const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_CONFIG = `${GITHUB_OIDC_ISSUER}/.well-known/openid-configuration`;
const COLLECTOR_AUDIENCE = "northstar-amazon-collector";
const COLLECTOR_REPOSITORY = "fysong0423-sudo/Tuatimar-S10";
const COLLECTOR_REPOSITORY_ID = "1316702558";
const COLLECTOR_REF = "refs/heads/main";
const COLLECTOR_WORKFLOW_REF = `${COLLECTOR_REPOSITORY}/.github/workflows/amazon-collector.yml@${COLLECTOR_REF}`;

type JsonWebKeyWithKid = JsonWebKey & { kid?: string };
type GithubOidcClaims = {
  aud?: string | string[];
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  repository?: string;
  repository_id?: string;
  run_id?: string;
  ref?: string;
  workflow_ref?: string;
  event_name?: string;
  runner_environment?: string;
};

let cachedKeys: { expiresAt: number; keys: JsonWebKeyWithKid[] } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

async function githubOidcKeys() {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const configurationResponse = await fetch(GITHUB_OIDC_CONFIG, { headers: { accept: "application/json" } });
  if (!configurationResponse.ok) throw new Error("无法读取 GitHub 执行器身份配置。");
  const configuration = await configurationResponse.json() as { issuer?: string; jwks_uri?: string };
  if (configuration.issuer !== GITHUB_OIDC_ISSUER || !configuration.jwks_uri?.startsWith(`${GITHUB_OIDC_ISSUER}/`)) {
    throw new Error("GitHub 执行器身份配置无效。");
  }
  const keysResponse = await fetch(configuration.jwks_uri, { headers: { accept: "application/json" } });
  if (!keysResponse.ok) throw new Error("无法读取 GitHub 执行器签名密钥。");
  const payload = await keysResponse.json() as { keys?: JsonWebKeyWithKid[] };
  if (!payload.keys?.length) throw new Error("GitHub 执行器签名密钥为空。");
  cachedKeys = { expiresAt: Date.now() + 10 * 60 * 1000, keys: payload.keys };
  return payload.keys;
}

function audienceMatches(audience: string | string[] | undefined) {
  return Array.isArray(audience) ? audience.includes(COLLECTOR_AUDIENCE) : audience === COLLECTOR_AUDIENCE;
}

export async function authenticateCollector(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeJson<{ alg?: string; kid?: string; typ?: string }>(parts[0]);
    const claims = decodeJson<GithubOidcClaims>(parts[1]);
    if (header.alg !== "RS256" || header.typ !== "JWT" || !header.kid) return null;
    const keys = await githubOidcKeys();
    const jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(parts[2]), signedContent);
    if (!validSignature) return null;

    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== GITHUB_OIDC_ISSUER || !audienceMatches(claims.aud)) return null;
    if (!claims.exp || claims.exp < now - 30 || (claims.nbf && claims.nbf > now + 30) || (claims.iat && claims.iat > now + 30)) return null;
    if (claims.repository?.toLowerCase() !== COLLECTOR_REPOSITORY.toLowerCase()) return null;
    if (String(claims.repository_id) !== COLLECTOR_REPOSITORY_ID) return null;
    if (claims.ref !== COLLECTOR_REF || claims.workflow_ref !== COLLECTOR_WORKFLOW_REF) return null;
    if (!claims.event_name || !["schedule", "workflow_dispatch"].includes(claims.event_name)) return null;
    if (claims.runner_environment !== "github-hosted") return null;
    return claims;
  } catch {
    return null;
  }
}

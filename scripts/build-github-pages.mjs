import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const projectRoot = new URL("../", import.meta.url);
const pageBase = "/Tuatimar-S10";
const pageOrigin = "https://fysong0423-sudo.github.io";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("github-pages", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request(`${pageOrigin}/`, {
    headers: {
      accept: "text/html",
      "x-forwarded-host": "fysong0423-sudo.github.io",
      "x-forwarded-proto": "https",
    },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Unable to render GitHub Pages HTML: ${response.status}`);
}

let html = await response.text();
html = html
  .replaceAll("/assets/", `${pageBase}/assets/`)
  .replaceAll(`${pageOrigin}/favicon.svg`, `${pageOrigin}${pageBase}/favicon.svg`)
  .replaceAll(`${pageOrigin}/og.png`, `${pageOrigin}${pageBase}/og.png`);

await rm(new URL("../docs/", import.meta.url), { recursive: true, force: true });
await mkdir(new URL("../docs/assets/", import.meta.url), { recursive: true });
for (const asset of await readdir(new URL("../dist/client/assets/", import.meta.url))) {
  const source = new URL(`../dist/client/assets/${asset}`, import.meta.url);
  const target = new URL(`../docs/assets/${asset}`, import.meta.url);
  if (!(await stat(source)).isFile()) continue;
  await mkdir(dirname(target.pathname), { recursive: true });
  await copyFile(source, target);
}

for (const file of ["favicon.svg", "file.svg", "globe.svg", "og.png", "window.svg"]) {
  await copyFile(new URL(`../dist/client/${file}`, import.meta.url), new URL(`../docs/${file}`, import.meta.url));
}

await writeFile(new URL("../docs/index.html", import.meta.url), html, "utf8");
await writeFile(new URL("../docs/404.html", import.meta.url), html, "utf8");
await writeFile(new URL("../docs/.nojekyll", import.meta.url), "", "utf8");

console.log(`GitHub Pages output written to ${join(projectRoot.pathname, "docs")}`);

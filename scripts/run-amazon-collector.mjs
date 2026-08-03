import fs from "node:fs/promises";

const API_URL = process.env.COLLECTOR_API_URL || "https://northstar-amazon-us.fysong0423.chatgpt.site/api/collector";
const AUDIENCE = "northstar-amazon-collector";
const JOB_FILE = ".collector-job.json";
const MAX_PAGES = 6;
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

async function githubOidcToken() {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error("GitHub OIDC environment is unavailable");
  const url = new URL(requestUrl);
  url.searchParams.set("audience", AUDIENCE);
  const response = await fetch(url, { headers: { authorization: `Bearer ${requestToken}` } });
  if (!response.ok) throw new Error(`Unable to request GitHub OIDC token (${response.status})`);
  const payload = await response.json();
  if (!payload.value) throw new Error("GitHub OIDC token response is empty");
  return payload.value;
}

async function collectorApi(payload) {
  const sitesBypassToken = process.env.SITES_BYPASS_TOKEN;
  if (!sitesBypassToken) throw new Error("Sites server access token is not configured");
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await githubOidcToken()}`,
      "oai-sites-authorization": `Bearer ${sitesBypassToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Collector API returned ${response.status}`);
  return result;
}

async function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) await fs.appendFile(outputPath, `${name}=${value}\n`);
}

async function claimJob() {
  if (!process.env.SITES_BYPASS_TOKEN) {
    await fs.rm(JOB_FILE, { force: true });
    await setOutput("has_job", "false");
    console.log("Sites server access token is not configured; collector is idle.");
    return null;
  }
  const result = await collectorApi({ action: "claim" });
  if (!result.job) {
    await fs.rm(JOB_FILE, { force: true });
    await setOutput("has_job", "false");
    console.log("No queued collection job.");
    return null;
  }
  await fs.writeFile(JOB_FILE, JSON.stringify(result.job));
  await setOutput("has_job", "true");
  console.log(`Claimed collection job ${result.job.id} with ${result.job.keywords.length} keywords.`);
  return result.job;
}

function chinaDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function detectBlockedPage(title, bodyText) {
  const sample = `${title}\n${bodyText}`;
  if (/captcha|robot check|enter the characters you see below/i.test(sample)) return "Amazon人机验证";
  if (/sorry! something went wrong|api request limit exceeded/i.test(sample)) return "Amazon访问受限";
  return "";
}

async function prepareContext(browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
  page.setDefaultNavigationTimeout(45_000);
  page.setDefaultTimeout(15_000);
  return { context, page };
}

async function setAndVerifyZip(page, zip) {
  await page.goto("https://www.amazon.com/", { waitUntil: "domcontentloaded" });
  let response = null;
  try {
    response = await page.evaluate(async (targetZip) => {
      const body = new URLSearchParams({
        locationType: "LOCATION_INPUT",
        zipCode: targetZip,
        storeContext: "generic",
        pageType: "Gateway",
        actionSource: "glow",
      });
      const result = await fetch("/gp/delivery/ajax/address-change.html", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "x-requested-with": "XMLHttpRequest" },
        body,
      });
      return { ok: result.ok, text: await result.text() };
    }, zip);
  } catch {
    response = null;
  }
  if (!response?.ok || !new RegExp(`\"zipCode\"\\s*:\\s*\"${zip}\"`).test(response.text)) return false;
  await page.goto("https://www.amazon.com/?ref_=nav_ya_signin", { waitUntil: "domcontentloaded" });
  const visibleZip = await page.$eval("#glow-ingress-line2", (element) => element.textContent || "").catch(() => "");
  return new RegExp(`\\b${zip}(?:-\\d{4})?\\b`).test(visibleZip);
}

async function collectBsr(browser, job) {
  const { context, page } = await prepareContext(browser);
  try {
    if (!(await setAndVerifyZip(page, job.zip))) return { verified: false, reason: "页面未明确显示90001" };
    await page.goto(`${job.amazonUrl}${job.amazonUrl.includes("?") ? "&" : "?"}th=1&psc=1`, { waitUntil: "domcontentloaded" });
    const pageData = await page.evaluate(() => ({
      title: document.title,
      body: document.body?.innerText || "",
      asin: document.querySelector("input#ASIN")?.getAttribute("value") || "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    }));
    const blocked = detectBlockedPage(pageData.title, pageData.body);
    if (blocked) return { verified: false, reason: blocked };
    if (pageData.asin !== job.productAsin && !pageData.canonical.includes(`/dp/${job.productAsin}`)) {
      return { verified: false, reason: "商品页子ASIN核验失败" };
    }
    const detailsIndex = pageData.body.search(/Best Sellers Rank/i);
    if (detailsIndex < 0) return { verified: false, reason: "Product details未显示BSR" };
    const details = pageData.body.slice(detailsIndex, detailsIndex + 1800);
    const matches = [...details.matchAll(/#([\d,]+)\s+in\s+([^\n(]+)/gi)].map((match) => ({
      value: Number(match[1].replace(/,/g, "")),
      category: match[2].replace(/\s+/g, " ").trim(),
    })).filter((entry) => Number.isInteger(entry.value) && entry.value > 0 && entry.category);
    const selected = matches.find((entry) => /clitoral vibrators/i.test(entry.category)) || matches[0];
    if (!selected) return { verified: false, reason: "Product details中的BSR格式无法识别" };
    return { verified: true, value: selected.value, category: selected.category };
  } finally {
    await context.close();
  }
}

async function collectKeyword(browser, job, keyword) {
  const { context, page } = await prepareContext(browser);
  try {
    if (!(await setAndVerifyZip(page, job.zip))) return { keyword, state: "failed", reason: "页面未明确显示90001" };
    let cumulativeOrganic = 0;
    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
      const searchUrl = new URL("https://www.amazon.com/s");
      searchUrl.searchParams.set("k", keyword);
      searchUrl.searchParams.set("page", String(pageNumber));
      searchUrl.searchParams.set("ref", `sr_pg_${pageNumber}`);
      await page.goto(searchUrl.href, { waitUntil: "domcontentloaded" });
      const pageData = await page.evaluate(() => ({ title: document.title, body: document.body?.innerText?.slice(0, 12000) || "" }));
      const blocked = detectBlockedPage(pageData.title, pageData.body);
      if (blocked) return { keyword, state: "failed", reason: blocked };
      const cards = await page.$$eval('div[data-component-type="s-search-result"][data-asin]', (elements) => elements.map((element) => {
        const asin = element.getAttribute("data-asin") || "";
        const text = element.textContent || "";
        const sponsored = /\bSponsored\b/i.test(text)
          || Boolean(element.querySelector('[aria-label*="Sponsored" i], .puis-sponsored-label-text, a[href*="sspa/click"], a[href*="_sspa"]'));
        return { asin, sponsored };
      }).filter((entry) => entry.asin));
      if (!cards.length) return { keyword, state: "failed", reason: "搜索页未返回可验证商品卡片" };
      const organic = cards.filter((card) => !card.sponsored);
      const localIndex = organic.findIndex((card) => card.asin === job.productAsin);
      if (localIndex >= 0) return { keyword, state: "ranked", rank: cumulativeOrganic + localIndex + 1, page: pageNumber };
      cumulativeOrganic += organic.length;
    }
    return { keyword, state: "not_found", rank: null, page: null };
  } catch (error) {
    return { keyword, state: "failed", reason: error instanceof Error ? error.message.slice(0, 120) : "页面采集异常" };
  } finally {
    await context.close();
  }
}

async function executeClaimedJob() {
  const job = JSON.parse(await fs.readFile(JOB_FILE, "utf8"));
  if (job.zip !== "90001") throw new Error("Collector job ZIP is not 90001");
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--lang=en-US", "--window-size=1440,1000"],
  });
  const total = job.keywords.length + 1;
  let completed = 0;
  let bsr = { verified: false, reason: "尚未采集" };
  const keywordResults = [];
  try {
    bsr = await collectBsr(browser, job);
    completed += 1;
    await collectorApi({ action: "progress", jobId: job.id, completed, total, message: bsr.verified ? `BSR #${bsr.value}` : `BSR失败：${bsr.reason}` });
    for (const keyword of job.keywords) {
      const result = await collectKeyword(browser, job, keyword);
      keywordResults.push(result);
      completed += 1;
      const detail = result.state === "ranked" ? `${keyword} #${result.rank}` : result.state === "not_found" ? `${keyword} 前6页未找到` : `${keyword} 失败`;
      await collectorApi({ action: "progress", jobId: job.id, completed, total, message: detail });
    }
  } finally {
    await browser.close();
  }

  const result = await collectorApi({
    action: "complete",
    jobId: job.id,
    snapshotDate: chinaDateKey(),
    zip: job.zip,
    zipVerified: true,
    bsr,
    keywords: keywordResults,
  });
  console.log(result.message || `Collection job ${job.id} completed.`);
  await fs.rm(JOB_FILE, { force: true });
}

async function failClaimedJob(reason = "GitHub执行器启动失败，任务将在下次刷新时重试。") {
  const job = JSON.parse(await fs.readFile(JOB_FILE, "utf8"));
  await collectorApi({ action: "fail", jobId: job.id, reason });
  await fs.rm(JOB_FILE, { force: true });
}

const mode = process.argv[2] || "--execute";
try {
  if (mode === "--claim-only") await claimJob();
  else if (mode === "--fail-claimed") await failClaimedJob();
  else await executeClaimedJob();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown collector error";
  console.error(message);
  if (mode === "--execute") {
    await failClaimedJob(`服务器采集失败：${message.slice(0, 180)}`).catch(() => {});
  }
  process.exitCode = 1;
}

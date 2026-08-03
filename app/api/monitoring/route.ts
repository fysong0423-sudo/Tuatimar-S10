import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  dailySales,
  manualBsrEntries,
  manualKeywordRanks,
  monitoredKeywords,
  products,
  refreshJobs,
} from "../../../db/schema";
import { DEFAULT_PRODUCT, MONITORED_KEYWORDS } from "../../../lib/monitoring-config";

type AuthenticatedUser = { id: string; email: string };

function authenticatedUser(request: Request): AuthenticatedUser | null {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  return id && email ? { id, email } : null;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table") || message.includes("no column named")) {
    return "共享数据库正在升级，请稍后刷新页面。";
  }
  return message;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function normalizedKeyword(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100) : "";
}

function keywordSource(index: number) {
  if (index < 5) return "保留排名词";
  if (index < 15) return "图片新增词";
  return "优化长尾词";
}

async function ensureDefaults(user: AuthenticatedUser) {
  const db = await getDb();
  await db
    .insert(products)
    .values({
      ...DEFAULT_PRODUCT,
      isActive: true,
      updatedByUserId: user.id,
      updatedByEmail: user.email,
    })
    .onConflictDoNothing({ target: products.asin });

  await db
    .insert(monitoredKeywords)
    .values(
      MONITORED_KEYWORDS.map((keyword, index) => ({
        productAsin: DEFAULT_PRODUCT.asin,
        keyword,
        source: keywordSource(index),
        isActive: true,
        updatedByUserId: user.id,
        updatedByEmail: user.email,
      })),
    )
    .onConflictDoNothing({ target: [monitoredKeywords.productAsin, monitoredKeywords.keyword] });
  return db;
}

export async function GET(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return Response.json({ error: "请先登录内部看板。" }, { status: 401 });

  try {
    const db = await ensureDefaults(user);
    const [keywordEntries, bsrEntries, productRows, keywordRows, jobs, salesRows] = await Promise.all([
      db.select().from(manualKeywordRanks).orderBy(desc(manualKeywordRanks.snapshotDate), desc(manualKeywordRanks.updatedAt)).limit(1000),
      db.select().from(manualBsrEntries).orderBy(desc(manualBsrEntries.snapshotDate), desc(manualBsrEntries.updatedAt)).limit(180),
      db.select().from(products).orderBy(desc(products.isActive), desc(products.updatedAt)).limit(100),
      db.select().from(monitoredKeywords).orderBy(desc(monitoredKeywords.isActive), monitoredKeywords.id).limit(1000),
      db.select().from(refreshJobs).orderBy(desc(refreshJobs.requestedAt)).limit(30),
      db.select().from(dailySales).orderBy(desc(dailySales.salesDate), desc(dailySales.updatedAt)).limit(365),
    ]);

    return Response.json({
      user: { email: user.email },
      keywordEntries,
      bsrEntries,
      products: productRows,
      monitoredKeywords: keywordRows,
      refreshJobs: jobs,
      dailySales: salesRows,
      defaults: { product: DEFAULT_PRODUCT },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return Response.json({ error: "请先登录内部看板。" }, { status: 401 });

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const action = payload.action;
    const db = await ensureDefaults(user);

    if (action === "keyword") {
      const snapshotDate = payload.snapshotDate;
      const keyword = normalizedKeyword(payload.keyword);
      const productAsin = typeof payload.productAsin === "string" ? payload.productAsin.trim().toUpperCase() : DEFAULT_PRODUCT.asin;
      const notFound = payload.notFound === true;
      const rank = notFound ? null : boundedInteger(payload.rank, 1, 288);
      const page = notFound ? null : boundedInteger(payload.page, 1, 6);

      if (!validDate(snapshotDate)) return Response.json({ error: "请输入有效日期。" }, { status: 400 });
      const [monitored] = await db
        .select({ id: monitoredKeywords.id })
        .from(monitoredKeywords)
        .where(and(eq(monitoredKeywords.productAsin, productAsin), eq(monitoredKeywords.keyword, keyword), eq(monitoredKeywords.isActive, true)))
        .limit(1);
      if (!monitored) return Response.json({ error: "请先把该词加入当前产品的监控词库。" }, { status: 400 });
      if (!notFound && (rank === null || page === null)) {
        return Response.json({ error: "自然排名须为1–288，页数须为1–6。" }, { status: 400 });
      }

      const status = notFound ? "前6页未找到" : `第${page}页有排名`;
      const [entry] = await db
        .insert(manualKeywordRanks)
        .values({ snapshotDate, productAsin, keyword, rank, page, status, updatedByUserId: user.id, updatedByEmail: user.email })
        .onConflictDoUpdate({
          target: [manualKeywordRanks.snapshotDate, manualKeywordRanks.productAsin, manualKeywordRanks.keyword],
          set: { rank, page, status, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning();
      return Response.json({ entry }, { status: 201 });
    }

    if (action === "keyword_add") {
      const keyword = normalizedKeyword(payload.keyword);
      const productAsin = typeof payload.productAsin === "string" ? payload.productAsin.trim().toUpperCase() : "";
      if (!keyword || keyword.length < 2) return Response.json({ error: "请输入至少2个字符的关键词。" }, { status: 400 });
      if (!/^[A-Z0-9]{10}$/.test(productAsin)) return Response.json({ error: "请选择有效产品。" }, { status: 400 });
      const [entry] = await db
        .insert(monitoredKeywords)
        .values({ productAsin, keyword, source: "团队新增词", isActive: true, updatedByUserId: user.id, updatedByEmail: user.email })
        .onConflictDoUpdate({
          target: [monitoredKeywords.productAsin, monitoredKeywords.keyword],
          set: { isActive: true, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning();
      return Response.json({ entry }, { status: 201 });
    }

    if (action === "keyword_toggle") {
      const id = boundedInteger(payload.id, 1, 1_000_000_000);
      if (id === null || typeof payload.isActive !== "boolean") return Response.json({ error: "关键词状态无效。" }, { status: 400 });
      const [entry] = await db
        .update(monitoredKeywords)
        .set({ isActive: payload.isActive, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(monitoredKeywords.id, id))
        .returning();
      if (!entry) return Response.json({ error: "未找到该关键词。" }, { status: 404 });
      return Response.json({ entry });
    }

    if (action === "bsr") {
      const snapshotDate = payload.snapshotDate;
      const asin = typeof payload.productAsin === "string" ? payload.productAsin.trim().toUpperCase() : DEFAULT_PRODUCT.asin;
      const bsr = boundedInteger(payload.bsr, 1, 10_000_000);
      const category = typeof payload.category === "string" ? payload.category.trim().slice(0, 120) : "";
      const zip = typeof payload.zip === "string" ? payload.zip.trim() : "";
      if (!validDate(snapshotDate)) return Response.json({ error: "请输入有效日期。" }, { status: 400 });
      if (bsr === null) return Response.json({ error: "请输入有效的BSR正整数。" }, { status: 400 });
      if (!category) return Response.json({ error: "请输入BSR类目。" }, { status: 400 });
      if (zip !== "90001") return Response.json({ error: "当前监控地区固定为90001。" }, { status: 400 });
      const [entry] = await db
        .insert(manualBsrEntries)
        .values({ snapshotDate, asin, bsr, category, zip, updatedByUserId: user.id, updatedByEmail: user.email })
        .onConflictDoUpdate({
          target: [manualBsrEntries.snapshotDate, manualBsrEntries.asin],
          set: { bsr, category, zip, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning();
      return Response.json({ entry }, { status: 201 });
    }

    if (action === "product") {
      const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : "";
      const asin = typeof payload.asin === "string" ? payload.asin.trim().toUpperCase() : "";
      const market = typeof payload.market === "string" ? payload.market.trim().slice(0, 60) : "";
      const zip = typeof payload.zip === "string" ? payload.zip.trim() : "";
      const amazonUrl = typeof payload.amazonUrl === "string" ? payload.amazonUrl.trim() : "";
      let parsedUrl: URL | null = null;
      try { parsedUrl = new URL(amazonUrl); } catch { parsedUrl = null; }
      const safeAmazonUrl = parsedUrl?.protocol === "https:" && (parsedUrl.hostname === "amazon.com" || parsedUrl.hostname === "www.amazon.com");
      if (!name) return Response.json({ error: "请输入产品名称。" }, { status: 400 });
      if (!/^[A-Z0-9]{10}$/.test(asin)) return Response.json({ error: "请输入10位ASIN。" }, { status: 400 });
      if (!market) return Response.json({ error: "请输入站点。" }, { status: 400 });
      if (zip !== "90001") return Response.json({ error: "当前监控地区固定为90001。" }, { status: 400 });
      if (!safeAmazonUrl) return Response.json({ error: "请输入有效的Amazon US商品链接。" }, { status: 400 });
      const [product] = await db
        .insert(products)
        .values({ name, asin, market, zip, amazonUrl, isActive: true, updatedByUserId: user.id, updatedByEmail: user.email })
        .onConflictDoUpdate({
          target: products.asin,
          set: { name, market, zip, amazonUrl, isActive: true, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning();
      return Response.json({ product }, { status: 201 });
    }

    if (action === "product_toggle") {
      const id = boundedInteger(payload.id, 1, 1_000_000_000);
      if (id === null || typeof payload.isActive !== "boolean") return Response.json({ error: "产品状态无效。" }, { status: 400 });
      const [product] = await db
        .update(products)
        .set({ isActive: payload.isActive, updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(products.id, id))
        .returning();
      if (!product) return Response.json({ error: "未找到该产品。" }, { status: 404 });
      return Response.json({ product });
    }

    if (action === "refresh_request") {
      const productAsin = typeof payload.productAsin === "string" ? payload.productAsin.trim().toUpperCase() : DEFAULT_PRODUCT.asin;
      const [existing] = await db
        .select()
        .from(refreshJobs)
        .where(and(eq(refreshJobs.productAsin, productAsin), inArray(refreshJobs.status, ["queued", "running"])))
        .orderBy(desc(refreshJobs.requestedAt))
        .limit(1);
      if (existing) return Response.json({ job: existing, duplicate: true });
      const [job] = await db
        .insert(refreshJobs)
        .values({
          productAsin,
          status: "queued",
          message: "刷新请求已保存；等待已授权的排名采集数据源处理。",
          requestedByUserId: user.id,
          requestedByEmail: user.email,
        })
        .returning();
      return Response.json({ job }, { status: 202 });
    }

    if (action === "sales") {
      const salesDate = payload.salesDate;
      const productAsin = typeof payload.productAsin === "string" ? payload.productAsin.trim().toUpperCase() : DEFAULT_PRODUCT.asin;
      const units = boundedInteger(payload.units, 0, 10_000_000);
      const revenueCents = boundedInteger(payload.revenueCents, 0, 100_000_000_000);
      if (!validDate(salesDate)) return Response.json({ error: "请输入有效销售日期。" }, { status: 400 });
      if (units === null || revenueCents === null) return Response.json({ error: "销量或销售额无效。" }, { status: 400 });
      const [entry] = await db
        .insert(dailySales)
        .values({ salesDate, productAsin, units, revenueCents, currency: "USD", source: "manual", updatedByUserId: user.id, updatedByEmail: user.email })
        .onConflictDoUpdate({
          target: [dailySales.salesDate, dailySales.productAsin],
          set: { units, revenueCents, source: "manual", updatedByUserId: user.id, updatedByEmail: user.email, updatedAt: sql`CURRENT_TIMESTAMP` },
        })
        .returning();
      return Response.json({ entry }, { status: 201 });
    }

    return Response.json({ error: "不支持的录入类型。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

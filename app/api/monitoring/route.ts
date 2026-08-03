import { desc, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { manualBsrEntries, manualKeywordRanks, products } from "../../../db/schema";
import { DEFAULT_PRODUCT, MONITORED_KEYWORDS } from "../../../lib/monitoring-config";

type AuthenticatedUser = {
  id: string;
  email: string;
};

function authenticatedUser(request: Request): AuthenticatedUser | null {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  return id && email ? { id, email } : null;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "共享数据库尚未初始化，请重新发布包含数据库迁移的版本。";
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

export async function GET(request: Request) {
  const user = authenticatedUser(request);
  if (!user) return Response.json({ error: "请先登录内部看板。" }, { status: 401 });

  try {
    const db = await getDb();
    const [keywordEntries, bsrEntries, productRows] = await Promise.all([
      db.select().from(manualKeywordRanks).orderBy(desc(manualKeywordRanks.snapshotDate), desc(manualKeywordRanks.updatedAt)).limit(500),
      db.select().from(manualBsrEntries).orderBy(desc(manualBsrEntries.snapshotDate), desc(manualBsrEntries.updatedAt)).limit(90),
      db.select().from(products).orderBy(desc(products.updatedAt)).limit(20),
    ]);

    return Response.json({
      user: { email: user.email },
      keywordEntries,
      bsrEntries,
      products: productRows,
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
    const db = await getDb();

    if (action === "keyword") {
      const snapshotDate = payload.snapshotDate;
      const keyword = typeof payload.keyword === "string" ? payload.keyword.trim() : "";
      const notFound = payload.notFound === true;
      const rank = notFound ? null : boundedInteger(payload.rank, 1, 288);
      const page = notFound ? null : boundedInteger(payload.page, 1, 6);

      if (!validDate(snapshotDate)) return Response.json({ error: "请输入有效日期。" }, { status: 400 });
      if (!MONITORED_KEYWORDS.includes(keyword as (typeof MONITORED_KEYWORDS)[number])) {
        return Response.json({ error: "关键词不在当前25词监控库中。" }, { status: 400 });
      }
      if (!notFound && (rank === null || page === null)) {
        return Response.json({ error: "自然排名须为1–288，页数须为1–6。" }, { status: 400 });
      }

      const status = notFound ? "前6页未找到" : `第${page}页有排名`;
      const [entry] = await db
        .insert(manualKeywordRanks)
        .values({
          snapshotDate,
          keyword,
          rank,
          page,
          status,
          updatedByUserId: user.id,
          updatedByEmail: user.email,
        })
        .onConflictDoUpdate({
          target: [manualKeywordRanks.snapshotDate, manualKeywordRanks.keyword],
          set: {
            rank,
            page,
            status,
            updatedByUserId: user.id,
            updatedByEmail: user.email,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .returning();
      return Response.json({ entry }, { status: 201 });
    }

    if (action === "bsr") {
      const snapshotDate = payload.snapshotDate;
      const bsr = boundedInteger(payload.bsr, 1, 10_000_000);
      const category = typeof payload.category === "string" ? payload.category.trim().slice(0, 120) : "";
      const zip = typeof payload.zip === "string" ? payload.zip.trim() : "";

      if (!validDate(snapshotDate)) return Response.json({ error: "请输入有效日期。" }, { status: 400 });
      if (bsr === null) return Response.json({ error: "请输入有效的BSR正整数。" }, { status: 400 });
      if (!category) return Response.json({ error: "请输入BSR类目。" }, { status: 400 });
      if (zip !== "90001") return Response.json({ error: "当前监控地区固定为90001。" }, { status: 400 });

      const [entry] = await db
        .insert(manualBsrEntries)
        .values({
          snapshotDate,
          asin: DEFAULT_PRODUCT.asin,
          bsr,
          category,
          zip,
          updatedByUserId: user.id,
          updatedByEmail: user.email,
        })
        .onConflictDoUpdate({
          target: [manualBsrEntries.snapshotDate, manualBsrEntries.asin],
          set: {
            bsr,
            category,
            zip,
            updatedByUserId: user.id,
            updatedByEmail: user.email,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
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
      try {
        parsedUrl = new URL(amazonUrl);
      } catch {
        parsedUrl = null;
      }
      const safeAmazonUrl =
        parsedUrl?.protocol === "https:" &&
        (parsedUrl.hostname === "amazon.com" || parsedUrl.hostname === "www.amazon.com");

      if (!name) return Response.json({ error: "请输入产品名称。" }, { status: 400 });
      if (!/^[A-Z0-9]{10}$/.test(asin)) return Response.json({ error: "请输入10位ASIN。" }, { status: 400 });
      if (!market) return Response.json({ error: "请输入站点。" }, { status: 400 });
      if (zip !== "90001") return Response.json({ error: "当前监控地区固定为90001。" }, { status: 400 });
      if (!safeAmazonUrl) return Response.json({ error: "请输入有效的Amazon US商品链接。" }, { status: 400 });

      const [product] = await db
        .insert(products)
        .values({
          name,
          asin,
          market,
          zip,
          amazonUrl,
          updatedByUserId: user.id,
          updatedByEmail: user.email,
        })
        .onConflictDoUpdate({
          target: products.asin,
          set: {
            name,
            market,
            zip,
            amazonUrl,
            updatedByUserId: user.id,
            updatedByEmail: user.email,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        })
        .returning();
      return Response.json({ product }, { status: 201 });
    }

    return Response.json({ error: "不支持的录入类型。" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

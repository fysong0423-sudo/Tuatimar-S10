import { and, asc, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureMonitoringSchema, getDb } from "../../../db";
import { monitoredKeywords, products, refreshJobs } from "../../../db/schema";
import { authenticateCollector } from "../../../lib/github-oidc";

const SYSTEM_USER_ID = "github-actions:amazon-collector";
const SYSTEM_USER_EMAIL = "collector@github-actions.local";

type KeywordResultPayload = {
  keyword?: unknown;
  state?: unknown;
  rank?: unknown;
  page?: unknown;
  reason?: unknown;
};

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function integerInRange(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function collectorResponse(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const identity = await authenticateCollector(request);
  if (!identity) return collectorResponse({ error: "执行器身份验证失败。" }, 401);

  try {
    await ensureMonitoringSchema();
    const payload = await request.json() as Record<string, unknown>;
    const action = payload.action;
    const db = await getDb();

    if (action === "claim") {
      await db
        .update(refreshJobs)
        .set({
          status: "failed",
          message: "服务器执行器运行超时，请重新刷新。",
          completedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(
          eq(refreshJobs.status, "running"),
          sql`datetime(${refreshJobs.requestedAt}) < datetime('now', '-45 minutes')`,
        ));

      const [queuedJob] = await db
        .select()
        .from(refreshJobs)
        .where(eq(refreshJobs.status, "queued"))
        .orderBy(asc(refreshJobs.requestedAt))
        .limit(1);
      if (!queuedJob) return collectorResponse({ job: null });

      const [claimedJob] = await db
        .update(refreshJobs)
        .set({ status: "running", message: "服务器执行器已领取任务，正在准备无痕会话（0/26）。", startedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(refreshJobs.id, queuedJob.id), eq(refreshJobs.status, "queued")))
        .returning();
      if (!claimedJob) return collectorResponse({ job: null });

      const [[product], keywords] = await Promise.all([
        db.select().from(products).where(and(eq(products.asin, claimedJob.productAsin), eq(products.isActive, true))).limit(1),
        db.select({ keyword: monitoredKeywords.keyword })
          .from(monitoredKeywords)
          .where(and(eq(monitoredKeywords.productAsin, claimedJob.productAsin), eq(monitoredKeywords.isActive, true)))
          .orderBy(asc(monitoredKeywords.id)),
      ]);
      if (!product || !keywords.length) {
        await db.update(refreshJobs).set({ status: "failed", message: "产品或启用关键词不存在。", completedAt: sql`CURRENT_TIMESTAMP` }).where(eq(refreshJobs.id, claimedJob.id));
        return collectorResponse({ job: null });
      }
      await db
        .update(refreshJobs)
        .set({ message: `服务器执行器已领取任务，正在准备无痕会话（0/${keywords.length + 1}）。` })
        .where(eq(refreshJobs.id, claimedJob.id));

      return collectorResponse({
        job: {
          id: claimedJob.id,
          productAsin: claimedJob.productAsin,
          productName: product.name,
          amazonUrl: product.amazonUrl,
          zip: product.zip,
          keywords: keywords.map((entry) => entry.keyword),
        },
      });
    }

    const jobId = integerInRange(payload.jobId, 1, 1_000_000_000);
    if (jobId === null) return collectorResponse({ error: "任务编号无效。" }, 400);
    const [job] = await db.select().from(refreshJobs).where(eq(refreshJobs.id, jobId)).limit(1);
    if (!job || job.status !== "running") return collectorResponse({ error: "任务不存在或已结束。" }, 409);

    if (action === "progress") {
      const completed = integerInRange(payload.completed, 0, 1000);
      const total = integerInRange(payload.total, 1, 1000);
      const detail = cleanText(payload.message, 180);
      if (completed === null || total === null || completed > total) return collectorResponse({ error: "任务进度无效。" }, 400);
      const message = `服务器采集中（${completed}/${total}）${detail ? `：${detail}` : ""}`;
      await db.update(refreshJobs).set({ message }).where(eq(refreshJobs.id, jobId));
      return collectorResponse({ ok: true, message });
    }

    if (action === "fail") {
      const reason = cleanText(payload.reason, 220) || "服务器采集异常。";
      await db.update(refreshJobs).set({ status: "failed", message: reason, completedAt: sql`CURRENT_TIMESTAMP` }).where(eq(refreshJobs.id, jobId));
      return collectorResponse({ ok: true });
    }

    if (action === "complete") {
      const snapshotDate = payload.snapshotDate;
      const zip = cleanText(payload.zip, 10);
      const zipVerified = payload.zipVerified === true;
      if (!validDate(snapshotDate)) return collectorResponse({ error: "快照日期无效。" }, 400);
      if (zip !== "90001" || !zipVerified) return collectorResponse({ error: "配送邮编未核验为90001，本次结果拒绝入库。" }, 400);

      const activeKeywords = await db
        .select({ keyword: monitoredKeywords.keyword })
        .from(monitoredKeywords)
        .where(and(eq(monitoredKeywords.productAsin, job.productAsin), eq(monitoredKeywords.isActive, true)))
        .orderBy(asc(monitoredKeywords.id));
      const activeKeywordSet = new Set(activeKeywords.map((entry) => entry.keyword));
      const rawResults = Array.isArray(payload.keywords) ? payload.keywords as KeywordResultPayload[] : [];
      if (rawResults.length !== activeKeywordSet.size) return collectorResponse({ error: "关键词结果数量与启用词库不一致。" }, 400);

      const seen = new Set<string>();
      const normalizedResults = rawResults.map((result) => {
        const keyword = cleanText(result.keyword, 100).toLowerCase();
        if (!activeKeywordSet.has(keyword) || seen.has(keyword)) throw new Error("关键词结果与启用词库不一致。");
        seen.add(keyword);
        if (result.state === "ranked") {
          const rank = integerInRange(result.rank, 1, 1000);
          const page = integerInRange(result.page, 1, 6);
          if (rank === null || page === null) throw new Error(`关键词 ${keyword} 的排名无效。`);
          return { keyword, rank, page, status: `第${page}页有排名`, successful: true };
        }
        if (result.state === "not_found") return { keyword, rank: null, page: null, status: "前6页未找到", successful: true };
        const reason = cleanText(result.reason, 120) || "页面访问受限";
        return { keyword, rank: null, page: null, status: `采集失败：${reason}`, successful: false };
      });

      const bsrPayload = payload.bsr && typeof payload.bsr === "object" ? payload.bsr as Record<string, unknown> : null;
      const bsrValue = bsrPayload ? integerInRange(bsrPayload.value, 1, 10_000_000) : null;
      const bsrCategory = bsrPayload ? cleanText(bsrPayload.category, 120) : "";
      const bsrVerified = Boolean(bsrPayload && bsrPayload.verified === true && bsrValue !== null && bsrCategory);

      const statements = normalizedResults.map((result) => env.DB.prepare(
        "INSERT INTO manual_keyword_ranks (snapshot_date, product_asin, keyword, rank, page, status, updated_by_user_id, updated_by_email, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(snapshot_date, product_asin, keyword) DO UPDATE SET rank = excluded.rank, page = excluded.page, status = excluded.status, updated_by_user_id = excluded.updated_by_user_id, updated_by_email = excluded.updated_by_email, updated_at = CURRENT_TIMESTAMP",
      ).bind(snapshotDate, job.productAsin, result.keyword, result.rank, result.page, result.status, `${SYSTEM_USER_ID}:${identity.run_id ?? "unknown"}`, SYSTEM_USER_EMAIL));
      if (bsrVerified) {
        statements.push(env.DB.prepare(
          "INSERT INTO manual_bsr_entries (snapshot_date, asin, bsr, category, zip, updated_by_user_id, updated_by_email, updated_at) VALUES (?, ?, ?, ?, '90001', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(snapshot_date, asin) DO UPDATE SET bsr = excluded.bsr, category = excluded.category, zip = excluded.zip, updated_by_user_id = excluded.updated_by_user_id, updated_by_email = excluded.updated_by_email, updated_at = CURRENT_TIMESTAMP",
        ).bind(snapshotDate, job.productAsin, bsrValue, bsrCategory, `${SYSTEM_USER_ID}:${identity.run_id ?? "unknown"}`, SYSTEM_USER_EMAIL));
      }
      await env.DB.batch(statements);

      const successfulKeywords = normalizedResults.filter((result) => result.successful).length;
      const failedKeywords = normalizedResults.length - successfulKeywords;
      const rankedKeywords = normalizedResults.filter((result) => result.rank !== null).length;
      const status = successfulKeywords > 0 || bsrVerified ? "completed" : "failed";
      const bsrText = bsrVerified ? `BSR #${bsrValue}` : "BSR采集失败";
      const message = `服务器采集完成：${bsrText}；关键词成功${successfulKeywords}个、失败${failedKeywords}个、前6页有排名${rankedKeywords}个。`;
      await db.update(refreshJobs).set({ status, message, completedAt: sql`CURRENT_TIMESTAMP` }).where(eq(refreshJobs.id, jobId));
      return collectorResponse({ ok: true, status, message });
    }

    return collectorResponse({ error: "不支持的执行器操作。" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器执行器处理失败。";
    console.error("collector_api_failed", message.replace(/[^\w\s:().,'`-]/g, "").slice(0, 300));
    return collectorResponse({ error: message }, 500);
  }
}

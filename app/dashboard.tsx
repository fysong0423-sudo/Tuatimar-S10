"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataEntryDrawer, { type EntryMode, type ManagedKeyword, type ManagedProduct } from "./data-entry-drawer";
import { AMAZON_US_ACCOUNT_SALES_KEY, DEFAULT_PRODUCT } from "../lib/monitoring-config";

type KeywordRow = {
  keyword: string;
  product: string;
  productAsin: string;
  rank: number | null;
  change: number | null;
  status: string;
  source: string;
};

type ManualKeywordEntry = {
  snapshotDate: string;
  productAsin: string;
  keyword: string;
  rank: number | null;
  page: number | null;
  status: string;
  updatedByEmail: string;
  updatedAt: string;
};

type ManualBsrEntry = {
  snapshotDate: string;
  asin: string;
  bsr: number;
  category: string;
  zip: string;
  updatedByEmail: string;
  updatedAt: string;
};

type RefreshJob = {
  id: number;
  productAsin: string;
  status: string;
  message: string | null;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

type DailySale = {
  salesDate: string;
  productAsin: string;
  units: number;
  revenueCents: number;
  currency: string;
  source: string;
  updatedAt: string;
};

type SalesSyncJob = {
  id: number;
  salesDate: string;
  productAsin: string;
  status: string;
  message: string | null;
  requestedAt: string;
};

type SharedMonitoringData = {
  user: { email: string };
  keywordEntries: ManualKeywordEntry[];
  bsrEntries: ManualBsrEntry[];
  products: ManagedProduct[];
  monitoredKeywords: ManagedKeyword[];
  refreshJobs: RefreshJob[];
  dailySales: DailySale[];
  salesSyncJobs: SalesSyncJob[];
};

type NavSection = "overview" | "keyword" | "bsr" | "product";
type RefreshStepStatus = "idle" | "queued" | "running" | "completed" | "failed";

type FullRefreshProgress = {
  jobId: number | null;
  rankAndBsr: RefreshStepStatus;
  amazonApi: RefreshStepStatus;
  pageData: RefreshStepStatus;
  message: string;
};

const INTERNAL_DASHBOARD_URL = "https://northstar-amazon-us.fysong0423.chatgpt.site";
function chinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function recentDateKeys(days: number) {
  const today = new Date(`${chinaDateKey()}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return { key, label: key.slice(5).replace("-", "/") };
  });
}

const CURRENT_SNAPSHOT_DATE = chinaDateKey();

const keywordRows: KeywordRow[] = ([
  { keyword: "rose toy", product: "TUATIMAR S10", rank: 21, change: 11, status: "第1页有排名", source: "保留排名词" },
  { keyword: "rose sex toy", product: "TUATIMAR S10", rank: 259, change: -193, status: "第6页有排名", source: "保留排名词" },
  { keyword: "tongue licking vibrator", product: "TUATIMAR S10", rank: 91, change: -18, status: "第2页有排名", source: "保留排名词" },
  { keyword: "clitoral suction vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "保留排名词" },
  { keyword: "sexual wellness vibrator", product: "TUATIMAR S10", rank: 186, change: 6, status: "第4页有排名", source: "保留排名词" },
  { keyword: "tongue toy for women", product: "TUATIMAR S10", rank: 113, change: -14, status: "第3页有排名", source: "图片新增词" },
  { keyword: "tongue vibrator", product: "TUATIMAR S10", rank: 187, change: -38, status: "第4页有排名", source: "图片新增词" },
  { keyword: "rose adult toy", product: "TUATIMAR S10", rank: 19, change: 1, status: "第1页有排名", source: "图片新增词" },
  { keyword: "sucking vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "图片新增词" },
  { keyword: "vibrator rose", product: "TUATIMAR S10", rank: 252, change: -186, status: "第6页有排名", source: "图片新增词" },
  { keyword: "tongue sex toy", product: "TUATIMAR S10", rank: 139, change: -44, status: "第3页有排名", source: "图片新增词" },
  { keyword: "sex rose", product: "TUATIMAR S10", rank: 18, change: 0, status: "第1页有排名", source: "图片新增词" },
  { keyword: "rose sex toys", product: "TUATIMAR S10", rank: 63, change: -11, status: "第2页有排名", source: "图片新增词" },
  { keyword: "adult toy rose", product: "TUATIMAR S10", rank: 15, change: -2, status: "第1页有排名", source: "图片新增词" },
  { keyword: "rose sex", product: "TUATIMAR S10", rank: 26, change: -3, status: "第1页有排名", source: "图片新增词" },
  { keyword: "tongue vibrator for women", product: "TUATIMAR S10", rank: 108, change: -26, status: "第3页有排名", source: "优化长尾词" },
  { keyword: "tongue licking toy for women", product: "TUATIMAR S10", rank: 64, change: -14, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "rose tongue vibrator", product: "TUATIMAR S10", rank: 14, change: 3, status: "第1页有排名", source: "优化长尾词" },
  { keyword: "rose tongue toy", product: "TUATIMAR S10", rank: 30, change: -5, status: "第1页有排名", source: "优化长尾词" },
  { keyword: "licking vibrator for women", product: "TUATIMAR S10", rank: 83, change: -38, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "oral tongue vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "rose vibrator for women", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "clitoral tongue vibrator", product: "TUATIMAR S10", rank: 85, change: -17, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "tongue massager for women", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "rose clitoral toy", product: "TUATIMAR S10", rank: 64, change: -27, status: "第2页有排名", source: "优化长尾词" },
] as Omit<KeywordRow, "productAsin">[]).map((row) => ({ ...row, productAsin: DEFAULT_PRODUCT.asin }));

const rankingDates = recentDateKeys(7);

const rankHistory: Record<string, Record<string, number | null>> = {
  "2026-07-29": {
  "rose toy": 30,
  "rose sex toy": 70,
  "tongue licking vibrator": 72,
  "clitoral suction vibrator": 154,
  "sexual wellness vibrator": 187,
  "tongue toy for women": 91,
  "tongue vibrator": 156,
  "rose adult toy": 20,
  "sucking vibrator": null,
  "vibrator rose": 71,
  "tongue sex toy": 88,
  "sex rose": 18,
  "rose sex toys": 70,
  "adult toy rose": 14,
  "rose sex": 25,
  "tongue vibrator for women": 75,
  "tongue licking toy for women": 50,
  "rose tongue vibrator": 18,
  "rose tongue toy": 24,
  "licking vibrator for women": 54,
  "oral tongue vibrator": null,
  "rose vibrator for women": null,
  "clitoral tongue vibrator": 74,
  "tongue massager for women": null,
  "rose clitoral toy": 35,
  },
  "2026-07-30": {
    "rose toy": 32,
    "rose sex toy": 66,
    "tongue licking vibrator": 73,
    "clitoral suction vibrator": null,
    "sexual wellness vibrator": 192,
    "tongue toy for women": 99,
    "tongue vibrator": 149,
    "rose adult toy": 20,
    "sucking vibrator": null,
    "vibrator rose": 66,
    "tongue sex toy": 95,
    "sex rose": 18,
    "rose sex toys": 52,
    "adult toy rose": 13,
    "rose sex": 23,
    "tongue vibrator for women": 82,
    "tongue licking toy for women": 50,
    "rose tongue vibrator": 17,
    "rose tongue toy": 25,
    "licking vibrator for women": 45,
    "oral tongue vibrator": null,
    "rose vibrator for women": null,
    "clitoral tongue vibrator": 68,
    "tongue massager for women": null,
    "rose clitoral toy": 37,
  },
};

function rankForDate(row: KeywordRow, date: string) {
  if (date === CURRENT_SNAPSHOT_DATE) return row.rank;
  return rankHistory[date]?.[row.keyword] ?? null;
}

function pageForRow(row: KeywordRow) {
  const match = row.status.match(/^第(\d+)页/);
  return match ? Number(match[1]) : null;
}

function summarizeKeywords(rows: KeywordRow[]) {
  return {
    total: rows.length,
    ranked: rows.filter((row) => row.rank !== null).length,
    top10: rows.filter((row) => row.rank !== null && row.rank <= 10).length,
    rank11to48: rows.filter((row) => row.rank !== null && row.rank >= 11 && row.rank <= 48).length,
    rank49to192: rows.filter((row) => row.rank !== null && row.rank >= 49 && row.rank <= 192).length,
    rank193to288: rows.filter((row) => row.rank !== null && row.rank >= 193 && row.rank <= 288).length,
    notFound: rows.filter((row) => row.rank === null).length,
  };
}

function ChangePill({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span className={`change-pill ${neutral ? "neutral" : positive ? "positive" : "negative"}`}>
      {neutral ? "—" : positive ? "↑" : "↓"} {neutral ? "0" : Math.abs(value)}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [product, setProduct] = useState("全部产品");
  const [query, setQuery] = useState("");
  const [onlyDown, setOnlyDown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [salesSyncing, setSalesSyncing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<FullRefreshProgress | null>(null);
  const [toast, setToast] = useState("");
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [sharedData, setSharedData] = useState<SharedMonitoringData | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [publicCopy, setPublicCopy] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const lastUpdated = useMemo(() => {
    const timestamps = [
      ...(sharedData?.keywordEntries ?? []).map((entry) => entry.updatedAt),
      ...(sharedData?.bsrEntries ?? []).map((entry) => entry.updatedAt),
      ...(sharedData?.dailySales ?? []).map((entry) => entry.updatedAt),
    ].filter(Boolean).sort().reverse();
    if (!timestamps[0]) return `${CURRENT_SNAPSHOT_DATE} · 等待服务器采集`;
    const parsed = new Date(timestamps[0].replace(" ", "T") + (timestamps[0].includes("Z") ? "" : "Z"));
    return Number.isNaN(parsed.getTime()) ? timestamps[0] : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(parsed);
  }, [sharedData]);

  const reloadSharedData = useCallback(async () => {
    if (window.location.hostname.endsWith("github.io")) {
      setPublicCopy(true);
      setCanEdit(false);
      return;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/monitoring", { headers: { accept: "application/json" } });
        const data = (await response.json()) as SharedMonitoringData & { error?: string };
        if (!response.ok) throw new Error(data.error || "团队数据库连接失败");
        setSharedData(data);
        setCanEdit(true);
        setConnectionError("");

        const requestedEntry = new URL(window.location.href).searchParams.get("entry");
        if (requestedEntry === "keyword" || requestedEntry === "bsr" || requestedEntry === "product" || requestedEntry === "sales") {
          if (requestedEntry !== "sales") setActiveSection(requestedEntry);
          setEntryMode(requestedEntry);
        }
        return;
      } catch (error) {
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        }
        setCanEdit(false);
        setConnectionError(error instanceof Error ? error.message : "团队数据库连接失败");
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadSharedData(), 0);
    return () => window.clearTimeout(timer);
  }, [reloadSharedData]);

  const manualEntryMap = useMemo(() => {
    return new Map(
      (sharedData?.keywordEntries ?? []).map((entry) => [`${entry.snapshotDate}:${entry.productAsin}:${entry.keyword}`, entry]),
    );
  }, [sharedData]);

  const activeProducts = useMemo(() => {
    const rows = sharedData?.products.filter((item) => item.isActive !== false) ?? [];
    return rows.length ? rows : [DEFAULT_PRODUCT];
  }, [sharedData]);
  const currentProduct = activeProducts.find((item) => item.asin === product) ?? activeProducts[0];

  const effectiveRows = useMemo(() => {
    const configured = sharedData?.monitoredKeywords
      .filter((item) => item.isActive)
      .map((item): KeywordRow => {
        const base = keywordRows.find((row) => row.productAsin === item.productAsin && row.keyword === item.keyword);
        const productName = activeProducts.find((candidate) => candidate.asin === item.productAsin)?.name ?? item.productAsin;
        return base
          ? { ...base, product: productName, source: item.source }
          : { keyword: item.keyword, product: productName, productAsin: item.productAsin, rank: null, change: null, status: "等待首次采集", source: item.source };
      });
    const rows = configured ?? keywordRows;
    return rows.map((row) => {
      const manual = manualEntryMap.get(`${CURRENT_SNAPSHOT_DATE}:${row.productAsin}:${row.keyword}`);
      if (!manual) return row;
      const previousDate = rankingDates[rankingDates.length - 2]?.key;
      const previousManual = previousDate ? manualEntryMap.get(`${previousDate}:${row.productAsin}:${row.keyword}`) : null;
      const previousRank = previousManual?.rank ?? (row.productAsin === DEFAULT_PRODUCT.asin && previousDate ? rankHistory[previousDate]?.[row.keyword] ?? null : null);
      const change = manual.rank !== null && previousRank !== null ? previousRank - manual.rank : null;
      return { ...row, rank: manual.rank, change, status: manual.status };
    });
  }, [activeProducts, manualEntryMap, sharedData]);

  const summaryRows = product === "全部产品" ? effectiveRows : effectiveRows.filter((row) => row.productAsin === product);
  const keywordSummary = summarizeKeywords(summaryRows);
  const coveragePercent = keywordSummary.total ? ((keywordSummary.ranked / keywordSummary.total) * 100).toFixed(1) : "0.0";
  const improvedCount = effectiveRows.filter((row) => row.change !== null && row.change > 0).length;
  const declinedCount = effectiveRows.filter((row) => row.change !== null && row.change < 0).length;
  const stableCount = effectiveRows.filter((row) => row.change === 0).length;
  const currentBsrEntry = sharedData?.bsrEntries.find((entry) => entry.snapshotDate === CURRENT_SNAPSHOT_DATE && entry.asin === currentProduct.asin);
  const currentBsr = currentBsrEntry?.bsr ?? 123;
  const currentBsrCategory = currentBsrEntry?.category ?? "Clitoral Vibrators";
  const currentBsrZip = currentBsrEntry?.zip ?? "90001";
  const currentSale = sharedData?.dailySales.find((entry) => entry.salesDate === CURRENT_SNAPSHOT_DATE && entry.productAsin === currentProduct.asin);
  const accountSale = sharedData?.dailySales.find((entry) => entry.salesDate === CURRENT_SNAPSHOT_DATE && entry.productAsin === AMAZON_US_ACCOUNT_SALES_KEY);
  const latestRefreshJob = sharedData?.refreshJobs.find((entry) => entry.productAsin === currentProduct.asin);
  const bsrDelta = currentBsr - 113;
  const bsrChangeText = bsrDelta === 0 ? "与上一有效日持平" : `较上一有效日${bsrDelta > 0 ? "下降" : "上升"} ${Math.abs(bsrDelta)} 位`;

  const displayedRefreshProgress = useMemo(() => {
    if (!refreshProgress?.jobId || latestRefreshJob?.id !== refreshProgress.jobId) return refreshProgress;
    const nextStatus: RefreshStepStatus = latestRefreshJob.status === "completed"
      ? "completed"
      : latestRefreshJob.status === "failed"
        ? "failed"
        : latestRefreshJob.status === "running"
          ? "running"
          : "queued";
    if (!refreshProgress) return refreshProgress;
    const latestMessage = latestRefreshJob.message || refreshProgress.message;
    if (refreshProgress.rankAndBsr === nextStatus && refreshProgress.message === latestMessage) return refreshProgress;
    return {
      ...refreshProgress,
      rankAndBsr: nextStatus,
      message: latestMessage,
    };
  }, [latestRefreshJob, refreshProgress]);

  useEffect(() => {
    if (!refreshProgress?.jobId || !latestRefreshJob || !["queued", "running"].includes(latestRefreshJob.status)) return;
    const timer = window.setInterval(() => void reloadSharedData(), 8000);
    return () => window.clearInterval(timer);
  }, [latestRefreshJob, refreshProgress?.jobId, reloadSharedData]);

  useEffect(() => {
    if (refreshProgress || !latestRefreshJob || !["queued", "running"].includes(latestRefreshJob.status)) return;
    setRefreshProgress({
      jobId: latestRefreshJob.id,
      rankAndBsr: latestRefreshJob.status === "running" ? "running" : "queued",
      amazonApi: "completed",
      pageData: "completed",
      message: latestRefreshJob.message || "服务器采集任务处理中。",
    });
  }, [latestRefreshJob, refreshProgress]);

  function displayRankForDate(row: KeywordRow, date: string) {
    const manual = manualEntryMap.get(`${date}:${row.productAsin}:${row.keyword}`);
    return manual ? manual.rank : row.productAsin === DEFAULT_PRODUCT.asin ? rankForDate(row, date) : null;
  }

  const filteredRows = useMemo(() => {
    return effectiveRows.filter((row) => {
      const matchesProduct = product === "全部产品" || row.productAsin === product;
      const matchesQuery = row.keyword.toLowerCase().includes(query.toLowerCase());
      const matchesDown = !onlyDown || (row.change !== null && row.change < 0);
      return matchesProduct && matchesQuery && matchesDown;
    });
  }, [effectiveRows, product, query, onlyDown]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  const refreshPercent = useMemo(() => {
    if (!displayedRefreshProgress) return 0;
    const score: Record<RefreshStepStatus, number> = { idle: 0, queued: 0.2, running: 0.6, completed: 1, failed: 1 };
    const progressMatch = latestRefreshJob?.message?.match(/（(\d+)\/(\d+)）/);
    const liveRankScore = progressMatch && Number(progressMatch[2]) > 0
      ? Math.min(0.99, Number(progressMatch[1]) / Number(progressMatch[2]))
      : score[displayedRefreshProgress.rankAndBsr];
    return Math.round(
      liveRankScore * 55
      + score[displayedRefreshProgress.amazonApi] * 30
      + score[displayedRefreshProgress.pageData] * 15,
    );
  }, [displayedRefreshProgress, latestRefreshJob?.message]);

  const refreshHeadline = useMemo(() => {
    if (!displayedRefreshProgress) return "";
    const statuses = [displayedRefreshProgress.rankAndBsr, displayedRefreshProgress.amazonApi, displayedRefreshProgress.pageData];
    if (statuses.includes("failed")) return statuses.every((status) => status === "completed" || status === "failed") ? "更新结束，部分项目失败" : "正在继续更新其他项目";
    if (statuses.every((status) => status === "completed")) return "全部数据更新完成";
    if (displayedRefreshProgress.rankAndBsr === "queued") return "关键词与 BSR 已进入服务器队列";
    return "正在更新全部数据";
  }, [displayedRefreshProgress]);

  function refreshStepLabel(status: RefreshStepStatus) {
    if (status === "completed") return "已完成";
    if (status === "failed") return "失败";
    if (status === "running") return "进行中";
    if (status === "queued") return "排队中";
    return "等待中";
  }

  function navigateTo(section: NavSection) {
    setActiveSection(section);
    const targetId = {
      overview: "overview-section",
      keyword: "keyword-section",
      bsr: "bsr-section",
      product: "product-section",
    }[section];
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (section === "overview") return;
    if (canEdit) {
      setEntryMode(section);
      return;
    }
    if (publicCopy) {
      window.location.href = `${INTERNAL_DASHBOARD_URL}/?entry=${section}`;
      return;
    }
    showToast("正在连接团队共享数据库，请稍后再试");
  }

  async function handleSaved(message: string) {
    await reloadSharedData();
    showToast(message);
  }

  async function syncNow() {
    if (publicCopy) {
      window.location.href = `${INTERNAL_DASHBOARD_URL}/`;
      return;
    }
    if (!canEdit) {
      showToast("请先登录内部看板再刷新排名");
      return;
    }
    setSyncing(true);
    setRefreshProgress({
      jobId: null,
      rankAndBsr: "running",
      amazonApi: "idle",
      pageData: "idle",
      message: "正在创建关键词与 BSR 采集任务…",
    });
    try {
      const rankResponse = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "refresh_request", productAsin: currentProduct.asin }),
      });
      const rankResult = (await rankResponse.json()) as { error?: string; duplicate?: boolean; job?: RefreshJob };
      if (!rankResponse.ok) throw new Error(rankResult.error || "关键词与 BSR 刷新任务提交失败");

      setRefreshProgress({
        jobId: rankResult.job?.id ?? null,
        rankAndBsr: rankResult.job?.status === "running" ? "running" : "queued",
        amazonApi: "running",
        pageData: "idle",
        message: rankResult.duplicate ? "已有采集任务，正在继续同步 Amazon API…" : "采集任务已排队，正在同步 Amazon API…",
      });

      let amazonCompleted = false;
      let amazonError = "";
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          const salesResponse = await fetch("/api/monitoring", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "sales_sync",
              salesDate: CURRENT_SNAPSHOT_DATE,
              productAsin: currentProduct.asin,
              force: attempt === 0,
            }),
          });
          const salesResult = (await salesResponse.json()) as { error?: string; phase?: string };
          if (!salesResponse.ok && salesResponse.status !== 202) throw new Error(salesResult.error || "Amazon API 同步失败");
          if (salesResult.phase === "completed") {
            amazonCompleted = true;
            break;
          }
          setRefreshProgress((current) => current ? {
            ...current,
            amazonApi: "running",
            message: salesResult.phase === "running" ? "Amazon 报表生成中，关键词与 BSR 在后台排队…" : "Amazon 已接受同步请求，正在生成报表…",
          } : current);
          if (attempt < 11) await new Promise((resolve) => window.setTimeout(resolve, 5000));
        } catch (error) {
          amazonError = error instanceof Error ? error.message : "Amazon API 同步失败";
          break;
        }
      }
      if (!amazonCompleted && !amazonError) amazonError = "Amazon 报表仍在生成，可稍后再次刷新";

      setRefreshProgress((current) => current ? {
        ...current,
        amazonApi: amazonCompleted ? "completed" : "failed",
        pageData: "running",
        message: amazonCompleted ? "Amazon API 已同步，正在载入最新页面数据…" : `${amazonError}；正在载入其他最新数据…`,
      } : current);
      await reloadSharedData();
      setRefreshProgress((current) => current ? {
        ...current,
        pageData: "completed",
        message: amazonCompleted
          ? "Amazon API 与页面数据已更新；关键词和 BSR 将在后台采集完成后自动显示。"
          : `${amazonError}；关键词和 BSR 任务仍在后台处理。`,
      } : current);
      showToast(amazonCompleted ? "全量更新已启动，Amazon API 已同步" : "关键词与 BSR 已排队，Amazon API 本次未完成");
    } catch (error) {
      const message = error instanceof Error ? error.message : "刷新任务提交失败";
      setRefreshProgress((current) => current ? {
        ...current,
        rankAndBsr: current.jobId ? current.rankAndBsr : "failed",
        amazonApi: current.amazonApi === "idle" ? "failed" : current.amazonApi,
        pageData: "failed",
        message,
      } : { jobId: null, rankAndBsr: "failed", amazonApi: "failed", pageData: "failed", message });
      showToast(message);
    } finally {
      setSyncing(false);
    }
  }

  async function syncSales() {
    if (publicCopy) {
      window.location.href = `${INTERNAL_DASHBOARD_URL}/`;
      return;
    }
    if (!canEdit) {
      showToast("请先登录内部看板再同步销售额");
      return;
    }

    setSalesSyncing(true);
    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const response = await fetch("/api/monitoring", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "sales_sync",
            salesDate: CURRENT_SNAPSHOT_DATE,
            productAsin: currentProduct.asin,
            force: attempt === 0,
          }),
        });
        const result = (await response.json()) as { error?: string; phase?: string };
        if (!response.ok && response.status !== 202) throw new Error(result.error || "销售额同步失败");
        if (result.phase === "completed") {
          await reloadSharedData();
          showToast("今日销售额已从 Amazon 安全同步");
          return;
        }
        if (attempt < 11) await new Promise((resolve) => window.setTimeout(resolve, 5000));
      }
      await reloadSharedData();
      showToast("Amazon 正在生成报表，请稍后再点同步");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "销售额同步失败");
    } finally {
      setSalesSyncing(false);
    }
  }

  function exportCsv() {
    const header = ["关键词", ...rankingDates.map((date) => `${date.key}自然排名`), "页数", "日变化", "状态"];
    const lines = filteredRows.map((row) => [
      row.keyword,
      ...rankingDates.map((date) => displayRankForDate(row, date.key) ?? ""),
      pageForRow(row) ?? "",
      row.change,
      row.status,
    ]);
    const csv = "\uFEFF" + [header, ...lines].map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "amazon-us-keyword-ranking.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("关键词报表已导出");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-name">NORTHSTAR</span>
        </div>

        <div className="workspace-label">运营工作台</div>
        <nav className="nav-list" aria-label="主导航">
          <button type="button" className={`nav-item ${activeSection === "overview" ? "active" : ""}`} onClick={() => navigateTo("overview")} aria-current={activeSection === "overview" ? "page" : undefined}><span>⌁</span>每日概览</button>
          <button type="button" className={`nav-item ${activeSection === "keyword" ? "active" : ""}`} onClick={() => navigateTo("keyword")}><span>⌕</span>关键词监控</button>
          <button type="button" className={`nav-item ${activeSection === "bsr" ? "active" : ""}`} onClick={() => navigateTo("bsr")}><span>↗</span>BSR 趋势</button>
          <button type="button" className={`nav-item ${activeSection === "product" ? "active" : ""}`} onClick={() => navigateTo("product")}><span>□</span>产品管理</button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sync-card">
          <div className="sync-card-head">
            <span className="live-dot" />
            {canEdit ? "共享录入已连接" : "Amazon 排名已同步"}
          </div>
          <p>{canEdit ? `当前账号：${sharedData?.user.email ?? "已登录"}` : publicCopy ? "公开看板为只读，点击栏目进入内部录入" : `BSR 与 ${keywordSummary.total} 个关键词已同步`}</p>
          <div className="sync-track"><span style={{ width: "100%" }} /></div>
          <small>独立无痕会话 · ZIP 90001</small>
        </div>
        <button type="button" className="nav-item settings" onClick={() => navigateTo("product")}><span>⚙</span>数据源设置</button>
        <div className="user-card">
          <div className="avatar">YS</div>
          <div><strong>运营团队</strong><small>Amazon US</small></div>
          <span className="user-more">···</span>
        </div>
      </aside>

      <section className="content" id="overview-section">
        <header className="topbar">
          <div>
            <p className="eyebrow">AMAZON US · 每日监控</p>
            <h1>{currentProduct.name} 运营监控看板</h1>
            <p className="subhead">ASIN {currentProduct.asin} · {keywordSummary.total} 个启用监控词 · 独立无痕采集至第 6 页 · 自然排名保留最近 7 天。</p>
          </div>
          <div className="top-actions">
            <div className="updated"><span className="live-dot" />数据快照：{lastUpdated}</div>
            <button className="secondary-btn" onClick={exportCsv}>导出报表</button>
            <button className="primary-btn" onClick={() => void syncNow()} disabled={syncing}>
              <span className={syncing ? "spin" : ""}>↻</span>{syncing ? "更新中" : "刷新全部数据"}
            </button>
            {latestRefreshJob && <small className={`job-status ${latestRefreshJob.status}`}>{latestRefreshJob.status === "queued" ? "服务器排队中（通常5分钟内）" : latestRefreshJob.status === "running" ? "服务器正在采集" : latestRefreshJob.status === "completed" ? "刷新完成" : "任务失败"}</small>}
            {displayedRefreshProgress && (
              <div className="refresh-progress" role="status" aria-live="polite">
                <div className="refresh-progress-head"><strong>{refreshHeadline}</strong><span>{refreshPercent}%</span></div>
                <div className="refresh-progress-track" aria-label={`更新进度 ${refreshPercent}%`}><i style={{ width: `${refreshPercent}%` }} /></div>
                <div className="refresh-progress-steps">
                  <span className={displayedRefreshProgress.rankAndBsr}>关键词与 BSR · {refreshStepLabel(displayedRefreshProgress.rankAndBsr)}</span>
                  <span className={displayedRefreshProgress.amazonApi}>Amazon API · {refreshStepLabel(displayedRefreshProgress.amazonApi)}</span>
                  <span className={displayedRefreshProgress.pageData}>页面数据 · {refreshStepLabel(displayedRefreshProgress.pageData)}</span>
                </div>
                <small>{displayedRefreshProgress.message}</small>
              </div>
            )}
          </div>
        </header>

        <div className="control-strip section-anchor" id="product-section">
          <div className="select-wrap">
            <label htmlFor="product">产品</label>
            <select id="product" value={product} onChange={(event) => setProduct(event.target.value)}>
              <option>全部产品</option>
              {activeProducts.map((item) => <option key={item.asin} value={item.asin}>{item.name}</option>)}
            </select>
          </div>
          <div className="select-wrap">
            <label htmlFor="market">站点</label>
            <select id="market" defaultValue="美国站">
              <option>美国站</option>
            </select>
          </div>
          <div className="range-switch" aria-label="日期范围">
            {([7, 14, 30] as const).map((day) => (
              <button key={day} className={range === day ? "active" : ""} onClick={() => setRange(day)}>
                {day}天
              </button>
            ))}
          </div>
          <button type="button" className="entry-launch compact" onClick={() => navigateTo("product")}>管理产品</button>
          <a className="product-link" href={currentProduct.amazonUrl} target="_blank" rel="noreferrer">
            查看 Amazon 商品页 ↗
          </a>
        </div>

        {connectionError && !publicCopy && (
          <div className="connection-alert" role="status">
            <span>团队数据库连接失败：{connectionError}</span>
            <button type="button" onClick={() => void reloadSharedData()}>重新连接</button>
          </div>
        )}

        <section className="today-snapshot" aria-label="今日采集结果">
          <div className="snapshot-lead">
            <span className="snapshot-check">✓</span>
            <div><p>{currentBsrEntry?.zip === "90001" ? "90001 地区数据已采集" : "等待90001地区有效采集"}</p><strong>{lastUpdated}</strong></div>
          </div>
          <div className="snapshot-stat">
            <small>BSR</small><strong>#{currentBsr}</strong><span>{currentBsrCategory} · {bsrChangeText}</span>
          </div>
          <div className="snapshot-stat sales-highlight">
            <small>美国站店铺今日总额</small><strong>{accountSale ? `$${(accountSale.revenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</strong><span>{accountSale ? `${accountSale.units} 件 · Amazon SP-API` : "等待首次同步"}</span>
            <div className="snapshot-actions">
              <button type="button" className="snapshot-action primary" disabled={salesSyncing} onClick={() => void syncSales()}>{salesSyncing ? "同步中…" : "同步销售额"}</button>
            </div>
          </div>
          <div className="snapshot-stat">
            <small>当前产品今日销售额</small><strong>{currentSale ? `$${(currentSale.revenueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</strong><span>{currentSale ? `${currentSale.units} 件 · ${currentSale.source === "manual" ? "团队录入" : "Amazon SP-API"}` : "等待首次同步"}</span>
            <div className="snapshot-actions">
              <button type="button" className="snapshot-action" onClick={() => canEdit ? setEntryMode("sales") : publicCopy ? window.location.assign(`${INTERNAL_DASHBOARD_URL}/?entry=sales`) : showToast("正在连接共享数据库")}>手动录入</button>
            </div>
          </div>
          <div className="snapshot-stat">
            <small>采集地区</small><strong>{currentBsrZip}</strong><span>Los Angeles · {currentProduct.market}</span>
          </div>
          <div className="snapshot-stat">
            <small>前 6 页有自然排名</small><strong>{keywordSummary.ranked} / {keywordSummary.total}</strong><span>今日覆盖率 {coveragePercent}%</span>
          </div>
        </section>

        <section className="kpi-grid">
          <article className="kpi-card dark-card">
            <div className="kpi-label">总监控关键词</div>
            <div className="kpi-value">{keywordSummary.total}</div>
            <div className="kpi-foot"><span className="configured-pill">启用词库 · 近 7 天留存</span></div>
            <div className="mini-bars" aria-hidden="true">
              {[34, 44, 40, 56, 62, 58, 78, 68, 82, 92].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon mint">P6</span><span className="source-pill">前 6 页</span></div>
            <div className="kpi-label">有自然排名</div>
            <div className="kpi-value">{keywordSummary.ranked}</div>
            <p>占总词数 {coveragePercent}%</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon peach">T10</span><span className="source-pill">自然位</span></div>
            <div className="kpi-label">Top 10 关键词</div>
            <div className="kpi-value">{keywordSummary.top10}</div>
            <p>当前无 Top 10 关键词</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon blue">11</span><span className="source-pill">自然位</span></div>
            <div className="kpi-label">第 11–48 位</div>
            <div className="kpi-value">{keywordSummary.rank11to48}</div>
            <p>{keywordSummary.rank11to48} 个词进入搜索首页</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon blue">49</span><span className="source-pill">第 2–4 页</span></div>
            <div className="kpi-label">第 49–288 位</div>
            <div className="kpi-value">{keywordSummary.rank49to192 + keywordSummary.rank193to288}</div>
            <p>第 2–6 页共 {keywordSummary.rank49to192 + keywordSummary.rank193to288} 个词</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon gray">—</span><span className="waiting-pill">前 6 页</span></div>
            <div className="kpi-label">前 6 页未找到</div>
            <div className="kpi-value">{keywordSummary.notFound}</div>
            <p>不代表 Amazon 全站无排名</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon blue">#</span><span className="source-pill">Product details</span></div>
            <div className="kpi-label">Best Seller Rank</div>
            <div className="kpi-value">#{currentBsr}</div>
            <p>{bsrChangeText}</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon mint">$</span><span className="source-pill">日数据</span></div>
            <div className="kpi-label">当前产品今日销售额</div>
            <div className="kpi-value sales-value">{currentSale ? `$${(currentSale.revenueCents / 100).toLocaleString("en-US")}` : "—"}</div>
            <p>{currentSale ? `${currentSale.units} 件 · ${currentSale.source === "manual" ? "团队已录入" : "Amazon SP-API"}` : "等待首次同步"}</p>
          </article>
        </section>

        <section className="charts-grid">
          <article className="panel visibility-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">关键词可见度</p><h2>自然搜索覆盖趋势</h2></div>
              <div className="metric-inline"><strong>{coveragePercent}%</strong><span className="source-pill">共享数据</span></div>
            </div>
            <div className="waiting-chart">
              <div className="waiting-chart-mark">✓</div>
              <strong>今日关键词排名已完成</strong>
              <p>前 6 页可见 {keywordSummary.ranked} / {keywordSummary.total} 个词；{improvedCount} 个词上升、{declinedCount} 个词下降、{stableCount} 个持平。</p>
            </div>
            <div className="chart-legend">
              <span><i className="legend-line orange" />自然可见度</span>
              <span className="chart-note">每日 09:00 自动生成</span>
            </div>
          </article>

          <article className="panel bsr-panel section-anchor" id="bsr-section">
            <div className="panel-head">
              <div><p className="panel-kicker">BSR 日变化</p><h2>类目排名趋势</h2></div>
              <div className="panel-actions">
                <button type="button" className="entry-launch" onClick={() => navigateTo("bsr")}>录入 BSR</button>
                <div className="metric-inline align-right"><strong>#{currentBsr}</strong><span className="source-pill">ZIP {currentBsrZip}</span></div>
              </div>
            </div>
            <div className="snapshot-box">
              <span>{currentBsrEntry ? "团队人工修正值" : "今日商品详情已核验"}</span>
              <strong>#{currentBsr}</strong>
              <small>{currentBsrCategory}</small>
              <a href={currentProduct.amazonUrl} target="_blank" rel="noreferrer">查看来源 ↗</a>
            </div>
            <div className="bsr-summary">
              <div><small>当前排名</small><strong>#{currentBsr}</strong></div>
              <div><small>上一有效日</small><strong>#113</strong></div>
              <div><small>变化</small><strong className={bsrDelta > 0 ? "bad" : "good"}>{bsrDelta === 0 ? "— 0" : `${bsrDelta > 0 ? "↓" : "↑"} ${Math.abs(bsrDelta)}`}</strong></div>
            </div>
          </article>

          <article className="panel distribution-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">排名分布</p><h2>关键词位置区间</h2></div>
              <button className="text-btn">查看全部 →</button>
            </div>
            <div className="distribution-list">
              {[
                ["Top 10", keywordSummary.top10, Math.round(keywordSummary.top10 / keywordSummary.total * 100), "coral"],
                ["11 – 48", keywordSummary.rank11to48, Math.round(keywordSummary.rank11to48 / keywordSummary.total * 100), "orange"],
                ["49 – 192", keywordSummary.rank49to192, Math.round(keywordSummary.rank49to192 / keywordSummary.total * 100), "blue"],
                ["193 – 288", keywordSummary.rank193to288, Math.round(keywordSummary.rank193to288 / keywordSummary.total * 100), "slate"],
                ["前6页未找到", keywordSummary.notFound, Math.round(keywordSummary.notFound / keywordSummary.total * 100), "gray"],
              ].map(([label, value, percent, tone]) => (
                <div className="distribution-row" key={label}>
                  <span>{label}</span>
                  <div className="progress"><i className={String(tone)} style={{ width: `${percent}%` }} /></div>
                  <strong>{value}</strong>
                  <small>{percent}%</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel keyword-panel section-anchor" id="keyword-section">
          <div className="panel-head keyword-head">
            <div><p className="panel-kicker">关键词明细</p><h2>{keywordSummary.total} 个启用监控词 · 近 7 天自然排名</h2></div>
            <div className="table-actions">
              <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索关键词" aria-label="搜索关键词" /></div>
              <button className={`filter-btn ${onlyDown ? "selected" : ""}`} onClick={() => setOnlyDown(!onlyDown)}>↓ 仅看下滑</button>
              <button type="button" className="entry-launch" onClick={() => navigateTo("keyword")}>＋ 管理 / 录入关键词</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="keyword-column" rowSpan={2}>关键词</th>
                  <th className="history-heading" colSpan={7}>自然排名 · 近 7 天</th>
                  <th rowSpan={2}>页数</th>
                  <th rowSpan={2}>日变化</th>
                  <th rowSpan={2}>状态</th>
                </tr>
                <tr className="date-heading">
                  {rankingDates.map((date, index) => (
                    <th key={date.key} className={index === rankingDates.length - 1 ? "today-column" : ""}>{date.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.keyword}-${row.product}`}>
                    <td className="keyword-column"><strong>{row.keyword}</strong>{manualEntryMap.has(`${CURRENT_SNAPSHOT_DATE}:${row.productAsin}:${row.keyword}`) && <span className="manual-pill">人工</span>}</td>
                    {rankingDates.map((date, index) => {
                      const rank = displayRankForDate(row, date.key);
                      return (
                        <td key={date.key} className={index === rankingDates.length - 1 ? "today-column" : ""}>
                          <span className={`rank-number ${rank !== null && rank <= 10 ? "top" : ""}`}>{rank === null ? "—" : `#${rank}`}</span>
                        </td>
                      );
                    })}
                    <td><span className="page-number">{pageForRow(row) === null ? "—" : `第 ${pageForRow(row)} 页`}</span></td>
                    <td>{row.change === null ? <span className="waiting-cell">—</span> : <ChangePill value={row.change} />}</td>
                    <td><span className={`status ${row.rank !== null ? "ranked" : "unranked"}`}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && <div className="empty-state">没有符合当前筛选条件的关键词</div>}
          </div>
          <div className="table-footer"><span>显示 {filteredRows.length} / {keywordSummary.total} 个启用监控词</span><button onClick={exportCsv}>导出当前结果 →</button></div>
        </section>

        <footer className="page-footer">
          <span><i className="live-dot" />每个关键词均使用独立无痕会话 · ZIP 90001 · 排除 Sponsored</span>
          <span>每日 09:00（北京时间）自动同步 · 最深检查至第 6 页</span>
        </footer>
      </section>
      <DataEntryDrawer
        key={entryMode ?? "closed"}
        mode={entryMode}
        defaultDate={CURRENT_SNAPSHOT_DATE}
        product={currentProduct}
        products={sharedData?.products ?? activeProducts}
        monitoredKeywords={sharedData?.monitoredKeywords ?? keywordRows.map((row, index) => ({ id: index + 1, productAsin: row.productAsin, keyword: row.keyword, source: row.source, isActive: true }))}
        onClose={() => setEntryMode(null)}
        onSaved={handleSaved}
      />
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

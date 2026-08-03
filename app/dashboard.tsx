"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataEntryDrawer, { type EntryMode } from "./data-entry-drawer";
import { DEFAULT_PRODUCT } from "../lib/monitoring-config";

type KeywordRow = {
  keyword: string;
  product: string;
  rank: number | null;
  change: number | null;
  status: string;
  source: "保留排名词" | "图片新增词" | "优化长尾词";
};

type ManualKeywordEntry = {
  snapshotDate: string;
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

type SharedProduct = {
  name: string;
  asin: string;
  market: string;
  zip: string;
  amazonUrl: string;
};

type SharedMonitoringData = {
  user: { email: string };
  keywordEntries: ManualKeywordEntry[];
  bsrEntries: ManualBsrEntry[];
  products: SharedProduct[];
};

type NavSection = "overview" | "keyword" | "bsr" | "product";

const INTERNAL_DASHBOARD_URL = "https://northstar-amazon-us.fysong0423.chatgpt.site";
const CURRENT_SNAPSHOT_DATE = "2026-08-03";

const keywordRows: KeywordRow[] = [
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
];

const rankingDates = [
  { key: "2026-07-28", label: "07/28" },
  { key: "2026-07-29", label: "07/29" },
  { key: "2026-07-30", label: "07/30" },
  { key: "2026-07-31", label: "07/31" },
  { key: "2026-08-01", label: "08/01" },
  { key: "2026-08-02", label: "08/02" },
  { key: "2026-08-03", label: "08/03" },
] as const;

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
  if (date === "2026-08-03") return row.rank;
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
  const [lastUpdated] = useState("2026-08-03 10:03 CST");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [sharedData, setSharedData] = useState<SharedMonitoringData | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [publicCopy, setPublicCopy] = useState(false);

  const reloadSharedData = useCallback(async () => {
    if (window.location.hostname.endsWith("github.io")) {
      setPublicCopy(true);
      setCanEdit(false);
      return;
    }

    try {
      const response = await fetch("/api/monitoring", { headers: { accept: "application/json" } });
      if (!response.ok) {
        setCanEdit(false);
        return;
      }
      const data = (await response.json()) as SharedMonitoringData;
      setSharedData(data);
      setCanEdit(true);

      const requestedEntry = new URL(window.location.href).searchParams.get("entry");
      if (requestedEntry === "keyword" || requestedEntry === "bsr" || requestedEntry === "product") {
        setActiveSection(requestedEntry);
        setEntryMode(requestedEntry);
      }
    } catch {
      setCanEdit(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reloadSharedData(), 0);
    return () => window.clearTimeout(timer);
  }, [reloadSharedData]);

  const manualEntryMap = useMemo(() => {
    return new Map(
      (sharedData?.keywordEntries ?? []).map((entry) => [`${entry.snapshotDate}:${entry.keyword}`, entry]),
    );
  }, [sharedData]);

  const effectiveRows = useMemo(() => {
    return keywordRows.map((row) => {
      const manual = manualEntryMap.get(`${CURRENT_SNAPSHOT_DATE}:${row.keyword}`);
      if (!manual) return row;
      const previousRank = rankHistory["2026-07-30"]?.[row.keyword] ?? null;
      const change = manual.rank !== null && previousRank !== null ? previousRank - manual.rank : null;
      return { ...row, rank: manual.rank, change, status: manual.status };
    });
  }, [manualEntryMap]);

  const keywordSummary = useMemo(() => summarizeKeywords(effectiveRows), [effectiveRows]);
  const coveragePercent = ((keywordSummary.ranked / keywordSummary.total) * 100).toFixed(1);
  const improvedCount = effectiveRows.filter((row) => row.change !== null && row.change > 0).length;
  const declinedCount = effectiveRows.filter((row) => row.change !== null && row.change < 0).length;
  const stableCount = effectiveRows.filter((row) => row.change === 0).length;
  const currentBsrEntry = sharedData?.bsrEntries.find((entry) => entry.snapshotDate === CURRENT_SNAPSHOT_DATE);
  const currentBsr = currentBsrEntry?.bsr ?? 123;
  const currentBsrCategory = currentBsrEntry?.category ?? "Clitoral Vibrators";
  const currentBsrZip = currentBsrEntry?.zip ?? "90001";
  const currentProduct = sharedData?.products[0] ?? DEFAULT_PRODUCT;
  const bsrDelta = currentBsr - 113;
  const bsrChangeText = bsrDelta === 0 ? "与上一有效日持平" : `较上一有效日${bsrDelta > 0 ? "下降" : "上升"} ${Math.abs(bsrDelta)} 位`;

  function displayRankForDate(row: KeywordRow, date: string) {
    const manual = manualEntryMap.get(`${date}:${row.keyword}`);
    return manual ? manual.rank : rankForDate(row, date);
  }

  const filteredRows = useMemo(() => {
    return effectiveRows.filter((row) => {
      const matchesProduct = product === "全部产品" || row.product === product;
      const matchesQuery = row.keyword.toLowerCase().includes(query.toLowerCase());
      const matchesDown = !onlyDown || (row.change !== null && row.change < 0);
      return matchesProduct && matchesQuery && matchesDown;
    });
  }, [effectiveRows, product, query, onlyDown]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
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

  function syncNow() {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      showToast("当前页面已是最新采集快照");
    }, 900);
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
          <p>{canEdit ? `当前账号：${sharedData?.user.email ?? "已登录"}` : publicCopy ? "公开看板为只读，点击栏目进入内部录入" : "BSR 与 25 个关键词已深度更新"}</p>
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
            <h1>{currentProduct.name} 今日排名已自动更新。</h1>
            <p className="subhead">ASIN {currentProduct.asin} · 25 个固定监控词 · 独立无痕采集至第 6 页 · 自然排名保留最近 7 天。</p>
          </div>
          <div className="top-actions">
            <div className="updated"><span className="live-dot" />数据快照：{lastUpdated}</div>
            <button className="secondary-btn" onClick={exportCsv}>导出报表</button>
            <button className="primary-btn" onClick={syncNow} disabled={syncing}>
              <span className={syncing ? "spin" : ""}>↻</span>{syncing ? "检查中" : "检查快照"}
            </button>
          </div>
        </header>

        <div className="control-strip section-anchor" id="product-section">
          <div className="select-wrap">
            <label htmlFor="product">产品</label>
            <select id="product" value={product} onChange={(event) => setProduct(event.target.value)}>
              <option>全部产品</option>
              <option value="TUATIMAR S10">{currentProduct.name}</option>
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
          <button type="button" className="entry-launch compact" onClick={() => navigateTo("product")}>录入产品资料</button>
          <a className="product-link" href={currentProduct.amazonUrl} target="_blank" rel="noreferrer">
            查看 Amazon 商品页 ↗
          </a>
        </div>

        <section className="today-snapshot" aria-label="今日采集结果">
          <div className="snapshot-lead">
            <span className="snapshot-check">✓</span>
            <div><p>90001 地区数据已采集</p><strong>2026-08-03 10:03 CST</strong></div>
          </div>
          <div className="snapshot-stat">
            <small>BSR</small><strong>#{currentBsr}</strong><span>{currentBsrCategory} · {bsrChangeText}</span>
          </div>
          <div className="snapshot-stat">
            <small>月度购买信号</small><strong>50+</strong><span>bought in past month</span>
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
            <div className="kpi-foot"><span className="configured-pill">固定词库 · 近 7 天留存</span></div>
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
            <div><p className="panel-kicker">关键词明细</p><h2>25 个监控词 · 近 7 天自然排名</h2></div>
            <div className="table-actions">
              <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索关键词" aria-label="搜索关键词" /></div>
              <button className={`filter-btn ${onlyDown ? "selected" : ""}`} onClick={() => setOnlyDown(!onlyDown)}>↓ 仅看下滑</button>
              <button type="button" className="entry-launch" onClick={() => navigateTo("keyword")}>＋ 录入排名</button>
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
                    <td className="keyword-column"><strong>{row.keyword}</strong>{manualEntryMap.has(`${CURRENT_SNAPSHOT_DATE}:${row.keyword}`) && <span className="manual-pill">人工</span>}</td>
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
          <div className="table-footer"><span>显示 {filteredRows.length} / 25 个监控词</span><button onClick={exportCsv}>导出当前结果 →</button></div>
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
        onClose={() => setEntryMode(null)}
        onSaved={handleSaved}
      />
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

type KeywordRow = {
  keyword: string;
  product: string;
  rank: number | null;
  change: number | null;
  status: string;
  source: "保留排名词" | "图片新增词" | "优化长尾词";
};

const keywordRows: KeywordRow[] = [
  { keyword: "rose toy", product: "TUATIMAR S10", rank: 32, change: -2, status: "第1页有排名", source: "保留排名词" },
  { keyword: "rose sex toy", product: "TUATIMAR S10", rank: 66, change: 4, status: "第2页有排名", source: "保留排名词" },
  { keyword: "tongue licking vibrator", product: "TUATIMAR S10", rank: 73, change: -1, status: "第2页有排名", source: "保留排名词" },
  { keyword: "clitoral suction vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "保留排名词" },
  { keyword: "sexual wellness vibrator", product: "TUATIMAR S10", rank: 192, change: -5, status: "第4页有排名", source: "保留排名词" },
  { keyword: "tongue toy for women", product: "TUATIMAR S10", rank: 99, change: -8, status: "第3页有排名", source: "图片新增词" },
  { keyword: "tongue vibrator", product: "TUATIMAR S10", rank: 149, change: 7, status: "第4页有排名", source: "图片新增词" },
  { keyword: "rose adult toy", product: "TUATIMAR S10", rank: 20, change: 0, status: "第1页有排名", source: "图片新增词" },
  { keyword: "sucking vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "图片新增词" },
  { keyword: "vibrator rose", product: "TUATIMAR S10", rank: 66, change: 5, status: "第2页有排名", source: "图片新增词" },
  { keyword: "tongue sex toy", product: "TUATIMAR S10", rank: 95, change: -7, status: "第2页有排名", source: "图片新增词" },
  { keyword: "sex rose", product: "TUATIMAR S10", rank: 18, change: 0, status: "第1页有排名", source: "图片新增词" },
  { keyword: "rose sex toys", product: "TUATIMAR S10", rank: 52, change: 18, status: "第2页有排名", source: "图片新增词" },
  { keyword: "adult toy rose", product: "TUATIMAR S10", rank: 13, change: 1, status: "第1页有排名", source: "图片新增词" },
  { keyword: "rose sex", product: "TUATIMAR S10", rank: 23, change: 2, status: "第1页有排名", source: "图片新增词" },
  { keyword: "tongue vibrator for women", product: "TUATIMAR S10", rank: 82, change: -7, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "tongue licking toy for women", product: "TUATIMAR S10", rank: 50, change: 0, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "rose tongue vibrator", product: "TUATIMAR S10", rank: 17, change: 1, status: "第1页有排名", source: "优化长尾词" },
  { keyword: "rose tongue toy", product: "TUATIMAR S10", rank: 25, change: -1, status: "第1页有排名", source: "优化长尾词" },
  { keyword: "licking vibrator for women", product: "TUATIMAR S10", rank: 45, change: 9, status: "第1页有排名", source: "优化长尾词" },
  { keyword: "oral tongue vibrator", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "rose vibrator for women", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "clitoral tongue vibrator", product: "TUATIMAR S10", rank: 68, change: 6, status: "第2页有排名", source: "优化长尾词" },
  { keyword: "tongue massager for women", product: "TUATIMAR S10", rank: null, change: null, status: "前6页未找到", source: "优化长尾词" },
  { keyword: "rose clitoral toy", product: "TUATIMAR S10", rank: 37, change: -2, status: "第1页有排名", source: "优化长尾词" },
];

const rankingDates = [
  { key: "2026-07-24", label: "07/24" },
  { key: "2026-07-25", label: "07/25" },
  { key: "2026-07-26", label: "07/26" },
  { key: "2026-07-27", label: "07/27" },
  { key: "2026-07-28", label: "07/28" },
  { key: "2026-07-29", label: "07/29" },
  { key: "2026-07-30", label: "07/30" },
] as const;

const previousRanks: Record<string, number | null> = {
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
};

function rankForDate(row: KeywordRow, date: string) {
  if (date === "2026-07-30") return row.rank;
  if (date === "2026-07-29") return previousRanks[row.keyword] ?? null;
  return null;
}

function pageForRow(row: KeywordRow) {
  const match = row.status.match(/^第(\d+)页/);
  return match ? Number(match[1]) : null;
}

const keywordSummary = {
  total: keywordRows.length,
  ranked: keywordRows.filter((row) => row.rank !== null).length,
  top10: keywordRows.filter((row) => row.rank !== null && row.rank <= 10).length,
  rank11to48: keywordRows.filter((row) => row.rank !== null && row.rank >= 11 && row.rank <= 48).length,
  rank49to192: keywordRows.filter((row) => row.rank !== null && row.rank >= 49 && row.rank <= 192).length,
  notFound: keywordRows.filter((row) => row.rank === null).length,
};

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
  const [lastUpdated] = useState("2026-07-30 09:17 CST");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  const filteredRows = useMemo(() => {
    return keywordRows.filter((row) => {
      const matchesProduct = product === "全部产品" || row.product === product;
      const matchesQuery = row.keyword.toLowerCase().includes(query.toLowerCase());
      const matchesDown = !onlyDown || (row.change !== null && row.change < 0);
      return matchesProduct && matchesQuery && matchesDown;
    });
  }, [product, query, onlyDown]);

  function syncNow() {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      setToast("当前页面已是最新采集快照");
      window.setTimeout(() => setToast(""), 2600);
    }, 900);
  }

  function exportCsv() {
    const header = ["关键词", ...rankingDates.map((date) => `${date.key}自然排名`), "页数", "日变化", "状态"];
    const lines = filteredRows.map((row) => [
      row.keyword,
      ...rankingDates.map((date) => rankForDate(row, date.key) ?? ""),
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
    setToast("关键词报表已导出");
    window.setTimeout(() => setToast(""), 2600);
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
          <button className="nav-item active"><span>⌁</span>每日概览</button>
          <button className="nav-item"><span>⌕</span>关键词监控</button>
          <button className="nav-item"><span>↗</span>BSR 趋势</button>
          <button className="nav-item"><span>□</span>产品管理</button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sync-card">
          <div className="sync-card-head">
            <span className="live-dot" />
            Amazon 排名已同步
          </div>
          <p>BSR 与 25 个关键词已深度更新</p>
          <div className="sync-track"><span style={{ width: "100%" }} /></div>
          <small>独立无痕会话 · ZIP 90001</small>
        </div>
        <button className="nav-item settings"><span>⚙</span>数据源设置</button>
        <div className="user-card">
          <div className="avatar">YS</div>
          <div><strong>运营团队</strong><small>Amazon US</small></div>
          <span className="user-more">···</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">AMAZON US · 每日监控</p>
            <h1>TUATIMAR S10 今日排名已自动更新。</h1>
            <p className="subhead">ASIN B0GGTPHQZK · 25 个固定监控词 · 独立无痕采集至第 6 页 · 自然排名保留最近 7 天。</p>
          </div>
          <div className="top-actions">
            <div className="updated"><span className="live-dot" />数据快照：{lastUpdated}</div>
            <button className="secondary-btn" onClick={exportCsv}>导出报表</button>
            <button className="primary-btn" onClick={syncNow} disabled={syncing}>
              <span className={syncing ? "spin" : ""}>↻</span>{syncing ? "检查中" : "检查快照"}
            </button>
          </div>
        </header>

        <div className="control-strip">
          <div className="select-wrap">
            <label htmlFor="product">产品</label>
            <select id="product" value={product} onChange={(event) => setProduct(event.target.value)}>
              <option>全部产品</option>
              <option>TUATIMAR S10</option>
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
          <a className="product-link" href="https://www.amazon.com/dp/B0GGTPHQZK" target="_blank" rel="noreferrer">
            查看 Amazon 商品页 ↗
          </a>
        </div>

        <section className="today-snapshot" aria-label="今日采集结果">
          <div className="snapshot-lead">
            <span className="snapshot-check">✓</span>
            <div><p>90001 地区数据已采集</p><strong>2026-07-30 09:17 CST</strong></div>
          </div>
          <div className="snapshot-stat">
            <small>BSR</small><strong>#113</strong><span>Clitoral Vibrators · 日降 8 位</span>
          </div>
          <div className="snapshot-stat">
            <small>月度购买信号</small><strong>50+</strong><span>bought in past month</span>
          </div>
          <div className="snapshot-stat">
            <small>采集地区</small><strong>90001</strong><span>Los Angeles · Amazon US</span>
          </div>
          <div className="snapshot-stat">
            <small>前 6 页有自然排名</small><strong>20 / 25</strong><span>今日覆盖率 80.0%</span>
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
            <p>占总词数 80.0%</p>
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
            <p>9 个词进入搜索首页</p>
          </article>
          <article className="kpi-card">
            <div className="kpi-top"><span className="kpi-icon blue">49</span><span className="source-pill">第 2–4 页</span></div>
            <div className="kpi-label">第 49–192 位</div>
            <div className="kpi-value">{keywordSummary.rank49to192}</div>
            <p>第 2–4 页共 11 个词</p>
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
            <div className="kpi-value">#113</div>
            <p>较昨日 #105 下降 8 位</p>
          </article>
        </section>

        <section className="charts-grid">
          <article className="panel visibility-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">关键词可见度</p><h2>自然搜索覆盖趋势</h2></div>
              <div className="metric-inline"><strong>80.0%</strong><span className="waiting-pill">日降 4.0%</span></div>
            </div>
            <div className="waiting-chart">
              <div className="waiting-chart-mark">✓</div>
              <strong>今日关键词排名已完成</strong>
              <p>前 6 页可见 20 / 25 个词；9 个词上升、8 个词下降。</p>
            </div>
            <div className="chart-legend">
              <span><i className="legend-line orange" />自然可见度</span>
              <span className="chart-note">每日 09:00 自动生成</span>
            </div>
          </article>

          <article className="panel bsr-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">BSR 日变化</p><h2>类目排名趋势</h2></div>
              <div className="metric-inline align-right"><strong>#113</strong><span className="source-pill">ZIP 90001</span></div>
            </div>
            <div className="snapshot-box">
              <span>今日商品详情已核验</span>
              <strong>#113</strong>
              <small>Clitoral Vibrators</small>
              <a href="https://www.amazon.com/dp/B0GGTPHQZK" target="_blank" rel="noreferrer">查看来源 ↗</a>
            </div>
            <div className="bsr-summary">
              <div><small>当前排名</small><strong>#113</strong></div>
              <div><small>昨日排名</small><strong>#105</strong></div>
              <div><small>日变化</small><strong className="bad">↓ 8</strong></div>
            </div>
          </article>

          <article className="panel distribution-panel">
            <div className="panel-head">
              <div><p className="panel-kicker">排名分布</p><h2>关键词位置区间</h2></div>
              <button className="text-btn">查看全部 →</button>
            </div>
            <div className="distribution-list">
              {[
                ["Top 10", 0, 0, "coral"],
                ["11 – 48", 9, 36, "orange"],
                ["49 – 96", 8, 32, "blue"],
                ["97 – 192", 3, 12, "slate"],
                ["前6页未找到", 5, 20, "gray"],
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

        <section className="panel keyword-panel">
          <div className="panel-head keyword-head">
            <div><p className="panel-kicker">关键词明细</p><h2>25 个监控词 · 近 7 天自然排名</h2></div>
            <div className="table-actions">
              <div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索关键词" aria-label="搜索关键词" /></div>
              <button className={`filter-btn ${onlyDown ? "selected" : ""}`} onClick={() => setOnlyDown(!onlyDown)}>↓ 仅看下滑</button>
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
                    <td className="keyword-column"><strong>{row.keyword}</strong></td>
                    {rankingDates.map((date, index) => {
                      const rank = rankForDate(row, date.key);
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
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

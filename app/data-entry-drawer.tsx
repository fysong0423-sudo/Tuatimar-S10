"use client";

import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_PRODUCT, MONITORED_KEYWORDS } from "../lib/monitoring-config";

export type EntryMode = "keyword" | "bsr" | "product";

type ProductForm = {
  name: string;
  asin: string;
  market: string;
  zip: string;
  amazonUrl: string;
};

type DataEntryDrawerProps = {
  mode: EntryMode | null;
  defaultDate: string;
  product: ProductForm;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

const titles: Record<EntryMode, { kicker: string; title: string; description: string }> = {
  keyword: {
    kicker: "关键词监控",
    title: "录入自然排名",
    description: "录入或修正指定日期的自然位。广告位不得填写。",
  },
  bsr: {
    kicker: "BSR 趋势",
    title: "录入类目排名",
    description: "仅填写 Product details 中同一 ASIN 的 Best Sellers Rank。",
  },
  product: {
    kicker: "产品管理",
    title: "维护监控产品",
    description: "更新团队共享的产品名称、ASIN、站点和商品链接。",
  },
};

export default function DataEntryDrawer({ mode, defaultDate, product, onClose, onSaved }: DataEntryDrawerProps) {
  const [snapshotDate, setSnapshotDate] = useState(defaultDate);
  const [keyword, setKeyword] = useState<string>(MONITORED_KEYWORDS[0]);
  const [rank, setRank] = useState("");
  const [page, setPage] = useState("1");
  const [notFound, setNotFound] = useState(false);
  const [bsr, setBsr] = useState("");
  const [category, setCategory] = useState("Clitoral Vibrators");
  const [zip, setZip] = useState("90001");
  const [productForm, setProductForm] = useState<ProductForm>(product);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mode) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mode, onClose]);

  if (!mode) return null;

  async function submit(payload: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "保存失败，请稍后重试。");
      await onSaved(successMessage);
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  function submitKeyword(event: FormEvent) {
    event.preventDefault();
    return submit(
      {
        action: "keyword",
        snapshotDate,
        keyword,
        rank: rank ? Number(rank) : null,
        page: page ? Number(page) : null,
        notFound,
      },
      `${keyword} 的自然排名已保存`,
    );
  }

  function submitBsr(event: FormEvent) {
    event.preventDefault();
    return submit(
      { action: "bsr", snapshotDate, bsr: Number(bsr), category, zip },
      `${snapshotDate} 的 BSR 已保存`,
    );
  }

  function submitProduct(event: FormEvent) {
    event.preventDefault();
    return submit({ action: "product", ...productForm }, "产品资料已保存");
  }

  const title = titles[mode];

  return (
    <div className="entry-overlay" role="presentation">
      <section className="entry-drawer" role="dialog" aria-modal="true" aria-labelledby="entry-title">
        <div className="entry-head">
          <div>
            <p className="panel-kicker">{title.kicker}</p>
            <h2 id="entry-title">{title.title}</h2>
            <p>{title.description}</p>
          </div>
          <button type="button" className="entry-close" onClick={onClose} aria-label="关闭录入面板">×</button>
        </div>

        {mode === "keyword" && (
          <form className="entry-form" onSubmit={submitKeyword}>
            <label>数据日期<input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required /></label>
            <label>关键词
              <select value={keyword} onChange={(event) => setKeyword(event.target.value)}>
                {MONITORED_KEYWORDS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="entry-grid">
              <label>自然排名<input type="number" min="1" max="288" value={rank} onChange={(event) => setRank(event.target.value)} disabled={notFound} required={!notFound} placeholder="1–288" /></label>
              <label>命中页数<select value={page} onChange={(event) => setPage(event.target.value)} disabled={notFound}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>第 {item} 页</option>)}</select></label>
            </div>
            <label className="entry-check"><input type="checkbox" checked={notFound} onChange={(event) => setNotFound(event.target.checked)} />前6页未找到</label>
            <p className="entry-hint">保存后覆盖该关键词在对应日期的自动采集值，并记录录入账号与时间。</p>
            {error && <p className="entry-error" role="alert">{error}</p>}
            <button className="entry-submit" disabled={saving}>{saving ? "保存中…" : "保存关键词排名"}</button>
          </form>
        )}

        {mode === "bsr" && (
          <form className="entry-form" onSubmit={submitBsr}>
            <label>数据日期<input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required /></label>
            <label>Best Sellers Rank<input type="number" min="1" value={bsr} onChange={(event) => setBsr(event.target.value)} required placeholder="例如 123" /></label>
            <label>类目<input value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
            <label>配送邮编<input value={zip} onChange={(event) => setZip(event.target.value)} inputMode="numeric" pattern="90001" required /></label>
            <p className="entry-hint">地区固定为90001；人工值会标记为团队修正数据。</p>
            {error && <p className="entry-error" role="alert">{error}</p>}
            <button className="entry-submit" disabled={saving}>{saving ? "保存中…" : "保存 BSR"}</button>
          </form>
        )}

        {mode === "product" && (
          <form className="entry-form" onSubmit={submitProduct}>
            <label>产品名称<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /></label>
            <label>ASIN<input value={productForm.asin} onChange={(event) => setProductForm({ ...productForm, asin: event.target.value.toUpperCase() })} minLength={10} maxLength={10} required /></label>
            <label>站点<input value={productForm.market} onChange={(event) => setProductForm({ ...productForm, market: event.target.value })} required /></label>
            <label>配送邮编<input value={productForm.zip} onChange={(event) => setProductForm({ ...productForm, zip: event.target.value })} inputMode="numeric" pattern="90001" required /></label>
            <label>Amazon商品链接<input type="url" value={productForm.amazonUrl} onChange={(event) => setProductForm({ ...productForm, amazonUrl: event.target.value })} required /></label>
            <p className="entry-hint">当前采集脚本仍固定监控 ASIN {DEFAULT_PRODUCT.asin}；修改ASIN后需要同步调整后台采集任务。</p>
            {error && <p className="entry-error" role="alert">{error}</p>}
            <button className="entry-submit" disabled={saving}>{saving ? "保存中…" : "保存产品资料"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

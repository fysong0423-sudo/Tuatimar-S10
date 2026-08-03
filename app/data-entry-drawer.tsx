"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export type EntryMode = "keyword" | "bsr" | "product" | "sales";

export type ManagedProduct = {
  id?: number;
  name: string;
  asin: string;
  market: string;
  zip: string;
  amazonUrl: string;
  isActive?: boolean;
};

export type ManagedKeyword = {
  id: number;
  productAsin: string;
  keyword: string;
  source: string;
  isActive: boolean;
};

type DataEntryDrawerProps = {
  mode: EntryMode | null;
  defaultDate: string;
  product: ManagedProduct;
  products: ManagedProduct[];
  monitoredKeywords: ManagedKeyword[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

const titles: Record<EntryMode, { kicker: string; title: string; description: string }> = {
  keyword: { kicker: "关键词监控", title: "录入与管理关键词", description: "新增、停用监控词，或录入指定日期的自然排名。" },
  bsr: { kicker: "BSR 趋势", title: "录入类目排名", description: "仅填写 Product details 中同一 ASIN 的 Best Sellers Rank。" },
  product: { kicker: "产品管理", title: "管理监控产品", description: "新增、维护、停用或恢复团队共享的监控产品。" },
  sales: { kicker: "销售数据", title: "录入日销售额", description: "按产品和日期维护销售额与销量；可被 SP-API 数据替换。" },
};

const emptyProduct: ManagedProduct = { name: "", asin: "", market: "Amazon US", zip: "90001", amazonUrl: "", isActive: true };

export default function DataEntryDrawer({ mode, defaultDate, product, products, monitoredKeywords, onClose, onSaved }: DataEntryDrawerProps) {
  const activeProducts = useMemo(() => products.filter((item) => item.isActive !== false), [products]);
  const [snapshotDate, setSnapshotDate] = useState(defaultDate);
  const [selectedAsin, setSelectedAsin] = useState(product.asin);
  const [keyword, setKeyword] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [rank, setRank] = useState("");
  const [page, setPage] = useState("1");
  const [notFound, setNotFound] = useState(false);
  const [bsr, setBsr] = useState("");
  const [category, setCategory] = useState("Clitoral Vibrators");
  const [zip, setZip] = useState("90001");
  const [productForm, setProductForm] = useState<ManagedProduct>(product);
  const [salesRevenue, setSalesRevenue] = useState("");
  const [salesUnits, setSalesUnits] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeKeywords = useMemo(
    () => monitoredKeywords.filter((item) => item.productAsin === selectedAsin && item.isActive),
    [monitoredKeywords, selectedAsin],
  );
  const selectedKeyword = activeKeywords.some((item) => item.keyword === keyword) ? keyword : activeKeywords[0]?.keyword ?? "";

  useEffect(() => {
    if (!mode) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mode, onClose]);

  if (!mode) return null;

  async function submit(payload: Record<string, unknown>, successMessage: string, closeAfter = true) {
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
      if (closeAfter) onClose();
      return true;
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "保存失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function submitKeywordRank(event: FormEvent) {
    event.preventDefault();
    return submit({ action: "keyword", snapshotDate, productAsin: selectedAsin, keyword: selectedKeyword, rank: rank ? Number(rank) : null, page: page ? Number(page) : null, notFound }, `${selectedKeyword} 的自然排名已保存`);
  }

  async function addKeyword(event: FormEvent) {
    event.preventDefault();
    const saved = await submit({ action: "keyword_add", productAsin: selectedAsin, keyword: newKeyword }, `${newKeyword.trim()} 已加入监控`, false);
    if (saved) setNewKeyword("");
  }

  function toggleKeyword(item: ManagedKeyword) {
    return submit({ action: "keyword_toggle", id: item.id, isActive: !item.isActive }, `${item.keyword} 已${item.isActive ? "停用" : "恢复"}`, false);
  }

  function submitBsr(event: FormEvent) {
    event.preventDefault();
    return submit({ action: "bsr", snapshotDate, productAsin: selectedAsin, bsr: Number(bsr), category, zip }, `${snapshotDate} 的 BSR 已保存`);
  }

  function submitProduct(event: FormEvent) {
    event.preventDefault();
    return submit({ action: "product", ...productForm }, `${productForm.name} 已保存`, false);
  }

  function toggleProduct(item: ManagedProduct) {
    return submit({ action: "product_toggle", id: item.id, isActive: item.isActive === false }, `${item.name} 已${item.isActive === false ? "恢复" : "停用"}`, false);
  }

  function submitSales(event: FormEvent) {
    event.preventDefault();
    const revenueCents = Math.round(Number(salesRevenue) * 100);
    return submit({ action: "sales", salesDate: snapshotDate, productAsin: selectedAsin, units: Number(salesUnits), revenueCents }, `${snapshotDate} 的销售额已保存`);
  }

  const title = titles[mode];
  const productOptions = activeProducts.length ? activeProducts : [product];

  return (
    <div className="entry-overlay" role="presentation">
      <section className="entry-drawer" role="dialog" aria-modal="true" aria-labelledby="entry-title">
        <div className="entry-head">
          <div><p className="panel-kicker">{title.kicker}</p><h2 id="entry-title">{title.title}</h2><p>{title.description}</p></div>
          <button type="button" className="entry-close" onClick={onClose} aria-label="关闭录入面板">×</button>
        </div>

        {(mode === "keyword" || mode === "bsr" || mode === "sales") && (
          <label className="drawer-product-select">当前产品
            <select value={selectedAsin} onChange={(event) => setSelectedAsin(event.target.value)}>
              {productOptions.map((item) => <option key={item.asin} value={item.asin}>{item.name} · {item.asin}</option>)}
            </select>
          </label>
        )}

        {mode === "keyword" && (
          <>
            <form className="entry-form compact-form" onSubmit={addKeyword}>
              <div className="entry-section-title"><strong>监控词库</strong><span>{activeKeywords.length} 个启用词</span></div>
              <div className="inline-entry"><input value={newKeyword} onChange={(event) => setNewKeyword(event.target.value)} placeholder="输入新关键词" minLength={2} required /><button disabled={saving}>＋ 添加</button></div>
            </form>
            <div className="management-list" aria-label="关键词列表">
              {monitoredKeywords.filter((item) => item.productAsin === selectedAsin).map((item) => (
                <div className={`management-row ${item.isActive ? "" : "inactive"}`} key={item.id}>
                  <div><strong>{item.keyword}</strong><small>{item.isActive ? "监控中" : "已停用"}</small></div>
                  <button type="button" onClick={() => void toggleKeyword(item)} disabled={saving}>{item.isActive ? "停用" : "恢复"}</button>
                </div>
              ))}
            </div>
            <form className="entry-form divided-form" onSubmit={submitKeywordRank}>
              <div className="entry-section-title"><strong>录入自然排名</strong><span>排除 Sponsored</span></div>
              <label>数据日期<input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required /></label>
              <label>关键词<select value={selectedKeyword} onChange={(event) => setKeyword(event.target.value)} required>{activeKeywords.map((item) => <option key={item.id}>{item.keyword}</option>)}</select></label>
              <div className="entry-grid">
                <label>自然排名<input type="number" min="1" max="288" value={rank} onChange={(event) => setRank(event.target.value)} disabled={notFound} required={!notFound} placeholder="1–288" /></label>
                <label>命中页数<select value={page} onChange={(event) => setPage(event.target.value)} disabled={notFound}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>第 {item} 页</option>)}</select></label>
              </div>
              <label className="entry-check"><input type="checkbox" checked={notFound} onChange={(event) => setNotFound(event.target.checked)} />前6页未找到</label>
              {error && <p className="entry-error" role="alert">{error}</p>}
              <button className="entry-submit" disabled={saving || !selectedKeyword}>{saving ? "保存中…" : "保存关键词排名"}</button>
            </form>
          </>
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
          <>
            <div className="entry-toolbar"><strong>产品列表</strong><button type="button" onClick={() => setProductForm(emptyProduct)}>＋ 新增产品</button></div>
            <div className="management-list product-list">
              {products.map((item) => (
                <div className={`management-row ${item.isActive === false ? "inactive" : ""}`} key={item.asin}>
                  <button className="management-main" type="button" onClick={() => setProductForm(item)}><strong>{item.name}</strong><small>{item.asin} · {item.isActive === false ? "已停用" : "监控中"}</small></button>
                  <button type="button" onClick={() => void toggleProduct(item)} disabled={saving}>{item.isActive === false ? "恢复" : "停用"}</button>
                </div>
              ))}
            </div>
            <form className="entry-form divided-form" onSubmit={submitProduct}>
              <div className="entry-section-title"><strong>{productForm.id ? "编辑产品" : "新增产品"}</strong><span>ZIP 固定 90001</span></div>
              <label>产品名称<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /></label>
              <label>ASIN<input value={productForm.asin} onChange={(event) => setProductForm({ ...productForm, asin: event.target.value.toUpperCase() })} minLength={10} maxLength={10} required /></label>
              <label>站点<input value={productForm.market} onChange={(event) => setProductForm({ ...productForm, market: event.target.value })} required /></label>
              <label>配送邮编<input value={productForm.zip} onChange={(event) => setProductForm({ ...productForm, zip: event.target.value })} inputMode="numeric" pattern="90001" required /></label>
              <label>Amazon商品链接<input type="url" value={productForm.amazonUrl} onChange={(event) => setProductForm({ ...productForm, amazonUrl: event.target.value })} required /></label>
              <p className="entry-hint">停用产品不会删除其历史排名和销售额。新增产品后，请为它添加监控关键词。</p>
              {error && <p className="entry-error" role="alert">{error}</p>}
              <button className="entry-submit" disabled={saving}>{saving ? "保存中…" : "保存产品"}</button>
            </form>
          </>
        )}

        {mode === "sales" && (
          <form className="entry-form" onSubmit={submitSales}>
            <label>销售日期<input type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required /></label>
            <label>日销售额（USD）<input type="number" min="0" step="0.01" value={salesRevenue} onChange={(event) => setSalesRevenue(event.target.value)} required placeholder="0.00" /></label>
            <label>销量（件）<input type="number" min="0" step="1" value={salesUnits} onChange={(event) => setSalesUnits(event.target.value)} required placeholder="0" /></label>
            <p className="entry-hint">商品公开页面无法读取准确销售额。当前先由团队录入；接入 Amazon SP-API 后可改为自动同步。</p>
            {error && <p className="entry-error" role="alert">{error}</p>}
            <button className="entry-submit" disabled={saving}>{saving ? "保存中…" : "保存日销售数据"}</button>
          </form>
        )}
      </section>
    </div>
  );
}

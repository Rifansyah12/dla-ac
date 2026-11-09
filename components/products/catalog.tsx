"use client";

import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { statusLabels, unitKinds, type Lot } from "@/lib/lots";
import { ProductCard } from "./product-card";

type Filters = { query: string; kind: string; brand: string; status: string; sort: string };
const empty: Filters = { query: "", kind: "", brand: "", status: "", sort: "awal" };

function FilterFields({ filters, update, reset, brands, prefix }: { filters: Filters; update: (field: keyof Filters, value: string) => void; reset: () => void; brands: string[]; prefix: string }) {
  return <div className="filter-panel"><div className="filter-heading"><strong>Filter katalog</strong><button type="button" onClick={reset}>Atur ulang</button></div><label htmlFor={`${prefix}-kind`}>Jenis unit</label><select id={`${prefix}-kind`} value={filters.kind} onChange={(event) => update("kind", event.target.value)}><option value="">Semua jenis</option>{unitKinds.map((kind) => <option key={kind}>{kind}</option>)}</select><label htmlFor={`${prefix}-brand`}>Merek</label><select id={`${prefix}-brand`} value={filters.brand} onChange={(event) => update("brand", event.target.value)}><option value="">Semua merek</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select><label htmlFor={`${prefix}-status`}>Status</label><select id={`${prefix}-status`} value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><div className="filter-hint">Jumlah, kondisi, dan harga ditampilkan jika sudah diisi oleh pemilik usaha.</div></div>;
}

export function Catalog({ lots, initialQuery }: { lots: Lot[]; initialQuery: string }) {
  const [filters, setFilters] = useState<Filters>({ ...empty, query: initialQuery });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setDrawerOpen(false), []);
  const brands = useMemo(() => Array.from(new Set(lots.flatMap((lot) => lot.brand.split(",").map((item) => item.trim()).filter(Boolean)))).sort(), [lots]);
  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const result = lots.filter((lot) => `${lot.title} ${lot.brand} ${lot.kind} ${lot.code} ${lot.capacity}`.toLowerCase().includes(query) && (!filters.kind || lot.kind === filters.kind) && (!filters.brand || lot.brand.split(",").map((item) => item.trim()).includes(filters.brand)) && (!filters.status || lot.status === filters.status));
    if (filters.sort === "nama") result.sort((a, b) => a.title.localeCompare(b.title, "id"));
    if (filters.sort === "harga") result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return result;
  }, [filters, lots]);
  const update = useCallback((field: keyof Filters, value: string) => setFilters((current) => ({ ...current, [field]: value })), []);
  const reset = useCallback(() => setFilters(empty), []);
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const nodes = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, a[href]'));
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, [drawerOpen, close]);
  return <main className="catalog-page" id="konten"><div className="catalog-intro"><div className="shell"><div className="breadcrumb">BERANDA <span>/</span> STOK AC</div><div className="catalog-title-row"><div><div className="eyebrow">KATALOG / AC BORONGAN</div><h1>Dokumentasi unit.<br /><em>Detail yang terbuka.</em></h1></div><p>Jelajahi dokumentasi unit AC dan hubungi kami untuk informasi harga serta ketersediaan.</p></div></div></div><div className="catalog-layout shell"><aside className="catalog-sidebar"><FilterFields filters={filters} update={update} reset={reset} brands={brands} prefix="desktop" /></aside><div className="catalog-results"><div className="catalog-toolbar"><label className="catalog-search"><Search size={18} /><span className="sr-only">Cari stok</span><input type="search" placeholder="Cari merek, jenis, atau kode..." value={filters.query} onChange={(event) => update("query", event.target.value)} /></label><button className="mobile-filter-button" type="button" onClick={() => setDrawerOpen(true)}><SlidersHorizontal size={17} /> Filter</button><label className="sort-control"><span>Urutkan</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="awal">Pilihan awal</option><option value="nama">Nama A–Z</option><option value="harga">Harga terendah</option></select></label></div><div className="results-meta" aria-live="polite"><span>Menampilkan <strong>{filtered.length}</strong> dokumentasi / lot</span><span>FOTO DOKUMENTASI</span></div>{filtered.length ? <div className="catalog-grid">{filtered.map((lot) => <ProductCard key={lot.id} lot={lot} />)}</div> : <div className="empty-state"><Search size={25} /><h2>Tidak ada hasil yang sesuai.</h2><p>Coba kata kunci atau filter lain.</p><button type="button" onClick={reset}>Lihat semua dokumentasi <ArrowRight size={16} /></button></div>}</div></div>
    {drawerOpen && <div className="filter-drawer-layer" onClick={close}><div className="filter-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="filter-title" onClick={(event) => event.stopPropagation()}><div className="filter-drawer-heading"><h2 id="filter-title">Filter katalog</h2><button ref={closeRef} className="icon-button" type="button" aria-label="Tutup filter" onClick={close}><X size={21} /></button></div><div className="filter-drawer-body"><FilterFields filters={filters} update={update} reset={reset} brands={brands} prefix="mobile" /></div><button className="button button-dark filter-apply" type="button" onClick={close}>Lihat {filtered.length} hasil <ArrowRight size={17} /></button></div></div>}
  </main>;
}

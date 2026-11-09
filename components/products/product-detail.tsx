"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ContactButton } from "@/components/contact-button";
import { PhotoPreview } from "@/components/photo-viewer";
import { priceLabel, statusLabels, type Lot } from "@/lib/lots";
import { photoSource } from "@/lib/photos";
import { ProductCard } from "./product-card";

export function ProductDetail({ lot, related, number }: { lot: Lot; related: Lot[]; number: string | null }) {
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const photo = photoSource(lot.photos[selected] ?? "");
  const photos = lot.photos.flatMap((id, index) => {
    const src = photoSource(id);
    return src ? [{ src, alt: `Foto ${index + 1} ${lot.title}`, originalIndex: index }] : [];
  });
  const photoIndex = photos.findIndex((item) => item.originalIndex === selected);
  const message = [
    lot.status === "terjual" ? "Halo, saya ingin menanyakan unit lain yang serupa dengan:" : "Halo, saya tertarik dengan unit AC berikut:",
    `Kode: ${lot.code}`, `Dokumentasi: ${lot.title}`,
    quantity ? `Perkiraan kebutuhan: ${quantity} unit` : "",
    city.trim() ? `Kota tujuan: ${city.trim()}` : "",
    note.trim() ? `Catatan: ${note.trim()}` : "",
    "Mohon informasi kondisi, ketersediaan, dan penawarannya. Terima kasih.",
  ].filter(Boolean).join("\n");
  return <main className="detail-page" id="konten"><div className="shell">
    <div className="detail-breadcrumb"><Link href="/produk"><ArrowLeft size={15} /> Kembali ke katalog</Link><span>{lot.code} / AC</span></div>
    <div className="detail-layout">
      <div className="detail-gallery">
        {photo ? <PhotoPreview photos={photos} initialIndex={Math.max(photoIndex, 0)} label={`Perbesar foto ${lot.title}`} className="detail-image"><Image src={photo} alt={`Foto ${lot.title}`} fill priority sizes="(max-width: 850px) 100vw, 55vw" unoptimized={typeof photo === "string"} /><span className="gallery-tag">FOTO ASLI / {lot.code}</span></PhotoPreview> : <div className="detail-image"><span className="missing-photo">Foto belum tersedia</span><span className="gallery-tag">FOTO ASLI / {lot.code}</span></div>}
        {lot.photos.length > 1 && <div className="gallery-controls" aria-label="Pilih foto">{lot.photos.map((id, index) => { const source = photoSource(id); return <button key={id} type="button" aria-label={`Lihat foto ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>{source && <Image src={source} alt="" fill sizes="70px" unoptimized={typeof source === "string"} />}</button>; })}</div>}
      </div>
      <div className="detail-info">
        <div className="eyebrow">{lot.code} / {lot.kind.toUpperCase()}</div>
        <h1>{lot.title}<span className="accent-text">.</span></h1>
        <div className={`status status-${lot.status}`}>{statusLabels[lot.status]}</div>
        <p className="detail-intro">{lot.description || "Tanyakan rincian unit, kondisi, dan ketersediaan kepada pemilik usaha sebelum membeli."}</p>
        <div className="detail-price"><span>HARGA</span><strong>{priceLabel(lot)}</strong></div>
        <dl className="detail-spec-list"><div><dt>Merek</dt><dd>{lot.brand || "Belum dikonfirmasi"}</dd></div><div><dt>Jenis unit</dt><dd>{lot.kind}</dd></div><div><dt>Jumlah</dt><dd>{lot.quantity === null ? "Belum dikonfirmasi" : `${lot.quantity.toLocaleString("id-ID")} unit`}</dd></div><div><dt>Kapasitas</dt><dd>{lot.capacity || "Belum dikonfirmasi"}</dd></div><div><dt>Kondisi</dt><dd>{lot.condition || "Belum dikonfirmasi"}</dd></div><div><dt>Lokasi</dt><dd>{lot.location || "Belum dikonfirmasi"}</dd></div>{lot.composition && <div className="detail-spec-wide"><dt>Komposisi</dt><dd>{lot.composition}</dd></div>}</dl>
        <div className="inquiry-box"><div><span className="eyebrow">MINTA PENAWARAN</span><h2>Ceritakan kebutuhan Anda.</h2><p>Informasi ini akan disertakan dalam pesan WhatsApp.</p></div><div className="inquiry-fields"><label>Perkiraan jumlah unit<input inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Jumlah unit" /></label><label>Kota tujuan<input value={city} maxLength={100} onChange={(event) => setCity(event.target.value)} placeholder="Kota tujuan" /></label></div><label className="inquiry-note">Catatan tambahan <span>(opsional)</span><textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Jenis unit atau kebutuhan lainnya" /></label>{lot.status !== "terjual" && <AddToCartButton lotId={lot.id} title={lot.title} status={lot.status} quantity={quantity ? Number(quantity) : 1} className="button button-outline inquiry-cart-button" />}<ContactButton number={number} message={message} label={lot.status === "terjual" ? "Tanya unit serupa" : "Minta penawaran"} className="button button-accent inquiry-button" /></div>
      </div>
    </div>
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><div className="eyebrow">DOKUMENTASI LAINNYA</div><h2>Lihat unit<br /><em>lainnya.</em></h2></div><Link href="/produk" className="text-link">Lihat semua foto <ArrowRight size={17} /></Link></div><div className="lot-grid">{related.map((item) => <ProductCard key={item.id} lot={item} />)}</div></section>}
  </div></main>;
}

"use client";

import { ArrowLeft, ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MAX_CART_QUANTITY, useCart, type CartItem } from "@/components/cart/cart-provider";
import { WhatsAppDialog } from "@/components/whatsapp-dialog";
import { priceLabel, statusLabels, type Lot } from "@/lib/lots";
import { photoSource } from "@/lib/photos";

function CartLine({ item, lot }: { item: CartItem; lot: Lot | undefined }) {
  const { updateQuantity, removeItem } = useCart();
  const [draft, setDraft] = useState(String(item.quantity));
  const photo = lot ? photoSource(lot.photos[0] ?? "") : null;

  useEffect(() => setDraft(String(item.quantity)), [item.quantity]);

  function commitQuantity() {
    const value = Number(draft);
    if (!draft.trim() || !Number.isSafeInteger(value) || value < 1 || value > MAX_CART_QUANTITY) {
      setDraft(String(item.quantity));
      return;
    }
    updateQuantity(item.id, value);
  }

  if (!lot) return <article className="cart-line cart-line-missing"><div><strong>Dokumentasi tidak tersedia</strong><p>Hapus pilihan ini untuk melanjutkan permintaan penawaran.</p></div><button type="button" onClick={() => removeItem(item.id)}><Trash2 size={16} /> Hapus</button></article>;

  return <article className="cart-line">
    <Link href={`/produk/${lot.id}`} className="cart-line-image" aria-label={`Lihat detail ${lot.title}`}>{photo ? <Image src={photo} alt="" fill sizes="(max-width: 600px) 90px, 110px" unoptimized={typeof photo === "string"} /> : <span>Foto belum tersedia</span>}</Link>
    <div className="cart-line-main"><span className="cart-line-code">{lot.code} / {lot.kind.toUpperCase()}</span><h2><Link href={`/produk/${lot.id}`}>{lot.title}</Link></h2><span className={`status status-${lot.status}`}>{statusLabels[lot.status]}</span><strong className="cart-line-price">{priceLabel(lot)}</strong></div>
    <div className="cart-line-actions"><label htmlFor={`quantity-${lot.id}`}>Perkiraan unit</label><div className="cart-quantity"><button type="button" aria-label={`Kurangi jumlah ${lot.title}`} disabled={lot.status === "terjual" || item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={15} /></button><input id={`quantity-${lot.id}`} aria-label={`Jumlah unit ${lot.title}`} type="number" min={1} max={MAX_CART_QUANTITY} step={1} value={draft} disabled={lot.status === "terjual"} onChange={(event) => setDraft(event.target.value)} onBlur={commitQuantity} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button type="button" aria-label={`Tambah jumlah ${lot.title}`} disabled={lot.status === "terjual" || item.quantity >= MAX_CART_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={15} /></button></div><button className="cart-remove" type="button" aria-label={`Hapus ${lot.title} dari keranjang`} onClick={() => removeItem(item.id)}><Trash2 size={15} /> Hapus</button></div>
  </article>;
}

export function Cart({ lots, number }: { lots: Lot[]; number: string | null }) {
  const { items, ready, clearCart } = useCart();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const closeContact = useCallback(() => setContactOpen(false), []);
  const lines = items.map((item) => ({ item, lot: lots.find((lot) => lot.id === item.id) }));
  const unavailable = lines.some(({ lot }) => !lot || lot.status === "terjual");
  useEffect(() => { if (unavailable || items.length === 0) setContactOpen(false); }, [unavailable, items.length]);
  const message = [
    "Halo DLA AC, saya ingin meminta penawaran untuk:",
    ...lines.flatMap(({ item, lot }, index) => lot ? [`${index + 1}. ${lot.title}`, `   Kode: ${lot.code}`, `   Perkiraan kebutuhan: ${item.quantity.toLocaleString("id-ID")} unit`] : []),
    "",
    `Nama: ${name.trim()}`,
    `Kota tujuan: ${city.trim()}`,
    ...(note.trim() ? [`Catatan: ${note.trim()}`] : []),
    "Mohon informasi kondisi, ketersediaan, harga, pengiriman, dan metode pembayarannya. Terima kasih.",
  ].join("\n");

  return <main className="cart-page" id="konten"><div className="shell">
    <div className="cart-heading"><Link href="/produk" className="cart-back"><ArrowLeft size={16} /> Kembali ke katalog</Link><div className="eyebrow">DLA AC / PERMINTAAN PENAWARAN</div><h1>Keranjang <em>penawaran.</em></h1><p>Pilih unit yang Anda butuhkan dan kirimkan rinciannya kepada kami melalui WhatsApp.</p></div>
    {!ready ? <div className="empty-state" aria-live="polite"><p>Menyiapkan keranjang...</p></div> : items.length === 0 ? <div className="empty-state cart-empty"><ShoppingBag size={30} /><h2>Keranjang Anda masih kosong.</h2><p>Jelajahi katalog dan tambahkan unit yang ingin Anda tanyakan.</p><Link href="/produk" className="button button-dark">Lihat katalog <ArrowRight size={17} /></Link></div> : <div className="cart-layout">
      <section className="cart-list" aria-labelledby="cart-list-title"><div className="cart-list-heading"><div><span className="eyebrow">PILIHAN ANDA</span><h2 id="cart-list-title">{items.length} dokumentasi / lot</h2></div><button type="button" onClick={clearCart}>Kosongkan keranjang</button></div><div className="cart-lines">{lines.map(({ item, lot }) => <CartLine key={item.id} item={item} lot={lot} />)}</div><p className="cart-list-note">Jumlah unit merupakan perkiraan kebutuhan. Kondisi dan ketersediaan dikonfirmasi bersama penjual.</p></section>
      <aside className="checkout-panel">
        <span className="eyebrow">KIRIM PERMINTAAN</span><h2>Lengkapi kebutuhan Anda.</h2><p>Harga, ongkir, dan cara pembayaran akan dikonfirmasi melalui WhatsApp.</p>
        <form onSubmit={(event) => { event.preventDefault(); if (!unavailable) setContactOpen(true); }}>
          <label>Nama<input type="text" value={name} maxLength={100} pattern=".*\S.*" title="Masukkan nama Anda" onChange={(event) => setName(event.target.value)} placeholder="Nama Anda" autoComplete="name" required /></label>
          <label>Kota tujuan<input type="text" value={city} maxLength={100} pattern=".*\S.*" title="Masukkan kota tujuan" onChange={(event) => setCity(event.target.value)} placeholder="Kota tujuan" autoComplete="address-level2" required /></label>
          <label>Catatan tambahan <span>(opsional)</span><textarea rows={4} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sampaikan kebutuhan atau informasi pengiriman" /></label>
          {unavailable && <p className="cart-alert" role="alert">Ada pilihan yang tidak tersedia atau sudah terjual. Hapus pilihan tersebut untuk melanjutkan.</p>}
          <button className="button button-accent checkout-button" type="submit" aria-haspopup="dialog" disabled={unavailable}><MessageCircle size={18} /> Kirim via WhatsApp <ArrowRight size={17} /></button>
        </form>
        <span className="checkout-hint">Pilih admin, lalu WhatsApp akan terbuka dengan rincian pilihan Anda.</span>
        {contactOpen && !unavailable && <WhatsAppDialog number={number} message={message} onClose={closeContact} />}
      </aside>
    </div>}
  </div></main>;
}

"use client";

import { Upload, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent } from "react";
import { clientPhotos, photoSource } from "@/lib/photos";
import { statusLabels, stockStatuses, unitKinds, type Lot } from "@/lib/lots";

export type FormDataState = Omit<Lot, "id" | "quantity" | "price"> & { quantity: string; price: string };
export const emptyForm: FormDataState = { code: "", title: "", brand: "", kind: "Outdoor", capacity: "", quantity: "", composition: "", condition: "", location: "", price: "", priceUnit: "lot", status: "perlu-konfirmasi", description: "", photos: [], isExample: true };

type Props = {
  form: FormDataState;
  busy: boolean;
  uploading: boolean;
  canChangePrice: boolean;
  change: <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => void;
  togglePhoto: (id: string) => void;
  upload: (file: File | undefined) => Promise<void>;
  save: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  cancel: () => void;
};

export function LotForm({ form, busy, uploading, canChangePrice, change, togglePhoto, upload, save, cancel }: Props) {
  const uploaded = form.photos.filter((id) => id.startsWith("upload:"));
  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form-heading"><div><h2>Informasi lot</h2><p>Kolom kosong akan ditampilkan sebagai belum dikonfirmasi.</p></div><button type="button" className="icon-button" aria-label="Tutup formulir" onClick={cancel}><X size={21} /></button></div>
      <div className="admin-fields">
        <label htmlFor="lot-code">Kode lot <span>*</span><input id="lot-code" value={form.code} onChange={(event) => change("code", event.target.value)} maxLength={32} required placeholder="Image: LOT-001" /></label>
        <label htmlFor="lot-title">Judul <span>*</span><input id="lot-title" value={form.title} onChange={(event) => change("title", event.target.value)} maxLength={120} required placeholder="Image: Outdoor AC bekas" /></label>
        <label htmlFor="lot-brand">Merek<input id="lot-brand" value={form.brand} onChange={(event) => change("brand", event.target.value)} maxLength={80} placeholder="Pisahkan dengan koma jika campuran" /></label>
        <label htmlFor="lot-kind">Jenis unit<select id="lot-kind" aria-label="Jenis unit" value={form.kind} onChange={(event) => change("kind", event.target.value as Lot["kind"])}>{unitKinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label>
        <label htmlFor="lot-quantity">Jumlah unit<input id="lot-quantity" type="number" min="1" max="100000" step="1" value={form.quantity} onChange={(event) => change("quantity", event.target.value)} placeholder="Belum diketahui" /></label>
        <label htmlFor="lot-capacity">Kapasitas<input id="lot-capacity" value={form.capacity} onChange={(event) => change("capacity", event.target.value)} maxLength={50} placeholder="Image: 1 PK, jika diketahui" /></label>
        <label htmlFor="lot-composition">Komposisi<input id="lot-composition" value={form.composition} onChange={(event) => change("composition", event.target.value)} maxLength={160} placeholder="Image: rincian indoor / outdoor" /></label>
        <label htmlFor="lot-condition">Kondisi<input id="lot-condition" value={form.condition} onChange={(event) => change("condition", event.target.value)} maxLength={160} placeholder="Isi sesuai hasil pemeriksaan" /></label>
        <label htmlFor="lot-location">Lokasi<input id="lot-location" value={form.location} onChange={(event) => change("location", event.target.value)} maxLength={100} placeholder="Kota / wilayah" /></label>
        <label htmlFor="lot-status">Status<select id="lot-status" aria-label="Status" value={form.status} onChange={(event) => change("status", event.target.value as Lot["status"])}>{stockStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
        <label htmlFor="lot-price">Harga (Rp)<input id="lot-price" type="number" min="1" max="1000000000000" step="1" value={form.price} disabled={!canChangePrice} onChange={(event) => change("price", event.target.value)} placeholder="Kosongkan untuk tanya harga" /></label>
        <label htmlFor="lot-price-unit">Satuan harga<select id="lot-price-unit" aria-label="Satuan harga" value={form.priceUnit} disabled={!canChangePrice} onChange={(event) => change("priceUnit", event.target.value as Lot["priceUnit"])}><option value="lot">Per lot</option><option value="unit">Per unit</option></select></label>
        <label className="admin-field-wide" htmlFor="lot-description">Keterangan<textarea id="lot-description" rows={4} value={form.description} onChange={(event) => change("description", event.target.value)} maxLength={2000} placeholder="Informasi yang perlu diketahui calon pembeli" /></label>
      </div>
      <div className="admin-photo-heading"><div><h2>Foto lot</h2><p>Pilih 1–8 foto. Foto asli di folder klien tersedia di bawah.</p></div><span>{form.photos.length} / 8</span></div>
      <div className="admin-photo-grid">
        {clientPhotos.map((photo) => <label key={photo.id} className={`admin-photo-choice ${form.photos.includes(photo.id) ? "selected" : ""}`}><input type="checkbox" checked={form.photos.includes(photo.id)} onChange={() => togglePhoto(photo.id)} /><Image src={photo.image} alt={photo.label} fill sizes="(max-width: 600px) 33vw, 120px" /><span>{photo.label}</span></label>)}
        {uploaded.map((id, index) => { const source = photoSource(id); return <div className="admin-uploaded" key={id}>{source && <Image src={source} alt={`Foto unggahan ${index + 1}`} fill sizes="120px" unoptimized />}<button type="button" aria-label={`Hapus foto unggahan ${index + 1} dari lot`} onClick={() => togglePhoto(id)}><X size={16} /></button></div>; })}
      </div>
      <label className="upload-button"><Upload size={17} /> {uploading ? "Mengunggah..." : "Unggah foto baru"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || form.photos.length >= 8} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
      <p className="upload-hint">JPEG, PNG, atau WebP; maksimal 8 MB per foto.</p>
      <label className="example-checkbox"><input type="checkbox" checked={form.isExample} onChange={(event) => change("isExample", event.target.checked)} /> Tandai sebagai data contoh yang belum dikonfirmasi</label>
      <div className="admin-form-actions"><button className="button button-dark" type="submit" disabled={busy || uploading}>{busy ? "Menyimpan..." : "Simpan lot"}</button><button className="button button-outline-dark" type="button" onClick={cancel}>Batal</button></div>
    </form>
  );
}

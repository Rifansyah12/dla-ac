"use client";

import { ArrowLeft, Check, Edit3, LogOut, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { photoSource } from "@/lib/photos";
import { priceLabel, statusLabels, type Lot } from "@/lib/lots";
import { AccountTools } from "./account-tools";
import { CatalogSummary } from "./catalog-summary";
import { emptyForm, LotForm, type FormDataState } from "./lot-form";

type SessionUser = { name: string; username: string; role: "admin" | "owner"; canChangePrice: boolean; canDeleteLot: boolean };

function formFromLot(lot: Lot): FormDataState {
  return { ...lot, quantity: lot.quantity?.toString() ?? "", price: lot.price?.toString() ?? "" };
}

async function responseData(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string; data?: Lot[] | Lot; id?: string; configured?: boolean; authenticated?: boolean; accountMode?: boolean; user?: SessionUser | null };
  if (!response.ok) throw new Error(body.error || "Permintaan belum berhasil.");
  return body;
}

export function AdminDashboard() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [accountMode, setAccountMode] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormDataState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadLots() {
    setLots(null);
    try {
      const data = await responseData(await fetch("/api/products", { cache: "no-store" }));
      if (!Array.isArray(data.data)) throw new Error("Data katalog tidak valid.");
      setLots(data.data);
    } catch (err) {
      setLots(null);
      throw err;
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store" }).then(responseData).then(async (data) => {
      if (!active) return;
      setConfigured(Boolean(data.configured));
      setAuthenticated(Boolean(data.authenticated));
      setAccountMode(Boolean(data.accountMode));
      setUser(data.user ?? null);
      if (data.authenticated) {
        try { await loadLots(); }
        catch (err) { if (active) setError(err instanceof Error ? err.message : "Katalog belum dapat dimuat."); }
      }
    }).catch(() => { if (active) { setConfigured(false); setError("Status admin belum dapat dimuat."); } });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await responseData(await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }));
      setPassword(""); setUser(data.user ?? null); setAuthenticated(true); setNotice(""); await loadLots();
    } catch (err) { setError(err instanceof Error ? err.message : "Tidak dapat masuk."); } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError("");
    try { await responseData(await fetch("/api/admin/logout", { method: "POST" })); setAuthenticated(false); setUser(null); setLots(null); setEditing(null); setCreating(false); setNotice(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Tidak dapat keluar."); } finally { setBusy(false); }
  }

  async function retryLoadLots() {
    setBusy(true); setError("");
    try { await loadLots(); }
    catch (err) { setError(err instanceof Error ? err.message : "Katalog belum dapat dimuat."); } finally { setBusy(false); }
  }

  function change<K extends keyof FormDataState>(field: K, value: FormDataState[K]) { setForm((current) => ({ ...current, [field]: value })); }
  function togglePhoto(id: string) { setForm((current) => ({ ...current, photos: current.photos.includes(id) ? current.photos.filter((item) => item !== id) : current.photos.length < 8 ? [...current.photos, id] : current.photos })); }
  function beginEdit(lot: Lot) { setForm(formFromLot(lot)); setEditing(lot.id); setCreating(false); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function beginCreate() { setForm({ ...emptyForm, photos: [] }); setEditing(null); setCreating(true); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setEditing(null); setCreating(false); setError(""); }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (form.photos.length >= 8) { setError("Maksimal 8 foto per lot."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Foto maksimal 8 MB."); return; }
    setUploading(true); setError("");
    try {
      const payload = new FormData(); payload.append("photo", file);
      const data = await responseData(await fetch("/api/admin/upload", { method: "POST", body: payload }));
      if (!data.id) throw new Error("Foto belum dapat diunggah.");
      const id = data.id;
      setForm((current) => ({ ...current, photos: [...current.photos, id].slice(0, 8) }));
    } catch (err) { setError(err instanceof Error ? err.message : "Foto belum dapat diunggah."); } finally { setUploading(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const lot = { ...form, quantity: form.quantity ? Number(form.quantity) : null, price: form.price ? Number(form.price) : null };
      await responseData(await fetch("/api/admin/lots", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing, lot }) }));
      setEditing(null); setCreating(false); setNotice("Data katalog berhasil disimpan."); await loadLots();
    } catch (err) { setError(err instanceof Error ? err.message : "Data belum dapat disimpan."); } finally { setBusy(false); }
  }

  async function remove(lot: Lot) {
    if (!window.confirm(`Hapus ${lot.code} dari katalog?`)) return;
    setBusy(true); setError(""); setNotice("");
    try { await responseData(await fetch("/api/admin/lots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lot.id }) })); setNotice("Data katalog berhasil dihapus."); await loadLots(); }
    catch (err) { setError(err instanceof Error ? err.message : "Data belum dapat dihapus."); } finally { setBusy(false); }
  }

  const editingForm = creating || editing !== null;
  return (
    <main className="admin-page" id="konten"><div className="admin-shell">
      <header className="admin-top"><Link href="/" className="admin-back"><ArrowLeft size={16} /> Kembali ke website</Link><span>{user ? `${user.name} / ${user.role.toUpperCase()}` : "DLA AC / PENGELOLAAN KATALOG"}</span>{authenticated && <button className="admin-logout" type="button" disabled={busy} onClick={logout}><LogOut size={16} /> Keluar</button>}</header>
      {configured === null ? (
        <div className="admin-state" aria-live="polite">Memeriksa akses admin...</div>
      ) : !configured ? (
        <div className="admin-state"><span className="eyebrow">PENGATURAN ADMIN</span><h1>Admin belum diaktifkan.</h1><p>{accountMode ? <>Siapkan database, <code>ADMIN_SESSION_SECRET</code>, dan akun owner pertama sesuai panduan di README.</> : <>Isi <code>ADMIN_PASSWORD</code> dan <code>ADMIN_SESSION_SECRET</code> di file <code>.env.local</code>, lalu mulai ulang server. Panduan tersedia di README.</>}</p>{error && <p className="admin-error" role="alert">{error}</p>}</div>
      ) : !authenticated ? (
        <div className="admin-login"><span className="eyebrow">AKSES PEMILIK USAHA</span><h1>Masuk ke katalog.</h1><p>Kelola informasi lot dan foto yang ditampilkan pada website.</p><form onSubmit={login}>{accountMode && <label>Nama pengguna<input type="text" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={80} required autoComplete="username" /></label>}<label>Kata sandi<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={256} required autoComplete="current-password" /></label>{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}<button className="button button-dark" type="submit" disabled={busy}>{busy ? "Memeriksa..." : "Masuk"}</button></form></div>
      ) : (
        <>
          {user && !editingForm && <AccountTools owner={user.role === "owner"} onPasswordChanged={() => { setAuthenticated(false); setUser(null); setLots(null); setEditing(null); setCreating(false); setError(""); setNotice("Kata sandi berhasil diubah. Silakan masuk kembali."); }} />}
          <div className="admin-title"><div><span className="eyebrow">DASHBOARD ADMIN</span><h1>{editingForm ? editing ? "Ubah dokumentasi." : "Tambah lot." : "Kelola katalog."}</h1><p>Isi hanya informasi yang sudah dikonfirmasi pemilik usaha.</p></div>{!editingForm && lots !== null && <button className="button button-accent" type="button" onClick={beginCreate}><Plus size={17} /> Tambah lot</button>}</div>
          {error && <p className="admin-error" role="alert">{error}</p>}
          {notice && <p className="admin-success" role="status"><Check size={16} /> {notice}</p>}
          {editingForm ? (
            <LotForm form={form} busy={busy} uploading={uploading} canChangePrice={user?.canChangePrice ?? true} change={change} togglePhoto={togglePhoto} upload={upload} save={save} cancel={cancelEdit} />
          ) : lots === null ? (
            <div className="admin-catalog-loading" aria-live="polite">{error ? <button className="button button-outline-dark" type="button" disabled={busy} onClick={() => void retryLoadLots()}>Coba muat ulang katalog</button> : "Memuat katalog..."}</div>
          ) : (
            <><CatalogSummary lots={lots} /><div className="admin-list">{lots.length === 0 ? <div className="empty-state"><h2>Belum ada lot.</h2><p>Tambahkan dokumentasi untuk mulai mengisi katalog.</p></div> : lots.map((lot) => { const source = photoSource(lot.photos[0] ?? ""); return <article className="admin-list-item" key={lot.id}><div className="admin-list-image">{source && <Image src={source} alt="" fill sizes="90px" unoptimized={typeof source === "string"} />}</div><div className="admin-list-info"><span>{lot.code} · {statusLabels[lot.status]} {lot.isExample ? "· CONTOH" : ""}</span><h2>{lot.title}</h2><p>{lot.brand || "Merek belum dikonfirmasi"} · {priceLabel(lot)}</p></div><div className="admin-list-actions"><button type="button" onClick={() => beginEdit(lot)}><Edit3 size={15} /> Ubah</button>{(user?.canDeleteLot ?? true) && <button type="button" disabled={busy} onClick={() => void remove(lot)}><Trash2 size={15} /> Hapus</button>}</div></article>; })}</div></>
          )}
        </>
      )}
    </div></main>
  );
}

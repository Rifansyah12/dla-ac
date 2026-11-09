"use client";

import { ArrowLeft, ArrowRight, Boxes, Check, ClipboardList, Edit3, LayoutDashboard, LockKeyhole, LogOut, Plus, Settings2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import logo from "@/fotoac/logo-dla.png";
import { photoSource } from "@/lib/photos";
import { priceLabel, statusLabels, type Lot } from "@/lib/lots";
import { AccountTools } from "./account-tools";
import { CatalogSummary } from "./catalog-summary";
import { ForgotPassword } from "./forgot-password";
import { emptyForm, LotForm, type FormDataState } from "./lot-form";
import { PasswordField } from "./password-field";

type SessionUser = { name: string; username: string; role: "admin" | "owner"; canChangePrice: boolean; canDeleteLot: boolean };
type MobileView = "overview" | "catalog" | "settings";

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
  const [resetOpen, setResetOpen] = useState(false);
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormDataState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("overview");

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
    try { await responseData(await fetch("/api/admin/logout", { method: "POST" })); setAuthenticated(false); setUser(null); setLots(null); setEditing(null); setCreating(false); setMobileView("overview"); setNotice(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Tidak dapat keluar."); } finally { setBusy(false); }
  }

  async function retryLoadLots() {
    setBusy(true); setError("");
    try { await loadLots(); }
    catch (err) { setError(err instanceof Error ? err.message : "Katalog belum dapat dimuat."); } finally { setBusy(false); }
  }

  function change<K extends keyof FormDataState>(field: K, value: FormDataState[K]) { setForm((current) => ({ ...current, [field]: value })); }
  function togglePhoto(id: string) { setForm((current) => ({ ...current, photos: current.photos.includes(id) ? current.photos.filter((item) => item !== id) : current.photos.length < 8 ? [...current.photos, id] : current.photos })); }
  function beginEdit(lot: Lot) { setForm(formFromLot(lot)); setEditing(lot.id); setCreating(false); setMobileView("catalog"); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function beginCreate() { setForm({ ...emptyForm, photos: [] }); setEditing(null); setCreating(true); setMobileView("catalog"); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setEditing(null); setCreating(false); setError(""); }
  function changeMobileView(view: MobileView) { setMobileView(view); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

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
  const role = user?.role === "owner" ? "Owner" : "Admin";
  const name = user?.name.trim() || "Admin";
  const needsConfirmation = lots?.filter((lot) => lot.status === "perlu-konfirmasi").length;
  const loading = <div className="admin-catalog-loading" aria-live="polite">{error ? <button className="button button-outline-dark" type="button" disabled={busy} onClick={() => void retryLoadLots()}>Coba muat ulang katalog</button> : "Memuat katalog..."}</div>;

  return (
    <main className={`admin-page${authenticated ? " admin-page-active" : ""}`} id="konten">
      <div className="admin-shell">
        <header className="admin-top">
          <div className="admin-brand"><span className="admin-brand-logo"><Image src={logo} alt="" width={42} height={42} /></span><span><strong>DLA AC</strong><small>WORKSPACE</small></span></div>
          <div className="admin-top-actions"><Link href="/" className="admin-back" aria-label="Kembali ke website"><ArrowLeft size={16} /><span>Website</span></Link>{authenticated && <button className="admin-logout" type="button" disabled={busy} onClick={logout}><LogOut size={16} /><span>Keluar</span></button>}</div>
        </header>
        {configured === null ? (
          <div className="admin-state" aria-live="polite">Memeriksa akses admin...</div>
        ) : !configured ? (
          <div className="admin-state"><span className="admin-login-icon"><LockKeyhole size={21} /></span><span className="admin-kicker">PENGATURAN ADMIN</span><h1>Admin belum diaktifkan.</h1><p>{accountMode ? <>Siapkan database, <code>ADMIN_SESSION_SECRET</code>, dan akun owner pertama sesuai panduan di README.</> : <>Isi <code>ADMIN_PASSWORD</code> dan <code>ADMIN_SESSION_SECRET</code> di file <code>.env.local</code>, lalu mulai ulang server. Panduan tersedia di README.</>}</p>{error && <p className="admin-error" role="alert">{error}</p>}</div>
        ) : !authenticated && resetOpen && accountMode ? (
          <ForgotPassword onBack={() => { setResetOpen(false); setError(""); }} />
        ) : !authenticated ? (
          <div className="admin-login">
            <div className="admin-login-intro"><span className="admin-login-icon"><LockKeyhole size={21} /></span><span className="admin-kicker">DLA AC / AREA PENGELOLA</span><h1>Senang melihat<br /><em>Anda kembali.</em></h1><p>Masuk untuk mengelola katalog dan kebutuhan usaha Anda.</p></div>
            <form onSubmit={login}>
              {accountMode && <label>Nama pengguna<input type="text" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={80} placeholder="Masukkan nama pengguna" required autoComplete="username" /></label>}
              <PasswordField label="Kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={256} placeholder="Masukkan kata sandi" required autoComplete="current-password" />
              {accountMode && <button className="admin-forgot-link" type="button" onClick={() => { setPassword(""); setError(""); setResetOpen(true); }}>Lupa kata sandi?</button>}
              {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
              <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Memeriksa..." : "Masuk ke dashboard"} <ArrowRight size={18} /></button>
            </form>
            <div className="admin-login-footer"><span /> DLA AC <b>/</b> RUANG PENGELOLAAN</div>
          </div>
        ) : (
          <>
            <h1 className="sr-only">Dashboard {role} DLA AC</h1>
            {error && <p className="admin-error admin-page-message" role="alert">{error}</p>}
            {notice && <p className="admin-success admin-page-message" role="status"><Check size={16} /> {notice}</p>}
            {editingForm ? (
              <>
                <div className="admin-title"><div><span className="admin-kicker">KATALOG / {editing ? "UBAH LOT" : "LOT BARU"}</span><h2>{editing ? "Ubah dokumentasi." : "Tambah lot baru."}</h2><p>Isi informasi sesuai kondisi unit yang sudah dikonfirmasi.</p></div></div>
                <LotForm form={form} busy={busy} uploading={uploading} canChangePrice={user?.canChangePrice ?? true} change={change} togglePhoto={togglePhoto} upload={upload} save={save} cancel={cancelEdit} />
              </>
            ) : (
              <div className="admin-workspace" data-view={mobileView}>
                <section className="admin-overview-section" id="admin-overview" aria-labelledby="admin-welcome-title">
                  <div className="admin-welcome">
                    <div className="admin-welcome-decoration" aria-hidden="true" />
                    <div className="admin-welcome-content"><span className="admin-welcome-label"><span /> DLA AC WORKSPACE <b>/</b> {role.toUpperCase()}</span><h2 id="admin-welcome-title">Selamat datang,<br /><em>{name}.</em></h2><p>Semua yang Anda butuhkan untuk mengelola katalog, dalam satu tempat.</p></div>
                    <div className="admin-welcome-bottom"><div className="admin-welcome-stat"><strong>{lots?.length ?? "—"}</strong><span>total lot<br /><small>{needsConfirmation ?? "—"} perlu konfirmasi</small></span></div><button className="admin-welcome-add" type="button" onClick={beginCreate} disabled={lots === null}><Plus size={18} /> Tambah lot</button></div>
                  </div>
                  {lots === null ? loading : <CatalogSummary lots={lots} />}
                  <button className="admin-overview-link" type="button" onClick={() => changeMobileView("catalog")}><span className="admin-overview-link-icon"><Boxes size={20} /></span><span><strong>Kelola katalog</strong><small>Lihat dan perbarui dokumentasi</small></span><ArrowRight size={19} /></button>
                </section>

                <section className="admin-catalog-section" id="admin-catalog" aria-labelledby="admin-catalog-title">
                  <div className="admin-section-heading"><div><span className="admin-kicker">KOLEKSI / STOK AC</span><h2 id="admin-catalog-title">Katalog unit<span>.</span></h2><p>{lots === null ? "Menyiapkan dokumentasi..." : `${lots.length} dokumentasi dalam katalog Anda.`}</p></div><button className="admin-add-button" type="button" onClick={beginCreate} disabled={lots === null}><Plus size={17} /> <span>Tambah lot</span></button></div>
                  {lots === null ? loading : <div className="admin-list">{lots.length === 0 ? <div className="empty-state admin-empty"><Boxes size={26} /><h2>Belum ada lot.</h2><p>Tambahkan dokumentasi untuk mulai mengisi katalog.</p><button className="button button-dark" type="button" onClick={beginCreate}><Plus size={17} /> Tambah lot</button></div> : lots.map((lot) => {
                    const source = photoSource(lot.photos[0] ?? "");
                    return <article className="admin-list-item" key={lot.id}>
                      <div className="admin-list-image">{source ? <Image src={source} alt="" fill sizes="(max-width: 600px) 96px, 110px" unoptimized={typeof source === "string"} /> : <Boxes size={22} aria-hidden="true" />}</div>
                      <div className="admin-list-info"><span className="admin-list-code">{lot.code}{lot.isExample && <> <b>· CONTOH</b></>}</span><h3>{lot.title}</h3><p>{lot.brand || "Merek belum dikonfirmasi"} <span>·</span> {priceLabel(lot)}</p><span className={`admin-lot-status admin-lot-status-${lot.status}`}><span />{statusLabels[lot.status]}</span></div>
                      <div className="admin-list-actions"><button type="button" onClick={() => beginEdit(lot)}><Edit3 size={15} /> Ubah</button>{(user?.canDeleteLot ?? true) && <button type="button" disabled={busy} onClick={() => void remove(lot)}><Trash2 size={15} /> Hapus</button>}</div>
                    </article>;
                  })}</div>}
                </section>

                {user && <section className="admin-settings-section" id="admin-settings" aria-labelledby="admin-settings-title"><div className="admin-section-heading"><div><span className="admin-kicker">RUANG PENGELOLAAN</span><h2 id="admin-settings-title">Pengaturan<span>.</span></h2><p>Kelola akun dan informasi usaha dengan mudah.</p></div></div><AccountTools owner={user.role === "owner"} onPasswordChanged={() => { setAuthenticated(false); setUser(null); setLots(null); setEditing(null); setCreating(false); setMobileView("overview"); setError(""); setNotice("Kata sandi berhasil diubah. Silakan masuk kembali."); }} /></section>}
              </div>
            )}
          </>
        )}
      </div>
      {authenticated && !editingForm && <nav className="admin-mobile-nav" aria-label="Navigasi dashboard"><button type="button" aria-controls="admin-overview" aria-pressed={mobileView === "overview"} onClick={() => changeMobileView("overview")}><LayoutDashboard size={20} /><span>Beranda</span></button><button type="button" aria-controls="admin-catalog" aria-pressed={mobileView === "catalog"} onClick={() => changeMobileView("catalog")}><ClipboardList size={20} /><span>Katalog</span></button>{user && <button type="button" aria-controls="admin-settings" aria-pressed={mobileView === "settings"} onClick={() => changeMobileView("settings")}><Settings2 size={20} /><span>Pengaturan</span></button>}</nav>}
    </main>
  );
}

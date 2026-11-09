"use client";

import { ChevronDown, History, KeyRound, Mail, Settings2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ManagedAdmin } from "@/lib/admin-accounts";
import { ActivityList } from "./activity-list";
import { PasswordField } from "./password-field";
import { RecoveryEmailForm } from "./recovery-email-form";
import { SiteSettingsForm } from "./site-settings-form";

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: string; data?: ManagedAdmin[] };
  if (!response.ok) throw new Error(body.error || "Permintaan belum berhasil.");
  return body;
}

function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (next !== confirmation) { setError("Konfirmasi kata sandi tidak cocok."); return; }
    setBusy(true);
    try {
      await request("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      setCurrent(""); setNext(""); setConfirmation(""); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Kata sandi belum dapat diubah."); }
    finally { setBusy(false); }
  }

  return <form className="admin-account-form" onSubmit={submit}>
    <p>Setelah kata sandi diubah, semua sesi akun ini akan berakhir dan Anda perlu masuk kembali.</p>
    <div className="admin-account-fields">
      <PasswordField label="Kata sandi saat ini" value={current} onChange={(event) => setCurrent(event.target.value)} maxLength={256} autoComplete="current-password" required />
      <PasswordField label="Kata sandi baru" value={next} onChange={(event) => setNext(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required />
      <PasswordField label="Ulangi kata sandi baru" visibilityLabel="konfirmasi kata sandi baru" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required />
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Ubah kata sandi"}</button>
  </form>;
}

function AdminEditor({ admin, onSaved }: { admin: ManagedAdmin; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(admin.name);
  const [active, setActive] = useState(admin.active);
  const [canChangePrice, setCanChangePrice] = useState(admin.canChangePrice);
  const [canDeleteLot, setCanDeleteLot] = useState(admin.canDeleteLot);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(admin.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { setName(admin.name); setEmail(admin.email ?? ""); setActive(admin.active); setCanChangePrice(admin.canChangePrice); setCanDeleteLot(admin.canDeleteLot); }, [admin.name, admin.email, admin.active, admin.canChangePrice, admin.canDeleteLot]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await request("/api/owner/admins", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: admin.id, name, email, active, canChangePrice, canDeleteLot, password }) });
      setPassword(""); await onSaved(); setNotice("Akun admin berhasil diperbarui.");
    } catch (err) { setError(err instanceof Error ? err.message : "Akun belum dapat diperbarui."); }
    finally { setBusy(false); }
  }

  return <form className="admin-account-card" onSubmit={save}>
    <div className="admin-account-card-heading"><div><strong>{admin.username}</strong><span>Dibuat {new Date(admin.createdAt).toLocaleDateString("id-ID")}</span></div><span className={admin.active ? "admin-account-status" : "admin-account-status inactive"}>{admin.active ? "Aktif" : "Nonaktif"}</span></div>
    <div className="admin-account-fields">
      <label>Nama admin<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label>
      <label>Email pemulihan <span>(opsional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="nama@email.com" /></label>
      <PasswordField label="Reset kata sandi" hint="(opsional)" visibilityLabel={`kata sandi admin ${admin.username}`} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" placeholder="Isi hanya jika ingin mengganti" />
    </div>
    <div className="admin-account-checks"><label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Akun aktif</label><label><input type="checkbox" checked={canChangePrice} onChange={(event) => setCanChangePrice(event.target.checked)} /> Boleh mengubah harga</label><label><input type="checkbox" checked={canDeleteLot} onChange={(event) => setCanDeleteLot(event.target.checked)} /> Boleh menghapus lot</label></div>
    <p>Setiap perubahan akan mengakhiri sesi admin ini.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
    <button className="button button-outline-dark" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan perubahan"}</button>
  </form>;
}

function AdminAccounts() {
  const [admins, setAdmins] = useState<ManagedAdmin[] | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [canChangePrice, setCanChangePrice] = useState(true);
  const [canDeleteLot, setCanDeleteLot] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const body = await request("/api/owner/admins");
    if (!Array.isArray(body.data)) throw new Error("Daftar admin tidak valid.");
    setAdmins(body.data);
  }, []);
  useEffect(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Daftar admin belum dapat dimuat.")); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await request("/api/owner/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, email, password, canChangePrice, canDeleteLot }) });
      setName(""); setUsername(""); setEmail(""); setPassword(""); setCanChangePrice(true); setCanDeleteLot(true);
      await load(); setNotice("Akun admin berhasil dibuat.");
    } catch (err) { setError(err instanceof Error ? err.message : "Akun admin belum dapat dibuat."); }
    finally { setBusy(false); }
  }

  return <div className="admin-account-section">
    <form className="admin-account-form" onSubmit={create}>
      <h2>Tambah admin</h2><p>Berikan username dan kata sandi awal kepada admin secara aman.</p>
      <div className="admin-account-fields"><label>Nama admin<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={80} autoComplete="off" required /></label><label>Email pemulihan <span>(opsional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="nama@email.com" /></label><PasswordField label="Kata sandi awal" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required /></div>
      <div className="admin-account-checks"><label><input type="checkbox" checked={canChangePrice} onChange={(event) => setCanChangePrice(event.target.checked)} /> Boleh mengubah harga</label><label><input type="checkbox" checked={canDeleteLot} onChange={(event) => setCanDeleteLot(event.target.checked)} /> Boleh menghapus lot</label></div>
      {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
      <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Membuat..." : "Buat akun admin"}</button>
    </form>
    <div className="admin-account-list"><h2>Daftar admin</h2>{admins === null ? <p>Memuat daftar admin...</p> : admins.length === 0 ? <p>Belum ada akun admin.</p> : admins.map((admin) => <AdminEditor key={admin.id} admin={admin} onSaved={load} />)}</div>
  </div>;
}

export function AccountTools({ owner, onPasswordChanged }: { owner: boolean; onPasswordChanged: () => void }) {
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  return <div className="admin-tools">
    {owner && <details className="admin-tool" onToggle={(event) => setAccountsOpen(event.currentTarget.open)}><summary><span className="admin-tool-icon admin-tool-icon-blue"><UsersRound size={19} aria-hidden="true" /></span><span className="admin-tool-copy"><strong>Kelola akun admin</strong><small>Atur akun dan izin akses</small></span><ChevronDown className="admin-tool-chevron" size={18} aria-hidden="true" /></summary>{accountsOpen && <AdminAccounts />}</details>}
    <details className="admin-tool"><summary><span className="admin-tool-icon admin-tool-icon-violet"><KeyRound size={19} aria-hidden="true" /></span><span className="admin-tool-copy"><strong>Ubah kata sandi saya</strong><small>Perbarui akses akun Anda</small></span><ChevronDown className="admin-tool-chevron" size={18} aria-hidden="true" /></summary><PasswordForm onChanged={onPasswordChanged} /></details>
    <details className="admin-tool" onToggle={(event) => setRecoveryOpen(event.currentTarget.open)}><summary><span className="admin-tool-icon admin-tool-icon-blue"><Mail size={19} aria-hidden="true" /></span><span className="admin-tool-copy"><strong>Email pemulihan</strong><small>Atur email untuk menerima kode OTP</small></span><ChevronDown className="admin-tool-chevron" size={18} aria-hidden="true" /></summary>{recoveryOpen && <RecoveryEmailForm />}</details>
    {owner && <details className="admin-tool" onToggle={(event) => setActivityOpen(event.currentTarget.open)}><summary><span className="admin-tool-icon admin-tool-icon-amber"><History size={19} aria-hidden="true" /></span><span className="admin-tool-copy"><strong>Riwayat aktivitas</strong><small>Lihat perubahan terbaru</small></span><ChevronDown className="admin-tool-chevron" size={18} aria-hidden="true" /></summary>{activityOpen && <ActivityList />}</details>}
    <details className="admin-tool" onToggle={(event) => setSettingsOpen(event.currentTarget.open)}><summary><span className="admin-tool-icon admin-tool-icon-teal"><Settings2 size={19} aria-hidden="true" /></span><span className="admin-tool-copy"><strong>Jasa teknisi dan WhatsApp</strong><small>Perbarui informasi usaha</small></span><ChevronDown className="admin-tool-chevron" size={18} aria-hidden="true" /></summary>{settingsOpen && <SiteSettingsForm owner={owner} />}</details>
  </div>;
}

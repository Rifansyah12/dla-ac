"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ManagedAdmin } from "@/lib/admin-accounts";
import { ActivityList } from "./activity-list";
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
      <label>Kata sandi saat ini<input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} maxLength={256} autoComplete="current-password" required /></label>
      <label>Kata sandi baru<input type="password" value={next} onChange={(event) => setNext(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required /></label>
      <label>Ulangi kata sandi baru<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required /></label>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { setName(admin.name); setActive(admin.active); setCanChangePrice(admin.canChangePrice); setCanDeleteLot(admin.canDeleteLot); }, [admin.name, admin.active, admin.canChangePrice, admin.canDeleteLot]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await request("/api/owner/admins", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: admin.id, name, active, canChangePrice, canDeleteLot, password }) });
      setPassword(""); await onSaved(); setNotice("Akun admin berhasil diperbarui.");
    } catch (err) { setError(err instanceof Error ? err.message : "Akun belum dapat diperbarui."); }
    finally { setBusy(false); }
  }

  return <form className="admin-account-card" onSubmit={save}>
    <div className="admin-account-card-heading"><div><strong>{admin.username}</strong><span>Dibuat {new Date(admin.createdAt).toLocaleDateString("id-ID")}</span></div><span className={admin.active ? "admin-account-status" : "admin-account-status inactive"}>{admin.active ? "Aktif" : "Nonaktif"}</span></div>
    <div className="admin-account-fields">
      <label>Nama admin<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label>
      <label>Reset kata sandi <span>(opsional)</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" placeholder="Isi hanya jika ingin mengganti" /></label>
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
      await request("/api/owner/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, password, canChangePrice, canDeleteLot }) });
      setName(""); setUsername(""); setPassword(""); setCanChangePrice(true); setCanDeleteLot(true);
      await load(); setNotice("Akun admin berhasil dibuat.");
    } catch (err) { setError(err instanceof Error ? err.message : "Akun admin belum dapat dibuat."); }
    finally { setBusy(false); }
  }

  return <div className="admin-account-section">
    <form className="admin-account-form" onSubmit={create}>
      <h2>Tambah admin</h2><p>Berikan username dan kata sandi awal kepada admin secara aman.</p>
      <div className="admin-account-fields"><label>Nama admin<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required /></label><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={80} autoComplete="off" required /></label><label>Kata sandi awal<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required /></label></div>
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
  return <div className="admin-tools">
    {owner && <details className="admin-tool" onToggle={(event) => setAccountsOpen(event.currentTarget.open)}><summary>Kelola akun admin</summary>{accountsOpen && <AdminAccounts />}</details>}
    <details className="admin-tool"><summary>Ubah kata sandi saya</summary><PasswordForm onChanged={onPasswordChanged} /></details>
    {owner && <details className="admin-tool" onToggle={(event) => setActivityOpen(event.currentTarget.open)}><summary>Riwayat aktivitas</summary>{activityOpen && <ActivityList />}</details>}
    <details className="admin-tool" onToggle={(event) => setSettingsOpen(event.currentTarget.open)}><summary>Jasa teknisi dan WhatsApp</summary>{settingsOpen && <SiteSettingsForm owner={owner} />}</details>
  </div>;
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "./password-field";

type ResponseBody = { email?: string | null; error?: string };

export function RecoveryEmailForm() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/recovery-email", { cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({})) as ResponseBody;
      if (!response.ok) throw new Error(body.error || "Email pemulihan belum dapat dimuat.");
      if (active) setEmail(body.email ?? "");
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Email pemulihan belum dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/recovery-email", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, currentPassword }) });
      const body = await response.json().catch(() => ({})) as ResponseBody;
      if (!response.ok || !body.email) throw new Error(body.error || "Email pemulihan belum dapat disimpan.");
      setEmail(body.email); setCurrentPassword(""); setNotice("Email pemulihan berhasil disimpan.");
    } catch (err) { setError(err instanceof Error ? err.message : "Email pemulihan belum dapat disimpan."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="admin-account-form"><p aria-live="polite">Memuat email pemulihan...</p></div>;
  return <form className="admin-account-form" onSubmit={save}>
    <p>Email ini digunakan untuk menerima kode saat Anda lupa kata sandi.</p>
    <div className="admin-account-fields"><label>Email pemulihan<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="nama@email.com" required /></label><PasswordField label="Kata sandi saat ini" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={256} autoComplete="current-password" required /></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
    <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan email pemulihan"}</button>
  </form>;
}

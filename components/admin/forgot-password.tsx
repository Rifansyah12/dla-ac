"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "./password-field";

type Step = "request" | "confirm" | "complete";

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("request");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) window.clearInterval(timer);
    };
    const timer = window.setInterval(update, 1000);
    update();
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function requestCode() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Kode belum dapat diminta.");
      setStep("confirm"); setRetryAt(Date.now() + 60000); setRemaining(60);
      setNotice("Jika nama pengguna dan email sesuai, kode akan dikirim ke email tersebut.");
    } catch (err) { setError(err instanceof Error ? err.message : "Kode belum dapat diminta."); }
    finally { setBusy(false); }
  }

  async function request(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await requestCode(); }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (password !== confirmation) { setError("Konfirmasi kata sandi tidak cocok."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/password-reset/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, code, newPassword: password }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Kata sandi belum dapat dipulihkan.");
      setCode(""); setPassword(""); setConfirmation(""); setStep("complete");
    } catch (err) { setError(err instanceof Error ? err.message : "Kata sandi belum dapat dipulihkan."); }
    finally { setBusy(false); }
  }

  return <div className="admin-login">
    <div className="admin-login-intro"><span className="admin-login-icon">{step === "complete" ? <CheckCircle2 size={21} /> : <LockKeyhole size={21} />}</span><span className="admin-kicker">DLA AC / PEMULIHAN AKUN</span><h1>{step === "complete" ? <>Kata sandi<br /><em>diperbarui.</em></> : <>Pulihkan<br /><em>akses Anda.</em></>}</h1><p>{step === "request" ? "Masukkan nama pengguna dan email pemulihan yang sudah terdaftar." : step === "confirm" ? "Masukkan kode dari email dan tentukan kata sandi baru." : "Silakan masuk kembali menggunakan kata sandi baru Anda."}</p></div>
    {step === "request" && <form onSubmit={request}>
      <label>Nama pengguna<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={80} autoComplete="username" placeholder="Nama pengguna" required /></label>
      <label>Email pemulihan<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="nama@email.com" required /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Mengirim..." : "Kirim kode OTP"} <ArrowRight size={18} /></button>
      <button className="admin-reset-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Kembali ke login</button>
    </form>}
    {step === "confirm" && <form onSubmit={confirm}>
      {notice && <p className="admin-reset-notice" role="status">{notice}</p>}
      <label>Kode OTP<input type="text" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} autoComplete="one-time-code" placeholder="6 digit kode" required /></label>
      <PasswordField label="Kata sandi baru" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required />
      <PasswordField label="Ulangi kata sandi baru" visibilityLabel="konfirmasi kata sandi baru" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={256} autoComplete="new-password" required />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Memeriksa..." : "Simpan kata sandi baru"} <ArrowRight size={18} /></button>
      <button className="admin-reset-back" type="button" disabled={busy || remaining > 0} onClick={() => void requestCode()}>{remaining > 0 ? `Kirim ulang dalam ${remaining} detik` : "Kirim ulang kode"}</button>
      <button className="admin-reset-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Kembali ke login</button>
    </form>}
    {step === "complete" && <div className="admin-reset-complete"><button className="button button-dark" type="button" onClick={onBack}>Kembali ke login <ArrowRight size={18} /></button></div>}
    <div className="admin-login-footer"><span /> DLA AC <b>/</b> RUANG PENGELOLAAN</div>
  </div>;
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SiteSettings } from "@/lib/shop";

async function request(init?: RequestInit): Promise<SiteSettings> {
  const response = await fetch("/api/admin/settings", { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: string; data?: SiteSettings };
  if (!response.ok || !body.data) throw new Error(body.error || "Pengaturan belum dapat dimuat.");
  return body.data;
}

export function SiteSettingsForm({ owner }: { owner: boolean }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    request().then((data) => { if (active) setSettings(data); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Pengaturan belum dapat dimuat."); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = owner ? settings : { technicianDescription: settings.technicianDescription };
      setSettings(await request({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
      setNotice("Pengaturan berhasil disimpan dan akan tampil pada website.");
    } catch (err) { setError(err instanceof Error ? err.message : "Pengaturan belum dapat disimpan."); }
    finally { setBusy(false); }
  }

  if (!settings) return <div className="admin-account-form">{error ? <p className="admin-error" role="alert">{error}</p> : <p aria-live="polite">Memuat pengaturan...</p>}</div>;
  return <form className="admin-account-form" onSubmit={save}>
    <p>Isi keterangan jasa berdasarkan informasi yang sudah dikonfirmasi pemilik usaha.</p>
    <div className="admin-account-fields"><label className="admin-settings-description">Keterangan jasa teknisi<textarea rows={4} maxLength={1000} value={settings.technicianDescription} onChange={(event) => setSettings({ ...settings, technicianDescription: event.target.value })} required /></label>
      {owner && <><label>WhatsApp Admin Utama<input type="tel" value={settings.primaryNumber ?? ""} onChange={(event) => setSettings({ ...settings, primaryNumber: event.target.value })} placeholder="628981213681" maxLength={30} required /></label><label>WhatsApp Admin 2<input type="tel" value={settings.secondaryNumber ?? ""} onChange={(event) => setSettings({ ...settings, secondaryNumber: event.target.value })} placeholder="6285173209025" maxLength={30} required /></label></>}
    </div>
    {owner && <p>Gunakan nomor Indonesia dalam format internasional, misalnya diawali 62.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
    <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan pengaturan"}</button>
  </form>;
}

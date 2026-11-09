"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEvent } from "@/lib/audit";

export function ActivityList() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/owner/activity", { cache: "no-store" });
      const body = await response.json().catch(() => ({})) as { data?: AuditEvent[]; error?: string };
      if (!response.ok || !Array.isArray(body.data)) throw new Error(body.error || "Riwayat belum dapat dimuat.");
      setEvents(body.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Riwayat belum dapat dimuat."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <section className="admin-activity" aria-label="Riwayat aktivitas">
    <div className="admin-activity-heading"><p>Menampilkan hingga 100 aktivitas terbaru.</p><button className="button button-outline-dark" type="button" onClick={() => void load()} disabled={busy}>{busy ? "Memuat..." : "Muat ulang"}</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {events === null ? !error && <p aria-live="polite">Memuat riwayat...</p> : events.length === 0 ? <p>Belum ada aktivitas yang tercatat.</p> : <ol>{events.map((event) => <li key={event.id}><div><strong>{event.summary}</strong><span>{event.actorName} ({event.actorUsername})</span><span>Target: {event.targetType} / {event.targetId}</span></div><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ol>}
  </section>;
}

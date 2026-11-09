"use client";

import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { usePrimaryWhatsApp } from "@/components/whatsapp-provider";
import { whatsappUrl } from "@/lib/shop";

function formatNumber(number: string) {
  return `+${number.slice(0, 2)} ${number.slice(2, 5)}-${number.slice(5, 9)}-${number.slice(9)}`;
}

export function WhatsAppDialog({ number, message, onClose }: { number: string | null; message: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const primaryNumber = usePrimaryWhatsApp();
  const contacts = [
    { label: "Admin Utama", number: primaryNumber },
    { label: "Admin 2", number },
  ];

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
      const first = items[0]; const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, [onClose]);

  return createPortal(<div className="modal-backdrop" onClick={onClose}>
    <div className="contact-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onClick={(event) => event.stopPropagation()}>
      <div className="modal-heading"><div><span className="eyebrow">HUBUNGI DLA AC</span><h2 id={titleId}>Pilih admin WhatsApp.</h2></div><button ref={closeRef} className="icon-button" type="button" aria-label="Tutup" onClick={onClose}><X size={21} /></button></div>
      <p id={descriptionId}>Pilih admin yang ingin Anda hubungi. Pesan Anda akan disiapkan di WhatsApp.</p>
      <div className="contact-options">
        {contacts.map((contact) => {
          const url = whatsappUrl(contact.number, message);
          const content = <><span className="contact-option-icon"><MessageCircle size={20} aria-hidden="true" /></span><span className="contact-option-details"><strong>{contact.label}</strong><span>{contact.number ? formatNumber(contact.number) : "Nomor belum tersedia"}</span></span>{url && <ArrowUpRight size={18} aria-hidden="true" />}</>;
          return url ? <a key={contact.label} className="contact-option" href={url} target="_blank" rel="noopener noreferrer" onClick={onClose}>{content}</a> : <div key={contact.label} className="contact-option contact-option-unavailable" aria-disabled="true">{content}</div>;
        })}
      </div>
    </div>
  </div>, document.body);
}

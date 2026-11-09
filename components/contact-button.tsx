"use client";

import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { WhatsAppDialog } from "@/components/whatsapp-dialog";

export function ContactButton({ number, message, label = "Tanya via WhatsApp", className = "button button-accent" }: { number: string | null; message: string; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return <>
    <button className={className} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}><MessageCircle size={17} /> {label} <ArrowUpRight size={16} /></button>
    {open && <WhatsAppDialog number={number} message={message} onClose={close} />}
  </>;
}

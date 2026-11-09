"use client";

import { createContext, useContext, type ReactNode } from "react";
import { primaryWhatsAppNumber } from "@/lib/shop";

const PrimaryWhatsAppContext = createContext<string | null>(primaryWhatsAppNumber);

export function WhatsAppProvider({ primaryNumber, children }: { primaryNumber: string | null; children: ReactNode }) {
  return <PrimaryWhatsAppContext.Provider value={primaryNumber}>{children}</PrimaryWhatsAppContext.Provider>;
}

export function usePrimaryWhatsApp() {
  return useContext(PrimaryWhatsAppContext);
}

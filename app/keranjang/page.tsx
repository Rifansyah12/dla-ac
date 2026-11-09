import type { Metadata } from "next";
import { Cart } from "@/components/cart/cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";

export const metadata: Metadata = { title: "Keranjang Penawaran | DLA AC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [lots, settings] = await Promise.all([getLots(), getSiteSettings()]);
  const number = settings.secondaryNumber;
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><SiteHeader number={number} /><Cart lots={lots} number={number} /><SiteFooter number={number} /></WhatsAppProvider>;
}

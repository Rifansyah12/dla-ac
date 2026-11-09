import type { Metadata } from "next";
import { Catalog } from "@/components/products/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";

export const metadata: Metadata = { title: "Stok AC Bekas | DLA AC", description: "Jelajahi foto AC bekas untuk kebutuhan borongan dan tanyakan detail penawaran." };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const [lots, settings] = await Promise.all([getLots(), getSiteSettings()]);
  const number = settings.secondaryNumber;
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><SiteHeader number={number} /><Catalog key={query} lots={lots} initialQuery={query} /><SiteFooter number={number} /></WhatsAppProvider>;
}

import type { Metadata } from "next";
import acPhoto from "@/fotoac/ac1.jpeg";
import { Catalog } from "@/components/products/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";
import { socialMetadata } from "@/lib/seo";

const title = "Stok AC Borongan | DLA AC";
const description = "Lihat dokumentasi AC indoor dan outdoor untuk kebutuhan borongan. Tanyakan kondisi, ketersediaan, dan penawaran kepada DLA AC.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/produk" }, ...socialMetadata(title, description, "/produk", { url: acPhoto.src, width: acPhoto.width, height: acPhoto.height, alt: "Dokumentasi stok AC DLA AC" }) };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const [lots, settings] = await Promise.all([getLots(), getSiteSettings()]);
  const number = settings.secondaryNumber;
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><SiteHeader number={number} /><Catalog key={query} lots={lots} initialQuery={query} /><SiteFooter number={number} /></WhatsAppProvider>;
}

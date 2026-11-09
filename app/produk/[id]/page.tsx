import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/product-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const lot = (await getLots()).find((item) => item.id === id);
  return lot ? { title: `${lot.title} | DLA AC`, description: `Dokumentasi ${lot.title} untuk kebutuhan AC bekas borongan.` } : { title: "Dokumentasi tidak ditemukan | DLA AC" };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const lots = await getLots();
  const lot = lots.find((item) => item.id === id);
  if (!lot) notFound();
  const settings = await getSiteSettings();
  const number = settings.secondaryNumber;
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}><SiteHeader number={number} /><ProductDetail key={lot.id} lot={lot} related={lots.filter((item) => item.id !== id).slice(0, 3)} number={number} /><SiteFooter number={number} /></WhatsAppProvider>;
}

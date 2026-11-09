import type { Metadata } from "next";
import { notFound } from "next/navigation";
import acPhoto from "@/fotoac/ac1.jpeg";
import { ProductDetail } from "@/components/products/product-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getLots } from "@/lib/server/inventory";
import { getSiteSettings } from "@/lib/server/site-settings";
import { photoSource } from "@/lib/photos";
import { socialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const lot = (await getLots()).find((item) => item.id === id);
  if (!lot) return { title: "Dokumentasi tidak ditemukan | DLA AC", robots: { index: false, follow: false } };
  const title = `${lot.title} | DLA AC`;
  const detail = lot.description?.replace(/\s+/g, " ").trim() || "Tanyakan kondisi, harga, dan ketersediaan melalui WhatsApp.";
  const description = `${lot.title} (${lot.code}) untuk kebutuhan AC borongan. ${detail}`.slice(0, 160);
  const path = `/produk/${encodeURIComponent(lot.id)}`;
  const source = lot.photos.map(photoSource).find((photo) => photo !== null);
  const image = typeof source === "string" ? { url: source, alt: `Foto ${lot.title}` } : source ? { url: source.src, width: source.width, height: source.height, alt: `Foto ${lot.title}` } : { url: acPhoto.src, width: acPhoto.width, height: acPhoto.height, alt: "Dokumentasi unit AC DLA AC" };
  return { title, description, alternates: { canonical: path }, ...socialMetadata(title, description, path, image) };
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

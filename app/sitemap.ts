import type { MetadataRoute } from "next";
import { getLots } from "@/lib/server/inventory";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lots = await getLots();
  const productPaths = new Set(lots.map((lot) => `${siteUrl}/produk/${encodeURIComponent(lot.id)}`));
  return [{ url: `${siteUrl}/` }, { url: `${siteUrl}/produk` }, { url: `${siteUrl}/tentang` }, ...Array.from(productPaths, (url) => ({ url }))];
}

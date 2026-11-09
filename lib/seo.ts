import type { Metadata } from "next";

export const siteUrl = "https://dla-ac.com";
export const siteTitle = "Jual Beli AC Bekas Borongan & Jasa Teknisi | DLA AC";
export const siteDescription = "Jelajahi stok AC bekas indoor dan outdoor untuk kebutuhan borongan serta tanyakan jasa teknisi AC melalui WhatsApp.";

type ShareImage = { url: string; alt: string; width?: number; height?: number };

export function socialMetadata(title: string, description: string, path: string, image: ShareImage): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type: "website", locale: "id_ID", siteName: "DLA AC", title, description, url: new URL(path, siteUrl).toString(), images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image.url, alt: image.alt }] },
  };
}

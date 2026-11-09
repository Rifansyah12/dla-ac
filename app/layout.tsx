import type { Metadata } from "next";
import acPhoto from "@/fotoac/ac1.jpeg";
import logo from "@/fotoac/logo-dla.png";
import { CartProvider } from "@/components/cart/cart-provider";
import { PhotoViewerProvider } from "@/components/photo-viewer";
import { siteDescription, siteTitle, siteUrl, socialMetadata } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  ...socialMetadata(siteTitle, siteDescription, "/", { url: acPhoto.src, width: acPhoto.width, height: acPhoto.height, alt: "Dokumentasi unit outdoor AC DLA AC" }),
  icons: { icon: logo.src },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><a className="skip-link" href="#konten">Lewati ke konten</a><CartProvider><PhotoViewerProvider>{children}</PhotoViewerProvider></CartProvider></body>
    </html>
  );
}

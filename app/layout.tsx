import type { Metadata } from "next";
import logo from "@/fotoac/logo-dla.png";
import { CartProvider } from "@/components/cart/cart-provider";
import { PhotoViewerProvider } from "@/components/photo-viewer";
import "./globals.css";

export const metadata: Metadata = {
  title: "DLA AC — Jual Beli AC Borongan & Jasa Teknisi",
  description:
    "Jual beli AC untuk kebutuhan borongan dan jasa teknisi AC. Lihat dokumentasi unit bekas atau hubungi DLA AC untuk informasi.",
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

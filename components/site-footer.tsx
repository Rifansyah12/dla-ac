import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ContactButton } from "@/components/contact-button";
import { SiteLogo } from "@/components/site-logo";

export function SiteFooter({ number }: { number: string | null }) {
  return (
    <footer className="site-footer" id="tentang">
      <div className="footer-main shell">
        <div className="footer-brand">
          <SiteLogo />
          <p>
            Jual beli AC untuk kebutuhan borongan serta informasi jasa
            teknisi AC.
          </p>
        </div>
        <div className="footer-links">
          <div>
            <strong>Jelajahi</strong>
            <Link href="/tentang">Tentang kami</Link>
            <Link href="/produk">Stok AC</Link>
            <Link href="/#jasa-teknisi">Jasa teknisi AC</Link>
            <Link href="/keranjang">Keranjang penawaran</Link>
            <Link href="/#cara-pesan">Cara pemesanan</Link>
            <Link href="/#dokumentasi">Dokumentasi</Link>
          </div>
          <div>
            <strong>Informasi</strong>
            {/* <span>Harga, kondisi, jumlah, dan ketersediaan mengikuti konfirmasi pemilik usaha.</span> */}
            <ContactButton
              number={number}
              message="Halo, saya ingin menanyakan AC borongan yang tersedia."
              label="Tanya stok"
              className="footer-contact"
            />
          </div>
          <div>
            <strong>Pengelolaan</strong>
            <Link href="/admin">
              Dashboard admin <ArrowUpRight size={14} />
            </Link>

            <span>Atur data dan foto katalog melalui dashboard admin.</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom shell">
        <span>© {new Date().getFullYear()} DLA AC</span>
      </div>
    </footer>
  );
}

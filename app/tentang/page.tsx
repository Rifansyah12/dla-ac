import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Boxes, MapPin, MessageCircle, Navigation, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import acPhoto from "@/fotoac/ac1.jpeg";
import { ContactButton } from "@/components/contact-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { getSiteSettings } from "@/lib/server/site-settings";
import { socialMetadata } from "@/lib/seo";
import "./tentang.css";

const title = "Tentang Kami & Lokasi | DLA AC";
const description = "Kenali DLA AC, informasi jual beli AC borongan dan jasa teknisi, serta temukan alamat kami di Jl. Terusan Pasir Koja.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/tentang" }, ...socialMetadata(title, description, "/tentang", { url: acPhoto.src, width: acPhoto.width, height: acPhoto.height, alt: "Dokumentasi unit AC DLA AC" }) };
export const dynamic = "force-dynamic";

const address = "Jl. Terusan Pasir Koja, Gg. Bah Amid, RT 06/RW 05";
const mapsUrl = "https://maps.app.goo.gl/UQfnuaceSbpTk8qv8";
const embedUrl = "https://maps.google.com/maps?q=-6.926199%2C107.584214&z=17&output=embed";

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const number = settings.secondaryNumber;
  return <WhatsAppProvider primaryNumber={settings.primaryNumber}>
    <SiteHeader number={number} />
    <main className="about-page" id="konten">
      <section className="about-hero">
        <div className="shell about-hero-inner">
          <nav className="about-breadcrumb" aria-label="Jejak halaman"><Link href="/">BERANDA</Link><span>/</span><span>TENTANG KAMI</span></nav>
          <div className="about-hero-grid">
            <div className="about-hero-copy"><div className="eyebrow"><span className="status-dot" /> DLA AC / TENTANG KAMI</div><h1>Lebih dekat<br />dengan <em>DLA AC.</em></h1><p>Kenali DLA AC, tempat Anda dapat menanyakan kebutuhan jual beli AC borongan dan jasa teknisi AC.</p><div className="about-hero-actions"><a href="#lokasi" className="button button-dark">Lihat lokasi <ArrowDown size={17} /></a><ContactButton number={number} message="Halo DLA AC, saya ingin menanyakan informasi tentang lokasi dan layanan Anda." label="Hubungi kami" className="button button-outline" /></div></div>
            <div className="about-hero-photo"><Image src={acPhoto} alt="Dokumentasi beberapa unit outdoor AC DLA AC" fill priority sizes="(max-width: 800px) 100vw, 50vw" /><span className="about-photo-shade" /><div className="about-photo-caption"><span>FOTO / DOKUMENTASI DLA AC</span><strong>Lihat unitnya.<br />Diskusikan kebutuhan Anda.</strong></div></div>
          </div>
        </div>
      </section>

      <section className="about-services" aria-labelledby="about-services-title"><div className="shell"><div className="about-section-heading"><div><div className="eyebrow"><span>01</span> / YANG KAMI LAKUKAN</div><h2 id="about-services-title">Satu tempat untuk<br /><em>kebutuhan AC Anda.</em></h2></div><p>Mulai dari melihat dokumentasi sampai menanyakan detail, kami siap membantu Anda terhubung dengan informasi yang dibutuhkan.</p></div><div className="about-service-grid"><article className="about-service-card"><span className="about-service-icon"><Boxes size={22} /></span><span className="about-service-number">01 / UNIT AC</span><h3>Jual beli AC borongan</h3><p>Jelajahi dokumentasi unit indoor, outdoor, dan campuran untuk kebutuhan Anda.</p></article><article className="about-service-card"><span className="about-service-icon"><Wrench size={22} /></span><span className="about-service-number">02 / LAYANAN</span><h3>Informasi jasa teknisi</h3><p>{settings.technicianDescription}</p></article><article className="about-service-card"><span className="about-service-icon"><MessageCircle size={22} /></span><span className="about-service-number">03 / KONSULTASI</span><h3>Diskusi langsung</h3><p>Konfirmasi kondisi, jumlah, harga, dan penawaran melalui WhatsApp.</p></article></div></div></section>

      <section className="about-location" id="lokasi" aria-labelledby="about-location-title"><div className="shell about-location-grid"><div className="about-location-copy"><div className="eyebrow"><span>02</span> / LOKASI KAMI</div><h2 id="about-location-title">Temukan<br /><em>DLA AC.</em></h2><p>Ingin mengetahui lokasi kami? Gunakan alamat berikut atau buka peta untuk melihat petunjuk arah.</p><div className="about-address"><span className="about-address-icon"><MapPin size={21} /></span><div><span>ALAMAT DLA AC</span><address>{address}</address></div></div><a className="button button-dark about-maps-button" href={mapsUrl} target="_blank" rel="noopener noreferrer"><Navigation size={17} /> Buka di Google Maps <ArrowUpRight size={17} /></a></div><div className="about-map"><div className="about-map-heading"><span className="about-map-icon"><MapPin size={18} /></span><div><strong>Lokasi DLA AC</strong><small>Titik lokasi di Google Maps</small></div><a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Buka lokasi DLA AC di Google Maps"><ArrowUpRight size={19} /></a></div><iframe title="Peta lokasi DLA AC" src={embedUrl} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></div></div></section>
    </main>
    <SiteFooter number={number} />
  </WhatsAppProvider>;
}

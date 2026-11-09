import { ArrowDown, ArrowRight, ArrowUpRight, Boxes, Camera, CheckCircle2, ClipboardList, MessageCircle, Snowflake, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ContactButton } from "@/components/contact-button";
import { PhotoPreview } from "@/components/photo-viewer";
import { ProductCard } from "@/components/products/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { clientPhotos } from "@/lib/photos";
import type { Lot } from "@/lib/lots";

const generalMessage = "Halo, saya ingin menanyakan jual beli AC untuk kebutuhan borongan.";
const technicianMessage = "Halo, saya ingin menanyakan jasa teknisi AC dari DLA AC.";
const galleryPhotos = [clientPhotos[3], clientPhotos[5], clientPhotos[6]];
const galleryImages = galleryPhotos.map((photo) => ({ src: photo.image, alt: `Foto dokumentasi ${photo.label.toLowerCase()}` }));

export function HomePage({ lots, number, technicianDescription }: { lots: Lot[]; number: string | null; technicianDescription: string }) {
  return <><SiteHeader number={number} /><main className="home-page" id="konten"><section className="hero">
    <div className="hero-inner shell">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="status-dot" /> DLA AC / JUAL BELI AC BORONGAN</div>
        <h1>Jual beli AC.<br /><span>Untuk kebutuhan</span><br /><em>borongan.</em></h1>
        <p>Temukan dokumentasi unit AC indoor dan outdoor untuk kebutuhan borongan, atau hubungi kami untuk menanyakan jasa teknisi AC.</p>
        <div className="hero-actions"><Link className="button button-dark" href="/produk">Jelajahi stok AC <ArrowUpRight size={18} /></Link><ContactButton number={number} message={generalMessage} label="Tanya via WhatsApp" className="hero-contact" /></div>
        <a className="hero-scroll" href="#stok"><span><ArrowDown size={16} /></span> LIHAT DOKUMENTASI</a>
      </div>
      <div className="hero-visual">
        <PhotoPreview photos={[{ src: clientPhotos[0].image, alt: "Foto beberapa unit outdoor AC Daikin" }]} label="Perbesar foto outdoor AC" className="hero-main-photo"><Image src={clientPhotos[0].image} alt="Foto beberapa unit outdoor AC Daikin" fill priority sizes="(max-width: 850px) 100vw, 50vw" /><span className="hero-photo-shade" /><span className="hero-photo-caption"><span>AC / DLA AC</span><strong>Lihat unitnya.<br />Tanyakan detailnya.</strong><small>Foto asli untuk membantu Anda mengenali unit.</small></span></PhotoPreview>
        <PhotoPreview photos={[{ src: clientPhotos[3].image, alt: "Foto unit indoor dan outdoor AC" }]} label="Perbesar foto indoor dan outdoor AC" className="hero-side-photo"><Image src={clientPhotos[3].image} alt="Foto unit indoor dan outdoor AC" fill sizes="(max-width: 850px) 40vw, 15vw" /><span>INDOOR / OUTDOOR</span></PhotoPreview>
        <div className="hero-tag"><span className="hero-tag-icon"><Snowflake size={23} aria-hidden="true" /></span><div><strong>DLA AC</strong><small>JUAL BELI AC &amp; TEKNISI</small></div></div>
        <div className="hero-visual-label" aria-hidden="true">DOKUMENTASI / AC</div>
      </div>
    </div>
    <div className="hero-bottom shell">
      <div className="hero-proof"><span className="hero-proof-icon"><Camera size={19} aria-hidden="true" /></span><span><strong>Foto dokumentasi asli</strong><small>Kenali unit lebih dekat</small></span></div>
      <div className="hero-proof"><span className="hero-proof-icon"><Boxes size={19} aria-hidden="true" /></span><span><strong>Indoor &amp; outdoor</strong><small>Untuk kebutuhan borongan</small></span></div>
      <Link href="/#jasa-teknisi" className="hero-proof"><span className="hero-proof-icon"><Wrench size={19} aria-hidden="true" /></span><span><strong>Jasa teknisi AC</strong><small>Tanyakan kebutuhan Anda</small></span></Link>
    </div>
  </section>

    <div className="notice-bar"><div className="shell"><span className="notice-dot" /><p>Hubungi DLA AC untuk informasi kondisi, harga, jumlah, dan ketersediaan unit.</p><Link href="/produk">Lihat katalog <ArrowRight size={15} /></Link></div></div>

    <section className="technician-section" id="jasa-teknisi" aria-labelledby="technician-title"><div className="shell"><div className="technician-inner"><span className="technician-icon"><Wrench size={27} aria-hidden="true" /></span><div className="technician-copy"><div className="eyebrow">LAYANAN / JASA TEKNISI AC</div><h2 id="technician-title">Butuh bantuan <em>teknisi AC?</em></h2><p>{technicianDescription}</p></div><ContactButton number={number} message={technicianMessage} label="Tanya jasa teknisi" className="button button-dark" /></div></div></section>

    <section className="lot-section section-space" id="stok"><div className="shell">
      <div className="section-heading"><div><div className="eyebrow"><span>01</span> / JELAJAHI KOLEKSI</div><h2>Temukan unit<br /><em>yang Anda cari.</em></h2></div><div className="section-heading-side"><p>Lihat lebih dekat dokumentasi unit AC untuk berbagai kebutuhan borongan.</p><Link href="/produk" className="text-link">Lihat seluruh katalog <ArrowRight size={17} /></Link></div></div>
      <div className="home-catalog-label"><span>FOTO &amp; DOKUMENTASI</span><span>{String(lots.length).padStart(2, "0")} DOKUMENTASI / LOT</span></div>
      {lots.length ? <div className="lot-grid">{lots.slice(0, 4).map((lot) => <ProductCard key={lot.id} lot={lot} />)}</div> : <div className="empty-state"><h3>Belum ada unit yang ditampilkan.</h3><p>Hubungi pemilik usaha untuk menanyakan ketersediaan.</p></div>}
      <div className="section-end"><span>FOTO &amp; DETAIL SESUAI DATA PEMILIK</span><Link href="/produk" className="button button-outline">Jelajahi semua foto <ArrowRight size={17} /></Link></div>
    </div></section>

    <section className="bulk-section"><div className="bulk-inner shell"><div className="bulk-copy"><div className="eyebrow"><span>02</span> / KEBUTUHAN BORONGAN</div><h2>Beragam unit.<br /><em>Satu tujuan.</em></h2><p>Setiap unit AC memiliki kondisi dan kelengkapan yang berbeda. Mulai dari foto, lalu diskusikan rincian yang Anda butuhkan bersama kami.</p><div className="bulk-points"><div><CheckCircle2 size={18} /><span>Foto dokumentasi unit AC</span></div><div><CheckCircle2 size={18} /><span>Indoor, outdoor, dan unit campuran</span></div><div><CheckCircle2 size={18} /><span>Diskusikan jumlah dan harga terlebih dahulu</span></div></div><ContactButton number={number} message={generalMessage} label="Tanyakan kebutuhan Anda" className="button button-accent" /></div><div className="bulk-visual"><PhotoPreview photos={[{ src: clientPhotos[2].image, alt: "Foto beberapa unit outdoor AC merek Daikin dan Haier" }]} label="Perbesar foto AC Daikin dan Haier" className="bulk-image"><Image src={clientPhotos[2].image} alt="Foto beberapa unit outdoor AC merek Daikin dan Haier" fill sizes="(max-width: 850px) 100vw, 50vw" /></PhotoPreview><div className="bulk-caption"><span>FOTO 03 / DOKUMENTASI</span><strong>Kenali unitnya.<br />Konfirmasi detailnya.</strong></div></div></div></section>

    <section className="steps-section section-space" id="cara-pesan"><div className="shell"><div className="section-heading"><div><div className="eyebrow"><span>03</span> / CARA PEMESANAN</div><h2>Semudah<br /><em>mulai percakapan.</em></h2></div><p>Tiga langkah sederhana untuk mendiskusikan kebutuhan AC Anda.</p></div><div className="steps-grid"><div className="step"><span className="step-number">01</span><Boxes size={23} /><h3>Lihat dokumentasi</h3><p>Pilih foto atau lot AC yang ingin Anda tanyakan.</p></div><div className="step"><span className="step-number">02</span><ClipboardList size={23} /><h3>Sampaikan kebutuhan</h3><p>Cantumkan perkiraan jumlah unit dan lokasi tujuan Anda.</p></div><div className="step"><span className="step-number">03</span><MessageCircle size={23} /><h3>Konfirmasi penawaran</h3><p>Diskusikan kondisi, ketersediaan, harga, dan pengiriman bersama penjual.</p></div></div></div></section>

    <section className="gallery-section section-space" id="dokumentasi"><div className="shell"><div className="section-heading"><div><div className="eyebrow"><span>04</span> / FOTO UNIT AC</div><h2>Lebih dekat<br /><em>dengan unitnya.</em></h2></div><p>Lihat dokumentasi unit AC dan hubungi kami untuk informasi lebih lanjut.</p></div><div className="gallery-grid">{galleryPhotos.map((photo, index) => <PhotoPreview photos={galleryImages} initialIndex={index} label={`Perbesar foto ${photo.label}`} className="gallery-photo" key={photo.id}><Image src={photo.image} alt={`Foto dokumentasi ${photo.label.toLowerCase()}`} fill sizes="(max-width: 600px) 80vw, 33vw" /><span className="gallery-caption"><span>0{index + 1} / FOTO ASLI</span><strong>{photo.label}</strong></span></PhotoPreview>)}</div><div className="gallery-end"><span>DLA AC / DOKUMENTASI UNIT</span><Link href="/produk" className="text-link">Jelajahi katalog <ArrowRight size={17} /></Link></div></div></section>

    <section className="final-cta"><div className="final-inner shell"><div><div className="eyebrow"><span className="status-dot" /> SIAP MULAI BERTANYA?</div><h2>Ceritakan kebutuhan<br /><em>AC Anda.</em></h2><p>Diskusikan kebutuhan jual beli AC borongan bersama kami.</p></div><ContactButton number={number} message={generalMessage} label="Tanya via WhatsApp" className="button button-accent" /></div></section></main><SiteFooter number={number} /></>;
}

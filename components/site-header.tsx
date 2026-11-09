"use client";

import { ArrowRight, LogIn, Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ContactButton } from "@/components/contact-button";
import { useCart } from "@/components/cart/cart-provider";
import { SiteLogo } from "@/components/site-logo";

const links = [{ label: "Beranda", href: "/" }, { label: "Stok AC", href: "/produk" }, { label: "Jasa teknisi", href: "/#jasa-teknisi" }, { label: "Cara pesan", href: "/#cara-pesan" }, { label: "Dokumentasi", href: "/#dokumentasi" }];
const message = "Halo, saya ingin menanyakan AC borongan yang tersedia.";

export function SiteHeader({ number }: { number: string | null }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { items, ready } = useCart();
  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setSearchOpen(false); setMenuOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, menuOpen]);
  return <header className="site-header"><div className="header-inner shell"><SiteLogo /><nav className="desktop-nav" aria-label="Navigasi utama">{links.map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}</nav><div className="header-actions"><button className="icon-button" type="button" aria-label="Cari stok" aria-expanded={searchOpen} aria-controls="site-search" onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}><Search size={19} /></button><Link className="header-cart" href="/keranjang" aria-label={ready ? `Keranjang, ${items.length} pilihan` : "Keranjang"} title="Lihat keranjang"><ShoppingBag size={19} /><span aria-hidden="true">{items.length}</span></Link><span className="header-contact"><ContactButton number={number} message={message} label="Tanya stok" className="header-cta" /></span><Link className="header-login" href="/admin" aria-label="Login Admin / Owner" title="Login Admin / Owner"><LogIn size={17} aria-hidden="true" /><span>Login Admin / Owner</span></Link><button className="icon-button mobile-menu-button" type="button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></div>
    {searchOpen && <form id="site-search" className="search-panel" role="search" action="/produk" method="get"><Search size={19} /><input autoFocus type="search" name="q" placeholder="Cari merek, jenis, atau kode foto" aria-label="Cari stok" /><button type="submit">Cari <ArrowRight size={16} /></button></form>}
    {menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label="Navigasi seluler">{links.map((link) => <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowRight size={17} /></Link>)}<Link href="/admin" className="mobile-login" onClick={() => setMenuOpen(false)}><span><LogIn size={17} aria-hidden="true" /> Login Admin / Owner</span><ArrowRight size={17} /></Link><ContactButton number={number} message={message} label="Tanya stok" className="mobile-contact" /></nav>}
  </header>;
}

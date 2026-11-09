import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PhotoPreview } from "@/components/photo-viewer";
import { photoSource } from "@/lib/photos";
import { priceLabel, statusLabels, type Lot } from "@/lib/lots";

export function ProductCard({ lot }: { lot: Lot }) {
  const photos = lot.photos.flatMap((id, index) => {
    const src = photoSource(id);
    return src ? [{ src, alt: `Foto ${index + 1} ${lot.title}` }] : [];
  });
  const photo = photos[0]?.src;
  return <article className="lot-card">
    {photo ? <PhotoPreview photos={photos} label={`Perbesar foto ${lot.title}`} className="lot-image"><Image src={photo} alt={`Foto ${lot.title}`} fill sizes="(max-width: 600px) 50vw, (max-width: 900px) 50vw, 33vw" unoptimized={typeof photo === "string"} /><span className="lot-image-overlay" /><span className="lot-image-code">{lot.code}</span></PhotoPreview> : <Link href={`/produk/${lot.id}`} className="lot-image" aria-label={`Lihat detail ${lot.title}`}><span className="missing-photo">Foto belum tersedia</span></Link>}
    <div className="lot-info"><div className="lot-meta"><span>{lot.kind}</span><span className={`status status-${lot.status}`}>{statusLabels[lot.status]}</span></div><h3><Link href={`/produk/${lot.id}`}>{lot.title}</Link></h3><p>{lot.brand || "Merek belum dikonfirmasi"} <span>·</span> {lot.quantity === null ? "Jumlah perlu konfirmasi" : `${lot.quantity.toLocaleString("id-ID")} unit`}</p><div className="lot-bottom"><div><span>HARGA</span><strong>{priceLabel(lot)}</strong></div><Link href={`/produk/${lot.id}`}>Lihat detail <ArrowUpRight size={15} /></Link></div><AddToCartButton lotId={lot.id} title={lot.title} status={lot.status} className="lot-cart-button" /></div>
  </article>;
}

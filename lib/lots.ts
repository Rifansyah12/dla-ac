export const unitKinds = ["Outdoor", "Indoor", "Indoor & Outdoor", "Campuran"] as const;
export const stockStatuses = ["perlu-konfirmasi", "tersedia", "dalam-penawaran", "terjual"] as const;

export type Lot = {
  id: string;
  code: string;
  title: string;
  brand: string;
  kind: (typeof unitKinds)[number];
  capacity: string;
  quantity: number | null;
  composition: string;
  condition: string;
  location: string;
  price: number | null;
  priceUnit: "unit" | "lot";
  status: (typeof stockStatuses)[number];
  description: string;
  photos: string[];
  isExample: boolean;
};

export const statusLabels: Record<Lot["status"], string> = {
  "perlu-konfirmasi": "Perlu konfirmasi",
  tersedia: "Tersedia",
  "dalam-penawaran": "Dalam penawaran",
  terjual: "Terjual",
};

const empty = {
  capacity: "", quantity: null, composition: "", condition: "", location: "", price: null,
  priceUnit: "lot" as const, status: "perlu-konfirmasi" as const,
  description: "Hubungi DLA AC untuk informasi kondisi, jumlah, harga, dan ketersediaan unit.",
  isExample: true,
};

// Setiap foto ditampilkan sebagai contoh terpisah; pengelompokan lot belum dikonfirmasi.
export const exampleLots: Lot[] = [
  { ...empty, id: "foto-01", code: "FOTO-01", title: "Dokumentasi outdoor Daikin", brand: "Daikin", kind: "Outdoor", photos: ["client:ac1.jpeg"] },
  { ...empty, id: "foto-02", code: "FOTO-02", title: "Dokumentasi AC bekas campuran", brand: "Campuran", kind: "Campuran", photos: ["client:ac2.jpeg"] },
  { ...empty, id: "foto-03", code: "FOTO-03", title: "Dokumentasi outdoor Daikin & Haier", brand: "Daikin, Haier", kind: "Outdoor", photos: ["client:ac3.jpeg"] },
  { ...empty, id: "foto-04", code: "FOTO-04", title: "Dokumentasi unit indoor & outdoor", brand: "Campuran", kind: "Indoor & Outdoor", photos: ["client:ac4.jpeg"] },
  { ...empty, id: "foto-06", code: "FOTO-06", title: "Dokumentasi outdoor Daikin", brand: "Daikin", kind: "Outdoor", photos: ["client:ac6.jpeg"] },
  { ...empty, id: "foto-07", code: "FOTO-07", title: "Dokumentasi outdoor Sharp & indoor", brand: "Sharp", kind: "Indoor & Outdoor", photos: ["client:ac7.jpeg"] },
  { ...empty, id: "foto-08", code: "FOTO-08", title: "Dokumentasi AC bekas campuran", brand: "Campuran", kind: "Campuran", photos: ["client:ac8.jpeg"] },
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price).replace(/\s/g, " ");
}

export function priceLabel(lot: Lot): string {
  return lot.price === null ? "Tanya harga" : `${formatPrice(lot.price)} / ${lot.priceUnit === "unit" ? "unit" : "lot"}`;
}

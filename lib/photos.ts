import type { StaticImageData } from "next/image";
import ac1 from "@/fotoac/ac1.jpeg";
import ac2 from "@/fotoac/ac2.jpeg";
import ac3 from "@/fotoac/ac3.jpeg";
import ac4 from "@/fotoac/ac4.jpeg";
import ac6 from "@/fotoac/ac6.jpeg";
import ac7 from "@/fotoac/ac7.jpeg";
import ac8 from "@/fotoac/ac8.jpeg";

export const clientPhotos = [
  { id: "client:ac1.jpeg", image: ac1, label: "Outdoor Daikin" },
  { id: "client:ac2.jpeg", image: ac2, label: "Unit indoor dan outdoor" },
  { id: "client:ac3.jpeg", image: ac3, label: "Outdoor Daikin dan Haier" },
  { id: "client:ac4.jpeg", image: ac4, label: "Unit indoor dan outdoor" },
  { id: "client:ac6.jpeg", image: ac6, label: "Outdoor dan unit AC" },
  { id: "client:ac7.jpeg", image: ac7, label: "Outdoor Sharp dan unit indoor" },
  { id: "client:ac8.jpeg", image: ac8, label: "Dokumentasi unit AC" },
] as const;

export function photoSource(id: string): StaticImageData | string | null {
  const photo = clientPhotos.find((item) => item.id === id);
  if (photo) return photo.image;
  if (/^upload:[a-f0-9-]+\.(jpg|png|webp)$/.test(id)) return `/api/images/${id.slice(7)}`;
  return null;
}

export function validPhotoId(id: string): boolean {
  return photoSource(id) !== null;
}

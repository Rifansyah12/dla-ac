const defaultWhatsAppNumber = "6285173209025";
export const primaryWhatsAppNumber = "628981213681";
export const defaultTechnicianDescription = "Diskusikan kebutuhan teknisi AC Anda bersama DLA AC. Hubungi kami untuk menanyakan layanan, jadwal, dan biaya.";

export type SiteSettings = { primaryNumber: string | null; secondaryNumber: string | null; technicianDescription: string };

export function normalizeWhatsAppNumber(value: string): string | null {
  const number = value.replace(/[\s()+-]/g, "");
  return /^62\d{8,13}$/.test(number) ? number : null;
}

export function shopWhatsApp(): string | null {
  return normalizeWhatsAppNumber(process.env.WHATSAPP_NUMBER?.trim() || defaultWhatsAppNumber);
}

export function whatsappUrl(number: string | null, message: string): string | null {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

import type { RowDataPacket } from "mysql2/promise";
import { defaultTechnicianDescription, normalizeWhatsAppNumber, primaryWhatsAppNumber, shopWhatsApp, type SiteSettings } from "@/lib/shop";
import { catalogStorage, databasePool } from "./database";
import type { Account } from "./accounts";
import { recordAudit } from "./audit";

export class SiteSettingsError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type SettingRow = RowDataPacket & { setting_key: string; setting_value: string };

export async function getSiteSettings(): Promise<SiteSettings> {
  const defaults = { primaryNumber: primaryWhatsAppNumber, secondaryNumber: shopWhatsApp(), technicianDescription: defaultTechnicianDescription };
  if (catalogStorage() !== "mysql") return defaults;
  const [rows] = await databasePool().query<SettingRow[]>("SELECT setting_key, setting_value FROM ac_site_settings WHERE setting_key IN ('whatsapp_primary', 'whatsapp_secondary', 'technician_description')");
  const values = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  const primary = values.get("whatsapp_primary");
  const secondary = values.get("whatsapp_secondary");
  const description = values.get("technician_description");
  return {
    primaryNumber: primary === undefined ? defaults.primaryNumber : normalizeWhatsAppNumber(primary),
    secondaryNumber: secondary === undefined ? defaults.secondaryNumber : normalizeWhatsAppNumber(secondary),
    technicianDescription: description === undefined ? defaults.technicianDescription : description,
  };
}

export async function updateSiteSettings(value: unknown, actor: Account): Promise<void> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SiteSettingsError("Data tidak valid.");
  const input = value as Record<string, unknown>;
  if (typeof input.technicianDescription !== "string" || !input.technicianDescription.trim() || input.technicianDescription.trim().length > 1000) throw new SiteSettingsError("Keterangan jasa wajib diisi dan maksimal 1000 karakter.");
  const entries: [string, string][] = [["technician_description", input.technicianDescription.trim()]];
  const hasNumbers = Object.hasOwn(input, "primaryNumber") || Object.hasOwn(input, "secondaryNumber");
  if (hasNumbers && actor.role !== "owner") throw new SiteSettingsError("Hanya owner yang dapat mengubah nomor WhatsApp.", 403);
  if (hasNumbers) {
    const primary = typeof input.primaryNumber === "string" ? normalizeWhatsAppNumber(input.primaryNumber) : null;
    const secondary = typeof input.secondaryNumber === "string" ? normalizeWhatsAppNumber(input.secondaryNumber) : null;
    if (!primary || !secondary) throw new SiteSettingsError("Isi kedua nomor WhatsApp Indonesia dalam format internasional, misalnya 628123456789.");
    entries.push(["whatsapp_primary", primary], ["whatsapp_secondary", secondary]);
  }
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, setting] of entries) {
      await connection.execute("INSERT INTO ac_site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)", [key, setting]);
    }
    await recordAudit(connection, actor, "settings.updated", "settings", "site", hasNumbers ? "Memperbarui keterangan jasa dan nomor WhatsApp." : "Memperbarui keterangan jasa teknisi.");
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

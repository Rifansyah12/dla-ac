import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { exampleLots, stockStatuses, unitKinds, type Lot } from "@/lib/lots";
import { validPhotoId } from "@/lib/photos";
import { catalogStorage } from "./database";
import type { AuditActor } from "./audit";
import { deleteDatabaseLot, getDatabaseLots, saveDatabaseLot } from "./database-inventory";
import { InventoryError } from "./inventory-error";

export { InventoryError, InventoryPermissionError } from "./inventory-error";

export const dataDir = process.env.AC_DATA_DIR ? path.resolve(process.env.AC_DATA_DIR) : path.join(process.cwd(), "data");
export const uploadsDir = path.join(dataDir, "uploads");
const inventoryFile = path.join(dataDir, "lots.json");
let writeQueue: Promise<void> = Promise.resolve();

export async function getLots(): Promise<Lot[]> {
  if (catalogStorage() === "mysql") return getDatabaseLots();
  try {
    const parsed: unknown = JSON.parse(await readFile(inventoryFile, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Data katalog tidak valid");
    return parsed as Lot[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(exampleLots);
    throw error;
  }
}

function text(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== "string") throw new InventoryError(`${label} tidak valid.`);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new InventoryError(`${label} harus diisi dan maksimal ${max} karakter.`);
  return result;
}

function optionalNumber(value: unknown, max: number, label: string): number | null {
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > max) throw new InventoryError(`${label} harus berupa angka yang valid.`);
  return value;
}

async function validateLot(value: unknown, id: string): Promise<Lot> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InventoryError("Data lot tidak valid.");
  const input = value as Record<string, unknown>;
  const code = text(input.code, 32, "Kode", true).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) throw new InventoryError("Kode hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah.");
  const kind = text(input.kind, 40, "Jenis", true);
  const status = text(input.status, 40, "Status", true);
  if (!unitKinds.includes(kind as Lot["kind"])) throw new InventoryError("Jenis unit tidak valid.");
  if (!stockStatuses.includes(status as Lot["status"])) throw new InventoryError("Status tidak valid.");
  if (input.priceUnit !== "unit" && input.priceUnit !== "lot") throw new InventoryError("Satuan harga tidak valid.");
  if (typeof input.isExample !== "boolean") throw new InventoryError("Penanda contoh tidak valid.");
  if (!Array.isArray(input.photos) || input.photos.length < 1 || input.photos.length > 8 || !input.photos.every((item) => typeof item === "string" && validPhotoId(item))) throw new InventoryError("Pilih 1 sampai 8 foto yang valid.");
  const photos = [...new Set(input.photos as string[])];
  for (const photo of photos) {
    if (photo.startsWith("upload:")) {
      try { await stat(path.join(uploadsDir, photo.slice(7))); } catch { throw new InventoryError("Foto unggahan tidak ditemukan."); }
    }
  }
  return {
    id, code,
    title: text(input.title, 120, "Judul", true),
    brand: text(input.brand, 80, "Merek"),
    kind: kind as Lot["kind"],
    capacity: text(input.capacity, 50, "Kapasitas"),
    quantity: optionalNumber(input.quantity, 100000, "Jumlah unit"),
    composition: text(input.composition, 160, "Komposisi"),
    condition: text(input.condition, 160, "Kondisi"),
    location: text(input.location, 100, "Lokasi"),
    price: optionalNumber(input.price, 1000000000000, "Harga"),
    priceUnit: input.priceUnit,
    status: status as Lot["status"],
    description: text(input.description, 2000, "Keterangan"),
    photos,
    isExample: input.isExample,
  };
}

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function saveLots(lots: Lot[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const temporary = path.join(dataDir, `.lots-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(lots, null, 2), "utf8");
  await rename(temporary, inventoryFile);
}

export async function saveLot(value: unknown, id?: string, canChangePrice = true, actor?: AuditActor): Promise<Lot> {
  if (catalogStorage() === "mysql") {
    const lot = await validateLot(value, id ?? randomUUID());
    return saveDatabaseLot(lot, Boolean(id), canChangePrice, actor);
  }
  return withWriteLock(async () => {
    const lots = await getLots();
    if (id && !lots.some((lot) => lot.id === id)) throw new InventoryError("Lot tidak ditemukan.");
    const lot = await validateLot(value, id ?? randomUUID());
    if (lots.some((item) => item.id !== lot.id && item.code.toUpperCase() === lot.code)) throw new InventoryError("Kode lot sudah digunakan.");
    const next = id ? lots.map((item) => item.id === id ? lot : item) : [lot, ...lots];
    await saveLots(next);
    return lot;
  });
}

export async function deleteLot(id: string, actor?: AuditActor): Promise<void> {
  if (catalogStorage() === "mysql") return deleteDatabaseLot(id, actor);
  return withWriteLock(async () => {
    const lots = await getLots();
    if (!lots.some((lot) => lot.id === id)) throw new InventoryError("Lot tidak ditemukan.");
    await saveLots(lots.filter((lot) => lot.id !== id));
  });
}

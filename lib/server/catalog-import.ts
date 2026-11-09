import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { exampleLots, stockStatuses, unitKinds, type Lot } from "@/lib/lots";
import { databasePool } from "./database";
import { insertDatabaseLot, lockCatalog } from "./database-inventory";

const lotKeys = new Set(["id", "code", "title", "brand", "kind", "capacity", "quantity", "composition", "condition", "location", "price", "priceUnit", "status", "description", "photos", "isExample"]);

function validateImportedLots(value: unknown): Lot[] {
  if (!Array.isArray(value)) throw new Error("Data katalog harus berupa array.");
  const ids = new Set<string>();
  const codes = new Set<string>();
  return value.map((item: unknown, index): Lot => {
    const fail = (field: string): never => { throw new Error(`Lot ke-${index + 1}: ${field} tidak dapat diimpor tanpa mengubah data.`); };
    if (!item || typeof item !== "object" || Array.isArray(item)) return fail("data");
    const lot = item as Record<string, unknown>;
    for (const key of Object.keys(lot)) if (!lotKeys.has(key)) fail(`field ${key}`);
    const text = (field: string, max: number, required = false): string => {
      const input = lot[field];
      if (typeof input !== "string" || input.length > max || (required && !input)) return fail(field);
      return input;
    };
    const number = (field: string, max: number): number | null => {
      const input = lot[field];
      if (input === null) return null;
      if (typeof input !== "number" || !Number.isSafeInteger(input) || input < 0 || input > max) return fail(field);
      return input;
    };
    const id = text("id", 80, true);
    const code = text("code", 32, true);
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code) || ids.has(id) || codes.has(code.toUpperCase())) fail("ID atau kode lot");
    ids.add(id); codes.add(code.toUpperCase());
    const kind = text("kind", 40, true);
    const status = text("status", 40, true);
    if (!unitKinds.includes(kind as Lot["kind"])) fail("jenis unit");
    if (!stockStatuses.includes(status as Lot["status"])) fail("status");
    if (lot.priceUnit !== "unit" && lot.priceUnit !== "lot") fail("satuan harga");
    if (typeof lot.isExample !== "boolean") fail("penanda contoh");
    if (!Array.isArray(lot.photos) || !lot.photos.every((photo) => typeof photo === "string" && photo.length <= 255)) fail("foto");
    return {
      id, code, title: text("title", 120), brand: text("brand", 80), kind: kind as Lot["kind"],
      capacity: text("capacity", 50), quantity: number("quantity", 4294967295), composition: text("composition", 160),
      condition: text("condition", 160), location: text("location", 100), price: number("price", Number.MAX_SAFE_INTEGER),
      priceUnit: lot.priceUnit as Lot["priceUnit"], status: status as Lot["status"], description: text("description", 2000),
      photos: lot.photos as string[], isExample: lot.isExample as boolean,
    };
  });
}

async function readLegacyCatalog(directory: string): Promise<{ lots: Lot[]; source: "file" | "examples" }> {
  let contents: string;
  try {
    contents = await readFile(path.join(directory, "lots.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { lots: structuredClone(exampleLots), source: "examples" };
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(contents); }
  catch { throw new Error("File lots.json bukan JSON yang valid. Impor dibatalkan."); }
  return { lots: validateImportedLots(parsed), source: "file" };
}

export async function importCatalog(directory: string): Promise<{ imported: boolean; count: number; source?: "file" | "examples" }> {
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    if (await lockCatalog(connection)) {
      await connection.commit();
      return { imported: false, count: 0 };
    }
    const [existing] = await connection.query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM ac_lots");
    if (existing[0].total !== 0) throw new Error("Database sudah berisi lot yang belum ditandai sebagai hasil impor. Impor dibatalkan.");
    const { lots, source } = await readLegacyCatalog(directory);
    for (const [index, lot] of lots.entries()) await insertDatabaseLot(connection, lot, index);
    await connection.execute("UPDATE ac_catalog_state SET initialized = 1 WHERE id = 1");
    await connection.commit();
    return { imported: true, count: lots.length, source };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { Lot } from "@/lib/lots";
import { databasePool } from "./database";
import { recordAudit, type AuditActor } from "./audit";
import { InventoryError, InventoryPermissionError } from "./inventory-error";

type StateRow = RowDataPacket & { initialized: number };
type LotRow = RowDataPacket & {
  id: string; code: string; title: string; brand: string; kind: Lot["kind"]; capacity: string;
  quantity: number | null; composition: string; unit_condition: string; location: string;
  price: number | string | null; price_unit: Lot["priceUnit"]; status: Lot["status"];
  description: string; is_example: number;
};
type PhotoRow = RowDataPacket & { lot_id: string; photo_id: string };

export async function lockCatalog(connection: PoolConnection): Promise<boolean> {
  const [rows] = await connection.query<StateRow[]>("SELECT initialized FROM ac_catalog_state WHERE id = 1 FOR UPDATE");
  if (rows.length !== 1) throw new Error("Skema katalog belum disiapkan. Jalankan migrasi database.");
  return Boolean(rows[0].initialized);
}

async function withCatalogTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    if (!await lockCatalog(connection)) throw new Error("Katalog database belum diimpor. Jalankan impor katalog terlebih dahulu.");
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export async function insertDatabaseLot(connection: PoolConnection, lot: Lot, sortOrder: number): Promise<void> {
  await connection.execute(
    `INSERT INTO ac_lots (id, code, title, brand, kind, capacity, quantity, composition, unit_condition, location, price, price_unit, status, description, is_example, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lot.id, lot.code, lot.title, lot.brand, lot.kind, lot.capacity, lot.quantity, lot.composition, lot.condition, lot.location, lot.price, lot.priceUnit, lot.status, lot.description, lot.isExample ? 1 : 0, sortOrder],
  );
  await insertPhotos(connection, lot);
}

async function insertPhotos(connection: PoolConnection, lot: Lot): Promise<void> {
  for (const [index, photo] of lot.photos.entries()) {
    await connection.execute("INSERT INTO ac_lot_photos (lot_id, photo_order, photo_id) VALUES (?, ?, ?)", [lot.id, index, photo]);
  }
}

export async function getDatabaseLots(): Promise<Lot[]> {
  return withCatalogTransaction(async (connection) => {
    const [rows] = await connection.query<LotRow[]>("SELECT * FROM ac_lots ORDER BY sort_order, id");
    const [photos] = await connection.query<PhotoRow[]>("SELECT lot_id, photo_id FROM ac_lot_photos ORDER BY lot_id, photo_order");
    const photosByLot = new Map<string, string[]>();
    for (const photo of photos) {
      const list = photosByLot.get(photo.lot_id) ?? [];
      list.push(photo.photo_id);
      photosByLot.set(photo.lot_id, list);
    }
    return rows.map((row) => {
      const price = row.price === null ? null : Number(row.price);
      if (price !== null && !Number.isSafeInteger(price)) throw new Error("Harga katalog database tidak dapat dibaca dengan aman.");
      return {
        id: row.id, code: row.code, title: row.title, brand: row.brand, kind: row.kind,
        capacity: row.capacity, quantity: row.quantity, composition: row.composition,
        condition: row.unit_condition, location: row.location, price, priceUnit: row.price_unit,
        status: row.status, description: row.description, photos: photosByLot.get(row.id) ?? [],
        isExample: Boolean(row.is_example),
      };
    });
  });
}

export async function saveDatabaseLot(lot: Lot, updating: boolean, canChangePrice = true, actor?: AuditActor): Promise<Lot> {
  return withCatalogTransaction(async (connection) => {
    const [existing] = await connection.execute<(RowDataPacket & { id: string; price: number | string | null; price_unit: Lot["priceUnit"]; status: Lot["status"]; quantity: number | null })[]>("SELECT id, price, price_unit, status, quantity FROM ac_lots WHERE id = ?", [lot.id]);
    if (updating && existing.length === 0) throw new InventoryError("Lot tidak ditemukan.");
    if (!updating && existing.length !== 0) throw new InventoryError("ID lot sudah digunakan.");
    if (!canChangePrice) {
      const originalPrice = existing[0]?.price === null ? null : Number(existing[0]?.price);
      if (updating ? originalPrice !== lot.price || existing[0].price_unit !== lot.priceUnit : lot.price !== null || lot.priceUnit !== "lot") {
        throw new InventoryPermissionError("Anda tidak memiliki izin mengubah harga.");
      }
    }
    const [duplicate] = await connection.execute<RowDataPacket[]>("SELECT id FROM ac_lots WHERE code = ? AND id <> ?", [lot.code, lot.id]);
    if (duplicate.length) throw new InventoryError("Kode lot sudah digunakan.");

    if (updating) {
      const changes: string[] = [];
      if (actor) {
        if (existing[0].status !== lot.status) changes.push(`status ${existing[0].status} → ${lot.status}`);
        if (existing[0].quantity !== lot.quantity) changes.push("jumlah");
        const oldPrice = existing[0].price === null ? null : Number(existing[0].price);
        if (oldPrice !== lot.price || existing[0].price_unit !== lot.priceUnit) changes.push("harga");
        const [photos] = await connection.execute<PhotoRow[]>("SELECT lot_id, photo_id FROM ac_lot_photos WHERE lot_id = ? ORDER BY photo_order", [lot.id]);
        if (JSON.stringify(photos.map((photo) => photo.photo_id)) !== JSON.stringify(lot.photos)) changes.push("foto");
      }
      await connection.execute(
        `UPDATE ac_lots SET code = ?, title = ?, brand = ?, kind = ?, capacity = ?, quantity = ?, composition = ?, unit_condition = ?, location = ?, price = ?, price_unit = ?, status = ?, description = ?, is_example = ? WHERE id = ?`,
        [lot.code, lot.title, lot.brand, lot.kind, lot.capacity, lot.quantity, lot.composition, lot.condition, lot.location, lot.price, lot.priceUnit, lot.status, lot.description, lot.isExample ? 1 : 0, lot.id],
      );
      await connection.execute("DELETE FROM ac_lot_photos WHERE lot_id = ?", [lot.id]);
      await insertPhotos(connection, lot);
      if (actor) await recordAudit(connection, actor, "lot.updated", "lot", lot.id, `Memperbarui lot ${lot.code}${changes.length ? `: ${changes.join(", ")}` : ""}.`);
    } else {
      const [rows] = await connection.query<(RowDataPacket & { first_order: number | string })[]>("SELECT COALESCE(MIN(sort_order), 1) AS first_order FROM ac_lots");
      const sortOrder = Number(rows[0].first_order) - 1;
      if (!Number.isSafeInteger(sortOrder)) throw new Error("Urutan katalog database tidak valid.");
      await insertDatabaseLot(connection, lot, sortOrder);
      if (actor) await recordAudit(connection, actor, "lot.created", "lot", lot.id, `Membuat lot ${lot.code}.`);
    }
    return lot;
  });
}

export async function deleteDatabaseLot(id: string, actor?: AuditActor): Promise<void> {
  return withCatalogTransaction(async (connection) => {
    const [existing] = await connection.execute<(RowDataPacket & { id: string; code: string })[]>("SELECT id, code FROM ac_lots WHERE id = ?", [id]);
    if (!existing.length) throw new InventoryError("Lot tidak ditemukan.");
    await connection.execute("DELETE FROM ac_lots WHERE id = ?", [id]);
    if (actor) await recordAudit(connection, actor, "lot.deleted", "lot", id, `Menghapus lot ${existing[0].code}.`);
  });
}

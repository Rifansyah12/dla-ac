import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { RowDataPacket } from "mysql2/promise";
import { exampleLots, type Lot } from "../lib/lots";
import { importCatalog } from "../lib/server/catalog-import";
import { closeDatabase, databasePool } from "../lib/server/database";
import { getDatabaseLots, insertDatabaseLot, saveDatabaseLot } from "../lib/server/database-inventory";
import { migrateDatabase } from "../lib/server/database-schema";

const testDatabase = process.env.AC_TEST_DB_NAME;
const resetAllowed = process.env.AC_TEST_DB_RESET === "1";
const ready = Boolean(testDatabase && resetAllowed);

test("migrasi dan penyimpanan katalog MySQL", { skip: ready ? false : "Atur AC_TEST_DB_NAME dan AC_TEST_DB_RESET=1 untuk database uji khusus." }, async (t) => {
  if (!testDatabase || !/^dla_ac_test_[a-z0-9_]+$/.test(testDatabase)) throw new Error("Nama database uji harus diawali dla_ac_test_.");
  process.env.AC_DB_NAME = testDatabase;
  const directory = await mkdtemp(path.join(os.tmpdir(), "dla-ac-catalog-test-"));
  const file = path.join(directory, "lots.json");
  const reset = async () => {
    for (const table of ["ac_password_resets", "ac_recovery_emails", "ac_lot_photos", "ac_lots", "ac_catalog_state", "ac_admin_permissions", "ac_users", "ac_owner_bootstrap", "ac_site_settings", "ac_audit_events", "ac_schema_migrations"]) {
      await databasePool().query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await migrateDatabase();
  };
  const writeLots = (lots: Lot[]) => writeFile(file, JSON.stringify(lots), "utf8");
  try {
    await t.test("migrasi skema dapat diulang dan katalog belum diimpor tidak dianggap kosong", async () => {
      await reset();
      await migrateDatabase();
      await assert.rejects(getDatabaseLots(), /belum diimpor/);
    });

    await t.test("file yang tidak ada menggunakan data contoh berlabel", async () => {
      const result = await importCatalog(directory);
      assert.deepEqual(result, { imported: true, count: exampleLots.length, source: "examples" });
      assert.deepEqual(await getDatabaseLots(), exampleLots);
      assert.deepEqual(await importCatalog(directory), { imported: false, count: 0 });
    });

    await t.test("array kosong tetap kosong dan impor ulang tidak menimpa", async () => {
      await reset();
      await writeLots([]);
      assert.deepEqual(await importCatalog(directory), { imported: true, count: 0, source: "file" });
      await writeLots(exampleLots);
      assert.deepEqual(await importCatalog(directory), { imported: false, count: 0 });
      assert.deepEqual(await getDatabaseLots(), []);
    });

    await t.test("nilai, urutan lot, status, dan urutan foto dipertahankan", async () => {
      await reset();
      const first: Lot = { ...exampleLots[0], quantity: null, price: 123456789012, priceUnit: "unit", status: "tersedia", isExample: false, photos: ["upload:00000000-0000-4000-8000-000000000000.jpg", "client:ac1.jpeg", "client:ac1.jpeg"] };
      const second: Lot = { ...exampleLots[1], quantity: 11, price: null, status: "dalam-penawaran" };
      const legacy = [first, second];
      await writeLots(legacy);
      const before = await readFile(file, "utf8");
      assert.deepEqual(await importCatalog(directory), { imported: true, count: 2, source: "file" });
      assert.deepEqual(await getDatabaseLots(), legacy);
      assert.equal(await readFile(file, "utf8"), before);
      await writeLots([]);
      await importCatalog(directory);
      assert.deepEqual(await getDatabaseLots(), legacy);
    });

    await t.test("impor yang tidak valid dibatalkan tanpa data parsial", async () => {
      await reset();
      await writeLots([exampleLots[0], { ...exampleLots[1], code: exampleLots[0].code.toLowerCase() }]);
      await assert.rejects(importCatalog(directory), /ID atau kode lot/);
      const [rows] = await databasePool().query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM ac_lots");
      assert.equal(rows[0].total, 0);
      await assert.rejects(getDatabaseLots(), /belum diimpor/);
    });

    await t.test("tidak menimpa lot yang sudah ada walaupun penanda impor belum diatur", async () => {
      await reset();
      const connection = await databasePool().getConnection();
      try { await insertDatabaseLot(connection, exampleLots[0], 0); } finally { connection.release(); }
      await assert.rejects(importCatalog(directory), /sudah berisi lot/);
      const [rows] = await databasePool().query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM ac_lots");
      assert.equal(rows[0].total, 1);
    });

    await t.test("penulisan bersamaan menjaga kode unik dan jumlah data", async () => {
      await reset();
      await writeLots([]);
      await importCatalog(directory);
      const lots = Array.from({ length: 5 }, (_, index) => ({ ...exampleLots[0], id: `test-${index}`, code: `TEST-${index}` }));
      await Promise.all(lots.map((lot) => saveDatabaseLot(lot, false)));
      const duplicates = await Promise.allSettled([
        saveDatabaseLot({ ...exampleLots[0], id: "dup-1", code: "DUPLICATE" }, false),
        saveDatabaseLot({ ...exampleLots[0], id: "dup-2", code: "DUPLICATE" }, false),
      ]);
      assert.equal(duplicates.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(duplicates.filter((result) => result.status === "rejected").length, 1);
      assert.equal((await getDatabaseLots()).length, 6);
    });
  } finally {
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});

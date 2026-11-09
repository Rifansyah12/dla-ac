import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { importCatalog } = await import("../lib/server/catalog-import");
  const { closeDatabase } = await import("../lib/server/database");
  const dataDir = process.env.AC_DATA_DIR ? path.resolve(process.env.AC_DATA_DIR) : path.join(process.cwd(), "data");
  try {
    const result = await importCatalog(dataDir);
    if (!result.imported) console.log("Katalog database sudah diinisialisasi; data tidak diubah.");
    else console.log(`Impor selesai: ${result.count} lot dari ${result.source === "examples" ? "data contoh" : "lots.json"}.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Impor katalog gagal.");
  process.exitCode = 1;
});

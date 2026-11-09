import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { migrateDatabase } = await import("../lib/server/database-schema");
  const { closeDatabase } = await import("../lib/server/database");
  try {
    await migrateDatabase();
    console.log("Skema database siap. Migrasi aman untuk dijalankan ulang.");
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migrasi database gagal.");
  process.exitCode = 1;
});

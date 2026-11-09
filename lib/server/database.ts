import mysql, { type Pool } from "mysql2/promise";

declare global {
  // Reuse connections during development reloads and across server modules.
  var acDatabasePool: Pool | undefined;
}

export function catalogStorage(): "json" | "mysql" {
  const value = process.env.AC_STORAGE?.trim() || "json";
  if (value !== "json" && value !== "mysql") throw new Error("AC_STORAGE harus bernilai json atau mysql.");
  return value;
}

export function databasePool(): Pool {
  if (globalThis.acDatabasePool) return globalThis.acDatabasePool;

  const database = process.env.AC_DB_NAME?.trim();
  const user = process.env.AC_DB_USER?.trim();
  const portText = process.env.AC_DB_PORT?.trim() || "3306";
  const port = Number(portText);
  const ssl = process.env.AC_DB_SSL?.trim() || "false";
  if (!database || !user) throw new Error("Isi AC_DB_NAME dan AC_DB_USER untuk menggunakan database.");
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("AC_DB_PORT tidak valid.");
  if (ssl !== "true" && ssl !== "false") throw new Error("AC_DB_SSL harus bernilai true atau false.");

  globalThis.acDatabasePool = mysql.createPool({
    host: process.env.AC_DB_HOST?.trim() || "127.0.0.1",
    port,
    user,
    password: process.env.AC_DB_PASSWORD ?? "",
    database,
    charset: "utf8mb4",
    ssl: ssl === "true" ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
    supportBigNumbers: true,
    bigNumberStrings: false,
  });
  return globalThis.acDatabasePool;
}

export async function closeDatabase(): Promise<void> {
  const pool = globalThis.acDatabasePool;
  globalThis.acDatabasePool = undefined;
  if (pool) await pool.end();
}

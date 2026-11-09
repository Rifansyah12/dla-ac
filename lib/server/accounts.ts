import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { recordAudit } from "./audit";
import { databasePool } from "./database";

export type Account = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "owner";
  sessionVersion: number;
  canChangePrice: boolean;
  canDeleteLot: boolean;
};

type AccountRow = RowDataPacket & {
  id: string; display_name: string; username: string; password_hash: string; role: string;
  active: number; session_version: number; can_change_price: number | null; can_delete_lot: number | null;
};

const accountSelect = `SELECT u.id, u.display_name, u.username, u.password_hash, u.role, u.active, u.session_version,
  p.can_change_price, p.can_delete_lot FROM ac_users u LEFT JOIN ac_admin_permissions p ON p.user_id = u.id`;

function derivePassword(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derivePassword(password, salt);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const valid = parts.length === 6 && parts[0] === "scrypt" && parts[1] === "16384" && parts[2] === "8" && parts[3] === "1"
    && /^[A-Za-z0-9_-]{22}$/.test(parts[4]) && /^[A-Za-z0-9_-]{86}$/.test(parts[5]);
  const salt = valid ? Buffer.from(parts[4], "base64url") : Buffer.alloc(16);
  const expected = valid ? Buffer.from(parts[5], "base64url") : Buffer.alloc(64);
  const actual = await derivePassword(password, salt);
  return valid && expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function normalizedUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validUsername(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,79}$/.test(value);
}

function toAccount(row: AccountRow | undefined): Account | null {
  if (!row || !row.active || (row.role !== "admin" && row.role !== "owner") || !Number.isSafeInteger(row.session_version) || row.session_version < 1) return null;
  return {
    id: row.id, name: row.display_name, username: row.username, role: row.role,
    sessionVersion: row.session_version,
    canChangePrice: row.role === "owner" || Boolean(row.can_change_price),
    canDeleteLot: row.role === "owner" || Boolean(row.can_delete_lot),
  };
}

export async function findActiveAccount(id: string): Promise<Account | null> {
  const [rows] = await databasePool().execute<AccountRow[]>(`${accountSelect} WHERE u.id = ? LIMIT 1`, [id]);
  return toAccount(rows[0]);
}

export async function authenticateAccount(username: string, password: string): Promise<Account | null> {
  const normalized = normalizedUsername(username);
  const [rows] = await databasePool().execute<AccountRow[]>(`${accountSelect} WHERE u.username = ? LIMIT 1`, [normalized]);
  const matched = await verifyPassword(password, rows[0]?.password_hash ?? "");
  return matched ? toAccount(rows[0]) : null;
}

export async function initializeOwner(name: string, username: string, password: string): Promise<boolean> {
  const displayName = name.trim();
  const normalized = normalizedUsername(username);
  if (!displayName || displayName.length > 120) throw new Error("Nama owner wajib diisi dan maksimal 120 karakter.");
  if (!validUsername(normalized)) throw new Error("Username harus 3–80 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
  if (password.length < 8 || password.length > 256) throw new Error("Kata sandi harus berisi 8–256 karakter.");
  const hash = await hashPassword(password);
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [state] = await connection.query<(RowDataPacket & { initialized: number })[]>("SELECT initialized FROM ac_owner_bootstrap WHERE id = 1 FOR UPDATE");
    if (state.length !== 1) throw new Error("Skema akun belum disiapkan. Jalankan migrasi database.");
    if (state[0].initialized) { await connection.commit(); return false; }
    const [existing] = await connection.query<RowDataPacket[]>("SELECT id FROM ac_users WHERE role = 'owner' LIMIT 1");
    if (existing.length) {
      await connection.execute("UPDATE ac_owner_bootstrap SET initialized = 1 WHERE id = 1");
      await connection.commit();
      return false;
    }
    const id = randomUUID();
    await connection.execute("INSERT INTO ac_users (id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, 'owner')", [id, displayName, normalized, hash]);
    await connection.execute("INSERT INTO ac_admin_permissions (user_id, can_change_price, can_delete_lot) VALUES (?, 1, 1)", [id]);
    await connection.execute("UPDATE ac_owner_bootstrap SET initialized = 1 WHERE id = 1");
    await recordAudit(connection, { id, name: displayName, username: normalized }, "owner.initialized", "user", id, "Inisialisasi akun owner pertama.");
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export async function revokeAccountSessions(account: Account): Promise<void> {
  await databasePool().execute("UPDATE ac_users SET session_version = session_version + 1 WHERE id = ? AND session_version = ?", [account.id, account.sessionVersion]);
}

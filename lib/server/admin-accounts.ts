import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { ManagedAdmin } from "@/lib/admin-accounts";
import { hashPassword, normalizedUsername, validUsername, verifyPassword, type Account } from "./accounts";
import { recordAudit } from "./audit";
import { databasePool } from "./database";

export class AccountActionError extends Error {
  constructor(message: string, public status = 400, public code = "invalid") { super(message); }
}

type AdminRow = RowDataPacket & {
  id: string; display_name: string; username: string; active: number; created_at: Date;
  can_change_price: number | null; can_delete_lot: number | null;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccountActionError("Data tidak valid.");
  return value as Record<string, unknown>;
}

function name(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 120) throw new AccountActionError("Nama wajib diisi dan maksimal 120 karakter.");
  return value.trim();
}

function username(value: unknown): string {
  if (typeof value !== "string" || !validUsername(normalizedUsername(value))) throw new AccountActionError("Username harus 3–80 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
  return normalizedUsername(value);
}

function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 256) throw new AccountActionError("Kata sandi harus berisi 8–256 karakter.");
  return value;
}

function flag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new AccountActionError("Status atau izin tidak valid.");
  return value;
}

function duplicate(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY");
}

export async function listAdmins(): Promise<ManagedAdmin[]> {
  const [rows] = await databasePool().query<AdminRow[]>(`SELECT u.id, u.display_name, u.username, u.active, u.created_at,
    p.can_change_price, p.can_delete_lot FROM ac_users u LEFT JOIN ac_admin_permissions p ON p.user_id = u.id
    WHERE u.role = 'admin' ORDER BY u.created_at, u.id`);
  return rows.map((row) => ({ id: row.id, name: row.display_name, username: row.username, active: Boolean(row.active),
    canChangePrice: Boolean(row.can_change_price), canDeleteLot: Boolean(row.can_delete_lot), createdAt: row.created_at.toISOString() }));
}

export async function createAdmin(value: unknown, actor: Account): Promise<void> {
  const input = object(value);
  const displayName = name(input.name);
  const loginName = username(input.username);
  const secret = password(input.password);
  const canChangePrice = flag(input.canChangePrice);
  const canDeleteLot = flag(input.canDeleteLot);
  const hash = await hashPassword(secret);
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const id = randomUUID();
    await connection.execute("INSERT INTO ac_users (id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, 'admin')", [id, displayName, loginName, hash]);
    await connection.execute("INSERT INTO ac_admin_permissions (user_id, can_change_price, can_delete_lot) VALUES (?, ?, ?)", [id, Number(canChangePrice), Number(canDeleteLot)]);
    await recordAudit(connection, actor, "admin.created", "user", id, `Membuat akun admin ${loginName}.`);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    if (duplicate(error)) throw new AccountActionError("Username sudah digunakan.", 409);
    throw error;
  } finally { connection.release(); }
}

export async function updateAdmin(value: unknown, actor: Account): Promise<void> {
  const input = object(value);
  if (typeof input.id !== "string" || !input.id || input.id.length > 80) throw new AccountActionError("ID admin tidak valid.");
  const displayName = name(input.name);
  const active = flag(input.active);
  const canChangePrice = flag(input.canChangePrice);
  const canDeleteLot = flag(input.canDeleteLot);
  const hash = input.password === undefined || input.password === "" ? null : await hashPassword(password(input.password));
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { id: string; username: string })[]>("SELECT id, username FROM ac_users WHERE id = ? AND role = 'admin' FOR UPDATE", [input.id]);
    if (!rows.length) throw new AccountActionError("Admin tidak ditemukan.", 404);
    await connection.execute("UPDATE ac_users SET display_name = ?, active = ?, password_hash = COALESCE(?, password_hash), session_version = session_version + 1 WHERE id = ?", [displayName, Number(active), hash, input.id]);
    await connection.execute("INSERT INTO ac_admin_permissions (user_id, can_change_price, can_delete_lot) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_change_price = VALUES(can_change_price), can_delete_lot = VALUES(can_delete_lot)", [input.id, Number(canChangePrice), Number(canDeleteLot)]);
    await recordAudit(connection, actor, "admin.updated", "user", input.id, `Memperbarui admin ${rows[0].username}: ${active ? "aktif" : "nonaktif"}, izin diperbarui${hash ? ", kata sandi direset" : ""}.`);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

export async function changeOwnPassword(account: Account, current: unknown, next: unknown): Promise<void> {
  if (typeof current !== "string" || current.length > 256) throw new AccountActionError("Kata sandi saat ini tidak sesuai.", 400, "incorrect_password");
  const newPassword = password(next);
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { password_hash: string; active: number; session_version: number })[]>("SELECT password_hash, active, session_version FROM ac_users WHERE id = ? FOR UPDATE", [account.id]);
    const row = rows[0];
    if (!row || !row.active || row.session_version !== account.sessionVersion) throw new AccountActionError("Sesi telah berakhir. Silakan masuk kembali.", 401);
    if (!await verifyPassword(current, row.password_hash)) throw new AccountActionError("Kata sandi saat ini tidak sesuai.", 400, "incorrect_password");
    const hash = await hashPassword(newPassword);
    await connection.execute("UPDATE ac_users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [hash, account.id]);
    await recordAudit(connection, account, "password.changed", "user", account.id, "Mengubah kata sandi akun sendiri.");
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

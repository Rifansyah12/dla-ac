import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { normalizeEmail } from "@/lib/email";
import { hashPassword, normalizedUsername, validUsername } from "./accounts";
import { recordAudit } from "./audit";
import { databasePool } from "./database";

type UserRow = RowDataPacket & { id: string; username: string; display_name: string; active: number };
type EmailRow = RowDataPacket & { email: string };
type ResetRow = RowDataPacket & { request_id: string; code_hash: string; attempts: number; request_count: number; since_request: number; since_window: number; valid: number };

export type ResetMail = { email: string; code: string };

export function validResetIdentity(username: unknown, email: unknown): username is string {
  return typeof username === "string" && username.length <= 80 && validUsername(normalizedUsername(username)) && typeof email === "string" && normalizeEmail(email) !== null;
}

function codeHash(userId: string, requestId: string, code: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(`password-reset\0${userId}\0${requestId}\0${code}`).digest("hex");
}

function matchesCode(stored: string, userId: string, requestId: string, code: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(stored)) return false;
  const expected = Buffer.from(stored, "hex");
  const actual = Buffer.from(codeHash(userId, requestId, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function preparePasswordReset(username: string, email: string): Promise<ResetMail | null> {
  const normalized = normalizedUsername(username);
  const normalizedEmail = normalizeEmail(email);
  if (!validUsername(normalized) || !normalizedEmail) return null;
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute<UserRow[]>("SELECT id, username, display_name, active FROM ac_users WHERE username = ? FOR UPDATE", [normalized]);
    const user = users[0];
    if (!user || !user.active) { await connection.commit(); return null; }
    const [emails] = await connection.execute<EmailRow[]>("SELECT email FROM ac_recovery_emails WHERE user_id = ? FOR UPDATE", [user.id]);
    if (!emails[0] || normalizeEmail(emails[0].email) !== normalizedEmail) { await connection.commit(); return null; }
    const [resets] = await connection.execute<ResetRow[]>(`SELECT request_id, code_hash, attempts, request_count,
      TIMESTAMPDIFF(SECOND, requested_at, NOW(3)) AS since_request,
      TIMESTAMPDIFF(SECOND, window_started_at, NOW(3)) AS since_window,
      expires_at > NOW(3) AS valid FROM ac_password_resets WHERE user_id = ? FOR UPDATE`, [user.id]);
    const previous = resets[0];
    if (previous && previous.since_request < 60) { await connection.commit(); return null; }
    const resetWindow = !previous || previous.since_window >= 3600;
    if (previous && !resetWindow && previous.request_count >= 5) { await connection.commit(); return null; }
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const requestId = randomUUID();
    const hash = codeHash(user.id, requestId, code);
    if (previous) {
      await connection.execute(`UPDATE ac_password_resets SET request_id = ?, code_hash = ?, expires_at = DATE_ADD(NOW(3), INTERVAL 10 MINUTE),
        requested_at = NOW(3), window_started_at = IF(?, NOW(3), window_started_at), request_count = ?, attempts = 0 WHERE user_id = ?`,
      [requestId, hash, Number(resetWindow), resetWindow ? 1 : previous.request_count + 1, user.id]);
    } else {
      await connection.execute(`INSERT INTO ac_password_resets (user_id, request_id, code_hash, expires_at, requested_at, window_started_at, request_count, attempts)
        VALUES (?, ?, ?, DATE_ADD(NOW(3), INTERVAL 10 MINUTE), NOW(3), NOW(3), 1, 0)`, [user.id, requestId, hash]);
    }
    await connection.commit();
    return { email: emails[0].email, code };
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

export async function completePasswordReset(username: string, email: string, code: string, newPassword: string): Promise<boolean> {
  const normalized = normalizedUsername(username);
  const normalizedEmail = normalizeEmail(email);
  if (!validUsername(normalized) || !normalizedEmail || !/^\d{6}$/.test(code) || newPassword.length < 8 || newPassword.length > 256) return false;
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute<UserRow[]>("SELECT id, username, display_name, active FROM ac_users WHERE username = ? FOR UPDATE", [normalized]);
    const user = users[0];
    if (!user || !user.active) { await connection.commit(); return false; }
    const [emails] = await connection.execute<EmailRow[]>("SELECT email FROM ac_recovery_emails WHERE user_id = ? FOR UPDATE", [user.id]);
    if (!emails[0] || normalizeEmail(emails[0].email) !== normalizedEmail) { await connection.commit(); return false; }
    const [resets] = await connection.execute<ResetRow[]>("SELECT request_id, code_hash, attempts, expires_at > NOW(3) AS valid FROM ac_password_resets WHERE user_id = ? FOR UPDATE", [user.id]);
    const reset = resets[0];
    if (!reset || !reset.valid || reset.attempts >= 5) { await connection.commit(); return false; }
    if (!matchesCode(reset.code_hash, user.id, reset.request_id, code)) {
      await connection.execute("UPDATE ac_password_resets SET attempts = attempts + 1 WHERE user_id = ?", [user.id]);
      await connection.commit();
      return false;
    }
    const passwordHash = await hashPassword(newPassword);
    await connection.execute("UPDATE ac_users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [passwordHash, user.id]);
    await connection.execute("DELETE FROM ac_password_resets WHERE user_id = ?", [user.id]);
    await recordAudit(connection, { id: user.id, name: user.display_name, username: user.username }, "password.recovered", "user", user.id, "Memulihkan kata sandi melalui kode verifikasi.");
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { connection.release(); }
}

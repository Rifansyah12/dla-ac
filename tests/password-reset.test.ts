import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { RowDataPacket } from "mysql2/promise";
import { normalizeEmail } from "../lib/email";
import { authenticateAccount, hashPassword } from "../lib/server/accounts";
import { changeOwnPassword, updateOwnRecoveryEmail } from "../lib/server/admin-accounts";
import { closeDatabase, databasePool } from "../lib/server/database";
import { migrateDatabase } from "../lib/server/database-schema";
import { completePasswordReset, preparePasswordReset } from "../lib/server/password-reset";
import { smtpConfigured } from "../lib/server/smtp";

test("validasi email pemulihan", () => {
  assert.equal(normalizeEmail(" Admin+AC@Example.COM "), "admin+ac@example.com");
  for (const value of ["", "bukan-email", "a@@example.com", "a@-example.com", "a@example", "a\n@example.com"]) assert.equal(normalizeEmail(value), null);
});

test("SMTP aktif hanya saat konfigurasi lengkap dan valid", () => {
  const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"] as const;
  const previous = keys.map((key) => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(smtpConfigured(), false);
    Object.assign(process.env, { SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", SMTP_SECURE: "true", SMTP_USER: "sender@example.com", SMTP_PASSWORD: "test-only", SMTP_FROM: "sender@example.com" });
    assert.equal(smtpConfigured(), true);
    process.env.SMTP_SECURE = "invalid";
    assert.equal(smtpConfigured(), false);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});

const testDatabase = process.env.AC_TEST_DB_NAME;
const ready = Boolean(testDatabase && process.env.AC_TEST_DB_RESET === "1");

test("pemulihan kata sandi menggunakan OTP MySQL", { skip: ready ? false : "Atur AC_TEST_DB_NAME dan AC_TEST_DB_RESET=1 untuk database uji khusus." }, async (t) => {
  if (!testDatabase || !/^dla_ac_test_[a-z0-9_]+$/.test(testDatabase)) throw new Error("Nama database uji harus diawali dla_ac_test_.");
  process.env.AC_DB_NAME = testDatabase;
  process.env.AC_STORAGE = "mysql";
  process.env.ADMIN_SESSION_SECRET = "kunci-uji-rahasia-".repeat(3);
  const ownerId = randomUUID();
  const adminId = randomUUID();
  const updatedPasswords = new Map<string, string>();
  const clearReset = () => databasePool().execute("DELETE FROM ac_password_resets");
  const allowResend = (id: string) => databasePool().execute("UPDATE ac_password_resets SET requested_at = DATE_SUB(NOW(3), INTERVAL 61 SECOND) WHERE user_id = ?", [id]);
  try {
    for (const table of ["ac_password_resets", "ac_recovery_emails", "ac_lot_photos", "ac_lots", "ac_catalog_state", "ac_admin_permissions", "ac_users", "ac_owner_bootstrap", "ac_site_settings", "ac_audit_events", "ac_schema_migrations"]) {
      await databasePool().query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await migrateDatabase();
    for (const user of [{ id: ownerId, username: "owner-test", role: "owner", email: "owner@example.com" }, { id: adminId, username: "admin-test", role: "admin", email: "admin@example.com" }]) {
      await databasePool().execute("INSERT INTO ac_users (id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, ?)", [user.id, user.username, user.username, await hashPassword("password-awal"), user.role]);
      await databasePool().execute("INSERT INTO ac_admin_permissions (user_id) VALUES (?)", [user.id]);
    }
    await databasePool().query("DROP TABLE ac_password_resets");
    await databasePool().query("DROP TABLE ac_recovery_emails");
    await databasePool().execute("DELETE FROM ac_schema_migrations WHERE version = ?", ["004_password_recovery"]);
    await migrateDatabase();
    assert.ok(await authenticateAccount("owner-test", "password-awal"));
    for (const user of [{ id: ownerId, email: "owner@example.com" }, { id: adminId, email: "admin@example.com" }]) {
      await databasePool().execute("INSERT INTO ac_recovery_emails (user_id, email) VALUES (?, ?)", [user.id, user.email]);
    }

    await t.test("identitas cocok, kode tersimpan sebagai hash, dan permintaan dibatasi", async () => {
      assert.equal(await preparePasswordReset("tidak-ada", "owner@example.com"), null);
      assert.equal(await preparePasswordReset("owner-test", "lain@example.com"), null);
      const mail = await preparePasswordReset("OWNER-TEST", "owner@example.com");
      assert.ok(mail && /^\d{6}$/.test(mail.code));
      const [rows] = await databasePool().execute<(RowDataPacket & { code_hash: string })[]>("SELECT code_hash FROM ac_password_resets WHERE user_id = ?", [ownerId]);
      assert.match(rows[0].code_hash, /^[a-f0-9]{64}$/);
      assert.notEqual(rows[0].code_hash, mail.code);
      assert.equal(await preparePasswordReset("owner-test", "owner@example.com"), null);
      for (let i = 1; i < 5; i++) { await allowResend(ownerId); assert.ok(await preparePasswordReset("owner-test", "owner@example.com")); }
      await allowResend(ownerId);
      assert.equal(await preparePasswordReset("owner-test", "owner@example.com"), null);
    });

    await t.test("OTP salah dan kedaluwarsa tidak dapat digunakan", async () => {
      await clearReset();
      const mail = await preparePasswordReset("owner-test", "owner@example.com");
      assert.ok(mail);
      const wrong = mail.code === "000000" ? "000001" : "000000";
      for (let i = 0; i < 5; i++) assert.equal(await completePasswordReset("owner-test", "owner@example.com", wrong, "password-baru"), false);
      assert.equal(await completePasswordReset("owner-test", "owner@example.com", mail.code, "password-baru"), false);
      await clearReset();
      const expired = await preparePasswordReset("owner-test", "owner@example.com");
      assert.ok(expired);
      await databasePool().execute("UPDATE ac_password_resets SET expires_at = DATE_SUB(NOW(3), INTERVAL 1 SECOND) WHERE user_id = ?", [ownerId]);
      assert.equal(await completePasswordReset("owner-test", "owner@example.com", expired.code, "password-baru"), false);
    });

    await t.test("akun nonaktif tidak dapat meminta atau menggunakan OTP", async () => {
      await clearReset();
      const mail = await preparePasswordReset("admin-test", "admin@example.com");
      assert.ok(mail);
      await databasePool().execute("UPDATE ac_users SET active = 0 WHERE id = ?", [adminId]);
      assert.equal(await preparePasswordReset("admin-test", "admin@example.com"), null);
      assert.equal(await completePasswordReset("admin-test", "admin@example.com", mail.code, "password-baru"), false);
      await databasePool().execute("UPDATE ac_users SET active = 1 WHERE id = ?", [adminId]);
    });

    await t.test("owner dan admin dapat reset sekali dan sesi lama dicabut", async () => {
      await clearReset();
      for (const user of [{ id: ownerId, username: "owner-test", email: "owner@example.com" }, { id: adminId, username: "admin-test", email: "admin@example.com" }]) {
        const account = await authenticateAccount(user.username, "password-awal");
        assert.ok(account);
        const mail = await preparePasswordReset(user.username, user.email);
        assert.ok(mail);
        const results = await Promise.all([completePasswordReset(user.username, user.email, mail.code, "password-baru"), completePasswordReset(user.username, user.email, mail.code, "password-lain")]);
        assert.equal(results.filter(Boolean).length, 1);
        assert.equal(await completePasswordReset(user.username, user.email, mail.code, "password-baru"), false);
        assert.equal(await authenticateAccount(user.username, "password-awal"), null);
        const updatedPassword = results[0] ? "password-baru" : "password-lain";
        updatedPasswords.set(user.username, updatedPassword);
        const next = await authenticateAccount(user.username, updatedPassword);
        assert.ok(next && next.sessionVersion > account.sessionVersion);
      }
    });

    await t.test("perubahan email dan kata sandi membatalkan OTP lama", async () => {
      const currentPassword = updatedPasswords.get("owner-test")!;
      const account = await authenticateAccount("owner-test", currentPassword);
      assert.ok(account);
      const mail = await preparePasswordReset("owner-test", "owner@example.com");
      assert.ok(mail);
      await assert.rejects(updateOwnRecoveryEmail(account, "salah", "baru@example.com"), /tidak sesuai/);
      assert.equal(await updateOwnRecoveryEmail(account, currentPassword, "baru@example.com"), "baru@example.com");
      assert.equal(await completePasswordReset("owner-test", "owner@example.com", mail.code, "lainnya123"), false);
      const next = await preparePasswordReset("owner-test", "baru@example.com");
      assert.ok(next);
      await changeOwnPassword(account, currentPassword, "password-terakhir");
      assert.equal(await completePasswordReset("owner-test", "baru@example.com", next.code, "lainnya123"), false);
      const [events] = await databasePool().query<(RowDataPacket & { summary: string })[]>("SELECT summary FROM ac_audit_events");
      const secrets: string[] = [mail.code, next.code, "password-baru", "password-terakhir", "baru@example.com"];
      for (const event of events) for (const secret of secrets) assert.equal(event.summary.includes(secret), false);
    });
  } finally { await closeDatabase(); }
});

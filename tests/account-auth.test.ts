import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, initializeOwner, verifyPassword } from "../lib/server/accounts";
import { sessionCookie, setSession } from "../lib/server/admin-auth";
import { importCatalog } from "../lib/server/catalog-import";
import { closeDatabase, databasePool } from "../lib/server/database";
import { migrateDatabase } from "../lib/server/database-schema";

test("kata sandi disimpan dengan salt dan hash scrypt", async () => {
  const first = await hashPassword("kata-sandi-uji");
  const second = await hashPassword("kata-sandi-uji");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("kata-sandi-uji", first), true);
  assert.equal(await verifyPassword("salah", first), false);
  assert.equal(await verifyPassword("kata-sandi-uji", "hash-tidak-valid"), false);
});

const testDatabase = process.env.AC_TEST_DB_NAME;
const ready = Boolean(testDatabase && process.env.AC_TEST_DB_RESET === "1");

test("akun dan otorisasi API MySQL", { skip: ready ? false : "Atur AC_TEST_DB_NAME dan AC_TEST_DB_RESET=1 untuk database uji khusus." }, async () => {
  if (!testDatabase || !/^dla_ac_test_[a-z0-9_]+$/.test(testDatabase)) throw new Error("Nama database uji harus diawali dla_ac_test_.");
  process.env.AC_DB_NAME = testDatabase;
  process.env.AC_STORAGE = "mysql";
  process.env.ADMIN_SESSION_SECRET = "test-secret-".repeat(5);
  process.env.ADMIN_PASSWORD = "legacy-password-123";
  process.env.WHATSAPP_NUMBER = "6285173209025";
  const directory = await mkdtemp(path.join(os.tmpdir(), "dla-ac-account-test-"));
  let server: ChildProcess | undefined;
  try {
    for (const table of ["ac_lot_photos", "ac_lots", "ac_catalog_state", "ac_admin_permissions", "ac_users", "ac_owner_bootstrap", "ac_site_settings", "ac_audit_events", "ac_audit_events_test_hidden", "ac_schema_migrations"]) {
      await databasePool().query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await migrateDatabase();
    await importCatalog(directory);
    const initialized = await Promise.all([
      initializeOwner("Pemilik", "owner-test", "owner-password"),
      initializeOwner("Pemilik", "owner-test", "owner-password"),
    ]);
    assert.equal(initialized.filter(Boolean).length, 1);
    assert.equal(await initializeOwner("Owner Lain", "other-owner", "another-password"), false);

    const adminId = randomUUID();
    await databasePool().execute("INSERT INTO ac_users (id, display_name, username, password_hash, role) VALUES (?, ?, ?, ?, 'admin')", [adminId, "Admin Uji", "admin-test", await hashPassword("admin-password")]);
    await databasePool().execute("INSERT INTO ac_admin_permissions (user_id, can_change_price, can_delete_lot) VALUES (?, 0, 0)", [adminId]);

    const listener = net.createServer();
    await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const port = (listener.address() as net.AddressInfo).port;
    await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    const base = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, ["app.js"], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), AC_DATA_DIR: directory, APP_ORIGIN: base }, stdio: "ignore" });
    let started = false;
    for (let i = 0; i < 150; i++) {
      try { if ((await fetch(`${base}/api/admin/session`)).ok) { started = true; break; } } catch { /* Wait for the server. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(started, "Server harus dapat dijalankan dari hasil build.");
    const request = (url: string, init: RequestInit = {}) => fetch(`${base}${url}`, init);
    const login = (username: string, password: string, ip: string) => request("/api/admin/login", { method: "POST", headers: { origin: base, "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ username, password }) });
    const cookies = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";
    const headers = (cookie: string) => ({ origin: base, cookie, "content-type": "application/json" });

    const status = await request("/api/admin/session");
    assert.equal(status.headers.get("cache-control"), "no-store");
    assert.deepEqual(await status.json(), { configured: true, accountMode: true, authenticated: false, user: null });
    assert.equal((await request("/api/admin/login", { method: "POST", headers: { origin: "https://example.com", "content-type": "application/json" }, body: JSON.stringify({ username: "owner-test", password: "owner-password" }) })).status, 403);
    assert.equal((await login("owner-test", "wrong", "test-wrong")).status, 401);
    assert.equal((await login("", process.env.ADMIN_PASSWORD, "test-legacy-password")).status, 401);

    const ownerLogin = await login("OWNER-TEST", "owner-password", "test-owner");
    assert.equal(ownerLogin.status, 200);
    assert.equal(ownerLogin.headers.get("cache-control"), "no-store");
    assert.match(ownerLogin.headers.get("set-cookie") ?? "", /HttpOnly; SameSite=strict/i);
    const ownerCookie = cookies(ownerLogin);
    assert.match(ownerCookie, /^ac_account_session=/);
    const ownerData = await ownerLogin.json();
    assert.equal(ownerData.user.role, "owner");
    assert.equal(JSON.stringify(ownerData).includes("password"), false);
    const ownerSession = await (await request("/api/admin/session", { headers: { cookie: ownerCookie } })).json();
    assert.equal(ownerSession.user.role, "owner");

    const oldResponse = NextResponse.next();
    setSession(oldResponse, new NextRequest(`${base}/api/admin/login`));
    const oldCookie = oldResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
    assert.ok(oldCookie.startsWith(`${sessionCookie}=`));
    assert.equal((await request("/api/admin/lots", { method: "DELETE", headers: headers(oldCookie), body: JSON.stringify({ id: "foto-01" }) })).status, 401);

    const adminLogin = await login("admin-test", "admin-password", "test-admin");
    assert.equal(adminLogin.status, 200);
    const adminCookie = cookies(adminLogin);
    assert.equal((await adminLogin.json()).user.role, "admin");
    assert.equal((await request("/api/owner/activity")).status, 401);
    assert.equal((await request("/api/owner/activity", { headers: { cookie: oldCookie } })).status, 401);
    assert.equal((await request("/api/owner/activity", { headers: { cookie: adminCookie } })).status, 403);
    assert.equal((await request("/api/admin/settings")).status, 401);
    assert.equal((await request("/api/admin/settings", { headers: { cookie: oldCookie } })).status, 401);
    const initialSettingsResponse = await request("/api/admin/settings", { headers: { cookie: adminCookie } });
    assert.equal(initialSettingsResponse.status, 200);
    assert.equal(initialSettingsResponse.headers.get("cache-control"), "no-store");
    const initialSettings = (await initialSettingsResponse.json()).data;
    assert.equal(initialSettings.primaryNumber, "628981213681");
    assert.equal(initialSettings.secondaryNumber, "6285173209025");
    const settingsRequest = (cookie: string, data: unknown) => request("/api/admin/settings", { method: "PUT", headers: headers(cookie), body: JSON.stringify(data) });
    assert.equal((await settingsRequest(adminCookie, { technicianDescription: "Keterangan palsu", primaryNumber: "6281200001111", secondaryNumber: "6281300002222" })).status, 403);
    assert.equal((await settingsRequest(ownerCookie, { technicianDescription: "Tidak boleh tersimpan", primaryNumber: "nomor-salah", secondaryNumber: "6281300002222" })).status, 400);
    assert.equal((await (await request("/api/admin/settings", { headers: { cookie: ownerCookie } })).json()).data.technicianDescription, initialSettings.technicianDescription);
    const savedSettings = await settingsRequest(ownerCookie, { technicianDescription: "Layanan teknisi yang dikonfirmasi owner.", primaryNumber: "+62 812-0000-1111", secondaryNumber: "+62 813-0000-2222" });
    assert.equal(savedSettings.status, 200);
    assert.deepEqual((await savedSettings.json()).data, { primaryNumber: "6281200001111", secondaryNumber: "6281300002222", technicianDescription: "Layanan teknisi yang dikonfirmasi owner." });
    const savedDescription = await settingsRequest(adminCookie, { technicianDescription: "Layanan teknisi diperbarui admin." });
    assert.equal(savedDescription.status, 200);
    assert.equal((await savedDescription.json()).data.primaryNumber, "6281200001111");
    for (const route of ["/", "/produk", "/produk/foto-01", "/keranjang"]) {
      const response = await request(route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes("6281200001111") && html.includes("6281300002222"), `Nomor terbaru tersedia pada ${route}`);
      if (route === "/") assert.ok(html.includes("Layanan teknisi diperbarui admin."));
    }
    assert.equal((await request("/api/owner/admins")).status, 401);
    assert.equal((await request("/api/owner/admins", { headers: { cookie: oldCookie } })).status, 401);
    assert.equal((await request("/api/owner/admins", { headers: { cookie: adminCookie } })).status, 403);
    assert.equal((await request("/api/owner/admins", { method: "POST", headers: headers(adminCookie), body: JSON.stringify({ name: "Tidak Boleh", username: "tidak-boleh", password: "test-password", canChangePrice: true, canDeleteLot: true }) })).status, 403);
    assert.equal((await request("/api/owner/admins", { method: "POST", headers: { ...headers(ownerCookie), origin: "https://example.com" }, body: "{}" })).status, 403);

    const ownerListResponse = await request("/api/owner/admins", { headers: { cookie: ownerCookie } });
    assert.equal(ownerListResponse.status, 200);
    assert.equal(ownerListResponse.headers.get("cache-control"), "no-store");
    const initialAdmins = await ownerListResponse.json();
    assert.equal(initialAdmins.data.length, 1);
    assert.equal(initialAdmins.data[0].username, "admin-test");
    assert.equal(/password|hash/i.test(JSON.stringify(initialAdmins)), false);
    const newAdmin = { name: "Admin Baru", username: "new-admin", password: "new-password", canChangePrice: true, canDeleteLot: true };
    assert.equal((await request("/api/owner/admins", { method: "POST", headers: headers(ownerCookie), body: JSON.stringify(newAdmin) })).status, 201);
    assert.equal((await request("/api/owner/admins", { method: "POST", headers: headers(ownerCookie), body: JSON.stringify({ ...newAdmin, username: "NEW-ADMIN" }) })).status, 409);
    const adminList = (await (await request("/api/owner/admins", { headers: { cookie: ownerCookie } })).json()).data;
    const managed = adminList.find((item: { username: string }) => item.username === "new-admin");
    assert.ok(managed && managed.active && managed.canChangePrice && managed.canDeleteLot);
    assert.equal(/password|hash/i.test(JSON.stringify(managed)), false);
    const [ownerRows] = await databasePool().query<(import("mysql2/promise").RowDataPacket & { id: string })[]>("SELECT id FROM ac_users WHERE role = 'owner'");
    const ownerUpdate = { id: ownerRows[0].id, name: "Pemilik", active: false, canChangePrice: false, canDeleteLot: false };
    assert.equal((await request("/api/owner/admins", { method: "PUT", headers: headers(ownerCookie), body: JSON.stringify(ownerUpdate) })).status, 404);

    const managedLogin = await login("new-admin", "new-password", "test-managed");
    assert.equal(managedLogin.status, 200);
    const managedCookie = cookies(managedLogin);
    const managedUpdate = { id: managed.id, name: "Admin Diperbarui", active: false, canChangePrice: false, canDeleteLot: false, password: "" };
    assert.equal((await request("/api/owner/admins", { method: "PUT", headers: headers(ownerCookie), body: JSON.stringify(managedUpdate) })).status, 200);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: managedCookie } })).json()).authenticated, false);
    assert.equal((await login("new-admin", "new-password", "test-disabled")).status, 401);
    assert.equal((await request("/api/owner/admins", { method: "PUT", headers: headers(ownerCookie), body: JSON.stringify({ ...managedUpdate, active: true, password: "reset-password" }) })).status, 200);
    assert.equal((await login("new-admin", "new-password", "test-old-password")).status, 401);
    const resetLogin = await login("new-admin", "reset-password", "test-reset-password");
    assert.equal(resetLogin.status, 200);
    const resetCookie = cookies(resetLogin);
    assert.equal((await resetLogin.json()).user.canChangePrice, false);
    const passwordRequest = (cookie: string, currentPassword: string, newPassword: string) => request("/api/admin/password", { method: "POST", headers: headers(cookie), body: JSON.stringify({ currentPassword, newPassword }) });
    assert.equal((await passwordRequest("", "reset-password", "final-password")).status, 401);
    assert.equal((await passwordRequest(resetCookie, "wrong", "final-password")).status, 400);
    assert.equal((await passwordRequest(resetCookie, "reset-password", "short")).status, 400);
    assert.equal((await passwordRequest(resetCookie, "reset-password", "final-password")).status, 200);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: resetCookie } })).json()).authenticated, false);
    assert.equal((await login("new-admin", "reset-password", "test-reset-revoked")).status, 401);
    const finalLogin = await login("new-admin", "final-password", "test-final");
    assert.equal(finalLogin.status, 200);
    const finalCookie = cookies(finalLogin);
    assert.equal((await request("/api/admin/logout", { method: "POST", headers: { origin: base, cookie: finalCookie } })).status, 200);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: finalCookie } })).json()).authenticated, false);

    const products = (await (await request("/api/products")).json()).data;
    const original = products[0];
    const invalidPhoto = new FormData();
    invalidPhoto.append("photo", new Blob(["not-an-image"], { type: "image/jpeg" }), "invalid.jpg");
    assert.equal((await request("/api/admin/upload", { method: "POST", headers: { origin: base, cookie: adminCookie }, body: invalidPhoto })).status, 400);
    const oversizedPhoto = new FormData();
    oversizedPhoto.append("photo", new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/jpeg" }), "large.jpg");
    assert.equal((await request("/api/admin/upload", { method: "POST", headers: { origin: base, cookie: adminCookie }, body: oversizedPhoto })).status, 400);
    const originalPhoto = await readFile(path.join(process.cwd(), "fotoac/ac1.jpeg"));
    const validPhoto = new FormData();
    validPhoto.append("photo", new Blob([new Uint8Array(originalPhoto)], { type: "image/jpeg" }), "photo.jpg");
    const upload = await request("/api/admin/upload", { method: "POST", headers: { origin: base, cookie: adminCookie }, body: validPhoto });
    assert.equal(upload.status, 201);
    assert.equal(upload.headers.get("cache-control"), "no-store");
    const uploadedPhoto = (await upload.json()).id as string;
    assert.match(uploadedPhoto, /^upload:[a-f0-9-]{36}\.jpg$/);
    const tooManyPhotos = await request("/api/admin/lots", { method: "POST", headers: headers(adminCookie), body: JSON.stringify({ lot: { ...original, code: "TOO-MANY-PHOTOS", photos: Array(9).fill(uploadedPhoto) } }) });
    assert.equal(tooManyPhotos.status, 400);
    const publicPhoto = await request(`/api/images/${uploadedPhoto.slice(7)}`);
    assert.equal(publicPhoto.status, 200);
    assert.deepEqual(Buffer.from(await publicPhoto.arrayBuffer()), originalPhoto);
    const changePrice = await request("/api/admin/lots", { method: "PUT", headers: headers(adminCookie), body: JSON.stringify({ id: original.id, lot: { ...original, price: 12345 } }) });
    assert.equal(changePrice.status, 403);
    const changeUnit = await request("/api/admin/lots", { method: "PUT", headers: headers(adminCookie), body: JSON.stringify({ id: original.id, lot: { ...original, priceUnit: "unit" } }) });
    assert.equal(changeUnit.status, 403);
    const remove = await request("/api/admin/lots", { method: "DELETE", headers: headers(adminCookie), body: JSON.stringify({ id: original.id }) });
    assert.equal(remove.status, 403);
    const updateStatus = await request("/api/admin/lots", { method: "PUT", headers: headers(adminCookie), body: JSON.stringify({ id: original.id, lot: { ...original, status: "tersedia", photos: [uploadedPhoto] } }) });
    assert.equal(updateStatus.status, 200);
    assert.equal(updateStatus.headers.get("cache-control"), "no-store");
    const forbiddenCreate = await request("/api/admin/lots", { method: "POST", headers: headers(adminCookie), body: JSON.stringify({ lot: { ...original, code: "TEST-PRICE", price: 20000 } }) });
    assert.equal(forbiddenCreate.status, 403);
    const create = await request("/api/admin/lots", { method: "POST", headers: headers(adminCookie), body: JSON.stringify({ lot: { ...original, code: "TEST-NO-PRICE", price: null, priceUnit: "lot" } }) });
    assert.equal(create.status, 201);

    await databasePool().execute("UPDATE ac_admin_permissions SET can_delete_lot = 1 WHERE user_id = ?", [adminId]);
    const changedSession = await (await request("/api/admin/session", { headers: { cookie: adminCookie } })).json();
    assert.equal(changedSession.user.canDeleteLot, true);
    const allowedRemove = await request("/api/admin/lots", { method: "DELETE", headers: headers(adminCookie), body: JSON.stringify({ id: (await create.json()).data.id }) });
    assert.equal(allowedRemove.status, 200);
    await databasePool().execute("UPDATE ac_users SET active = 0 WHERE id = ?", [adminId]);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: adminCookie } })).json()).authenticated, false);
    assert.equal((await request("/api/admin/lots", { method: "DELETE", headers: headers(adminCookie), body: JSON.stringify({ id: original.id }) })).status, 401);
    await databasePool().execute("UPDATE ac_users SET active = 1, session_version = session_version + 1 WHERE id = ?", [adminId]);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: adminCookie } })).json()).authenticated, false);

    const activityResponse = await request("/api/owner/activity", { headers: { cookie: ownerCookie } });
    assert.equal(activityResponse.status, 200);
    assert.equal(activityResponse.headers.get("cache-control"), "no-store");
    const activity = (await activityResponse.json()).data as { action: string; actorUsername: string; targetId: string; summary: string; occurredAt: string }[];
    for (const action of ["owner.initialized", "admin.created", "admin.updated", "password.changed", "settings.updated", "lot.updated", "lot.created", "lot.deleted"]) {
      assert.ok(activity.some((event) => event.action === action), `Riwayat ${action} tercatat`);
    }
    assert.ok(activity.some((event) => event.action === "lot.updated" && event.actorUsername === "admin-test" && event.targetId === original.id && event.summary.includes("status") && event.summary.includes("foto")));
    assert.ok(activity.every((event) => !Number.isNaN(Date.parse(event.occurredAt))));
    for (const secret of ["owner-password", "admin-password", "new-password", "reset-password", "final-password", "legacy-password-123"]) assert.equal(JSON.stringify(activity).includes(secret), false);

    const beforeLot = (await (await request("/api/products")).json()).data.find((item: { id: string }) => item.id === original.id);
    const beforeSettings = (await (await request("/api/admin/settings", { headers: { cookie: ownerCookie } })).json()).data;
    await databasePool().query("RENAME TABLE ac_audit_events TO ac_audit_events_test_hidden");
    try {
      const failedLot = await request("/api/admin/lots", { method: "PUT", headers: headers(ownerCookie), body: JSON.stringify({ id: beforeLot.id, lot: { ...beforeLot, status: "terjual" } }) });
      assert.equal(failedLot.status, 500);
      assert.equal((await (await request("/api/products")).json()).data.find((item: { id: string }) => item.id === beforeLot.id).status, beforeLot.status);
      assert.equal((await settingsRequest(ownerCookie, { ...beforeSettings, technicianDescription: "Tidak boleh tersimpan tanpa audit." })).status, 503);
      assert.equal((await (await request("/api/admin/settings", { headers: { cookie: ownerCookie } })).json()).data.technicianDescription, beforeSettings.technicianDescription);
      assert.equal((await request("/api/owner/admins", { method: "POST", headers: headers(ownerCookie), body: JSON.stringify({ ...newAdmin, username: "rollback-admin" }) })).status, 503);
      const afterRollback = (await (await request("/api/owner/admins", { headers: { cookie: ownerCookie } })).json()).data;
      assert.equal(afterRollback.some((item: { username: string }) => item.username === "rollback-admin"), false);
    } finally { await databasePool().query("RENAME TABLE ac_audit_events_test_hidden TO ac_audit_events"); }

    const logout = await request("/api/admin/logout", { method: "POST", headers: { origin: base, cookie: ownerCookie } });
    assert.equal(logout.status, 200);
    assert.equal((await (await request("/api/admin/session", { headers: { cookie: ownerCookie } })).json()).authenticated, false);
  } finally {
    server?.kill();
    await closeDatabase();
    await rm(directory, { recursive: true, force: true });
  }
});

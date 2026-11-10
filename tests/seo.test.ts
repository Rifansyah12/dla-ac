import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { exampleLots, type Lot } from "../lib/lots";

test("metadata dan sitemap mengikuti katalog publik", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dla-ac-seo-test-"));
  const listener = net.createServer();
  let server: ChildProcess | undefined;
  try {
    await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const port = (listener.address() as net.AddressInfo).port;
    await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    const base = `http://127.0.0.1:${port}`;
    const development = process.env.AC_SEO_TEST_DEV === "1";
    const args = development ? [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(port), "-H", "127.0.0.1"] : ["app.js"];
    server = spawn(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, NODE_ENV: development ? "development" : "production", PORT: String(port), AC_STORAGE: "json", AC_DATA_DIR: directory, APP_ORIGIN: base, WHATSAPP_NUMBER: "6285173209025", ADMIN_PASSWORD: "", ADMIN_SESSION_SECRET: "" }, stdio: "ignore" });
    let started = false;
    for (let i = 0; i < 150; i++) {
      try { if ((await fetch(`${base}/robots.txt`)).ok) { started = true; break; } } catch { /* Wait for the server. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(started, "Jalankan build produksi sebelum tes SEO.");
    const request = (url: string) => fetch(`${base}${url}`, { headers: { "user-agent": "Googlebot" }, cache: "no-store" });

    const home = await (await request("/")).text();
    assert.match(home, /<title>DLA AC \| Jual Beli AC Borongan.*Jasa Teknisi<\/title>/);
    assert.doesNotMatch(home, /\bbekas\b/i);
    assert.match(home, /<link rel="canonical" href="https:\/\/dla-ac\.com\/?"/);
    assert.match(home, /<meta property="og:image" content="https:\/\/dla-ac\.com\//);
    const jsonLd = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLd);
    const organization = JSON.parse(jsonLd[1]) as { "@type": string; name: string; url: string };
    assert.equal(organization["@type"], "Organization");
    assert.equal(organization.name, "DLA AC");
    assert.equal(organization.url, "https://dla-ac.com/");

    const robots = await (await request("/robots.txt")).text();
    assert.match(robots, /Sitemap: https:\/\/dla-ac\.com\/sitemap\.xml/);
    assert.match(robots, /Disallow: \/api\/admin\//);
    assert.doesNotMatch(robots, /Disallow: \/api\/images\//);
    const verification = await request("/google8d5a9fc9fd1919f0.html");
    assert.equal(verification.status, 200);
    assert.equal((await verification.text()).trim(), "google-site-verification: google8d5a9fc9fd1919f0.html");
    for (const route of ["/admin", "/keranjang"]) {
      const html = await (await request(route)).text();
      assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
    }

    const catalog = await (await request("/produk?q=Daikin")).text();
    assert.doesNotMatch(catalog, /\bbekas\b/i);
    assert.match(catalog, /<link rel="canonical" href="https:\/\/dla-ac\.com\/produk"/);
    assert.match(catalog, /<meta property="og:url" content="https:\/\/dla-ac\.com\/produk"/);
    const about = await (await request("/tentang")).text();
    assert.match(about, /<link rel="canonical" href="https:\/\/dla-ac\.com\/tentang"/);
    assert.ok(about.includes("Jl. Terusan Pasir Koja, Gg. Bah Amid, RT 06/RW 05"));
    assert.match(about, /<iframe[^>]+title="Peta lokasi DLA AC"/);
    assert.ok(about.includes("https://maps.app.goo.gl/UQfnuaceSbpTk8qv8"));
    assert.ok(about.includes("-6.926199%2C107.584214"));

    const initialMap = await (await request("/sitemap.xml")).text();
    assert.equal((initialMap.match(/<loc>/g) ?? []).length, exampleLots.length + 3);
    assert.match(initialMap, /https:\/\/dla-ac\.com\/produk\/foto-01/);
    assert.match(initialMap, /https:\/\/dla-ac\.com\/tentang/);
    assert.doesNotMatch(initialMap, /https:\/\/dla-ac\.com\/(admin|keranjang)/);

    const imageName = "00000000-0000-4000-8000-000000000000.jpg";
    const lot: Lot = { ...exampleLots[0], id: "unit & baru", code: "UNIT-TEST", title: "Unit AC Uji", description: "Dokumentasi unit yang tersedia untuk ditanyakan.", photos: [`upload:${imageName}`], isExample: false };
    await mkdir(path.join(directory, "uploads"), { recursive: true });
    await copyFile(path.join(process.cwd(), "fotoac/ac1.jpeg"), path.join(directory, "uploads", imageName));
    await writeFile(path.join(directory, "lots.json"), JSON.stringify([lot]), "utf8");
    const updatedMap = await (await request("/sitemap.xml")).text();
    assert.match(updatedMap, /https:\/\/dla-ac\.com\/produk\/unit%20%26%20baru/);
    assert.doesNotMatch(updatedMap, /\/produk\/foto-01/);
    const detail = await (await request("/produk/unit%20%26%20baru")).text();
    assert.match(detail, /<title>Unit AC Uji \| DLA AC<\/title>/);
    assert.match(detail, /<link rel="canonical" href="https:\/\/dla-ac\.com\/produk\/unit%20%26%20baru"/);
    assert.ok(detail.includes(`https://dla-ac.com/api/images/${imageName}`));
    assert.equal((await request(`/api/images/${imageName}`)).status, 200);

    await writeFile(path.join(directory, "lots.json"), "[]", "utf8");
    const emptyMap = await (await request("/sitemap.xml")).text();
    assert.equal((emptyMap.match(/<loc>/g) ?? []).length, 3);
    const removed = await request("/produk/unit%20%26%20baru");
    assert.ok(removed.status === 404 || removed.status === 200);
    assert.match(await removed.text(), /<meta name="robots" content="noindex(?:, nofollow)?"/);
  } finally {
    if (server && server.exitCode === null) await new Promise<void>((resolve) => { server!.once("exit", () => resolve()); server!.kill(); });
    await rm(directory, { recursive: true, force: true });
  }
});

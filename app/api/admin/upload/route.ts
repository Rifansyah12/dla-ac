import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { authenticated, sameOrigin } from "@/lib/server/admin-auth";
import { uploadsDir } from "@/lib/server/inventory";

export const runtime = "nodejs";
const maxBytes = 8 * 1024 * 1024;
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    if (!await authenticated(request)) return NextResponse.json({ error: "Silakan masuk sebagai admin." }, { status: 401, headers });
  } catch { return NextResponse.json({ error: "Layanan admin belum tersedia." }, { status: 503, headers }); }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes + 1024 * 1024) return NextResponse.json({ error: "Foto maksimal 8 MB." }, { status: 413, headers });
  try {
    const file = (await request.formData()).get("photo");
    if (!file || typeof file === "string" || file.size === 0 || file.size > maxBytes) return NextResponse.json({ error: "Pilih foto maksimal 8 MB." }, { status: 400, headers });
    const bytes = Buffer.from(await file.arrayBuffer());
    const jpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = bytes.length > 12 && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!jpeg && !png && !webp) return NextResponse.json({ error: "Gunakan foto JPEG, PNG, atau WebP." }, { status: 400, headers });
    const filename = `${randomUUID()}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, filename), bytes, { flag: "wx" });
    return NextResponse.json({ id: `upload:${filename}` }, { status: 201, headers });
  } catch {
    return NextResponse.json({ error: "Foto belum dapat diunggah." }, { status: 500, headers });
  }
}

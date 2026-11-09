import { NextRequest, NextResponse } from "next/server";
import { accountMode, adminConfigured, clearSession, sameOrigin } from "@/lib/server/admin-auth";
import { completePasswordReset, validResetIdentity } from "@/lib/server/password-reset";
import { allowResetAttempt } from "@/lib/server/reset-rate-limit";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    if (!accountMode() || !adminConfigured()) return NextResponse.json({ error: "Layanan pemulihan kata sandi belum tersedia." }, { status: 503, headers });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || "local";
    if (!allowResetAttempt(`confirm:${ip}`, 30)) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    const { username, email, code, newPassword } = input as { username?: unknown; email?: unknown; code?: unknown; newPassword?: unknown };
    if (!validResetIdentity(username, email) || typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Masukkan kode verifikasi 6 digit yang valid." }, { status: 400, headers });
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 256) return NextResponse.json({ error: "Kata sandi harus berisi 8–256 karakter." }, { status: 400, headers });
    if (!await completePasswordReset(username, email, code, newPassword)) return NextResponse.json({ error: "Kode verifikasi tidak valid atau sudah kedaluwarsa." }, { status: 400, headers });
    const response = NextResponse.json({ ok: true }, { headers });
    clearSession(response);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Kata sandi belum dapat dipulihkan." }, { status: 503, headers });
  }
}

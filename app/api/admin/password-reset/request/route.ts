import { after, NextRequest, NextResponse } from "next/server";
import { accountMode, adminConfigured, sameOrigin } from "@/lib/server/admin-auth";
import { preparePasswordReset, validResetIdentity } from "@/lib/server/password-reset";
import { allowResetAttempt } from "@/lib/server/reset-rate-limit";
import { sendPasswordResetEmail, smtpConfigured } from "@/lib/server/smtp";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    if (!accountMode() || !adminConfigured() || !smtpConfigured()) return NextResponse.json({ error: "Layanan pemulihan kata sandi belum tersedia." }, { status: 503, headers });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 100) || "local";
    if (!allowResetAttempt(`request:${ip}`, 10)) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers });
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    const { username, email } = input as { username?: unknown; email?: unknown };
    if (!validResetIdentity(username, email) || typeof email !== "string") return NextResponse.json({ error: "Masukkan nama pengguna dan email yang valid." }, { status: 400, headers });
    const mail = await preparePasswordReset(username, email);
    if (mail) after(async () => {
      try { await sendPasswordResetEmail(mail.email, mail.code); }
      catch { console.error("Pengiriman email kode pemulihan gagal."); }
    });
    return NextResponse.json({ ok: true }, { status: 202, headers });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Layanan pemulihan kata sandi belum tersedia." }, { status: 503, headers });
  }
}

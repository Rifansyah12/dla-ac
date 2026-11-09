import { NextRequest, NextResponse } from "next/server";
import { authenticateAccount, type Account } from "@/lib/server/accounts";
import { accountMode, adminConfigured, correctPassword, sameOrigin, setAccountSession, setSession } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
const attempts = new Map<string, { count: number; expires: number }>();
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  if (!adminConfigured()) return NextResponse.json({ error: "Admin belum dikonfigurasi." }, { status: 503, headers });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.expires > now && current.count >= 5) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers });
  let password: unknown; let username: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    ({ password, username } = body as { password?: unknown; username?: unknown });
  } catch { return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers }); }
  let account: Account | null = null;
  let valid = false;
  try {
    if (typeof password === "string" && password.length <= 256) {
      if (accountMode()) {
        if (typeof username === "string" && username.length <= 80) account = await authenticateAccount(username, password);
        valid = Boolean(account);
      } else valid = correctPassword(password);
    }
  } catch { return NextResponse.json({ error: "Layanan login belum tersedia." }, { status: 503, headers }); }
  if (!valid) {
    const entry = current && current.expires > now ? current : { count: 0, expires: now + 15 * 60 * 1000 };
    attempts.set(ip, { ...entry, count: entry.count + 1 });
    return NextResponse.json({ error: accountMode() ? "Nama pengguna atau kata sandi tidak sesuai." : "Kata sandi tidak sesuai." }, { status: 401, headers });
  }
  attempts.delete(ip);
  const response = NextResponse.json({ ok: true, user: account ? { name: account.name, username: account.username, role: account.role, canChangePrice: account.canChangePrice, canDeleteLot: account.canDeleteLot } : null }, { headers });
  if (account) setAccountSession(response, request, account);
  else setSession(response, request);
  return response;
}

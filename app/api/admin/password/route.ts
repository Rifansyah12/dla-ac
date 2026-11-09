import { NextRequest, NextResponse } from "next/server";
import { AccountActionError, changeOwnPassword } from "@/lib/server/admin-accounts";
import { clearSession, currentAccount, sameOrigin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const attempts = new Map<string, { count: number; expires: number }>();

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    const user = await currentAccount(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    const now = Date.now();
    const previous = attempts.get(user.id);
    if (previous && previous.expires > now && previous.count >= 5) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    const { currentPassword, newPassword } = input as { currentPassword?: unknown; newPassword?: unknown };
    try { await changeOwnPassword(user, currentPassword, newPassword); }
    catch (error) {
      if (error instanceof AccountActionError && error.code === "incorrect_password") {
        const entry = previous && previous.expires > now ? previous : { count: 0, expires: now + 15 * 60 * 1000 };
        attempts.set(user.id, { ...entry, count: entry.count + 1 });
      }
      throw error;
    }
    attempts.delete(user.id);
    const response = NextResponse.json({ ok: true }, { headers });
    clearSession(response);
    return response;
  } catch (error) {
    if (error instanceof AccountActionError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Kata sandi belum dapat diubah." }, { status: 503, headers });
  }
}

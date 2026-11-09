import { NextRequest, NextResponse } from "next/server";
import { AccountActionError, getRecoveryEmail, updateOwnRecoveryEmail } from "@/lib/server/admin-accounts";
import { currentAccount, sameOrigin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const attempts = new Map<string, { count: number; expires: number }>();

export async function GET(request: NextRequest) {
  try {
    const account = await currentAccount(request);
    if (!account) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    return NextResponse.json({ email: await getRecoveryEmail(account) }, { headers });
  } catch {
    return NextResponse.json({ error: "Email pemulihan belum dapat dimuat." }, { status: 503, headers });
  }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    const account = await currentAccount(request);
    if (!account) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    const now = Date.now();
    const previous = attempts.get(account.id);
    if (previous && previous.expires > now && previous.count >= 5) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    const { email, currentPassword } = body as { email?: unknown; currentPassword?: unknown };
    try {
      const saved = await updateOwnRecoveryEmail(account, currentPassword, email);
      attempts.delete(account.id);
      return NextResponse.json({ email: saved }, { headers });
    } catch (error) {
      if (error instanceof AccountActionError && error.code === "incorrect_password") {
        const entry = previous && previous.expires > now ? previous : { count: 0, expires: now + 15 * 60 * 1000 };
        attempts.set(account.id, { ...entry, count: entry.count + 1 });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof AccountActionError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Email pemulihan belum dapat disimpan." }, { status: 503, headers });
  }
}

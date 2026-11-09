import { NextRequest, NextResponse } from "next/server";
import { revokeAccountSessions } from "@/lib/server/accounts";
import { accountMode, clearSession, currentAccount, sameOrigin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    if (accountMode()) {
      const account = await currentAccount(request);
      if (account) await revokeAccountSessions(account);
    }
  } catch {
    const response = NextResponse.json({ error: "Sesi belum dapat dicabut. Silakan coba lagi." }, { status: 503, headers });
    clearSession(response);
    return response;
  }
  const response = NextResponse.json({ ok: true }, { headers });
  clearSession(response);
  return response;
}

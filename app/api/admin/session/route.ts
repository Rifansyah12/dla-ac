import { NextRequest, NextResponse } from "next/server";
import { accountMode, adminConfigured, authenticated, currentAccount } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const configured = adminConfigured();
    const accounts = accountMode();
    const user = configured && accounts ? await currentAccount(request) : null;
    return NextResponse.json({ configured, accountMode: accounts, authenticated: accounts ? Boolean(user) : await authenticated(request), user: user ? { name: user.name, username: user.username, role: user.role, canChangePrice: user.canChangePrice, canDeleteLot: user.canDeleteLot } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Status admin belum dapat dimuat." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

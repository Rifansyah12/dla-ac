import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/server/admin-auth";
import { listAuditEvents } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const user = await currentAccount(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    if (user.role !== "owner") return NextResponse.json({ error: "Riwayat aktivitas hanya untuk owner." }, { status: 403, headers });
    return NextResponse.json({ data: await listAuditEvents() }, { headers });
  } catch {
    return NextResponse.json({ error: "Riwayat aktivitas belum dapat dimuat." }, { status: 503, headers });
  }
}

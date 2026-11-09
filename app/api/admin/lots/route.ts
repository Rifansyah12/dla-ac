import { NextRequest, NextResponse } from "next/server";
import type { Account } from "@/lib/server/accounts";
import { accountMode, authenticated, currentAccount, sameOrigin } from "@/lib/server/admin-auth";
import { deleteLot, InventoryError, InventoryPermissionError, saveLot } from "@/lib/server/inventory";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

async function mutate(request: NextRequest, method: "create" | "update" | "delete") {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  let account: Account | null = null;
  try {
    if (accountMode()) {
      account = await currentAccount(request);
      if (!account) return NextResponse.json({ error: "Silakan masuk sebagai admin." }, { status: 401, headers });
    } else if (!await authenticated(request)) return NextResponse.json({ error: "Silakan masuk sebagai admin." }, { status: 401, headers });
  } catch { return NextResponse.json({ error: "Layanan admin belum tersedia." }, { status: 503, headers }); }
  if (method === "delete" && account && !account.canDeleteLot) return NextResponse.json({ error: "Anda tidak memiliki izin menghapus lot." }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 32000) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    const input = body as { id?: unknown; lot?: unknown };
    if (method !== "create" && (typeof input.id !== "string" || input.id.length > 80)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400, headers });
    if (method === "delete") { await deleteLot(input.id as string, account ?? undefined); return NextResponse.json({ ok: true }, { headers }); }
    const lot = await saveLot(input.lot, method === "update" ? input.id as string : undefined, account?.canChangePrice ?? true, account ?? undefined);
    return NextResponse.json({ data: lot }, { status: method === "create" ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof InventoryError) return NextResponse.json({ error: error.message }, { status: 400, headers });
    if (error instanceof InventoryPermissionError) return NextResponse.json({ error: error.message }, { status: 403, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Data belum dapat disimpan." }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) { return mutate(request, "create"); }
export async function PUT(request: NextRequest) { return mutate(request, "update"); }
export async function DELETE(request: NextRequest) { return mutate(request, "delete"); }

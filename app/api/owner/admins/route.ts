import { NextRequest, NextResponse } from "next/server";
import { AccountActionError, createAdmin, listAdmins, updateAdmin } from "@/lib/server/admin-accounts";
import { currentAccount, sameOrigin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

async function handle(request: NextRequest, action: "list" | "create" | "update") {
  if (action !== "list" && !sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    const user = await currentAccount(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    if (user.role !== "owner") return NextResponse.json({ error: "Halaman ini hanya untuk owner." }, { status: 403, headers });
    if (action === "list") return NextResponse.json({ data: await listAdmins() }, { headers });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const input: unknown = JSON.parse(raw);
    if (action === "create") await createAdmin(input, user);
    else await updateAdmin(input, user);
    return NextResponse.json({ ok: true }, { status: action === "create" ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof AccountActionError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Pengelolaan admin belum tersedia." }, { status: 503, headers });
  }
}

export async function GET(request: NextRequest) { return handle(request, "list"); }
export async function POST(request: NextRequest) { return handle(request, "create"); }
export async function PUT(request: NextRequest) { return handle(request, "update"); }

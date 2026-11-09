import { NextRequest, NextResponse } from "next/server";
import { currentAccount, sameOrigin } from "@/lib/server/admin-auth";
import { getSiteSettings, SiteSettingsError, updateSiteSettings } from "@/lib/server/site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

async function handle(request: NextRequest, update: boolean) {
  if (update && !sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403, headers });
  try {
    const user = await currentAccount(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401, headers });
    if (!update) return NextResponse.json({ data: await getSiteSettings() }, { headers });
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers });
    const input: unknown = JSON.parse(raw);
    await updateSiteSettings(input, user);
    return NextResponse.json({ data: await getSiteSettings() }, { headers });
  } catch (error) {
    if (error instanceof SiteSettingsError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers });
    return NextResponse.json({ error: "Pengaturan belum dapat diproses." }, { status: 503, headers });
  }
}

export async function GET(request: NextRequest) { return handle(request, false); }
export async function PUT(request: NextRequest) { return handle(request, true); }

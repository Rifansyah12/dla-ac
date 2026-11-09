import { getLots } from "@/lib/server/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ data: await getLots() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Katalog belum dapat dimuat." }, { status: 500 });
  }
}

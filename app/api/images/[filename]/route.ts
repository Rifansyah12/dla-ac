import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/server/inventory";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(uploadsDir, filename));
    const contentType = filename.endsWith(".jpg") ? "image/jpeg" : filename.endsWith(".png") ? "image/png" : "image/webp";
    return new Response(Uint8Array.from(bytes), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function readSecret(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const wasRaw = stdin.isRaw;
    let value = "";
    let excess = 0;
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    function finish(error?: Error) {
      stdin.removeListener("data", onData);
      stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error); else resolve(value);
    }
    function onData(chunk: string) {
      for (const char of chunk) {
        if (char === "\u0003") { finish(new Error("Inisialisasi dibatalkan.")); return; }
        if (char === "\r" || char === "\n") { finish(excess ? new Error("Kata sandi maksimal 256 karakter.") : undefined); return; }
        if (char === "\u007f" || char === "\b") {
          if (excess) excess -= 1;
          else value = Array.from(value).slice(0, -1).join("");
        } else if (char >= " ") {
          if (!excess && value.length + char.length <= 256) value += char;
          else excess += 1;
        }
      }
    }
    stdin.on("data", onData);
    stdout.write(prompt);
    stdin.resume();
  });
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error("Jalankan inisialisasi melalui terminal interaktif agar kata sandi tidak terlihat.");
  if ((process.env.ADMIN_SESSION_SECRET?.length ?? 0) < 32) throw new Error("Isi ADMIN_SESSION_SECRET minimal 32 karakter sebelum membuat owner.");
  const rl = createInterface({ input: stdin, output: stdout });
  let name: string; let username: string;
  try {
    name = await rl.question("Nama owner: ");
    username = await rl.question("Username owner: ");
  } finally { rl.close(); }
  const password = await readSecret("Kata sandi owner (tidak ditampilkan): ");
  const confirmation = await readSecret("Ulangi kata sandi: ");
  if (password !== confirmation) throw new Error("Konfirmasi kata sandi tidak cocok.");
  const { initializeOwner } = await import("../lib/server/accounts");
  const { closeDatabase } = await import("../lib/server/database");
  try {
    const created = await initializeOwner(name, username, password);
    console.log(created ? "Akun owner berhasil dibuat." : "Owner sudah diinisialisasi; tidak ada akun baru yang dibuat.");
  } finally { await closeDatabase(); }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Inisialisasi owner gagal.");
  process.exitCode = 1;
});

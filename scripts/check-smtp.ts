import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { verifySmtpConnection } = await import("../lib/server/smtp");
  await verifySmtpConnection();
  console.log("Koneksi dan autentikasi SMTP berhasil.");
}

main().catch(() => {
  console.error("Koneksi SMTP gagal. Periksa host, port, TLS, dan kredensial email pada environment.");
  process.exitCode = 1;
});

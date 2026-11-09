import nodemailer from "nodemailer";
import { normalizeEmail } from "@/lib/email";

type SmtpConfig = { host: string; port: number; secure: boolean; user: string; password: string; from: string };

function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const portText = process.env.SMTP_PORT?.trim() || "587";
  const port = Number(portText);
  const secureText = process.env.SMTP_SECURE?.trim() || (port === 465 ? "true" : "false");
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password = process.env.SMTP_PASSWORD ?? "";
  const from = normalizeEmail(process.env.SMTP_FROM ?? "");
  if (!/^[a-z0-9.-]{1,253}$/i.test(host) || !/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  if ((secureText !== "true" && secureText !== "false") || !user || /[\r\n]/.test(user) || !password || !from) return null;
  return { host, port, secure: secureText === "true", user, password, from };
}

export function smtpConfigured(): boolean {
  return smtpConfig() !== null;
}

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.secure, requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
}

export async function verifySmtpConnection(): Promise<void> {
  const config = smtpConfig();
  if (!config) throw new Error("SMTP belum dikonfigurasi.");
  const transport = createTransport(config);
  try { await transport.verify(); }
  finally { transport.close(); }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const config = smtpConfig();
  if (!config) throw new Error("SMTP belum dikonfigurasi.");
  const transport = createTransport(config);
  try {
    await transport.sendMail({
      from: { name: "DLA AC", address: config.from }, to,
      subject: "Kode verifikasi pemulihan kata sandi DLA AC",
      text: `Halo,\n\nKode verifikasi pemulihan kata sandi Anda: ${code}\n\nKode berlaku selama 10 menit dan hanya dapat digunakan satu kali.\nJika Anda tidak meminta perubahan kata sandi, abaikan email ini.\n\nDLA AC`,
    });
  } finally { transport.close(); }
}

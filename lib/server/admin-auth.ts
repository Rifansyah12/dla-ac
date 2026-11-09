import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { findActiveAccount, type Account } from "./accounts";
import { catalogStorage } from "./database";

export const sessionCookie = "ac_admin_session";
export const accountSessionCookie = "ac_account_session";
const sessionSeconds = 8 * 60 * 60;

export function accountMode(): boolean {
  return catalogStorage() === "mysql";
}

export function adminConfigured(): boolean {
  const secretReady = (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32;
  return secretReady && (accountMode() ? Boolean(process.env.AC_DB_NAME?.trim() && process.env.AC_DB_USER?.trim()) : (process.env.ADMIN_PASSWORD?.length ?? 0) >= 8);
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const appOrigin = process.env.APP_ORIGIN?.trim();
  if (!origin) return false;
  try {
    const requestedOrigin = new URL(origin);
    if (requestedOrigin.protocol !== "http:" && requestedOrigin.protocol !== "https:") return false;
    if (appOrigin) {
      const expectedOrigin = new URL(appOrigin);
      if (expectedOrigin.protocol !== "http:" && expectedOrigin.protocol !== "https:") return false;
      return requestedOrigin.origin === expectedOrigin.origin;
    }
    return !!host && requestedOrigin.host === host;
  } catch { return false; }
}

export function correctPassword(password: string): boolean {
  if (!adminConfigured()) return false;
  const expected = createHash("sha256").update(process.env.ADMIN_PASSWORD!).digest();
  const actual = createHash("sha256").update(password).digest();
  return timingSafeEqual(expected, actual);
}

function sign(payload: string, account = false): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(account ? `${accountSessionCookie}:${payload}` : payload).digest("base64url");
}

function verifiedPayload(token: string | undefined, account = false): string | null {
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload, account));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? payload : null;
}

function legacyAuthenticated(request: NextRequest): boolean {
  const payload = verifiedPayload(request.cookies.get(sessionCookie)?.value);
  if (!payload) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch { return false; }
}

export async function currentAccount(request: NextRequest): Promise<Account | null> {
  if (!accountMode() || !adminConfigured()) return null;
  const payload = verifiedPayload(request.cookies.get(accountSessionCookie)?.value, true);
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: unknown; sub?: unknown; sv?: unknown; exp?: unknown };
    if (data.v !== 1 || typeof data.sub !== "string" || data.sub.length > 80 || !Number.isSafeInteger(data.sv) || typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    const user = await findActiveAccount(data.sub);
    return user && user.sessionVersion === data.sv ? user : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function authenticated(request: NextRequest): Promise<boolean> {
  if (!adminConfigured()) return false;
  return accountMode() ? Boolean(await currentAccount(request)) : legacyAuthenticated(request);
}

function secureCookie(request: NextRequest): boolean {
  let configuredHttps = false;
  try { configuredHttps = new URL(process.env.APP_ORIGIN ?? "").protocol === "https:"; } catch { /* No valid public origin configured. */ }
  return configuredHttps || request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

export function setSession(response: NextResponse, request: NextRequest): void {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + sessionSeconds * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  response.cookies.set(sessionCookie, `${payload}.${sign(payload)}`, { httpOnly: true, secure: secureCookie(request), sameSite: "strict", path: "/", maxAge: sessionSeconds });
}

export function setAccountSession(response: NextResponse, request: NextRequest, account: Account): void {
  const payload = Buffer.from(JSON.stringify({ v: 1, sub: account.id, sv: account.sessionVersion, exp: Date.now() + sessionSeconds * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  response.cookies.set(accountSessionCookie, `${payload}.${sign(payload, true)}`, { httpOnly: true, secure: secureCookie(request), sameSite: "strict", path: "/", maxAge: sessionSeconds });
}

export function clearSession(response: NextResponse): void {
  response.cookies.set(sessionCookie, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  response.cookies.set(accountSessionCookie, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
}

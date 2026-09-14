// Admin sign-in for the site. One account, seeded from the environment:
// ADMIN_EMAIL, ADMIN_PASSWORD_HASH (scrypt, made by scripts/admin-password.mjs;
// colon-separated because dotenv loaders expand `$name` inside values),
// AUTH_SECRET (signs the session cookie). No database, no accounts table --
// the gate exists to keep the working pages (queue, drafts, open questions,
// how this works) out of visitors' way, not to protect secrets; the catalog
// itself is public by design.
//
// Server-only: node:crypto. The proxy (Node runtime in Next 16) and the
// route handlers both import this; client code reads only the marker cookie.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rsi_session";
/** Not HttpOnly: lets the nav show admin links without a round trip. Carries no authority. */
export const MARKER_COOKIE = "rsi_admin_ui";
export const SESSION_DAYS = 30;
export const GATED_PREFIXES = ["/open-questions", "/queue", "/drafts", "/how-this-works"];

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET missing or too short");
  return s;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const got = scryptSync(password, salt, 64);
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

/** "email.expiresAt.signature", base64url; verifiable without state. */
export function signSession(email: string): string {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const body = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret()).update(body).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { email: string; exp: number };
    if (typeof exp !== "number" || exp < Date.now()) return null;
    if (!process.env.ADMIN_EMAIL || email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) return null;
    return { email };
  } catch { return null; }
}

export function isAdminEmail(email: string): boolean {
  const admin = process.env.ADMIN_EMAIL;
  return !!admin && email.trim().toLowerCase() === admin.toLowerCase();
}

import crypto from "crypto";

function resolveSecret(): string {
  const s = process.env.PORTAL_SECRET || process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PORTAL_SECRET (or SESSION_SECRET) is required in production");
  }
  console.warn("[portal] PORTAL_SECRET not set — using ephemeral dev secret. Tokens will not survive restarts.");
  // Generate a random ephemeral secret per process so tokens cannot be forged.
  return crypto.randomBytes(32).toString("hex");
}
const SECRET = resolveSecret();
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signPortalToken(contactId: number): string {
  const payload = JSON.stringify({ cid: contactId, exp: Date.now() + TOKEN_TTL_MS });
  const body = b64url(payload);
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyPortalToken(token: string): { contactId: number } | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest());
  // Constant-time compare to avoid timing leaks.
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (typeof payload?.cid !== "number") return null;
    if (typeof payload?.exp !== "number" || Date.now() > payload.exp) return null;
    return { contactId: payload.cid };
  } catch { return null; }
}

export function readPortalToken(req: any): string | null {
  const auth = req.header("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.header("x-portal-token");
  return x ? String(x).trim() : null;
}

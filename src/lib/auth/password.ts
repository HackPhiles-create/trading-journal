// Deliberately NOT "server-only" — used both by the web login API routes
// and, client-side, by the offline Android build's local auth
// (lib/local/auth.ts). PBKDF2-SHA256 via the Web Crypto API rather than
// Node's `crypto.scrypt` —
// route handlers run on the Node runtime, but Web Crypto works identically
// there and keeps this code portable if any of these routes ever move to the
// Edge runtime.
const ITERATIONS = 120_000;
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function deriveHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return toHex(new Uint8Array(bits));
}

/** Returns "saltHex:hashHex", suitable for storing directly in User.passwordHash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await deriveHash(password, salt);
  return `${toHex(salt)}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const candidate = await deriveHash(password, fromHex(saltHex));
  return constantTimeEqual(candidate, hashHex);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Local-only auth for the offline Android build — no server, no session
// cookie. A password hash lives in the on-device `users` table (same
// hashPassword/verifyPassword as the web login), and "signed in" is a
// device-local flag persisted via @capacitor/preferences so it survives
// closing the app, cleared only by an explicit sign-out.
import { Preferences } from "@capacitor/preferences";
import { queryAll, run } from "@/lib/local/db";
import { genId, nowIso, LocalApiError } from "@/lib/local/utils";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const UNLOCK_KEY = "tj_unlocked";

const TRADE_ID_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export async function hasLocalAccount(): Promise<boolean> {
  const rows = await queryAll("SELECT id FROM users LIMIT 1");
  return rows.length > 0;
}

export async function registerLocal(tradeId: string, password: string): Promise<{ tradeId: string }> {
  if (await hasLocalAccount()) throw new LocalApiError("An account already exists. Please sign in instead.", 409);
  const trimmed = tradeId.trim();
  if (!TRADE_ID_RE.test(trimmed)) throw new LocalApiError("Trade ID must be 3-32 characters: letters, numbers, and _ . -");
  if (password.length < 8) throw new LocalApiError("Password must be at least 8 characters.");

  const passwordHash = await hashPassword(password);
  await run("INSERT INTO users (id, tradeId, passwordHash, createdAt) VALUES (?, ?, ?, ?)", [genId(), trimmed, passwordHash, nowIso()]);
  await setUnlocked(true);
  return { tradeId: trimmed };
}

export async function loginLocal(tradeId: string, password: string): Promise<{ tradeId: string }> {
  const rows = await queryAll<{ tradeId: string; passwordHash: string }>("SELECT tradeId, passwordHash FROM users WHERE tradeId = ?", [
    tradeId.trim(),
  ]);
  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) throw new LocalApiError("Invalid Trade ID or password.", 401);
  await setUnlocked(true);
  return { tradeId: user.tradeId };
}

export async function getSignedInTradeId(): Promise<string | null> {
  const rows = await queryAll<{ tradeId: string }>("SELECT tradeId FROM users LIMIT 1");
  return rows[0]?.tradeId ?? null;
}

export async function isUnlocked(): Promise<boolean> {
  const { value } = await Preferences.get({ key: UNLOCK_KEY });
  return value === "1";
}

export async function setUnlocked(unlocked: boolean): Promise<void> {
  if (unlocked) await Preferences.set({ key: UNLOCK_KEY, value: "1" });
  else await Preferences.remove({ key: UNLOCK_KEY });
}

export async function signOutLocal(): Promise<void> {
  await setUnlocked(false);
}

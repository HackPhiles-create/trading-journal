"use client";

import { CapacitorSQLite } from "@capacitor-community/sqlite";
import { isNative } from "@/lib/data-source";
import { LOCAL_SCHEMA_SQL, LOCAL_SCHEMA_VERSION } from "@/lib/local/schema";
import { PRESET_CHECKLIST_ITEMS, PRESET_MISTAKES, DEFAULT_ASSETS } from "@/lib/constants";
import { genId, nowIso } from "@/lib/local/utils";

const DB_NAME = "trading_journal";

// Same 5 strategies as lib/seed/reference-data.ts's DEMO_STRATEGIES,
// redefined here rather than imported — that file imports Prisma at module
// scope, which must never reach the client bundle.
const DEFAULT_STRATEGIES = [
  { name: "Order Block", description: "Entries from unmitigated institutional order blocks." },
  { name: "Break of Structure", description: "Continuation entries after a confirmed structure break." },
  { name: "Liquidity Sweep", description: "Fade entries after a stop-hunt sweep of prior highs/lows." },
  { name: "Trend Continuation", description: "Pullback entries in the direction of the prevailing trend." },
  { name: "Reversal Setup", description: "Counter-trend entries at exhaustion / reversal zones." },
];

let initPromise: Promise<void> | null = null;

async function ensureOpen(): Promise<void> {
  if (!isNative()) {
    throw new Error("Local SQLite is only available inside the native app.");
  }

  // A hard page reload (or the app being backgrounded and the WebView
  // document re-created) resets our JS-side `initPromise` cache but NOT the
  // native plugin's own connection registry — so always check native state
  // first rather than assuming createConnection is safe to call blindly.
  const { result: alreadyOpen } = await CapacitorSQLite.isDBOpen({ database: DB_NAME }).catch(() => ({ result: false }));
  if (alreadyOpen) return;

  try {
    await CapacitorSQLite.createConnection({ database: DB_NAME, version: 1, encrypted: false, mode: "no-encryption" });
  } catch (err) {
    if (!String(err).includes("already exists")) throw err;
  }
  await CapacitorSQLite.open({ database: DB_NAME });
}

// Preset checklist items / mistakes / default assets / demo strategies —
// the on-device equivalent of lib/seed/reference-data.ts's seedReferenceData(),
// run exactly once (see the first-run gate in runMigrations below). Uses
// CapacitorSQLite directly rather than the run()/queryAll() wrappers in this
// file, since those call getLocalDb() — which would deadlock against the
// in-flight initPromise this runs under.
async function seedReferenceDataLocal(): Promise<void> {
  const now = nowIso();
  const statements = [
    ...PRESET_CHECKLIST_ITEMS.map((label) => ({
      statement: "INSERT INTO checklist_items (id, label, isPreset, createdAt) VALUES (?, ?, 1, ?)",
      values: [genId(), label, now],
    })),
    ...PRESET_MISTAKES.map((label) => ({
      statement: "INSERT INTO mistakes (id, label, isPreset, createdAt) VALUES (?, ?, 1, ?)",
      values: [genId(), label, now],
    })),
    ...DEFAULT_ASSETS.map((asset) => ({
      statement: "INSERT INTO assets (id, symbol, name, assetClass, contractSize, isCustom, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)",
      values: [genId(), asset.symbol, asset.name, asset.assetClass, asset.contractSize, now],
    })),
    ...DEFAULT_STRATEGIES.map((s) => ({
      statement: "INSERT INTO strategies (id, name, description, isCustom) VALUES (?, ?, ?, 0)",
      values: [genId(), s.name, s.description],
    })),
  ];
  await CapacitorSQLite.executeSet({ database: DB_NAME, set: statements, transaction: true });
}

async function runMigrations(): Promise<void> {
  await CapacitorSQLite.execute({ database: DB_NAME, statements: LOCAL_SCHEMA_SQL, transaction: true });

  const current = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: "SELECT version FROM local_schema_version WHERE id = 1",
    values: [],
  });
  const existingVersion = (current.values?.[0] as { version?: number } | undefined)?.version;

  if (existingVersion == null) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: "INSERT INTO local_schema_version (id, version) VALUES (1, ?)",
      values: [LOCAL_SCHEMA_VERSION],
    });
    await seedReferenceDataLocal();
  }
  // Future schema changes: add `if (existingVersion < N) { ...ALTER/UPDATE...; bump version }`
  // steps here, the same way prisma/migrations/ accumulates files over time.
}

/** Opens (creating on first run) the on-device database and applies the schema. Idempotent — safe to call from every hook. */
export async function getLocalDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureOpen();
      await runMigrations();
    })().catch((err) => {
      initPromise = null; // allow retry on next call if init failed
      throw err;
    });
  }
  return initPromise;
}

function toBool(value: unknown): boolean {
  return value === 1 || value === true;
}

/** Runs a SELECT and returns rows as plain objects. */
export async function queryAll<T = Record<string, unknown>>(statement: string, values: unknown[] = []): Promise<T[]> {
  await getLocalDb();
  const result = await CapacitorSQLite.query({ database: DB_NAME, statement, values });
  return (result.values ?? []) as T[];
}

export async function queryOne<T = Record<string, unknown>>(statement: string, values: unknown[] = []): Promise<T | null> {
  const rows = await queryAll<T>(statement, values);
  return rows[0] ?? null;
}

/** Runs an INSERT/UPDATE/DELETE. Returns the number of rows changed. */
export async function run(statement: string, values: unknown[] = []): Promise<{ changes: number; lastId?: number }> {
  await getLocalDb();
  const result = await CapacitorSQLite.run({ database: DB_NAME, statement, values });
  return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
}

/** Runs several statements as one transaction (e.g. a trade + its checklist/mistake join rows). */
export async function runBatch(statements: { statement: string; values?: unknown[] }[]): Promise<void> {
  await getLocalDb();
  await CapacitorSQLite.executeSet({ database: DB_NAME, set: statements, transaction: true });
}

export { toBool };

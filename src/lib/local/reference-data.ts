import { queryAll, run, toBool } from "@/lib/local/db";
import { genId, nowIso, LocalApiError } from "@/lib/local/utils";
import { createAssetSchema, createStrategySchema, createMistakeSchema, createChecklistItemSchema } from "@/lib/schemas/asset";
import { createAccountSchema, type CreateAccountInput } from "@/lib/schemas/account";
import type { AssetDTO, StrategyDTO, MistakeDTO, ChecklistItemDTO } from "@/hooks/use-reference-data";
import type { AccountDTO } from "@/hooks/use-accounts";

// --- Accounts ---------------------------------------------------------

function mapAccount(row: Record<string, unknown>): AccountDTO {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as string,
    broker: (row.broker as string) ?? null,
    currency: row.currency as string,
    startingBalance: (row.startingBalance as number) ?? null,
    isDemo: toBool(row.isDemo),
  };
}

export async function listAccounts(): Promise<AccountDTO[]> {
  const rows = await queryAll("SELECT * FROM accounts ORDER BY createdAt ASC");
  return rows.map(mapAccount);
}

export async function createAccount(input: CreateAccountInput): Promise<AccountDTO> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const id = genId();
  const now = nowIso();
  await run(
    `INSERT INTO accounts (id, name, type, broker, currency, startingBalance, isDemo, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, parsed.data.name, parsed.data.type, parsed.data.broker ?? null, parsed.data.currency, parsed.data.startingBalance ?? null, now, now]
  );
  return { id, name: parsed.data.name, type: parsed.data.type, broker: parsed.data.broker ?? null, currency: parsed.data.currency, startingBalance: parsed.data.startingBalance ?? null, isDemo: false };
}

export async function deleteAccount(id: string): Promise<void> {
  const [{ count }] = await queryAll<{ count: number }>("SELECT COUNT(*) as count FROM trades WHERE accountId = ?", [id]);
  if (count > 0) throw new LocalApiError(`Cannot delete an account with ${count} trade(s). Delete or reassign its trades first.`, 409);
  await run("DELETE FROM accounts WHERE id = ?", [id]);
}

// --- Assets -------------------------------------------------------------

function mapAsset(row: Record<string, unknown>): AssetDTO {
  return {
    id: row.id as string,
    symbol: row.symbol as string,
    name: row.name as string,
    assetClass: row.assetClass as string,
    contractSize: row.contractSize as number,
    isCustom: toBool(row.isCustom),
  };
}

export async function listAssets(): Promise<AssetDTO[]> {
  const rows = await queryAll("SELECT * FROM assets ORDER BY symbol ASC");
  return rows.map(mapAsset);
}

export async function createAsset(input: unknown): Promise<AssetDTO> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const existing = await queryAll("SELECT id FROM assets WHERE symbol = ?", [parsed.data.symbol]);
  if (existing.length > 0) throw new LocalApiError(`Asset "${parsed.data.symbol}" already exists.`, 409);
  const id = genId();
  await run(
    "INSERT INTO assets (id, symbol, name, assetClass, contractSize, isCustom, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)",
    [id, parsed.data.symbol, parsed.data.name, parsed.data.assetClass, parsed.data.contractSize, nowIso()]
  );
  return { id, symbol: parsed.data.symbol, name: parsed.data.name, assetClass: parsed.data.assetClass, contractSize: parsed.data.contractSize, isCustom: true };
}

export async function deleteAsset(id: string): Promise<void> {
  const [{ count }] = await queryAll<{ count: number }>("SELECT COUNT(*) as count FROM trades WHERE assetId = ?", [id]);
  if (count > 0) throw new LocalApiError(`Cannot delete an asset used by ${count} trade(s).`, 409);
  await run("DELETE FROM assets WHERE id = ?", [id]);
}

// --- Strategies -----------------------------------------------------------

function mapStrategy(row: Record<string, unknown>): StrategyDTO {
  return { id: row.id as string, name: row.name as string, description: (row.description as string) ?? null, isCustom: toBool(row.isCustom) };
}

export async function listStrategies(): Promise<StrategyDTO[]> {
  const rows = await queryAll("SELECT * FROM strategies ORDER BY name ASC");
  return rows.map(mapStrategy);
}

export async function createStrategy(input: unknown): Promise<StrategyDTO> {
  const parsed = createStrategySchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const existing = await queryAll("SELECT id FROM strategies WHERE name = ?", [parsed.data.name]);
  if (existing.length > 0) throw new LocalApiError(`Strategy "${parsed.data.name}" already exists.`, 409);
  const id = genId();
  await run("INSERT INTO strategies (id, name, description, isCustom) VALUES (?, ?, ?, 1)", [id, parsed.data.name, parsed.data.description ?? null]);
  return { id, name: parsed.data.name, description: parsed.data.description ?? null, isCustom: true };
}

// --- Mistakes ---------------------------------------------------------

function mapMistake(row: Record<string, unknown>): MistakeDTO {
  return { id: row.id as string, label: row.label as string, isPreset: toBool(row.isPreset) };
}

export async function listMistakes(): Promise<MistakeDTO[]> {
  const rows = await queryAll("SELECT * FROM mistakes ORDER BY label ASC");
  return rows.map(mapMistake);
}

export async function createMistake(input: unknown): Promise<MistakeDTO> {
  const parsed = createMistakeSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const existing = await queryAll("SELECT id FROM mistakes WHERE label = ?", [parsed.data.label]);
  if (existing.length > 0) throw new LocalApiError(`Mistake "${parsed.data.label}" already exists.`, 409);
  const id = genId();
  await run("INSERT INTO mistakes (id, label, isPreset, createdAt) VALUES (?, ?, 0, ?)", [id, parsed.data.label, nowIso()]);
  return { id, label: parsed.data.label, isPreset: false };
}

// --- Checklist items ------------------------------------------------------

function mapChecklistItem(row: Record<string, unknown>): ChecklistItemDTO {
  return { id: row.id as string, label: row.label as string, isPreset: toBool(row.isPreset) };
}

export async function listChecklistItems(): Promise<ChecklistItemDTO[]> {
  const rows = await queryAll("SELECT * FROM checklist_items ORDER BY label ASC");
  return rows.map(mapChecklistItem);
}

export async function createChecklistItem(input: unknown): Promise<ChecklistItemDTO> {
  const parsed = createChecklistItemSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const existing = await queryAll("SELECT id FROM checklist_items WHERE label = ?", [parsed.data.label]);
  if (existing.length > 0) throw new LocalApiError(`Checklist item "${parsed.data.label}" already exists.`, 409);
  const id = genId();
  await run("INSERT INTO checklist_items (id, label, isPreset, createdAt) VALUES (?, ?, 0, ?)", [id, parsed.data.label, nowIso()]);
  return { id, label: parsed.data.label, isPreset: false };
}

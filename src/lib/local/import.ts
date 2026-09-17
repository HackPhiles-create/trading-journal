// Local-SQLite port of lib/import/commit.ts — identical row resolution,
// validation, and commit logic; only the Prisma reads/writes become local
// SQLite reads/writes. Never blindly imports malformed data, same as the
// server path: every row is re-resolved and re-validated here regardless of
// what the client-side preview showed.
import { queryAll, run, toBool } from "@/lib/local/db";
import { genId, nowIso } from "@/lib/local/utils";
import { validateTrade } from "@/lib/validation";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { DIRECTIONS, type Direction } from "@/lib/constants";
import { REQUIRED_IMPORT_FIELDS } from "@/lib/schemas/import";
import type { ColumnMapping, MappedImportRow, ImportCommitRow } from "@/lib/schemas/import";
import type { ImportRowPreview } from "@/lib/import/commit";

function applyMapping(row: Record<string, string>, mapping: ColumnMapping): Omit<MappedImportRow, "rowIndex"> {
  const mapped: Record<string, string> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (target) mapped[target] = row[header] ?? "";
  }
  return mapped as Omit<MappedImportRow, "rowIndex">;
}

function normalizeDirection(raw: string): Direction | null {
  const v = raw.trim().toUpperCase();
  if (v === "BUY" || v === "LONG" || v === "B") return "BUY";
  if (v === "SELL" || v === "SHORT" || v === "S") return "SELL";
  if ((DIRECTIONS as readonly string[]).includes(v)) return v as Direction;
  return null;
}

export async function resolveAndValidateImportRowsLocal(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ImportRowPreview[]> {
  const [accounts, assets, strategies, existingTradeRows, prefs] = await Promise.all([
    queryAll<{ id: string; name: string; isDemo: number }>("SELECT * FROM accounts"),
    queryAll<{ id: string; symbol: string }>("SELECT * FROM assets"),
    queryAll<{ id: string; name: string }>("SELECT * FROM strategies"),
    queryAll<{ id: string; accountId: string; assetId: string; direction: string; entryPrice: number; entryDateTime: string }>(
      "SELECT id, accountId, assetId, direction, entryPrice, entryDateTime FROM trades"
    ),
    getOrCreateLocalPreference(),
  ]);
  const existingTrades = existingTradeRows.map((t) => ({ ...t, direction: t.direction as Direction, entryDateTime: new Date(t.entryDateTime) }));

  const defaultAccount = accounts.find((a) => !toBool(a.isDemo)) ?? accounts[0] ?? null;

  return rawRows.map((raw, rowIndex) => {
    const mapped = applyMapping(raw, mapping);
    const errors: string[] = [];

    const missingRequired = REQUIRED_IMPORT_FIELDS.filter((f) => !mapped[f] || !mapped[f]?.trim());
    for (const field of missingRequired) errors.push(`Missing required value for "${field}".`);

    const entryDateTime = mapped.entryDateTime ? new Date(mapped.entryDateTime) : null;
    if (mapped.entryDateTime && (!entryDateTime || Number.isNaN(entryDateTime.getTime()))) {
      errors.push(`"${mapped.entryDateTime}" is not a valid date/time.`);
    }

    const direction = mapped.direction ? normalizeDirection(mapped.direction) : null;
    if (mapped.direction && !direction) errors.push(`"${mapped.direction}" is not a recognized direction (expected BUY/SELL).`);

    const entryPrice = mapped.entryPrice ? Number(mapped.entryPrice) : NaN;
    const stopLoss = mapped.stopLoss ? Number(mapped.stopLoss) : NaN;
    const takeProfit = mapped.takeProfit ? Number(mapped.takeProfit) : NaN;
    const lotSize = mapped.lotSize ? Number(mapped.lotSize) : NaN;
    const exitPrice = mapped.exitPrice ? Number(mapped.exitPrice) : null;
    const actualPnl = mapped.actualPnl ? Number(mapped.actualPnl) : null;

    const numericFields: Array<{ label: string; mappedValue?: string; parsed: number }> = [
      { label: "Entry price", mappedValue: mapped.entryPrice, parsed: entryPrice },
      { label: "Stop loss", mappedValue: mapped.stopLoss, parsed: stopLoss },
      { label: "Take profit", mappedValue: mapped.takeProfit, parsed: takeProfit },
      { label: "Lot size", mappedValue: mapped.lotSize, parsed: lotSize },
    ];
    for (const { label, mappedValue, parsed } of numericFields) {
      if (mappedValue && Number.isNaN(parsed)) errors.push(`"${label}" must be a number.`);
    }

    const asset = mapped.assetSymbol ? assets.find((a) => a.symbol.toUpperCase() === mapped.assetSymbol!.trim().toUpperCase()) : null;
    if (mapped.assetSymbol && !asset) errors.push(`Unknown asset symbol "${mapped.assetSymbol}" — add it under Assets first.`);

    const account = mapped.accountName ? accounts.find((a) => a.name.toLowerCase() === mapped.accountName!.trim().toLowerCase()) : defaultAccount;
    if (!account) errors.push(`No account found${mapped.accountName ? ` named "${mapped.accountName}"` : ""} — create one first.`);

    const strategy = mapped.strategyName ? strategies.find((s) => s.name.toLowerCase() === mapped.strategyName!.trim().toLowerCase()) : null;

    const warnings: string[] = [];
    let isDuplicate = false;

    if (direction && entryDateTime && !Number.isNaN(entryPrice) && account && asset) {
      const validation = validateTrade({
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        lotSize,
        entryDateTime,
        assetId: asset.id,
        accountId: account.id,
        preferredMinRR: prefs.preferredMinRR,
        existingTrades,
      });
      for (const e of validation.errors) errors.push(e.message);
      for (const w of validation.warnings) {
        warnings.push(w.message);
        if (w.field === "entryDateTime" && w.message.includes("duplicate")) isDuplicate = true;
      }
    }

    const resolved: Partial<ImportCommitRow> = {
      rowIndex,
      accountId: account?.id,
      assetId: asset?.id,
      strategyId: strategy?.id ?? null,
      direction: direction ?? undefined,
      entryDateTime: entryDateTime ?? undefined,
      entryPrice: Number.isNaN(entryPrice) ? undefined : entryPrice,
      stopLoss: Number.isNaN(stopLoss) ? undefined : stopLoss,
      takeProfit: Number.isNaN(takeProfit) ? undefined : takeProfit,
      exitPrice: exitPrice != null && !Number.isNaN(exitPrice) ? exitPrice : null,
      lotSize: Number.isNaN(lotSize) ? undefined : lotSize,
      actualPnl: actualPnl != null && !Number.isNaN(actualPnl) ? actualPnl : null,
    };

    return { rowIndex, raw, resolved, errors, warnings, isDuplicate };
  });
}

export async function commitImportRowsLocal(rows: ImportCommitRow[]): Promise<{ imported: number; skipped: { rowIndex: number; reason: string }[]; errors: string[] }> {
  let imported = 0;
  const skipped: Array<{ rowIndex: number; reason: string }> = [];

  for (const row of rows) {
    const [asset, account] = await Promise.all([
      queryAll("SELECT id FROM assets WHERE id = ?", [row.assetId]),
      queryAll("SELECT id FROM accounts WHERE id = ?", [row.accountId]),
    ]);
    if (asset.length === 0 || account.length === 0) {
      skipped.push({ rowIndex: row.rowIndex, reason: "Asset or account no longer exists." });
      continue;
    }

    const isClosed = row.exitPrice != null;
    const now = nowIso();
    await run(
      `INSERT INTO trades (id, accountId, assetId, strategyId, direction, status, entryDateTime, entryPrice, stopLoss, takeProfit, lotSize, exitPrice, exitDateTime, result, actualPnl, isDemo, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        genId(),
        row.accountId,
        row.assetId,
        row.strategyId ?? null,
        row.direction,
        isClosed ? "CLOSED" : "OPEN",
        row.entryDateTime.toISOString(),
        row.entryPrice,
        row.stopLoss,
        row.takeProfit,
        row.lotSize,
        row.exitPrice ?? null,
        isClosed ? row.entryDateTime.toISOString() : null,
        isClosed ? (row.actualPnl != null ? (row.actualPnl > 0 ? "WIN" : row.actualPnl < 0 ? "LOSS" : "BREAKEVEN") : null) : null,
        row.actualPnl ?? null,
        now,
        now,
      ]
    );
    imported++;
  }

  return { imported, skipped, errors: [] };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { validateTrade } from "@/lib/validation";
import { getOrCreatePreference } from "@/lib/preferences";
import { DIRECTIONS, type Direction } from "@/lib/constants";
import type { ColumnMapping, MappedImportRow, ImportCommitRow } from "@/lib/schemas/import";
import { REQUIRED_IMPORT_FIELDS } from "@/lib/schemas/import";

export interface ImportRowPreview {
  rowIndex: number;
  raw: Record<string, string>;
  resolved: Partial<ImportCommitRow>;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

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

// Never blindly imports malformed data — resolves + re-validates every row
// server-side, independent of whatever the client-side preview showed.
export async function resolveAndValidateImportRows(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ImportRowPreview[]> {
  const [accounts, assets, strategies, existingTrades, prefs] = await Promise.all([
    prisma.account.findMany(),
    prisma.asset.findMany(),
    prisma.strategy.findMany(),
    prisma.trade.findMany({ select: { id: true, accountId: true, assetId: true, direction: true, entryPrice: true, entryDateTime: true } }),
    getOrCreatePreference(),
  ]);

  const defaultAccount = accounts.find((a) => !a.isDemo) ?? accounts[0] ?? null;

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

    const asset = mapped.assetSymbol
      ? assets.find((a) => a.symbol.toUpperCase() === mapped.assetSymbol!.trim().toUpperCase())
      : null;
    if (mapped.assetSymbol && !asset) errors.push(`Unknown asset symbol "${mapped.assetSymbol}" — add it under Assets first.`);

    const account = mapped.accountName
      ? accounts.find((a) => a.name.toLowerCase() === mapped.accountName!.trim().toLowerCase())
      : defaultAccount;
    if (!account) errors.push(`No account found${mapped.accountName ? ` named "${mapped.accountName}"` : ""} — create one first.`);

    const strategy = mapped.strategyName
      ? strategies.find((s) => s.name.toLowerCase() === mapped.strategyName!.trim().toLowerCase())
      : null;

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
        existingTrades: existingTrades.map((t) => ({
          id: t.id,
          accountId: t.accountId,
          assetId: t.assetId,
          direction: t.direction as Direction,
          entryPrice: t.entryPrice,
          entryDateTime: t.entryDateTime,
        })),
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

export async function commitImportRows(rows: ImportCommitRow[]) {
  let imported = 0;
  const skipped: Array<{ rowIndex: number; reason: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const asset = await tx.asset.findUnique({ where: { id: row.assetId } });
      const account = await tx.account.findUnique({ where: { id: row.accountId } });
      if (!asset || !account) {
        skipped.push({ rowIndex: row.rowIndex, reason: "Asset or account no longer exists." });
        continue;
      }

      const isClosed = row.exitPrice != null;
      await tx.trade.create({
        data: {
          accountId: row.accountId,
          assetId: row.assetId,
          strategyId: row.strategyId ?? null,
          direction: row.direction,
          status: isClosed ? "CLOSED" : "OPEN",
          entryDateTime: row.entryDateTime,
          entryPrice: row.entryPrice,
          stopLoss: row.stopLoss,
          takeProfit: row.takeProfit,
          lotSize: row.lotSize,
          exitPrice: row.exitPrice ?? null,
          exitDateTime: isClosed ? row.entryDateTime : null,
          result: isClosed ? (row.actualPnl != null ? (row.actualPnl > 0 ? "WIN" : row.actualPnl < 0 ? "LOSS" : "BREAKEVEN") : null) : null,
          actualPnl: row.actualPnl ?? null,
        },
      });
      imported++;
    }
  });

  return { imported, skipped, errors: [] as string[] };
}

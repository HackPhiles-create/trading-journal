import { IMPORT_TARGET_FIELDS, type ColumnMapping, type ImportTargetField } from "@/lib/schemas/import";

// Header-name heuristics for pre-filling the column mapping step. Never
// silently commits data — this only pre-selects a dropdown the user reviews.
const HEURISTICS: Record<ImportTargetField, string[]> = {
  entryDateTime: ["date", "entry date", "datetime", "open time", "time"],
  assetSymbol: ["symbol", "asset", "pair", "instrument", "ticker"],
  direction: ["direction", "side", "type", "buy/sell"],
  entryPrice: ["entry", "entry price", "open price", "open"],
  stopLoss: ["sl", "stop loss", "stoploss"],
  takeProfit: ["tp", "take profit", "takeprofit"],
  exitPrice: ["exit", "exit price", "close price", "close"],
  lotSize: ["lot", "lot size", "lots", "size", "volume"],
  accountName: ["account"],
  strategyName: ["strategy", "setup"],
  actualPnl: ["pnl", "p&l", "profit", "profit/loss", "net profit"],
};

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<ImportTargetField>();

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    let match: ImportTargetField | null = null;

    for (const field of IMPORT_TARGET_FIELDS) {
      if (used.has(field)) continue;
      const candidates = HEURISTICS[field];
      if (candidates.some((c) => normalized === c || normalized.includes(c))) {
        match = field;
        break;
      }
    }

    mapping[header] = match;
    if (match) used.add(match);
  }

  return mapping;
}

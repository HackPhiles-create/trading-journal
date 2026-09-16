import { calculateRR } from "@/lib/trading-math";
import type { Direction } from "@/lib/constants";

// Rule-based, non-throwing validation. Never mutates trading data — every
// rule below returns a structured issue the UI renders inline with a
// "fix it" affordance; only `errors` block submission, `warnings` do not.

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface TradeValidationInput {
  direction: Direction;
  entryPrice: number | null | undefined;
  stopLoss: number | null | undefined;
  takeProfit: number | null | undefined;
  lotSize: number | null | undefined;
  entryDateTime: Date | string | null | undefined;
  assetId: string | null | undefined;
  accountId: string | null | undefined;
  preferredMinRR?: number;
  // Existing trades to check against for duplicate detection.
  existingTrades?: Array<{
    id: string;
    accountId: string;
    assetId: string;
    direction: Direction;
    entryPrice: number;
    entryDateTime: Date | string;
  }>;
}

const DUPLICATE_WINDOW_MS = 120_000; // ±120s
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60_000; // 5 minutes into the future is tolerated

export function validateTrade(input: TradeValidationInput): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const {
    direction,
    entryPrice,
    stopLoss,
    takeProfit,
    lotSize,
    entryDateTime,
    assetId,
    accountId,
    preferredMinRR,
    existingTrades = [],
  } = input;

  // --- Required fields ---
  if (!assetId) errors.push({ field: "assetId", severity: "error", message: "Select an asset." });
  if (!accountId) errors.push({ field: "accountId", severity: "error", message: "Select an account." });
  if (entryPrice == null || Number.isNaN(entryPrice))
    errors.push({ field: "entryPrice", severity: "error", message: "Entry price is required." });
  if (stopLoss == null || Number.isNaN(stopLoss))
    errors.push({ field: "stopLoss", severity: "error", message: "Stop loss is required." });
  if (takeProfit == null || Number.isNaN(takeProfit))
    errors.push({ field: "takeProfit", severity: "error", message: "Take profit is required." });
  if (lotSize == null || Number.isNaN(lotSize))
    errors.push({ field: "lotSize", severity: "error", message: "Lot size is required." });
  if (!entryDateTime) errors.push({ field: "entryDateTime", severity: "error", message: "Entry date/time is required." });

  // --- Non-positive values ---
  if (entryPrice != null && entryPrice <= 0)
    errors.push({ field: "entryPrice", severity: "error", message: "Entry price must be greater than zero." });
  if (stopLoss != null && stopLoss <= 0)
    errors.push({ field: "stopLoss", severity: "error", message: "Stop loss must be greater than zero." });
  if (takeProfit != null && takeProfit <= 0)
    errors.push({ field: "takeProfit", severity: "error", message: "Take profit must be greater than zero." });
  if (lotSize != null && lotSize <= 0)
    errors.push({ field: "lotSize", severity: "error", message: "Lot size must be greater than zero." });

  // --- SL/TP wrong-side-of-entry checks (only when prices are all sane numbers) ---
  const pricesAreSane =
    entryPrice != null && stopLoss != null && takeProfit != null &&
    !Number.isNaN(entryPrice) && !Number.isNaN(stopLoss) && !Number.isNaN(takeProfit) &&
    entryPrice > 0 && stopLoss > 0 && takeProfit > 0;

  if (pricesAreSane) {
    const rr = calculateRR({ direction, entry: entryPrice, sl: stopLoss, tp: takeProfit, lotSize: lotSize || 1 });

    if (rr.riskDistance <= 0) {
      errors.push({
        field: "stopLoss",
        severity: "error",
        message:
          direction === "BUY"
            ? "Your Stop Loss appears to be above the Entry Price for a BUY trade."
            : "Your Stop Loss appears to be below the Entry Price for a SELL trade.",
      });
    }

    if (rr.rewardDistance <= 0) {
      errors.push({
        field: "takeProfit",
        severity: "error",
        message:
          direction === "BUY"
            ? "Your Take Profit appears to be below the Entry Price for a BUY trade."
            : "Your Take Profit appears to be above the Entry Price for a SELL trade.",
      });
    }

    if (rr.rrRatio !== null && preferredMinRR != null && rr.rrRatio < preferredMinRR) {
      warnings.push({
        field: "takeProfit",
        severity: "warning",
        message: `This trade's R:R (1:${rr.rrRatio.toFixed(2)}) is below your preferred minimum of 1:${preferredMinRR}.`,
      });
    }
  }

  // --- Date/time sanity ---
  if (entryDateTime) {
    const parsed = new Date(entryDateTime);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: "entryDateTime", severity: "error", message: "Entry date/time is not a valid date." });
    } else if (parsed.getTime() - Date.now() > CLOCK_SKEW_TOLERANCE_MS) {
      errors.push({ field: "entryDateTime", severity: "error", message: "Entry date/time is in the future." });
    }
  }

  // --- Duplicate detection ---
  if (entryPrice != null && entryDateTime && accountId && assetId) {
    const entryTime = new Date(entryDateTime).getTime();
    const duplicate = existingTrades.find((t) => {
      if (t.accountId !== accountId || t.assetId !== assetId || t.direction !== direction) return false;
      if (Math.abs(t.entryPrice - entryPrice) > Number.EPSILON * 10) return false;
      const existingTime = new Date(t.entryDateTime).getTime();
      return Math.abs(existingTime - entryTime) <= DUPLICATE_WINDOW_MS;
    });
    if (duplicate) {
      warnings.push({
        field: "entryDateTime",
        severity: "warning",
        message: `This looks like a duplicate of a trade already logged around this time at the same price.`,
      });
    }
  }

  return { errors, warnings };
}

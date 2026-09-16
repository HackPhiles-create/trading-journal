import type { Direction } from "@/lib/constants";

// Pure, isomorphic trading math — no fs/prisma imports. This is the single
// source of truth for R:R math, used identically by the live Add Trade
// calculator (client) and every server-side aggregate/report, so numbers can
// never drift after a trade is edited.
//
// Direction-agnostic formula (avoids the classic buy/sell sign bug):
//   BUY:  risk   = entry - sl   (sl must be below entry)
//         reward = tp - entry  (tp must be above entry)
//   SELL: risk   = sl - entry  (sl must be above entry)
//         reward = entry - tp  (tp must be below entry)
// A correctly placed trade always yields positive risk/reward distances in
// both directions. A wrong-side SL/TP yields a negative distance, which
// validation.ts turns into a blocking error — this function never throws or
// silently "fixes" the input.

export interface RRInput {
  direction: Direction;
  entry: number;
  sl: number;
  tp: number;
  lotSize: number;
  contractSize?: number; // from Asset.contractSize, default 1
  accountBalance?: number; // optional, for riskPercent
}

export interface RRResult {
  riskDistance: number; // > 0 valid SL placement, <= 0 invalid
  rewardDistance: number; // > 0 valid TP placement, <= 0 invalid
  rrRatio: number | null; // null when riskDistance <= 0 (avoid div-by-zero / nonsense ratio)
  riskPercent: number | null; // null when accountBalance not provided or <= 0
  potentialLoss: number; // magnitude of loss if SL is hit
  potentialProfit: number; // magnitude of profit if TP is hit
}

export function calculateRR(input: RRInput): RRResult {
  const { direction, entry, sl, tp, lotSize, contractSize = 1, accountBalance } = input;

  const riskDistance = direction === "BUY" ? entry - sl : sl - entry;
  const rewardDistance = direction === "BUY" ? tp - entry : entry - tp;

  const rrRatio = riskDistance > 0 ? rewardDistance / riskDistance : null;

  const potentialLoss = Math.abs(riskDistance) * lotSize * contractSize;
  const potentialProfit = Math.abs(rewardDistance) * lotSize * contractSize;

  const riskPercent =
    accountBalance && accountBalance > 0 ? (potentialLoss / accountBalance) * 100 : null;

  return { riskDistance, rewardDistance, rrRatio, riskPercent, potentialLoss, potentialProfit };
}

// Suggests an actual P&L / R-multiple for the close-out form from the exit
// price, using the same generic direction-aware distance formula. The user
// can accept or override this (see Trade.pnlManuallyOverridden).
export function suggestActualPnl(input: {
  direction: Direction;
  entry: number;
  sl: number;
  exit: number;
  lotSize: number;
  contractSize?: number;
}): { actualPnl: number; actualRMultiple: number | null } {
  const { direction, entry, sl, exit, lotSize, contractSize = 1 } = input;

  const riskDistance = direction === "BUY" ? entry - sl : sl - entry;
  const movedDistance = direction === "BUY" ? exit - entry : entry - exit;

  const actualPnl = movedDistance * lotSize * contractSize;
  const actualRMultiple = riskDistance > 0 ? movedDistance / riskDistance : null;

  return { actualPnl, actualRMultiple };
}

export function isValidRR(rr: RRResult): boolean {
  return rr.riskDistance > 0 && rr.rewardDistance > 0 && rr.rrRatio !== null;
}

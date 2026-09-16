// Deliberately NOT "server-only" — Papa.unparse is a plain string transform
// with no Node dependency, reused client-side by the offline Android
// build's export (lib/local/export.ts) as well as the web export route.
import Papa from "papaparse";
import type { ReportSnapshot } from "@/lib/analytics/reports";

export interface CsvTrade {
  entryDateTime: string | Date;
  asset: { symbol: string };
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  exitPrice: number | null;
  result: string | null;
  actualPnl: number | null;
  strategy: { name: string } | null;
  account: { name: string };
  mistakes: { note: string | null; mistake: { label: string } }[];
}

export function tradesToCsv(trades: CsvTrade[]): string {
  const rows = trades.map((t) => ({
    Date: new Date(t.entryDateTime).toISOString(),
    Asset: t.asset.symbol,
    Direction: t.direction,
    Entry: t.entryPrice,
    "Stop Loss": t.stopLoss,
    "Take Profit": t.takeProfit,
    "Lot Size": t.lotSize,
    Exit: t.exitPrice ?? "",
    Result: t.result ?? "",
    "P&L": t.actualPnl ?? "",
    Strategy: t.strategy?.name ?? "",
    Account: t.account.name,
    Mistakes: t.mistakes.map((m) => m.mistake.label).join("; "),
  }));
  return Papa.unparse(rows);
}

export function reportToCsv(report: ReportSnapshot): string {
  const rows = [
    { Metric: "Total P&L", Value: report.summary.totalPnl },
    { Metric: "Win Rate", Value: report.summary.winRate ?? "" },
    { Metric: "Total Trades", Value: report.summary.totalTrades },
    { Metric: "Winning Trades", Value: report.summary.winningTrades },
    { Metric: "Losing Trades", Value: report.summary.losingTrades },
    { Metric: "Average R:R", Value: report.summary.avgRR ?? "" },
    { Metric: "Average Win", Value: report.summary.avgWin ?? "" },
    { Metric: "Average Loss", Value: report.summary.avgLoss ?? "" },
    { Metric: "Profit Factor", Value: report.summary.profitFactor ?? "" },
    { Metric: "Largest Win", Value: report.summary.largestWin ?? "" },
    { Metric: "Largest Loss", Value: report.summary.largestLoss ?? "" },
  ];
  return Papa.unparse(rows);
}

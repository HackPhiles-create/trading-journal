import "server-only";
import * as XLSX from "xlsx";
import type { TradeWithRelations } from "@/lib/analytics/aggregate";
import type { ReportSnapshot } from "@/lib/analytics/reports";

export function tradesToWorkbookBuffer(trades: TradeWithRelations[], report?: ReportSnapshot): Buffer {
  const wb = XLSX.utils.book_new();

  if (report) {
    const summaryRows = [
      { Metric: "Total P&L", Value: report.summary.totalPnl },
      { Metric: "Win Rate (%)", Value: report.summary.winRate ?? "" },
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  }

  const tradeRows = trades.map((t) => ({
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
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tradeRows), "Trades");

  const mistakeRows = trades.flatMap((t) =>
    t.mistakes.map((m) => ({ Date: new Date(t.entryDateTime).toISOString(), Asset: t.asset.symbol, Mistake: m.mistake.label, Note: m.note ?? "" }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mistakeRows), "Mistakes");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

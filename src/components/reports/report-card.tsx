import { format } from "date-fns";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportDTO } from "@/hooks/use-reports";

export function ReportCard({ report }: { report: ReportDTO }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {report.type === "WEEKLY" ? "Weekly Report" : "Monthly Report"}
            </p>
            <Badge variant="outline" className="text-[10px]">{report.accountId ? "Single Account" : "All Accounts"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(report.periodStart), "MMM d")} – {format(new Date(report.periodEnd), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className={cn("text-sm font-semibold tabular-nums", report.totalPnl >= 0 ? "text-profit" : "text-loss")}>
            {formatCurrency(report.totalPnl, { showSign: true })}
          </p>
          <p className="text-xs text-muted-foreground">{formatPercent(report.winRate)} win rate · {report.tradeCount} trades</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

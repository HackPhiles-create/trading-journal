import { CheckSquare } from "lucide-react";
import type { TradeDTO } from "@/hooks/use-trades";

export function ReasoningPanel({ trade }: { trade: TradeDTO }) {
  const fields: Array<[string, string | null]> = [
    ["Market condition", trade.marketCondition],
    ["Confirmation", trade.confirmation],
    ["Entry reason", trade.entryReason],
    ["Confluence", trade.confluence],
  ];
  const hasAnyContent = trade.reasoningText || fields.some(([, v]) => v) || trade.riskReasoning || trade.checklistAnswers.length > 0;

  if (!hasAnyContent) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">Why did I take this trade?</h3>

      {trade.reasoningText && <p className="mt-3 text-sm leading-relaxed text-foreground">{trade.reasoningText}</p>}

      {fields.some(([, v]) => v) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm text-foreground">{value}</p>
              </div>
            ))}
        </div>
      )}

      {trade.riskReasoning && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted-foreground">Risk reasoning</p>
          <p className="mt-0.5 text-sm text-foreground">{trade.riskReasoning}</p>
        </div>
      )}

      {trade.checklistAnswers.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Setup checklist</p>
          <div className="flex flex-wrap gap-2">
            {trade.checklistAnswers.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <CheckSquare className="h-3 w-3" />
                {a.checklistItem.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

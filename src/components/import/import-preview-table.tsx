import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ImportRowPreview {
  rowIndex: number;
  raw: Record<string, string>;
  resolved: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export function ImportPreviewTable({
  rows,
  selected,
  onToggle,
}: {
  rows: ImportRowPreview[];
  selected: Set<number>;
  onToggle: (rowIndex: number, checked: boolean) => void;
}) {
  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-profit"><CheckCircle2 className="h-3.5 w-3.5" /> {validCount} valid</span>
        {invalidCount > 0 && (
          <span className="flex items-center gap-1.5 text-loss"><AlertCircle className="h-3.5 w-3.5" /> {invalidCount} with errors (excluded)</span>
        )}
      </div>

      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="text-left text-muted-foreground">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Asset</th>
              <th className="px-2 py-2">Dir</th>
              <th className="px-2 py-2">Entry</th>
              <th className="px-2 py-2">Issues</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isValid = row.errors.length === 0;
              return (
                <tr key={row.rowIndex} className={cn("border-t border-border", !isValid && "bg-loss/5")}>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={isValid && selected.has(row.rowIndex)}
                      disabled={!isValid}
                      onCheckedChange={(v) => onToggle(row.rowIndex, Boolean(v))}
                    />
                  </td>
                  <td className="px-2 py-2">{String(row.resolved.entryDateTime ?? row.raw[Object.keys(row.raw)[0]] ?? "—")}</td>
                  <td className="px-2 py-2">{String(row.resolved.assetId ? "✓" : row.raw[Object.keys(row.raw)[1]] ?? "—")}</td>
                  <td className="px-2 py-2">{String(row.resolved.direction ?? "—")}</td>
                  <td className="px-2 py-2">{String(row.resolved.entryPrice ?? "—")}</td>
                  <td className="px-2 py-2">
                    {row.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-1 text-loss">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {e}
                      </div>
                    ))}
                    {row.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

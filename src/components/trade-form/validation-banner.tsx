import { AlertCircle, AlertTriangle } from "lucide-react";
import type { ValidationIssue } from "@/lib/validation";

export function ValidationBanner({ errors, warnings }: { errors: ValidationIssue[]; warnings: ValidationIssue[] }) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.map((e, i) => (
        <div key={`err-${i}`} className="flex items-start gap-2 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2.5 text-sm text-loss">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{e.message}</span>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div
          key={`warn-${i}`}
          className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}

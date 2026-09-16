import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMPORT_TARGET_FIELDS, REQUIRED_IMPORT_FIELDS, type ColumnMapping, type ImportTargetField } from "@/lib/schemas/import";

const FIELD_LABELS: Record<ImportTargetField, string> = {
  entryDateTime: "Date",
  assetSymbol: "Asset (Symbol)",
  direction: "Direction (Buy/Sell)",
  entryPrice: "Entry Price",
  stopLoss: "Stop Loss",
  takeProfit: "Take Profit",
  exitPrice: "Exit Price",
  lotSize: "Lot Size",
  accountName: "Account",
  strategyName: "Strategy",
  actualPnl: "Profit / Loss",
};

export function ColumnMappingStep({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}) {
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = REQUIRED_IMPORT_FIELDS.filter((f) => !mappedFields.has(f));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Match each column from your file to a field in your journal.</p>

      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {headers.map((header) => (
          <div key={header} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="w-1/2 min-w-0">
              <p className="truncate text-sm font-medium">{header}</p>
            </div>
            <Select
              value={mapping[header] ?? "none"}
              onValueChange={(v) => onChange({ ...mapping, [header]: v === "none" ? null : (v as ImportTargetField) })}
            >
              <SelectTrigger className="w-1/2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Don&apos;t import</SelectItem>
                {IMPORT_TARGET_FIELDS.map((f) => (
                  <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {missingRequired.length > 0 && (
        <p className="text-xs text-loss">
          Missing required field{missingRequired.length > 1 ? "s" : ""}: {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}
        </p>
      )}
    </div>
  );
}

export { FIELD_LABELS };

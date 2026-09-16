import { TradeTable } from "@/components/trade-table/trade-table";

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="text-sm text-muted-foreground">Every trade you&apos;ve logged, searchable and filterable.</p>
      </div>
      <TradeTable />
    </div>
  );
}

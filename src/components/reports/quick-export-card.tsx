"use client";

import { useState } from "react";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { exportReportUrl, useExportReportLocal } from "@/hooks/use-reports";
import { isNative } from "@/lib/data-source";

// A direct-download export — no saved Report row required. Useful when you
// just want a PDF/CSV/XLSX for an arbitrary range right now.
export function QuickExportCard() {
  const { data: accounts = [] } = useAccounts();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = useState("all");
  const exportLocal = useExportReportLocal();

  async function download(fmt: "pdf" | "csv" | "xlsx") {
    const opts = { format: fmt, accountId: accountId === "all" ? null : accountId, dateFrom, dateTo };
    if (isNative()) {
      try {
        await exportLocal.mutateAsync(opts);
        toast.success(`${fmt.toUpperCase()} export ready to share.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = exportReportUrl(opts);
    a.click();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <FileDown className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Quick Export</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Download a report for any date range — no need to generate one first.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="quick-export-from">From</Label>
          <Input id="quick-export-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quick-export-to">To</Label>
          <Input id="quick-export-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => download("pdf")}>
          <FileText className="h-3.5 w-3.5" /> Download PDF
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => download("csv")}>
          <FileDown className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => download("xlsx")}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
        </Button>
      </div>
    </div>
  );
}

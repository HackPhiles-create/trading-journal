"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenerateReport } from "@/hooks/use-reports";
import { useAccounts } from "@/hooks/use-accounts";
import type { ReportType } from "@/lib/constants";

export function GenerateReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { data: accounts = [] } = useAccounts();
  const generateReport = useGenerateReport();
  const [type, setType] = useState<ReportType>("WEEKLY");
  const [period, setPeriod] = useState("current");
  const [accountId, setAccountId] = useState("all");

  async function handleGenerate() {
    const now = new Date();
    const isWeekly = type === "WEEKLY";
    const base = period === "current" ? now : isWeekly ? subWeeks(now, 1) : subMonths(now, 1);
    const periodStart = isWeekly ? startOfWeek(base, { weekStartsOn: 1 }) : startOfMonth(base);
    const periodEnd = isWeekly ? endOfWeek(base, { weekStartsOn: 1 }) : endOfMonth(base);

    try {
      const report = await generateReport.mutateAsync({
        type,
        accountId: accountId === "all" ? null : accountId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
      toast.success(`${type === "WEEKLY" ? "Weekly" : "Monthly"} report generated.`);
      onOpenChange(false);
      router.push(`/reports/${report.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>Create a performance report for a period.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Report type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">{`Current ${type === "WEEKLY" ? "week" : "month"} (${format(new Date(), "MMM d")})`}</SelectItem>
                <SelectItem value="previous">{`Previous ${type === "WEEKLY" ? "week" : "month"}`}</SelectItem>
              </SelectContent>
            </Select>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generateReport.isPending}>
            {generateReport.isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

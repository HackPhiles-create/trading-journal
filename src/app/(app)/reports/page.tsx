"use client";

import { useState } from "react";
import { Plus, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/reports/report-card";
import { GenerateReportDialog } from "@/components/reports/generate-report-dialog";
import { ImportWizard } from "@/components/import/import-wizard";
import { QuickExportCard } from "@/components/reports/quick-export-card";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useReports } from "@/hooks/use-reports";

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useReports();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Weekly and monthly performance reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import Trades
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" /> Generate Report
          </Button>
        </div>
      </div>

      <QuickExportCard />

      {isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first weekly or monthly performance report."
          action={<Button size="sm" onClick={() => setGenerateOpen(true)}>Generate Report</Button>}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}

      <GenerateReportDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <ImportWizard open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

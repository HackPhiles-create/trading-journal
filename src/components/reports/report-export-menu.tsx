"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportReportUrl, useExportReportLocal } from "@/hooks/use-reports";
import { isNative } from "@/lib/data-source";

export function ReportExportMenu({ accountId, dateFrom, dateTo }: { accountId: string | null; dateFrom: string; dateTo: string }) {
  const exportLocal = useExportReportLocal();

  async function handleExport(format: "pdf" | "csv" | "xlsx") {
    if (!isNative()) return;
    try {
      await exportLocal.mutateAsync({ format, accountId, dateFrom, dateTo });
      toast.success(`${format.toUpperCase()} export ready to share.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(["pdf", "csv", "xlsx"] as const).map((format) =>
          isNative() ? (
            <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
              Export as {format.toUpperCase()}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={format} asChild>
              <a href={exportReportUrl({ format, accountId, dateFrom, dateTo })} download>
                Export as {format.toUpperCase()}
              </a>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

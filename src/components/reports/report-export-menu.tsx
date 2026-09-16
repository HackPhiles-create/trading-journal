"use client";

import { Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { exportReportUrl } from "@/hooks/use-reports";

export function ReportExportMenu({ accountId, dateFrom, dateTo }: { accountId: string | null; dateFrom: string; dateTo: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(["pdf", "csv", "xlsx"] as const).map((format) => (
          <DropdownMenuItem key={format} asChild>
            <a href={exportReportUrl({ format, accountId, dateFrom, dateTo })} download>
              Export as {format.toUpperCase()}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, ArrowLeft, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseSpreadsheetFile } from "@/lib/import/parse";
import { autoDetectMapping } from "@/lib/import/mapping";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { resolveAndValidateImportRowsLocal, commitImportRowsLocal } from "@/lib/local/import";
import { importCommitRowSchema } from "@/lib/schemas/import";
import { ColumnMappingStep } from "@/components/import/column-mapping-step";
import { ImportPreviewTable, type ImportRowPreview } from "@/components/import/import-preview-table";
import type { ColumnMapping } from "@/lib/schemas/import";
import { useQueryClient } from "@tanstack/react-query";

type Step = "upload" | "mapping" | "preview" | "done";

export function ImportWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [previewRows, setPreviewRows] = useState<ImportRowPreview[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported: number; skipped: { rowIndex: number; reason: string }[] } | null>(null);

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setPreviewRows([]);
    setSelected(new Set());
    setCommitResult(null);
  }

  async function handleFile(file: File) {
    try {
      setBusy(true);
      const { headers, rows } = await parseSpreadsheetFile(file);
      if (rows.length === 0) {
        toast.error("This file has no rows.");
        return;
      }
      setHeaders(headers);
      setRawRows(rows);
      setMapping(autoDetectMapping(headers));
      setStep("mapping");
    } catch {
      toast.error("Could not read this file. Make sure it's a valid CSV or Excel file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleValidate() {
    try {
      setBusy(true);
      const result = isNative()
        ? { rows: await resolveAndValidateImportRowsLocal(rawRows, mapping) }
        : await fetchJson<{ rows: ImportRowPreview[] }>("/api/import/preview", {
            method: "POST",
            body: JSON.stringify({ rows: rawRows, mapping }),
          });
      setPreviewRows(result.rows);
      setSelected(new Set(result.rows.filter((r) => r.errors.length === 0).map((r) => r.rowIndex)));
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to validate rows.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    const rowsToCommit = previewRows.filter((r) => r.errors.length === 0 && selected.has(r.rowIndex)).map((r) => r.resolved);
    if (rowsToCommit.length === 0) {
      toast.error("No valid rows selected to import.");
      return;
    }
    try {
      setBusy(true);
      const result = isNative()
        ? await commitImportRowsLocal(rowsToCommit.map((r) => importCommitRowSchema.parse(r)))
        : await fetchJson<{ imported: number; skipped: { rowIndex: number; reason: string }[] }>("/api/import/commit", {
            method: "POST",
            body: JSON.stringify({ rows: rowsToCommit }),
          });
      setCommitResult(result);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Trades</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file exported from your broker or another journal.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-12 text-center transition-colors hover:bg-accent/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Click to upload a file</p>
              <p className="text-xs text-muted-foreground">CSV or Excel (.xlsx)</p>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {step === "mapping" && (
          <>
            <ColumnMappingStep headers={headers} mapping={mapping} onChange={setMapping} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleValidate} disabled={busy} className="gap-1.5">
                {busy ? "Validating..." : "Preview & Validate"} <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            <ImportPreviewTable rows={previewRows} selected={selected} onToggle={(idx, checked) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (checked) next.add(idx);
                else next.delete(idx);
                return next;
              });
            }} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleCommit} disabled={busy || selected.size === 0}>
                {busy ? "Importing..." : `Import ${selected.size} Trade${selected.size !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && commitResult && (
          <>
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/40 p-8 text-center">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <p className="text-lg font-semibold">{commitResult.imported} trade{commitResult.imported !== 1 ? "s" : ""} imported</p>
              {commitResult.skipped.length > 0 && (
                <p className="text-sm text-muted-foreground">{commitResult.skipped.length} row(s) skipped during import.</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

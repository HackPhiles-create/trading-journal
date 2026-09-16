import { z } from "zod";
import { DIRECTIONS } from "@/lib/constants";

// Target fields a spreadsheet column can be mapped to during CSV/Excel import.
export const IMPORT_TARGET_FIELDS = [
  "entryDateTime",
  "assetSymbol",
  "direction",
  "entryPrice",
  "stopLoss",
  "takeProfit",
  "exitPrice",
  "lotSize",
  "accountName",
  "strategyName",
  "actualPnl",
] as const;
export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

export const REQUIRED_IMPORT_FIELDS: ImportTargetField[] = [
  "entryDateTime",
  "assetSymbol",
  "direction",
  "entryPrice",
  "stopLoss",
  "takeProfit",
  "lotSize",
];

export const columnMappingSchema = z.record(z.string(), z.enum(IMPORT_TARGET_FIELDS).nullable());
export type ColumnMapping = z.infer<typeof columnMappingSchema>;

// A single mapped, but not-yet-validated, row from the uploaded file.
export const mappedImportRowSchema = z.object({
  rowIndex: z.number(),
  entryDateTime: z.string().optional(),
  assetSymbol: z.string().optional(),
  direction: z.string().optional(),
  entryPrice: z.string().optional(),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
  exitPrice: z.string().optional(),
  lotSize: z.string().optional(),
  accountName: z.string().optional(),
  strategyName: z.string().optional(),
  actualPnl: z.string().optional(),
});
export type MappedImportRow = z.infer<typeof mappedImportRowSchema>;

export const importCommitRowSchema = z.object({
  rowIndex: z.number(),
  accountId: z.string(),
  assetId: z.string(),
  strategyId: z.string().optional().nullable(),
  direction: z.enum(DIRECTIONS),
  entryDateTime: z.coerce.date(),
  entryPrice: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive(),
  takeProfit: z.coerce.number().positive(),
  exitPrice: z.coerce.number().optional().nullable(),
  lotSize: z.coerce.number().positive(),
  actualPnl: z.coerce.number().optional().nullable(),
});
export type ImportCommitRow = z.infer<typeof importCommitRowSchema>;

export const importCommitSchema = z.object({
  rows: z.array(importCommitRowSchema).min(1),
});
export type ImportCommitInput = z.infer<typeof importCommitSchema>;

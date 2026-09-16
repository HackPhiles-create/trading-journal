import { z } from "zod";
import { ASSET_CLASSES } from "@/lib/constants";

export const createAssetSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").toUpperCase(),
  name: z.string().min(1, "Name is required"),
  assetClass: z.enum(ASSET_CLASSES),
  contractSize: z.coerce.number().positive().default(1),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createStrategySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
});
export type CreateStrategyInput = z.infer<typeof createStrategySchema>;

export const createMistakeSchema = z.object({
  label: z.string().min(1, "Label is required"),
});
export type CreateMistakeInput = z.infer<typeof createMistakeSchema>;

export const createChecklistItemSchema = z.object({
  label: z.string().min(1, "Label is required"),
});
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

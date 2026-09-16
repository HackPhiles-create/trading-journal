import { z } from "zod";
import { DIRECTIONS, EMOTIONAL_STATES, SESSIONS, TRADE_RESULTS } from "@/lib/constants";

export const checklistAnswerSchema = z.object({
  checklistItemId: z.string(),
  checked: z.boolean().default(true),
});

export const mistakeTagSchema = z.object({
  mistakeId: z.string(),
  note: z.string().optional(),
});

export const createTradeSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  assetId: z.string().min(1, "Asset is required"),
  strategyId: z.string().optional().nullable(),
  direction: z.enum(DIRECTIONS),
  session: z.enum(SESSIONS).optional().nullable(),
  entryDateTime: z.coerce.date(),
  entryPrice: z.coerce.number().positive("Entry price must be greater than zero"),
  stopLoss: z.coerce.number().positive("Stop loss must be greater than zero"),
  takeProfit: z.coerce.number().positive("Take profit must be greater than zero"),
  lotSize: z.coerce.number().positive("Lot size must be greater than zero"),
  riskPercent: z.coerce.number().optional().nullable(),
  reasoningText: z.string().optional().nullable(),
  marketCondition: z.string().optional().nullable(),
  confirmation: z.string().optional().nullable(),
  entryReason: z.string().optional().nullable(),
  confluence: z.string().optional().nullable(),
  riskReasoning: z.string().optional().nullable(),
  checklistAnswers: z.array(checklistAnswerSchema).default([]),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export const updateTradeSchema = createTradeSchema.partial();
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

export const closeTradeSchema = z.object({
  exitPrice: z.coerce.number().positive("Exit price must be greater than zero"),
  exitDateTime: z.coerce.date(),
  result: z.enum(TRADE_RESULTS),
  actualPnl: z.coerce.number(),
  actualRMultiple: z.coerce.number().optional().nullable(),
  pnlManuallyOverridden: z.boolean().default(false),
  emotionalState: z.enum(EMOTIONAL_STATES).optional().nullable(),
  whatWentWell: z.string().optional().nullable(),
  whatToImprove: z.string().optional().nullable(),
  lessonLearned: z.string().optional().nullable(),
  mistakes: z.array(mistakeTagSchema).default([]),
});

export type CloseTradeInput = z.infer<typeof closeTradeSchema>;

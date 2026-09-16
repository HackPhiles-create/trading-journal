import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/constants";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(ACCOUNT_TYPES),
  broker: z.string().optional().nullable(),
  currency: z.string().default("USD"),
  startingBalance: z.coerce.number().optional().nullable(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

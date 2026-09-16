import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAndValidateImportRows } from "@/lib/import/commit";
import { columnMappingSchema } from "@/lib/schemas/import";

const previewSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).max(5000),
  mapping: columnMappingSchema,
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const preview = await resolveAndValidateImportRows(parsed.data.rows, parsed.data.mapping);
  return NextResponse.json({ rows: preview });
}

import { NextResponse } from "next/server";
import { importCommitSchema } from "@/lib/schemas/import";
import { commitImportRows } from "@/lib/import/commit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = importCommitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const result = await commitImportRows(parsed.data.rows);
  return NextResponse.json(result);
}

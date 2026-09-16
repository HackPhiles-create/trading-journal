import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/uploads";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; sid: string }> }) {
  const { sid } = await ctx.params;

  const screenshot = await prisma.screenshot.findUnique({ where: { id: sid } });
  if (!screenshot) return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });

  await prisma.screenshot.delete({ where: { id: sid } });

  const absolutePath = resolveUploadPath(screenshot.filePath);
  if (absolutePath) {
    await unlink(absolutePath).catch((err) => {
      console.error(`Failed to remove screenshot file at ${absolutePath}:`, err);
    });
  }

  return NextResponse.json({ ok: true });
}

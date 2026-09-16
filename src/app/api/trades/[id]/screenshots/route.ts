import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { SCREENSHOT_PHASES } from "@/lib/constants";
import { UPLOADS_ROOT, ALLOWED_SCREENSHOT_TYPES, MAX_SCREENSHOT_BYTES, extensionForMime } from "@/lib/uploads";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const screenshots = await prisma.screenshot.findMany({ where: { tradeId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(screenshots);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade) return NextResponse.json({ error: "Trade not found." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  const phase = formData.get("phase");
  const caption = formData.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (typeof phase !== "string" || !(SCREENSHOT_PHASES as readonly string[]).includes(phase)) {
    return NextResponse.json({ error: "Invalid screenshot phase." }, { status: 400 });
  }
  if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are supported." }, { status: 415 });
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 413 });
  }

  const tradeDir = path.join(UPLOADS_ROOT, id);
  await mkdir(tradeDir, { recursive: true });

  const filename = `${phase.toLowerCase()}-${randomUUID()}.${extensionForMime(file.type)}`;
  const relativePath = path.join(id, filename);
  const absolutePath = path.join(UPLOADS_ROOT, relativePath);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const screenshot = await prisma.screenshot.create({
    data: {
      tradeId: id,
      filePath: relativePath,
      phase,
      caption: typeof caption === "string" && caption ? caption : null,
    },
  });

  return NextResponse.json(screenshot, { status: 201 });
}

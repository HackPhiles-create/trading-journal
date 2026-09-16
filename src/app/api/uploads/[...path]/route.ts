import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { resolveUploadPath } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const relativePath = segments.join("/");
  const absolutePath = resolveUploadPath(relativePath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    await stat(absolutePath);
    const buffer = await readFile(absolutePath);
    const ext = absolutePath.slice(absolutePath.lastIndexOf(".")).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

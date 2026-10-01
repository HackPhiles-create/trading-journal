import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";

// Defaults to ./uploads for local dev; in production (e.g. Railway) set
// UPLOADS_DIR to a path inside a mounted persistent volume, or uploaded
// screenshots vanish on every redeploy.
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

export const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024; // 8MB

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

// Resolves a relative screenshot path (as stored in Screenshot.filePath) to an
// absolute path, guaranteeing the result stays inside UPLOADS_ROOT even if
// the relative path contains "..".
export function resolveUploadPath(relativePath: string): string | null {
  const resolved = path.join(UPLOADS_ROOT, relativePath);
  if (!resolved.startsWith(UPLOADS_ROOT + path.sep) && resolved !== UPLOADS_ROOT) {
    return null;
  }
  return resolved;
}

const MIME_BY_EXT: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

// Reads a stored screenshot off disk for embedding directly in a PDF (via
// react-pdf's <Image src="data:..."> ), rather than round-tripping through
// the /api/uploads HTTP route. Returns null instead of throwing so a report
// export doesn't fail just because one screenshot's file is missing.
export async function readUploadAsDataUri(relativePath: string): Promise<string | null> {
  const absolutePath = resolveUploadPath(relativePath);
  if (!absolutePath) return null;
  try {
    const bytes = await readFile(absolutePath);
    const ext = path.extname(absolutePath).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "image/png";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

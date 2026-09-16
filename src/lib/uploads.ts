import "server-only";
import path from "node:path";

export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

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

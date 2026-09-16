import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { run, queryOne } from "@/lib/local/db";
import { genId, nowIso, LocalApiError } from "@/lib/local/utils";
import { SCREENSHOT_PHASES } from "@/lib/constants";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // reader.result is a data: URL ("data:image/png;base64,AAAA...") — Filesystem.writeFile wants the raw base64 payload.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Resolves a stored relative screenshot path to a src usable in <img>/<Image>. */
export async function resolveScreenshotUri(relativePath: string): Promise<string> {
  const { uri } = await Filesystem.getUri({ path: `screenshots/${relativePath}`, directory: Directory.Data });
  return Capacitor.convertFileSrc(uri);
}

export async function uploadScreenshotLocal(
  tradeId: string,
  file: File,
  phase: "BEFORE" | "AFTER",
  caption?: string
): Promise<{ id: string; filePath: string; phase: string; caption: string | null }> {
  if (!(SCREENSHOT_PHASES as readonly string[]).includes(phase)) throw new LocalApiError("Invalid screenshot phase.");
  if (!ALLOWED_TYPES.includes(file.type)) throw new LocalApiError("Only PNG, JPEG, and WebP images are supported.", 415);
  if (file.size > MAX_BYTES) throw new LocalApiError("Image must be 8MB or smaller.", 413);

  const trade = await queryOne("SELECT id FROM trades WHERE id = ?", [tradeId]);
  if (!trade) throw new LocalApiError("Trade not found.", 404);

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${phase.toLowerCase()}-${genId()}.${ext}`;
  const relativePath = `${tradeId}/${filename}`;

  const base64 = await fileToBase64(file);
  await Filesystem.writeFile({
    path: `screenshots/${relativePath}`,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });

  const id = genId();
  await run("INSERT INTO screenshots (id, tradeId, filePath, phase, caption, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [
    id,
    tradeId,
    relativePath,
    phase,
    caption || null,
    nowIso(),
  ]);

  return { id, filePath: relativePath, phase, caption: caption || null };
}

export async function deleteScreenshotLocal(screenshotId: string): Promise<void> {
  const row = await queryOne<{ id: string; filePath: string }>("SELECT id, filePath FROM screenshots WHERE id = ?", [screenshotId]);
  if (!row) throw new LocalApiError("Screenshot not found.", 404);

  await run("DELETE FROM screenshots WHERE id = ?", [screenshotId]);

  await Filesystem.deleteFile({ path: `screenshots/${row.filePath}`, directory: Directory.Data }).catch((err) => {
    console.error(`Failed to remove screenshot file at ${row.filePath}:`, err);
  });
}

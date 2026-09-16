"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Trash2, X, Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useUploadScreenshot, useDeleteScreenshot, type TradeDTO } from "@/hooks/use-trades";
import { isNative } from "@/lib/data-source";
import { resolveScreenshotUri } from "@/lib/local/screenshots";
import type { ScreenshotPhase } from "@/lib/constants";

type Screenshot = TradeDTO["screenshots"][number];

// On native, `filePath` is a relative on-device path, not a URL — it needs
// an async resolve (via the Filesystem plugin) into a capacitor:// src
// before an <img>/<Image> can load it. On web it's just /api/uploads/<path>.
// `resolved` is keyed by the path it was resolved FOR, so switching to a
// different filePath (e.g. zooming to another screenshot without unmount)
// shows the loading state via the path mismatch below rather than a
// synchronous setState reset at the top of the effect.
function useScreenshotSrc(filePath: string): string | null {
  const [resolved, setResolved] = useState<{ path: string; src: string } | null>(null);

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    resolveScreenshotUri(filePath).then((src) => {
      if (!cancelled) setResolved({ path: filePath, src });
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (!isNative()) return `/api/uploads/${filePath}`;
  return resolved?.path === filePath ? resolved.src : null;
}

function ScreenshotImage({ filePath, alt, className }: { filePath: string; alt: string; className: string }) {
  const src = useScreenshotSrc(filePath);
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <Image src={src} alt={alt} fill className={className} unoptimized />;
}

function PhaseSection({
  tradeId,
  phase,
  label,
  screenshots,
  onZoom,
}: {
  tradeId: string;
  phase: ScreenshotPhase;
  label: string;
  screenshots: Screenshot[];
  onZoom: (s: Screenshot) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadScreenshot(tradeId);
  const deleteScreenshot = useDeleteScreenshot(tradeId);
  const [pendingDelete, setPendingDelete] = useState<Screenshot | null>(null);

  async function handleFile(file: File) {
    try {
      await upload.mutateAsync({ file, phase });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {screenshots.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          <ImageOff className="mr-1.5 h-3.5 w-3.5" /> No {label.toLowerCase()} yet
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {screenshots.map((s) => (
            <div key={s.id} className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
              <button type="button" className="h-full w-full" onClick={() => onZoom(s)}>
                <ScreenshotImage filePath={s.filePath} alt={s.caption ?? label} className="object-cover transition-transform group-hover:scale-105" />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(s)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete screenshot?"
        description="This image will be permanently removed from this trade."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteScreenshot.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export function ScreenshotGallery({ trade }: { trade: TradeDTO }) {
  const [zoomed, setZoomed] = useState<Screenshot | null>(null);
  const before = trade.screenshots.filter((s) => s.phase === "BEFORE");
  const after = trade.screenshots.filter((s) => s.phase === "AFTER");

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">Screenshots</h3>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PhaseSection tradeId={trade.id} phase="BEFORE" label="Before" screenshots={before} onZoom={setZoomed} />
        <PhaseSection tradeId={trade.id} phase="AFTER" label="After" screenshots={after} onZoom={setZoomed} />
      </div>

      <Dialog open={!!zoomed} onOpenChange={(open) => !open && setZoomed(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
          {zoomed && (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <ScreenshotImage filePath={zoomed.filePath} alt={zoomed.caption ?? "Screenshot"} className="object-contain" />
              <button
                onClick={() => setZoomed(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

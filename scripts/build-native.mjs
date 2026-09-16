#!/usr/bin/env node
// Builds the static-export bundle for the offline Android app.
//
// A Next.js static export can't contain server Route Handlers or
// middleware at all (not just "unused" — their mere presence fails the
// export build), but the same source tree also needs those exact files for
// the normal `next build` used by the Railway web deploy. So: temporarily
// move src/app/api and src/middleware.ts out of the tree, run the export
// build, then always move them back — even if the build fails — so the web
// app's source tree is never left broken.
import { existsSync, renameSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiDir = path.join(root, "src/app/api");
const apiBackup = path.join(root, ".native-build-tmp/api");
const middlewareFile = path.join(root, "src/middleware.ts");
const middlewareBackup = path.join(root, ".native-build-tmp/middleware.ts");
const outDir = path.join(root, "out");
const androidWwwDir = path.join(root, "..", "trading-journal-android", "www");

function moveAside() {
  mkdirSync(path.join(root, ".native-build-tmp"), { recursive: true });
  if (existsSync(apiDir)) renameSync(apiDir, apiBackup);
  if (existsSync(middlewareFile)) renameSync(middlewareFile, middlewareBackup);
}

function restore() {
  if (existsSync(apiBackup)) renameSync(apiBackup, apiDir);
  if (existsSync(middlewareBackup)) renameSync(middlewareBackup, middlewareFile);
  rmSync(path.join(root, ".native-build-tmp"), { recursive: true, force: true });
}

console.log("[build-native] Moving src/app/api and src/middleware.ts aside for the static export...");
moveAside();

try {
  // .next/dev/types/validator.ts caches the route list from whatever build
  // ran last — with the API routes suddenly gone, a stale cache here makes
  // the typecheck step fail on routes that (correctly) no longer exist.
  console.log("[build-native] Clearing .next (stale route-type cache would reference the moved-out API routes)...");
  rmSync(path.join(root, ".next"), { recursive: true, force: true });

  console.log("[build-native] Running next build (output: export)...");
  execSync("npx next build", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_OUTPUT_EXPORT: "1" },
  });

  if (!existsSync(outDir)) {
    throw new Error(`Expected static export output at ${outDir}, but it doesn't exist.`);
  }

  console.log(`[build-native] Copying ${outDir} -> ${androidWwwDir}`);
  rmSync(androidWwwDir, { recursive: true, force: true });
  mkdirSync(androidWwwDir, { recursive: true });
  cpSync(outDir, androidWwwDir, { recursive: true });

  console.log("[build-native] Done. Run `npx cap sync android` in trading-journal-android next.");
} finally {
  console.log("[build-native] Restoring src/app/api and src/middleware.ts...");
  restore();
}

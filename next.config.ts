import type { NextConfig } from "next";
import path from "node:path";

// Set only by scripts/build-native.mjs, which also temporarily moves
// src/app/api and src/middleware.ts out of the way first — a static export
// can't contain server routes/middleware at all, so those must not exist in
// the tree during this build, not just be unused. The normal `next build`
// (Railway/web) never sets this and is unaffected.
const isNativeExport = process.env.NEXT_OUTPUT_EXPORT === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  ...(isNativeExport ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;

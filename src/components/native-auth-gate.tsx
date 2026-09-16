"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/data-source";
import { isUnlocked } from "@/lib/local/auth";

// Native-only equivalent of middleware.ts's session check — a static-export
// build has no server/Edge runtime to run middleware at all, so the (app)
// route group gates itself client-side here instead. On web this is a no-op
// (middleware already protects everything server-side).
export function NativeAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(!isNative());

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    (async () => {
      const unlocked = await isUnlocked();
      if (cancelled) return;
      if (!unlocked) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}

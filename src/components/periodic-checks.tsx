"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

// No background scheduler exists in a locally-run Next.js app, so "automatic"
// checks (weekly/monthly report generation, news alerts) only actually run
// while the app is open in a tab — this polls both check-due endpoints on an
// interval (and once on mount) to approximate that.
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function PeriodicChecks() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const results = await Promise.allSettled([
        fetch("/api/reports/check-due"),
        fetch("/api/news/check-due"),
      ]);
      if (cancelled) return;
      const anyOk = results.some((r) => r.status === "fulfilled");
      if (anyOk) queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    }

    runChecks();
    const interval = setInterval(runChecks, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}

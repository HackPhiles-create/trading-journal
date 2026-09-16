"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Trash2, Settings as SettingsIcon, Volume2, ShieldAlert, Newspaper, KeyRound, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings, useResetDemoData, useClearDemoData } from "@/hooks/use-settings";
import { fetchJson } from "@/lib/api-client";
import { playSuccessSound } from "@/lib/sounds";
import { getBrowserTimezone } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/data-source";
import { getSignedInTradeId, signOutLocal } from "@/lib/local/auth";

const NEWS_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"];

const NOTIFICATION_TOGGLES = [
  { key: "notifyWeeklyReport", label: "Weekly report ready" },
  { key: "notifyMonthlyReport", label: "Monthly report ready" },
  { key: "notifyRepeatedMistake", label: "Repeated mistake detected" },
  { key: "notifyMultipleLosses", label: "Multiple losses from same setup" },
  { key: "notifyLowRR", label: "R:R below preferred threshold" },
  { key: "notifyNewStats", label: "New trading statistics available" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetDemo = useResetDemoData();
  const clearDemo = useClearDemoData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () =>
      isNative()
        ? { authenticated: true as const, tradeId: (await getSignedInTradeId()) ?? "" }
        : fetchJson<{ authenticated: true; tradeId: string }>("/api/auth/me"),
  });

  async function handleSignOut() {
    setSigningOut(true);
    try {
      if (isNative()) await signOutLocal();
      else await fetchJson("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      router.push("/login");
    } catch {
      toast.error("Failed to sign out. Try again.");
      setSigningOut(false);
    }
  }

  const [minRR, setMinRR] = useState("");
  const [windowDays, setWindowDays] = useState("");
  const [minOccurrences, setMinOccurrences] = useState("");
  const [hoursBefore, setHoursBefore] = useState("");

  // Preference.timezone defaults to "UTC" and nothing else ever sets it —
  // sync it to the browser's detected zone once, the first time settings
  // load with that untouched default. Needed for the news morning-window
  // check (and any other local-time logic) to mean anything for this user.
  useEffect(() => {
    if (!settings) return;
    if (settings.timezone === "UTC") {
      const detected = getBrowserTimezone();
      if (detected && detected !== "UTC") {
        updateSettings.mutate({ timezone: detected });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.timezone]);

  async function handleResetDemo() {
    try {
      await resetDemo.mutateAsync();
      toast.success("Demo data has been reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset demo data.");
    }
  }

  async function handleClearDemo() {
    try {
      await clearDemo.mutateAsync();
      toast.success("Demo data cleared. Your journal is now empty and ready for real trades.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear demo data.");
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Preferences, notifications, and demo data.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Account</h3>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{me?.tradeId ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Signed in to this trading desk.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSignOut} disabled={signingOut}>
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Trading Preferences</h3>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="min-rr">Preferred minimum R:R</Label>
            <p className="text-xs text-muted-foreground">Trades below this ratio show a warning and can trigger a notification.</p>
          </div>
          <Input
            id="min-rr"
            inputMode="decimal"
            className="w-24"
            defaultValue={settings.preferredMinRR}
            onChange={(e) => setMinRR(e.target.value)}
            onBlur={() => {
              if (minRR && Number(minRR) > 0) {
                updateSettings.mutate({ preferredMinRR: Number(minRR) });
              }
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
          <div>
            <Label className="text-sm font-normal">Timezone</Label>
            <p className="text-xs text-muted-foreground">Used for &quot;morning&quot; news alerts and date defaults.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{settings.timezone}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings.mutate({ timezone: getBrowserTimezone() })}
            >
              Use this device&apos;s
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Mistake Detection</h3>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="auto-detect" className="text-sm font-normal">Automatic detection</Label>
            <p className="text-xs text-muted-foreground">
              Scan your journal for repeated mistakes and losing streaks, and surface them on the Dashboard and Mistakes page.
            </p>
          </div>
          <Switch
            id="auto-detect"
            checked={settings.autoDetectMistakes}
            onCheckedChange={(checked) => updateSettings.mutate({ autoDetectMistakes: checked })}
          />
        </div>

        {settings.autoDetectMistakes && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="window-days">Lookback window (days)</Label>
              <Input
                id="window-days"
                type="number"
                min={1}
                max={365}
                defaultValue={settings.mistakeWindowDays}
                onChange={(e) => setWindowDays(e.target.value)}
                onBlur={() => {
                  if (windowDays && Number(windowDays) > 0) {
                    updateSettings.mutate({ mistakeWindowDays: Number(windowDays) });
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min-occurrences">Min. occurrences to flag</Label>
              <Input
                id="min-occurrences"
                type="number"
                min={1}
                max={50}
                defaultValue={settings.mistakeMinOccurrences}
                onChange={(e) => setMinOccurrences(e.target.value)}
                onBlur={() => {
                  if (minOccurrences && Number(minOccurrences) > 0) {
                    updateSettings.mutate({ mistakeMinOccurrences: Number(minOccurrences) });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">News Alerts</h3>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="news-alerts" className="text-sm font-normal">Automatic alerts</Label>
            <p className="text-xs text-muted-foreground">
              Economic calendar from ForexFactory. Get a morning digest and a heads-up before high-impact releases.
            </p>
          </div>
          <Switch
            id="news-alerts"
            checked={settings.newsAlertsEnabled}
            onCheckedChange={(checked) => updateSettings.mutate({ newsAlertsEnabled: checked })}
          />
        </div>

        {settings.newsAlertsEnabled && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Watched currencies</Label>
              <div className="flex flex-wrap gap-1.5">
                {NEWS_CURRENCIES.map((c) => {
                  const watchedList = settings.newsAlertCurrency.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
                  const active = watchedList.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const next = active ? watchedList.filter((x) => x !== c) : [...watchedList, c];
                        if (next.length === 0) return;
                        updateSettings.mutate({ newsAlertCurrency: next.join(",") });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours-before">Alert hours before release</Label>
              <Input
                id="hours-before"
                type="number"
                min={1}
                max={24}
                defaultValue={settings.newsAlertHoursBefore}
                onChange={(e) => setHoursBefore(e.target.value)}
                onBlur={() => {
                  if (hoursBefore && Number(hoursBefore) > 0) {
                    updateSettings.mutate({ newsAlertHoursBefore: Number(hoursBefore) });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="mt-4 space-y-3">
          {NOTIFICATION_TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <Label htmlFor={t.key} className="text-sm font-normal">{t.label}</Label>
              <Switch
                id={t.key}
                checked={Boolean(settings[t.key])}
                onCheckedChange={(checked) => updateSettings.mutate({ [t.key]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Sound</h3>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="sound-enabled" className="text-sm font-normal">Sound effects</Label>
            <p className="text-xs text-muted-foreground">Subtle audio cues when a trade saves, closes, or a new notification arrives.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => playSuccessSound()}
              aria-label="Preview sound"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings.mutate({ soundEnabled: checked })}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
          <div>
            <Label htmlFor="sound-on-click" className="text-sm font-normal">Click sounds</Label>
            <p className="text-xs text-muted-foreground">Play a soft tick on every button, link, and toggle press.</p>
          </div>
          <Switch
            id="sound-on-click"
            checked={settings.soundOnClick}
            disabled={!settings.soundEnabled}
            onCheckedChange={(checked) => updateSettings.mutate({ soundOnClick: checked })}
          />
        </div>
      </div>

      {!isNative() && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Demo Data</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This journal can ship with sample trades so the dashboard looks realistic immediately. Reset regenerates a fresh
            sample dataset; Clear removes demo trades entirely so you can start journaling real trades. Your real trades are
            never touched by either action.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset Demo Data
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-loss hover:text-loss" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear Demo Data
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="This deletes all demo trades and accounts and regenerates a fresh sample dataset. Your real trades are unaffected."
        confirmLabel="Reset Demo Data"
        onConfirm={handleResetDemo}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear demo data?"
        description="This permanently deletes all demo trades and demo accounts, leaving your journal empty. Your real trades are unaffected. This cannot be undone."
        confirmLabel="Clear Demo Data"
        onConfirm={handleClearDemo}
      />
    </div>
  );
}

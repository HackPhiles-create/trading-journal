"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, User, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/data-source";
import { hasLocalAccount, registerLocal, loginLocal, isUnlocked } from "@/lib/local/auth";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { playSuccess, playError } = useSound();

  // Native has no middleware to bounce an already-unlocked visit to /login
  // back to the app — do it here instead.
  useEffect(() => {
    if (!isNative()) return;
    isUnlocked().then((unlocked) => {
      if (unlocked) router.replace("/dashboard");
    });
  }, [router]);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["auth", "status"],
    queryFn: async () =>
      isNative() ? { hasAccount: await hasLocalAccount() } : fetchJson<{ hasAccount: boolean }>("/api/auth/status"),
  });

  const isSetup = status?.hasAccount === false;

  const [tradeId, setTradeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (shakeTimeout.current) clearTimeout(shakeTimeout.current); }, []);

  function triggerError(message: string) {
    setError(message);
    playError();
    setShake(true);
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    shakeTimeout.current = setTimeout(() => setShake(false), 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSetup && password !== confirmPassword) {
      triggerError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      if (isNative()) {
        if (isSetup) await registerLocal(tradeId, password);
        else await loginLocal(tradeId, password);
      } else {
        const endpoint = isSetup ? "/api/auth/register" : "/api/auth/login";
        await fetchJson<{ ok: true; tradeId: string }>(endpoint, {
          method: "POST",
          body: JSON.stringify({ tradeId, password }),
        });
      }
      playSuccess();
      queryClient.clear();
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      triggerError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#05070d] px-4 py-10">
      {/* Ambient animated background — pure CSS (no Framer Motion: it gets
          stuck invisible in the Android WebView), safe for the APK too. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid" />
      </div>

      <div
        className={cn(
          "relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-500 ease-out",
          shake && "login-shake"
        )}
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="login-logo flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_-8px_rgba(10,132,255,0.7)]">
            <TrendingUp className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Trading Journal</h1>
            <p className="mt-1 text-sm text-white/50">
              {statusLoading ? " " : isSetup ? "Set up your trading desk" : "Welcome back, trader."}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
          {statusLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                icon={User}
                id="tradeId"
                label="Trade ID"
                placeholder="e.g. GFT.trader01"
                value={tradeId}
                onChange={setTradeId}
                autoComplete="username"
                autoFocus
              />

              <Field
                icon={Lock}
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder={isSetup ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={setPassword}
                autoComplete={isSetup ? "new-password" : "current-password"}
                trailing={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-white/40 transition-colors hover:text-white/70"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {isSetup && (
                <Field
                  icon={Lock}
                  id="confirmPassword"
                  label="Confirm password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Type it again"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />
              )}

              {error && (
                <p className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-xs font-medium text-loss duration-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !tradeId || !password}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(10,132,255,0.6)] transition-all duration-200 hover:shadow-[0_10px_28px_-6px_rgba(10,132,255,0.75)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isSetup ? "Create account" : "Sign in"}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          {isSetup
            ? "This creates the one trading-desk login for this install."
            : "Your trades, calendar, and reports stay locked behind this login."}
        </p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>;
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-white/60">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 transition-colors focus-within:border-primary/60 focus-within:bg-white/[0.06]">
        <Icon className="h-4 w-4 shrink-0 text-white/35" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
        />
        {trailing}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

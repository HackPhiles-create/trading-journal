export function formatCurrency(value: number, opts?: { showSign?: boolean }): string {
  const sign = opts?.showSign && value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompactCurrency(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatRR(value: number | null | undefined): string {
  if (value == null) return "—";
  return `1:${value.toFixed(2)}`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Trims a raw price to a sane number of decimals for display, without any
// per-asset metadata: forex-scale (<10) prices keep 5 decimals, mid-range
// (<1000, e.g. gold, JPY pairs) keep 3, everything else keeps 2. Guards
// against floating-point noise (e.g. 2718.9872381868954) reaching the UI.
export function formatPrice(value: number): string {
  const decimals = Math.abs(value) < 10 ? 5 : Math.abs(value) < 1000 ? 3 : 2;
  return value.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}

// SQLite has no native enum type, so every "enum-like" trade field is a plain
// String column in prisma/schema.prisma. These arrays are the single source of
// truth for the allowed values; zod schemas in lib/schemas/* enforce them.

export const DIRECTIONS = ["BUY", "SELL"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const TRADE_STATUSES = ["OPEN", "CLOSED"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const TRADE_RESULTS = ["WIN", "LOSS", "BREAKEVEN"] as const;
export type TradeResult = (typeof TRADE_RESULTS)[number];

export const SESSIONS = ["ASIA", "LONDON", "NEWYORK", "OVERLAP", "OTHER"] as const;
export type Session = (typeof SESSIONS)[number];

export const ACCOUNT_TYPES = ["PERSONAL", "PROP_FIRM", "DEMO", "BROKER", "OTHER"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ASSET_CLASSES = ["FOREX", "CRYPTO", "STOCK", "INDEX", "COMMODITY", "OTHER"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const EMOTIONAL_STATES = [
  "CALM",
  "CONFIDENT",
  "FOMO",
  "FEAR",
  "GREED",
  "REVENGE",
  "NEUTRAL",
  "OTHER",
] as const;
export type EmotionalState = (typeof EMOTIONAL_STATES)[number];

export const SCREENSHOT_PHASES = ["BEFORE", "AFTER"] as const;
export type ScreenshotPhase = (typeof SCREENSHOT_PHASES)[number];

export const NOTIFICATION_TYPES = [
  "WEEKLY_REPORT_READY",
  "MONTHLY_REPORT_READY",
  "REPEATED_MISTAKE",
  "MULTIPLE_LOSSES_SAME_SETUP",
  "LOW_RR",
  "NEW_STATS",
  "NEWS_MORNING",
  "NEWS_UPCOMING",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REPORT_TYPES = ["WEEKLY", "MONTHLY"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const PRESET_CHECKLIST_ITEMS = [
  "Strong candle",
  "Break of structure",
  "Order block",
  "Liquidity sweep",
  "Support/resistance",
  "Price action confirmation",
  "Trend continuation",
  "Reversal setup",
  "Session setup",
  "News consideration",
] as const;

export const PRESET_MISTAKES = [
  "Overtrading",
  "Revenge trading",
  "FOMO",
  "Entered too early",
  "Entered too late",
  "Moved SL",
  "Removed SL",
  "Took trade without confirmation",
  "Oversized position",
  "Ignored strategy",
  "Traded during news",
  "Chased price",
  "Poor R:R",
  "Emotional trading",
  "No trading plan",
] as const;

// contractSize is the multiplier used by lib/trading-math.ts:
// potentialProfit/Loss = priceDistance * lotSize * contractSize. Values below
// are chosen so a 1.0 "lot" at typical retail sizing produces a plausible
// dollar pip/point value for that instrument (e.g. ~$10/pip/lot for majors),
// not a precise broker P&L model.
export const DEFAULT_ASSETS: Array<{ symbol: string; name: string; assetClass: AssetClass; contractSize: number }> = [
  { symbol: "XAUUSD", name: "Gold", assetClass: "COMMODITY", contractSize: 100 },
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "FOREX", contractSize: 100000 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", assetClass: "FOREX", contractSize: 100000 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", assetClass: "FOREX", contractSize: 1000 },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", assetClass: "CRYPTO", contractSize: 1 },
  { symbol: "ETHUSD", name: "Ethereum / US Dollar", assetClass: "CRYPTO", contractSize: 1 },
  { symbol: "NAS100", name: "Nasdaq 100", assetClass: "INDEX", contractSize: 10 },
  { symbol: "US30", name: "Dow Jones 30", assetClass: "INDEX", contractSize: 5 },
];

// Minimum trades required before a behavioral/"improvement" observation is
// shown in reports/analytics — below this, render an explicit
// "not enough data yet" state rather than a computed claim.
export const MIN_SAMPLE_SIZE = 10;

// Rolling-window mistake-pattern detection defaults.
export const MISTAKE_PATTERN_WINDOW_DAYS = 30;
export const MISTAKE_PATTERN_MIN_OCCURRENCES = 3;
export const SETUP_LOSS_STREAK_MIN = 3;

export const EQUITY_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
export type EquityRange = (typeof EQUITY_RANGES)[number];

// On-device SQLite schema for the offline Android build — hand-mirrors
// prisma/schema.prisma. Prisma Migrate is Node-only and can't run inside the
// WebView, so this file (plus the version-numbered runner in db.ts) is the
// on-device analog of prisma/migrations/. Booleans are stored as INTEGER
// 0/1 (SQLite has no native boolean, same as the server DB under Prisma).
// A plain string (not a loaded .sql file) because the WebView bundle has no
// filesystem access to read a sibling file from at runtime.

export const LOCAL_SCHEMA_VERSION = 1;

export const LOCAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS local_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tradeId TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  broker TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  startingBalance REAL,
  isDemo INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  assetClass TEXT NOT NULL,
  contractSize REAL NOT NULL DEFAULT 1,
  isCustom INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  isCustom INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  isPreset INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mistakes (
  id TEXT PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  isPreset INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL REFERENCES accounts(id),
  assetId TEXT NOT NULL REFERENCES assets(id),
  strategyId TEXT REFERENCES strategies(id),

  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  session TEXT,

  entryDateTime TEXT NOT NULL,
  entryPrice REAL NOT NULL,
  stopLoss REAL NOT NULL,
  takeProfit REAL NOT NULL,
  lotSize REAL NOT NULL,
  riskPercent REAL,

  exitPrice REAL,
  exitDateTime TEXT,
  result TEXT,
  actualPnl REAL,
  actualRMultiple REAL,

  pnlManuallyOverridden INTEGER NOT NULL DEFAULT 0,

  reasoningText TEXT,
  marketCondition TEXT,
  confirmation TEXT,
  entryReason TEXT,
  confluence TEXT,
  riskReasoning TEXT,

  emotionalState TEXT,
  whatWentWell TEXT,
  whatToImprove TEXT,
  lessonLearned TEXT,

  isDemo INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_account_entry ON trades(accountId, entryDateTime);
CREATE INDEX IF NOT EXISTS idx_trades_asset ON trades(assetId);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategyId);

CREATE TABLE IF NOT EXISTS trade_checklist_answers (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  checklistItemId TEXT NOT NULL REFERENCES checklist_items(id),
  checked INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tradeId, checklistItemId)
);

CREATE TABLE IF NOT EXISTS trade_mistakes (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  mistakeId TEXT NOT NULL REFERENCES mistakes(id),
  note TEXT,
  UNIQUE(tradeId, mistakeId)
);

CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  tradeId TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  filePath TEXT NOT NULL,
  phase TEXT NOT NULL,
  caption TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  relatedEntityId TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  accountId TEXT,
  periodStart TEXT NOT NULL,
  periodEnd TEXT NOT NULL,
  totalPnl REAL NOT NULL,
  winRate REAL NOT NULL,
  tradeCount INTEGER NOT NULL,
  dataJson TEXT NOT NULL,
  generatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY DEFAULT 'default',
  theme TEXT NOT NULL DEFAULT 'system',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  defaultAccountId TEXT,
  preferredMinRR REAL NOT NULL DEFAULT 2,
  notifyWeeklyReport INTEGER NOT NULL DEFAULT 1,
  notifyMonthlyReport INTEGER NOT NULL DEFAULT 1,
  notifyRepeatedMistake INTEGER NOT NULL DEFAULT 1,
  notifyMultipleLosses INTEGER NOT NULL DEFAULT 1,
  notifyLowRR INTEGER NOT NULL DEFAULT 1,
  notifyNewStats INTEGER NOT NULL DEFAULT 1,
  soundEnabled INTEGER NOT NULL DEFAULT 1,
  soundOnClick INTEGER NOT NULL DEFAULT 1,
  autoDetectMistakes INTEGER NOT NULL DEFAULT 1,
  mistakeWindowDays INTEGER NOT NULL DEFAULT 30,
  mistakeMinOccurrences INTEGER NOT NULL DEFAULT 3,
  newsAlertsEnabled INTEGER NOT NULL DEFAULT 1,
  newsAlertCurrency TEXT NOT NULL DEFAULT 'USD,JPY',
  newsAlertHoursBefore INTEGER NOT NULL DEFAULT 1
);
`;

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "broker" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startingBalance" REAL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL,
    "contractSize" REAL NOT NULL DEFAULT 1,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trade_checklist_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "trade_checklist_answers_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trade_checklist_answers_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mistakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trade_mistakes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "mistakeId" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "trade_mistakes_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trade_mistakes_mistakeId_fkey" FOREIGN KEY ("mistakeId") REFERENCES "mistakes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "screenshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screenshots_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "strategyId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "session" TEXT,
    "entryDateTime" DATETIME NOT NULL,
    "entryPrice" REAL NOT NULL,
    "stopLoss" REAL NOT NULL,
    "takeProfit" REAL NOT NULL,
    "lotSize" REAL NOT NULL,
    "riskPercent" REAL,
    "exitPrice" REAL,
    "exitDateTime" DATETIME,
    "result" TEXT,
    "actualPnl" REAL,
    "actualRMultiple" REAL,
    "pnlManuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "reasoningText" TEXT,
    "marketCondition" TEXT,
    "confirmation" TEXT,
    "entryReason" TEXT,
    "confluence" TEXT,
    "riskReasoning" TEXT,
    "emotionalState" TEXT,
    "whatWentWell" TEXT,
    "whatToImprove" TEXT,
    "lessonLearned" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "accountId" TEXT,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalPnl" REAL NOT NULL,
    "winRate" REAL NOT NULL,
    "tradeCount" INTEGER NOT NULL,
    "dataJson" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "preferences" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultAccountId" TEXT,
    "preferredMinRR" REAL NOT NULL DEFAULT 2,
    "notifyWeeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "notifyMonthlyReport" BOOLEAN NOT NULL DEFAULT true,
    "notifyRepeatedMistake" BOOLEAN NOT NULL DEFAULT true,
    "notifyMultipleLosses" BOOLEAN NOT NULL DEFAULT true,
    "notifyLowRR" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewStats" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_name_key" ON "strategies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_label_key" ON "checklist_items"("label");

-- CreateIndex
CREATE UNIQUE INDEX "trade_checklist_answers_tradeId_checklistItemId_key" ON "trade_checklist_answers"("tradeId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "mistakes_label_key" ON "mistakes"("label");

-- CreateIndex
CREATE UNIQUE INDEX "trade_mistakes_tradeId_mistakeId_key" ON "trade_mistakes"("tradeId", "mistakeId");

-- CreateIndex
CREATE INDEX "trades_accountId_entryDateTime_idx" ON "trades"("accountId", "entryDateTime");

-- CreateIndex
CREATE INDEX "trades_assetId_idx" ON "trades"("assetId");

-- CreateIndex
CREATE INDEX "trades_strategyId_idx" ON "trades"("strategyId");

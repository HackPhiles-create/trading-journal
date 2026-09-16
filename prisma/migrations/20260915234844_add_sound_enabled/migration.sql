-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_preferences" (
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
    "notifyNewStats" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_preferences" ("defaultAccountId", "id", "notifyLowRR", "notifyMonthlyReport", "notifyMultipleLosses", "notifyNewStats", "notifyRepeatedMistake", "notifyWeeklyReport", "preferredMinRR", "theme", "timezone") SELECT "defaultAccountId", "id", "notifyLowRR", "notifyMonthlyReport", "notifyMultipleLosses", "notifyNewStats", "notifyRepeatedMistake", "notifyWeeklyReport", "preferredMinRR", "theme", "timezone" FROM "preferences";
DROP TABLE "preferences";
ALTER TABLE "new_preferences" RENAME TO "preferences";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

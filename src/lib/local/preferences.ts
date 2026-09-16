import { queryOne, run, toBool } from "@/lib/local/db";
import type { PreferenceDTO } from "@/hooks/use-settings";

const DEFAULTS: Omit<PreferenceDTO, "id"> = {
  theme: "system",
  timezone: "UTC",
  defaultAccountId: null,
  preferredMinRR: 2,
  notifyWeeklyReport: true,
  notifyMonthlyReport: true,
  notifyRepeatedMistake: true,
  notifyMultipleLosses: true,
  notifyLowRR: true,
  notifyNewStats: true,
  soundEnabled: true,
  soundOnClick: true,
  autoDetectMistakes: true,
  mistakeWindowDays: 30,
  mistakeMinOccurrences: 3,
  newsAlertsEnabled: true,
  newsAlertCurrency: "USD,JPY",
  newsAlertHoursBefore: 1,
};

function mapPreference(row: Record<string, unknown>): PreferenceDTO {
  return {
    id: row.id as string,
    theme: row.theme as string,
    timezone: row.timezone as string,
    defaultAccountId: (row.defaultAccountId as string) ?? null,
    preferredMinRR: row.preferredMinRR as number,
    notifyWeeklyReport: toBool(row.notifyWeeklyReport),
    notifyMonthlyReport: toBool(row.notifyMonthlyReport),
    notifyRepeatedMistake: toBool(row.notifyRepeatedMistake),
    notifyMultipleLosses: toBool(row.notifyMultipleLosses),
    notifyLowRR: toBool(row.notifyLowRR),
    notifyNewStats: toBool(row.notifyNewStats),
    soundEnabled: toBool(row.soundEnabled),
    soundOnClick: toBool(row.soundOnClick),
    autoDetectMistakes: toBool(row.autoDetectMistakes),
    mistakeWindowDays: row.mistakeWindowDays as number,
    mistakeMinOccurrences: row.mistakeMinOccurrences as number,
    newsAlertsEnabled: toBool(row.newsAlertsEnabled),
    newsAlertCurrency: row.newsAlertCurrency as string,
    newsAlertHoursBefore: row.newsAlertHoursBefore as number,
  };
}

export async function getOrCreateLocalPreference(): Promise<PreferenceDTO> {
  const existing = await queryOne("SELECT * FROM preferences WHERE id = 'default'");
  if (existing) return mapPreference(existing);
  await run("INSERT INTO preferences (id) VALUES ('default')");
  return { id: "default", ...DEFAULTS };
}

export async function updateLocalPreference(patch: Partial<PreferenceDTO>): Promise<PreferenceDTO> {
  await getOrCreateLocalPreference(); // ensure the row exists
  const entries = Object.entries(patch).filter(([k]) => k !== "id");
  if (entries.length > 0) {
    const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
    const values = entries.map(([, v]) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
    await run(`UPDATE preferences SET ${setClause} WHERE id = 'default'`, values);
  }
  return getOrCreateLocalPreference();
}

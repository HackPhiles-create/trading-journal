import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  subYears,
  format,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { EquityRange } from "@/lib/constants";

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatDateInTz(date: Date | string, timezone: string, fmt = "MMM d, yyyy HH:mm"): string {
  return formatInTimeZone(new Date(date), timezone, fmt);
}

export function toZonedDate(date: Date | string, timezone: string): Date {
  return toZonedTime(new Date(date), timezone);
}

export function nowForDateTimeInput(timezone = getBrowserTimezone()): string {
  const zoned = toZonedTime(new Date(), timezone);
  return format(zoned, "yyyy-MM-dd'T'HH:mm");
}

export function rangeToDates(range: EquityRange, now = new Date()): { start: Date; end: Date } {
  const end = endOfDay(now);
  switch (range) {
    case "1D":
      return { start: startOfDay(now), end };
    case "1W":
      return { start: startOfWeek(now), end };
    case "1M":
      return { start: startOfDay(subDays(now, 30)), end };
    case "3M":
      return { start: startOfDay(subMonths(now, 3)), end };
    case "6M":
      return { start: startOfDay(subMonths(now, 6)), end };
    case "1Y":
      return { start: startOfDay(subYears(now, 1)), end };
    case "ALL":
      return { start: new Date(2000, 0, 1), end };
  }
}

export function currentWeekRange(now = new Date()) {
  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
}

export function currentMonthRange(now = new Date()) {
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function previousWeekRange(now = new Date()) {
  const prev = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
  return currentWeekRange(prev);
}

export function previousMonthRange(now = new Date()) {
  const prev = subMonths(startOfMonth(now), 1);
  return currentMonthRange(prev);
}

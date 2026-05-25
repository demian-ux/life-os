export type DateKey = string;
export type TimeKey = string;

export type DayKey =
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT"
  | "SUN";

const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function partsToDateKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getZonedParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export function todayKey(timezone: string): DateKey {
  const { year, month, day } = getZonedParts(new Date(), timezone);
  return partsToDateKey(year, month, day);
}

function parseDateKey(dateKey: DateKey): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function dateKeyToUtcDate(dateKey: DateKey): Date {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToDateKey(date: Date): DateKey {
  return partsToDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const d = dateKeyToUtcDate(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateToDateKey(d);
}

export function getWeekStart(dateKey: DateKey): DateKey {
  const d = dateKeyToUtcDate(dateKey);
  const dow = d.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(dateKey, offset);
}

export function getWeekEnd(dateKey: DateKey): DateKey {
  return addDays(getWeekStart(dateKey), 6);
}

export function getDayKey(dateKey: DateKey): DayKey {
  const d = dateKeyToUtcDate(dateKey);
  const dow = d.getUTCDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return DAY_KEYS[idx];
}

export function formatDateLabel(dateKey: DateKey): string {
  const d = dateKeyToUtcDate(dateKey);
  return `${DAY_LABELS[d.getUTCDay()]}, ${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const DAY_OF_WEEK_TO_KEY: Record<number, DayKey> = {
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
  7: "SUN",
};

// lib/fiscalYear.ts
//
// Shared fiscal year utilities for generating human-readable labels
// describing the fiscal year period based on portal settings.

import type { PortalSettings } from "@/lib/queries";

export const MONTH_NAMES = [
  "",
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

const LAST_DAY_OF_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Generate a human-readable label describing the fiscal year period.
 *
 * @param settings - Portal settings containing fiscal year configuration
 * @returns A string like "Fiscal year runs July 1 – June 30." or null if no settings
 */
export function getFiscalYearLabel(
  settings: PortalSettings | null
): string | null {
  if (!settings) return null;

  // Check for explicit custom label first
  const explicitLabel = settings.fiscal_year_label ?? null;

  if (explicitLabel && explicitLabel.trim().length > 0) {
    return explicitLabel.trim();
  }

  // Parse and validate start month/day with safe defaults
  const rawStartMonth = settings.fiscal_year_start_month;
  const rawStartDay = settings.fiscal_year_start_day;

  const parsedMonth = Number(rawStartMonth);
  const parsedDay = Number(rawStartDay);

  const startMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : 1;
  const startDay =
    Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 31
      ? parsedDay
      : 1;

  // Calendar year alignment
  if (startMonth === 1 && startDay === 1) {
    return "Fiscal year aligns with the calendar year (January 1 – December 31).";
  }

  const startMonthName = MONTH_NAMES[startMonth] || "January";

  // End month is the month before the start month in the following year.
  // For example, start July 1 -> end June 30.
  const endMonthIndex = ((startMonth + 10) % 12) + 1;
  const endMonthName = MONTH_NAMES[endMonthIndex] || "December";

  // Use the last day of the end month (non-leap year is fine for this message).
  const endDay = LAST_DAY_OF_MONTH[endMonthIndex] ?? 30;

  return `Fiscal year runs ${startMonthName} ${startDay} – ${endMonthName} ${endDay}.`;
}

"use client";

import { useMemo, useId } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type Props = {
  options: number[];
  label?: string;
};

/**
 * Behavior:
 * - Highest year is ALWAYS the default.
 * - No "Latest" pseudo-option.
 * - If few years (≤ 4): show pills.
 * - If many years: dropdown.
 */
export default function FiscalYearSelect({
  options,
  label = "Fiscal year",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectId = useId();

  const sortedYears = useMemo(
    () => [...options].sort((a, b) => b - a), // Descending: newest first
    [options]
  );

  const highestYear =
    sortedYears.length > 0 ? String(sortedYears[0]) : null;

  const currentParam = searchParams.get("year");
  const currentValue =
    currentParam && sortedYears.includes(Number(currentParam))
      ? currentParam
      : highestYear;

  const setYear = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // Reset pagination

    params.set("year", value);

    router.push(`${pathname}?${params.toString()}`);
  };

  const showPills = sortedYears.length > 0 && sortedYears.length <= 6;

  if (showPills) {
    return (
      <div className="inline-flex flex-col items-end gap-1 text-right">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </span>
        <div
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-0.5"
          role="group"
          aria-label={label}
        >
          {sortedYears.map((year) => {
            const value = String(year);
            const active = currentValue === value;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setYear(value)}
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:bg-white/60"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Dropdown fallback for many years
  return (
    <div className="inline-block w-full max-w-xs">
      <label
        htmlFor={selectId}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={currentValue ?? ""}
        onChange={(e) => setYear(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
      >
        {sortedYears.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type Props = {
  options: number[];
  label?: string;
};

export default function FiscalYearSelect({
  options,
  label = "Fiscal year",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentYearParam = searchParams.get("year");
  const currentValue = currentYearParam ?? "latest";

  const sortedYears = useMemo(
    () => [...options].sort((a, b) => b - a),
    [options]
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    const params = new URLSearchParams(
      searchParams.toString()
    );

    // Reset pagination whenever year changes
    params.delete("page");

    if (value === "latest") {
      // Use "latest" as the default = no explicit year param
      params.delete("year");
    } else {
      params.set("year", value);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="inline-block w-full max-w-xs">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={currentValue}
        onChange={handleChange}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        <option value="latest">Latest</option>
        {sortedYears.map((year) => (
          <option key={year} value={year.toString()}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

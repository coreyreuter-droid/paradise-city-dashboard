"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  options: number[];
  label?: string;
};

export default function FiscalYearSelect({ options, label = "Fiscal year" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentYear = searchParams.get("year") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("year", value);
    } else {
      params.delete("year");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  if (!options.length) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        value={currentYear}
        onChange={handleChange}
      >
        {/* Optional “All” / default option – you can keep or remove */}
        {!currentYear && <option value="">Latest</option>}
        {options.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

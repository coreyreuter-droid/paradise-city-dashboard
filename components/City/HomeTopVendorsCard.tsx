// components/City/ParadiseHomeTopVendorsCard.tsx
"use client";

import type { TransactionRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  year?: number;
  transactions: TransactionRow[];
};

type VendorAgg = {
  name: string;
  total: number;
  count: number;
  avg: number;
};

export default function TopVendorsCard({ year, transactions }: Props) {
  const map = new Map<string, { total: number; count: number }>();

  for (const tx of transactions) {
    const name =
      tx.vendor && tx.vendor.trim().length > 0
        ? tx.vendor.trim()
        : "Unspecified";
    const amt = Number(tx.amount || 0);
    const entry = map.get(name) ?? { total: 0, count: 0 };
    entry.total += amt;
    entry.count += 1;
    map.set(name, entry);
  }

  const vendors: VendorAgg[] = Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      total: v.total,
      count: v.count,
      avg: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <section aria-label="Top vendors by spending" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Top Vendors{year ? ` – ${year}` : ""}
        </h3>
      </div>
      {vendors.length === 0 ? (
        <p className="text-xs text-slate-500">
          No vendor spending available for this year.
        </p>
      ) : (
        <ul className="space-y-2 text-xs sm:text-sm">
          {vendors.map((v) => (
            <li key={v.name} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate pr-2">{v.name}</span>
                <span className="whitespace-nowrap font-mono">
                  {formatCurrency(v.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {v.count.toLocaleString("en-US")} transaction
                  {v.count === 1 ? "" : "s"}
                </span>
                <span className="font-mono">
                  Avg {formatCurrency(v.avg)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

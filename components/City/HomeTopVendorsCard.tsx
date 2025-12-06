// components/City/HomeTopVendorsCard.tsx
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
  share: number;
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

  const allVendors = Array.from(map.entries()).map(([name, v]) => ({
    name,
    total: v.total,
    count: v.count,
    avg: v.count > 0 ? v.total / v.count : 0,
  }));

  const grandTotal = allVendors.reduce((sum, v) => sum + v.total, 0);

  const vendors: VendorAgg[] = allVendors
    .map((v) => ({
      ...v,
      share: grandTotal > 0 ? v.total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <section aria-label="Top vendors by spending" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Top vendors{year ? ` – ${year}` : ""}
        </h3>
        {grandTotal > 0 && (
          <p className="text-[11px] text-slate-500">
            Showing top {vendors.length} by total spending.
          </p>
        )}
      </div>

      {vendors.length === 0 ? (
        <p className="text-xs text-slate-500">
          No vendor spending available for this year.
        </p>
      ) : (
        <ol className="space-y-2 text-xs sm:text-sm">
          {vendors.map((v, index) => {
            const pct = v.share * 100;
            const pctLabel =
              grandTotal > 0 ? `${pct.toFixed(pct >= 10 ? 0 : 1)}%` : "—";

            return (
              <li
                key={v.name}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                        {v.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {v.count.toLocaleString("en-US")} transaction
                        {v.count === 1 ? "" : "s"} · Avg{" "}
                        {formatCurrency(v.avg)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono text-slate-900">
                      {formatCurrency(v.total)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {pctLabel} of total
                    </div>
                  </div>
                </div>

                {grandTotal > 0 && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

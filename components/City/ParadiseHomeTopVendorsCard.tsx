// components/City/ParadiseHomeTopVendorsCard.tsx
"use client";

import type { TransactionRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  year?: number;
  transactions: TransactionRow[];
};

export default function TopVendorsCard({
  year,
  transactions,
}: Props) {
  const vendorMap = new Map<
    string,
    { total: number; count: number }
  >();

  transactions.forEach((tx) => {
    const vendor = tx.vendor || "Unspecified";
    const amt = Number(tx.amount || 0);
    const existing = vendorMap.get(vendor) ?? {
      total: 0,
      count: 0,
    };
    existing.total += amt;
    existing.count += 1;
    vendorMap.set(vendor, existing);
  });

  const vendors = Array.from(vendorMap.entries())
    .map(([name, v]) => ({
      name,
      total: v.total,
      count: v.count,
      avg: v.count > 0 ? v.total / v.count : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Top Vendors{year ? ` – ${year}` : ""}
        </h2>
      </div>
      {vendors.length === 0 ? (
        <p className="text-xs text-slate-500">
          No transactions available for this year.
        </p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-2 py-1 text-left text-slate-500">
                Vendor
              </th>
              <th className="px-2 py-1 text-right text-slate-500">
                Total
              </th>
              <th className="px-2 py-1 text-right text-slate-500">
                Txns
              </th>
              <th className="px-2 py-1 text-right text-slate-500">
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.name} className="border-b border-slate-100">
                <td className="px-2 py-1 align-top text-slate-800">
                  {v.name}
                </td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatCurrency(v.total)}
                </td>
                <td className="px-2 py-1 text-right font-mono">
                  {v.count}
                </td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatCurrency(v.avg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

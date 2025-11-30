// components/City/ParadiseHomeRecentTransactionsCard.tsx
"use client";

import type { TransactionRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  year?: number;
  transactions: TransactionRow[];
};

export default function RecentTransactionsCard({
  year,
  transactions,
}: Props) {
  const sorted = [...transactions]
    .filter((tx) => tx.date)
    .sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    )
    .slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Recent Transactions{year ? ` – ${year}` : ""}
        </h2>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-500">
          No transactions available for this year.
        </p>
      ) : (
        <ul className="space-y-1">
          {sorted.map((tx, idx) => (
            <li
              key={`${tx.date}-${tx.vendor}-${idx}`}
              className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1 last:border-b-0"
            >
              <div className="flex-1">
                <div className="text-[11px] text-slate-500">
                  {tx.date} –{" "}
                  {tx.department_name || "Unspecified"}
                </div>
                <div className="text-xs font-medium text-slate-800">
                  {tx.vendor || "Unspecified vendor"}
                </div>
                {tx.description && (
                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    {tx.description}
                  </div>
                )}
              </div>
              <div className="ml-2 text-right font-mono text-xs text-slate-900">
                {formatCurrency(Number(tx.amount || 0))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

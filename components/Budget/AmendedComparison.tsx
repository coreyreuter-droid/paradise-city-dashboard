"use client";

import React from "react";
import { formatCurrency } from "@/lib/format";
import DepartmentIcon from "@/components/ui/DepartmentIcon";
import type { AdoptedVsAmendedRow } from "@/lib/queries";

type Props = {
  rows: AdoptedVsAmendedRow[];
  fiscalYear: number;
  accentColor?: string;
};

export default function AmendedComparison({ rows, fiscalYear, accentColor }: Props) {
  if (!rows || rows.length === 0) return null;

  const totalAdopted = rows.reduce((s, r) => s + Number(r.adopted_amount || 0), 0);
  const totalAmended = rows.reduce((s, r) => s + Number(r.amended_amount || 0), 0);
  const totalChange = totalAmended - totalAdopted;
  const totalChangePct = totalAdopted > 0 ? (totalChange / totalAdopted) * 100 : 0;

  return (
    <section aria-label="Budget amendments" className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Budget amendments — FY {fiscalYear}
          </h2>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Amended
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          The adopted budget was amended. Below shows original adopted amounts, current amended amounts, and the change.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Original adopted</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(totalAdopted)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current amended</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(totalAmended)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Net change</p>
          <p className={`mt-0.5 text-sm font-semibold ${totalChange > 0 ? "text-amber-700" : totalChange < 0 ? "text-emerald-700" : "text-slate-900"}`}>
            {totalChange > 0 ? "+" : ""}{formatCurrency(totalChange)}
            <span className="ml-1 text-[11px] font-normal text-slate-500">
              ({totalChange > 0 ? "+" : ""}{totalChangePct.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>

      {/* Department comparison table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Department</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Adopted</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Amended</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const change = Number(row.change_amount || 0);
              const adopted = Number(row.adopted_amount || 0);
              const changePct = adopted > 0 ? (change / adopted) * 100 : 0;

              return (
                <tr key={row.department_name} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <DepartmentIcon name={row.department_name} size="sm" accentColor={accentColor} />
                      <span className="font-medium text-slate-800">{row.department_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">
                    {formatCurrency(adopted)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-900">
                    {formatCurrency(Number(row.amended_amount || 0))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {change !== 0 ? (
                      <span className={`font-mono font-semibold ${change > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {change > 0 ? "+" : ""}{formatCurrency(change)}
                        <span className="ml-1 text-[11px] font-normal text-slate-500">
                          {change > 0 ? "+" : ""}{changePct.toFixed(1)}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <td className="px-3 py-2 text-slate-900">Total</td>
              <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(totalAdopted)}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-900">{formatCurrency(totalAmended)}</td>
              <td className="px-3 py-2 text-right">
                <span className={`font-mono ${totalChange > 0 ? "text-amber-700" : totalChange < 0 ? "text-emerald-700" : "text-slate-900"}`}>
                  {totalChange > 0 ? "+" : ""}{formatCurrency(totalChange)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

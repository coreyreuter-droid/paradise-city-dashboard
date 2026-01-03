// components/Admin/DeleteYearButton.tsx
"use client";

import { FormEvent } from "react";

type Props = {
  table: "budgets" | "actuals" | "transactions" | "revenues";
  fiscalYear: number;
  action: (formData: FormData) => void;
};

const TABLE_LABEL: Record<Props["table"], string> = {
  budgets: "budget",
  actuals: "actuals",
  transactions: "transactions",
  revenues: "revenues",
};

export default function DeleteYearButton({
  table,
  fiscalYear,
  action,
}: Props) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const label = TABLE_LABEL[table] ?? table;

    const ok = window.confirm(
      `Are you sure you want to permanently delete all ${label} records for fiscal year ${fiscalYear}? This cannot be undone.`
    );

    if (!ok) {
      e.preventDefault();
    }
  };

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="fiscalYear" value={fiscalYear} />
      <button
        type="submit"
        aria-label={`Delete fiscal year ${fiscalYear} data from ${table} table`}
        className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Delete FY {fiscalYear}
      </button>
    </form>
  );
}

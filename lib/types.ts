// lib/types.ts

// Raw budget row from `budgets` table
export type BudgetRow = {
  fiscal_year: number;
  department_name: string | null;
  amount: number;
};

// Raw actual row from `actuals` table
export type ActualRow = BudgetRow;

// Raw transaction row from `transactions` table
export type TransactionRow = {
  date: string;
  fiscal_year: number;
  fund_name: string | null;
  department_name: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
};

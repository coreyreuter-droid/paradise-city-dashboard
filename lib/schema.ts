// lib/schema.ts

export type ActualRow = {
  fiscal_year: number;              // e.g. 2024
  period: string;                   // e.g. "2024-01" or "2024-1"
  fund_code: string | null;
  fund_name: string | null;
  department_code: string | null;
  department_name: string | null;
  category: string | null;
  account_code: string | null;
  account_name: string | null;
  amount: number;                   // positive budget/actual dollars
};

export type BudgetRow = {
  fiscal_year: number;
  fund_code: string | null;
  fund_name: string | null;
  department_code: string | null;
  department_name: string | null;
  category: string | null;
  account_code: string | null;
  account_name: string | null;
  amount: number;
};

export type TransactionRow = {
  date: string;                     // ISO date string "YYYY-MM-DD"
  fiscal_year: number;
  fund_code: string | null;
  fund_name: string | null;
  department_code: string | null;
  department_name: string | null;
  account_code: string | null;
  account_name: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
};

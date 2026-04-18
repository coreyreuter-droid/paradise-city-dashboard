// lib/types.ts
// Compatibility shim. All real table schemas live in ./schema.

export type {
  BudgetRow,
  ActualRow,
  TransactionRow,
  RevenueRow,
} from "./schema";

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

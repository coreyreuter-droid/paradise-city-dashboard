// lib/narrativeHelpers.ts

import { formatCurrency } from "./format";

type BaseNarrativeData = {
  cityName: string;
  year: number | null;
};

type HomeNarrativeData = BaseNarrativeData & {
  totalBudget: number;
  totalActuals: number;
  execPct: number; // 0-1 decimal
  deptCount: number;
  topDepartment: string | null;
  topDepartmentSpending?: number;
  revenueTotal: number | null;
  topRevenueSource?: string | null;
  txCount: number;
  vendorCount?: number;
  yearTotals?: Array<{ year: number; Actuals?: number; Budget?: number }>;
  enableActuals: boolean;
  enableTransactions: boolean;
  enableVendors: boolean;
  enableRevenues: boolean;
};

type BudgetNarrativeData = BaseNarrativeData & {
  totalBudget: number;
  totalActuals: number;
  execPct: number;
  deptCount: number;
  topDepartment: string | null;
  topDepartmentBudget: number;
  topDepartmentPct: number;
  overBudgetDepts: Array<{ name: string; pct: number }>;
  enableActuals: boolean;
};

type RevenuesNarrativeData = BaseNarrativeData & {
  totalRevenue: number;
  sourceCount: number;
  topSources: Array<{ name: string; value: number }>;
  yearTotals?: Array<{ year: number; total: number }>;
};

type DepartmentsNarrativeData = BaseNarrativeData & {
  deptCount: number;
  totalBudget: number;
  totalActuals: number;
  topBudgetDept: string | null;
  topBudgetAmount: number;
  topExecDept: string | null;
  topExecPct: number;
  overBudgetCount: number;
  enableActuals: boolean;
  enableTransactions: boolean;
  totalTxCount?: number;
};

type DepartmentDetailNarrativeData = BaseNarrativeData & {
  departmentName: string;
  budget: number;
  actuals: number;
  execPct: number;
  txCount: number;
  vendorCount: number;
  topVendor: string | null;
  topVendorAmount: number;
  prevYearActuals?: number | null;
  enableActuals: boolean;
  enableTransactions: boolean;
  enableVendors: boolean;
};

// Format percentage nicely
function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Format percentage already in 0-100 form
function formatPctRaw(value: number): string {
  return `${Math.round(value)}%`;
}

// Calculate YoY change
function calcYoYChange(
  current: number,
  previous: number
): { direction: string; pct: number } | null {
  if (previous <= 0 || current <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return null; // Less than 0.5% is "flat"
  return {
    direction: change > 0 ? "up" : "down",
    pct: Math.abs(Math.round(change)),
  };
}

// Compact currency for narrative flow
function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

/**
 * HOME PAGE NARRATIVE
 */
export function buildHomeNarrative(data: HomeNarrativeData): string {
  const sentences: string[] = [];
  const yearLabel = data.year ? `FY${data.year}` : "This fiscal year";

  // Opening: Budget basics (always present)
  if (data.totalBudget > 0) {
    sentences.push(
      `In ${yearLabel}, ${data.cityName} adopted a budget of ${formatCompact(data.totalBudget)} across ${data.deptCount} departments.`
    );
  }

  // Spending (if actuals enabled and data exists)
  if (data.enableActuals && data.totalActuals > 0) {
    sentences.push(
      `Spending to date totals ${formatCompact(data.totalActuals)}, representing ${formatPct(data.execPct)} budget execution.`
    );
  }

  // Top department
  if (data.topDepartment) {
    if (data.enableActuals && data.topDepartmentSpending && data.topDepartmentSpending > 0) {
      sentences.push(
        `${data.topDepartment} leads spending at ${formatCompact(data.topDepartmentSpending)}.`
      );
    } else {
      sentences.push(`${data.topDepartment} holds the largest budget allocation.`);
    }
  }

  // Revenue
  if (data.enableRevenues && data.revenueTotal && data.revenueTotal > 0) {
    if (data.topRevenueSource) {
      sentences.push(
        `Total revenue reached ${formatCompact(data.revenueTotal)}, with ${data.topRevenueSource} as the primary source.`
      );
    } else {
      sentences.push(`Total revenue reached ${formatCompact(data.revenueTotal)}.`);
    }
  }

  // Transactions
  if (data.enableTransactions && data.txCount > 0) {
    const vendorPart =
      data.enableVendors && data.vendorCount && data.vendorCount > 0
        ? ` across ${data.vendorCount.toLocaleString()} vendors`
        : "";
    sentences.push(
      `A total of ${data.txCount.toLocaleString()} transactions were processed${vendorPart}.`
    );
  }

  // YoY comparison (needs 2+ years)
  if (data.enableActuals && data.yearTotals && data.yearTotals.length >= 2) {
    const sorted = [...data.yearTotals].sort((a, b) => b.year - a.year);
    const current = sorted[0]?.Actuals ?? 0;
    const previous = sorted[1]?.Actuals ?? 0;
    const yoy = calcYoYChange(current, previous);
    if (yoy) {
      sentences.push(`Overall spending is ${yoy.direction} ${yoy.pct}% compared to last year.`);
    }
  }

  return sentences.join(" ");
}

/**
 * BUDGET PAGE NARRATIVE
 */
export function buildBudgetNarrative(data: BudgetNarrativeData): string {
  const sentences: string[] = [];
  const yearLabel = data.year ? `FY${data.year}` : "This fiscal year";

  // Opening
  sentences.push(
    `The ${yearLabel} adopted budget totals ${formatCompact(data.totalBudget)} across ${data.deptCount} departments.`
  );

  // Top department
  if (data.topDepartment && data.topDepartmentBudget > 0) {
    sentences.push(
      `${data.topDepartment} has the largest allocation at ${formatCompact(data.topDepartmentBudget)} (${formatPctRaw(data.topDepartmentPct)} of total).`
    );
  }

  // Execution rate (if actuals enabled)
  if (data.enableActuals && data.totalActuals > 0) {
    sentences.push(`Budget execution stands at ${formatPct(data.execPct)}.`);

    // Over-budget departments
    if (data.overBudgetDepts.length > 0) {
      if (data.overBudgetDepts.length === 1) {
        const dept = data.overBudgetDepts[0];
        sentences.push(
          `${dept.name} has exceeded its budget at ${formatPctRaw(dept.pct)} execution.`
        );
      } else {
        const topOver = data.overBudgetDepts[0];
        sentences.push(
          `${data.overBudgetDepts.length} departments have exceeded their budgets, with ${topOver.name} at ${formatPctRaw(topOver.pct)}.`
        );
      }
    }
  }

  return sentences.join(" ");
}

/**
 * REVENUES PAGE NARRATIVE
 */
export function buildRevenuesNarrative(data: RevenuesNarrativeData): string {
  const sentences: string[] = [];
  const yearLabel = data.year ? `FY${data.year}` : "This fiscal year";

  // Opening
  sentences.push(
    `${yearLabel} revenues total ${formatCompact(data.totalRevenue)} from ${data.sourceCount} sources.`
  );

  // Top sources
  if (data.topSources.length >= 3) {
    const topThreeTotal = data.topSources.slice(0, 3).reduce((s, t) => s + t.value, 0);
    const topThreePct = data.totalRevenue > 0 ? (topThreeTotal / data.totalRevenue) * 100 : 0;
    const names = data.topSources.slice(0, 3).map((s) => s.name);
    sentences.push(
      `The top 3 sources — ${names.join(", ")} — account for ${formatPctRaw(topThreePct)} of all revenue.`
    );
  } else if (data.topSources.length === 1) {
    sentences.push(`Revenue comes primarily from ${data.topSources[0].name}.`);
  }

  // YoY comparison
  if (data.yearTotals && data.yearTotals.length >= 2) {
    const sorted = [...data.yearTotals].sort((a, b) => b.year - a.year);
    const current = sorted[0]?.total ?? 0;
    const previous = sorted[1]?.total ?? 0;
    const yoy = calcYoYChange(current, previous);
    if (yoy) {
      sentences.push(`Total revenue is ${yoy.direction} ${yoy.pct}% from ${sorted[1].year}.`);
    }
  }

  return sentences.join(" ");
}

/**
 * DEPARTMENTS LIST PAGE NARRATIVE
 */
export function buildDepartmentsNarrative(data: DepartmentsNarrativeData): string {
  const sentences: string[] = [];
  const yearLabel = data.year ? `FY${data.year}` : "This fiscal year";

  // Opening
  sentences.push(`${data.deptCount} departments are tracked for ${yearLabel}.`);

  // Top budget department
  if (data.topBudgetDept && data.topBudgetAmount > 0) {
    sentences.push(
      `${data.topBudgetDept} has the highest budget at ${formatCompact(data.topBudgetAmount)}.`
    );
  }

  // Top execution department (if actuals enabled)
  if (data.enableActuals && data.topExecDept && data.topExecPct > 0) {
    if (data.topExecDept !== data.topBudgetDept) {
      sentences.push(
        `${data.topExecDept} shows the highest execution rate at ${formatPctRaw(data.topExecPct)}.`
      );
    }
  }

  // Over-budget count
  if (data.enableActuals && data.overBudgetCount > 0) {
    sentences.push(
      `${data.overBudgetCount} ${data.overBudgetCount === 1 ? "department is" : "departments are"} currently over budget.`
    );
  }

  // Transaction count
  if (data.enableTransactions && data.totalTxCount && data.totalTxCount > 0) {
    sentences.push(
      `A total of ${data.totalTxCount.toLocaleString()} transactions have been recorded.`
    );
  }

  return sentences.join(" ");
}

/**
 * DEPARTMENT DETAIL PAGE NARRATIVE
 */
export function buildDepartmentDetailNarrative(data: DepartmentDetailNarrativeData): string {
  const sentences: string[] = [];
  const yearLabel = data.year ? `FY${data.year}` : "This fiscal year";

  // Opening: Budget
  sentences.push(
    `${data.departmentName} has a ${yearLabel} budget of ${formatCompact(data.budget)}.`
  );

  // Spending (if actuals enabled)
  if (data.enableActuals && data.actuals > 0) {
    const status = data.execPct > 1 ? "exceeding its budget" : "within budget";
    sentences.push(
      `Spending to date is ${formatCompact(data.actuals)} (${formatPct(data.execPct)} execution), ${status}.`
    );

    // YoY for this department
    if (data.prevYearActuals && data.prevYearActuals > 0) {
      const yoy = calcYoYChange(data.actuals, data.prevYearActuals);
      if (yoy) {
        sentences.push(`Spending is ${yoy.direction} ${yoy.pct}% compared to last year.`);
      }
    }
  }

  // Transactions
  if (data.enableTransactions && data.txCount > 0) {
    const vendorPart =
      data.enableVendors && data.vendorCount > 0
        ? ` across ${data.vendorCount} vendors`
        : "";
    sentences.push(
      `The department has processed ${data.txCount.toLocaleString()} transactions${vendorPart}.`
    );

    // Top vendor
    if (data.enableVendors && data.topVendor && data.topVendorAmount > 0) {
      sentences.push(
        `${data.topVendor} is the top vendor at ${formatCompact(data.topVendorAmount)}.`
      );
    }
  }

  return sentences.join(" ");
}

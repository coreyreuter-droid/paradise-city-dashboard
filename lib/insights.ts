// lib/insights.ts
import { formatCurrency, formatPercent } from "@/lib/format";

export type InsightType = "warning" | "info";

export type Insight = {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  departmentName: string;
  priority: number; // Lower = more important (shown first)
};

export type DepartmentSummary = {
  department_name: string;
  budget: number;
  actuals: number;
  percentSpent: number;
};

export type InsightInputData = {
  departments: DepartmentSummary[];
};

/**
 * Calculate department-focused insights from budget and spending data.
 * Returns 3-5 insights if enough departments meet thresholds.
 * Returns empty array if fewer than 3 departments are flagged (section will hide).
 */
export function calculateInsights(data: InsightInputData): Insight[] {
  const insights: Insight[] = [];
  const { departments } = data;

  // Only consider departments with meaningful budgets
  const validDepts = departments.filter((d) => d.budget > 1000);

  for (const dept of validDepts) {
    const pct = dept.budget > 0 ? (dept.actuals / dept.budget) * 100 : 0;

    // CRITICAL (priority 1): Significantly over budget (>150%)
    if (pct > 150) {
      const overAmount = dept.actuals - dept.budget;
      insights.push({
        id: `dept-critical-${dept.department_name}`,
        type: "warning",
        title: `${dept.department_name} is significantly over budget`,
        description: `Spent ${formatCurrency(overAmount)} more than budgeted (${formatPercent(pct, 0)} of budget used)`,
        departmentName: dept.department_name,
        priority: 1,
      });
    }
    // WARNING (priority 2): Over budget (>105% but <=150%)
    else if (pct > 105) {
      const overAmount = dept.actuals - dept.budget;
      insights.push({
        id: `dept-over-${dept.department_name}`,
        type: "warning",
        title: `${dept.department_name} is over budget`,
        description: `Spent ${formatCurrency(overAmount)} more than budgeted (${formatPercent(pct, 0)} of budget used)`,
        departmentName: dept.department_name,
        priority: 2,
      });
    }
    // INFO (priority 3): Under-utilizing budget (<50%)
    else if (pct < 50 && dept.budget > 10000) {
      // Only flag significant budgets as under-utilized
      const remaining = dept.budget - dept.actuals;
      insights.push({
        id: `dept-under-${dept.department_name}`,
        type: "info",
        title: `${dept.department_name} is under-utilizing budget`,
        description: `Only ${formatPercent(pct, 0)} spent, with ${formatCurrency(remaining)} remaining`,
        departmentName: dept.department_name,
        priority: 3,
      });
    }
  }

  // Sort by priority first, then by how extreme the over/under percentage is
  insights.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary sort: warnings by most over, info by least spent
    const deptA = validDepts.find((d) => d.department_name === a.departmentName);
    const deptB = validDepts.find((d) => d.department_name === b.departmentName);
    if (!deptA || !deptB) return 0;

    const pctA = deptA.budget > 0 ? (deptA.actuals / deptA.budget) * 100 : 0;
    const pctB = deptB.budget > 0 ? (deptB.actuals / deptB.budget) * 100 : 0;

    // For warnings (over budget): higher percentage first
    if (a.priority <= 2) {
      return pctB - pctA;
    }
    // For info (under budget): lower percentage first
    return pctA - pctB;
  });

  // Require minimum 3 insights, otherwise hide the section
  if (insights.length < 3) {
    return [];
  }

  // Return max 5 insights
  return insights.slice(0, 5);
}

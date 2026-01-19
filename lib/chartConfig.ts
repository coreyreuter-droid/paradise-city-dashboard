// lib/chartConfig.ts
// Centralized chart colors and configuration
// Import these instead of defining colors in components

// =============================================================================
// CORE COLORS
// =============================================================================

export const BUDGET_COLOR = "#334155"; // slate-700
export const ACTUAL_COLOR = "#0f766e"; // teal-700
export const REVENUE_LINE_COLOR = "#0f172a"; // slate-900
export const OTHER_COLOR = "#94a3b8"; // slate-400 (for "Other" categories)

// =============================================================================
// PIE / DONUT CHART COLORS
// =============================================================================

export const PIE_COLORS = [
  "#0f172a", // slate-900
  "#334155", // slate-700
  "#64748b", // slate-500
  "#0f766e", // teal-700
  "#15803d", // green-700
  "#b45309", // amber-700
  "#b91c1c", // red-700
  "#94a3b8", // slate-400 (fallback)
];

// =============================================================================
// TREEMAP COLORS
// =============================================================================

export const TREEMAP_COLORS = [
  "#0f172a", // slate-900
  "#1e293b", // slate-800
  "#334155", // slate-700
  "#475569", // slate-600
  "#64748b", // slate-500
  "#0f766e", // teal-700
  "#15803d", // green-700
  "#b45309", // amber-700
];

// =============================================================================
// SANKEY CHART COLORS
// =============================================================================

export const SANKEY_COLORS = {
  revenue: [
    "#0d9488", // teal-600
    "#0891b2", // cyan-600
    "#0284c7", // sky-600
    "#2563eb", // blue-600
    "#4f46e5", // indigo-600
    "#7c3aed", // violet-600
    "#9333ea", // purple-600
    "#c026d3", // fuchsia-600
    "#64748b", // slate-500
  ],
  center: "#0f172a", // slate-900
  departments: [
    "#16a34a", // green-600
    "#65a30d", // lime-600
    "#ca8a04", // yellow-600
    "#ea580c", // orange-600
    "#dc2626", // red-600
    "#db2777", // pink-600
    "#9333ea", // purple-600
    "#2563eb", // blue-600
    "#64748b", // slate-500
  ],
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a color from an array by index, cycling if needed
 */
export function getColorByIndex(colors: readonly string[], index: number): string {
  return colors[index % colors.length];
}

/**
 * Get pie/donut color, using OTHER_COLOR for "Other" category
 */
export function getPieColor(index: number, isOther: boolean): string {
  return isOther ? OTHER_COLOR : getColorByIndex(PIE_COLORS, index);
}

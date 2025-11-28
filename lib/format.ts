// lib/format.ts

export const formatCurrency = (
  value: number | null | undefined
): string => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "$0";

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

export const formatPercent = (
  value: number | null | undefined,
  fractionDigits = 1
): string => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return `0.${"0".repeat(fractionDigits)}%`;
  }

  const str = num.toFixed(fractionDigits);
  // avoid "-0.0%"
  return `${str.replace(/-0\.0+/, "0.0")}%`;
};

// lib/format.ts

export function formatDate(value: string | Date): string {
  if (!value) return "";

  const d =
    typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(d.getTime())) return "";

  // Important: force locale + timezone so SSR and client match
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}


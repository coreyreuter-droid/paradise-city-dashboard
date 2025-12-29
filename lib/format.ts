// lib/format.ts

/**
 * Sanitize user input for use in Postgres ILIKE queries.
 * Escapes special pattern characters to prevent SQL injection.
 * Also limits length to prevent DoS.
 */
export function sanitizeSearchInput(input: string, maxLength = 100): string {
  if (!input || typeof input !== "string") return "";
  
  // Escape Postgres LIKE pattern special characters: % _ \
  // The backslash must be escaped first to avoid double-escaping
  const escaped = input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  
  // Trim and limit length
  return escaped.trim().slice(0, maxLength);
}

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

export const formatNumber = (
  value: number | string | null | undefined,
  opts?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string => {
  if (value === null || value === undefined) return "";

  const cleaned =
    typeof value === "string" ? value.replace(/,/g, "").trim() : String(value);

  if (!cleaned) return "";

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return cleaned;

  const { maximumFractionDigits = 0, minimumFractionDigits = 0 } = opts ?? {};

  return num.toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits,
  });
};

export const formatCurrencyCompact = (
  value: number | string | null | undefined,
  decimals = 1
): string => {
  if (value === null || value === undefined) return "$0";

  const cleaned =
    typeof value === "string" ? value.replace(/,/g, "").trim() : String(value);

  if (!cleaned) return "$0";

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return "$0";

  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);

  const formatScaled = (scaled: number, suffix: string) => {
    const fixed = scaled.toFixed(decimals);
    const trimmed = fixed
      .replace(/\.0$/, "")
      .replace(/(\.\d)0$/, "$1");
    return `${sign}$${trimmed}${suffix}`;
  };

  if (abs >= 1_000_000_000) return formatScaled(abs / 1_000_000_000, "B");
  if (abs >= 1_000_000) return formatScaled(abs / 1_000_000, "M");
  if (abs >= 1_000) return formatScaled(abs / 1_000, "K");

  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};


// lib/uploadValidation.ts
// CSV upload validation and parsing utilities for Admin upload

// =============================================================================
// TABLE SCHEMAS
// =============================================================================

export const TABLE_SCHEMAS: Record<
  string,
  { required: string[]; numeric: string[] }
> = {
  budgets: {
    required: [
      "fiscal_year",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  actuals: {
    required: [
      "fiscal_year",
      "period",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  transactions: {
    required: [
      "date",
      "fiscal_year",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "account_code",
      "account_name",
      "vendor",
      "description",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
  revenues: {
    required: [
      "fiscal_year",
      "period",
      "fund_code",
      "fund_name",
      "department_code",
      "department_name",
      "category",
      "account_code",
      "account_name",
      "amount",
    ],
    numeric: ["fiscal_year", "amount"],
  },
};

// =============================================================================
// TYPES
// =============================================================================

export type ValidationIssue = {
  row: number | null;
  field: string | null;
  message: string;
};

export type ValidationResult = {
  records: Record<string, unknown>[];
  yearsInData: number[];
  issues: ValidationIssue[];
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const BAD_DEPT_VALUES = new Set(["", "na", "n/a", "null", "none"]);

export function isReasonableYear(n: unknown): boolean {
  if (typeof n !== "number" || !Number.isInteger(n)) return false;
  return n >= 2000 && n <= 2100;
}

/**
 * Strict ISO date: YYYY-MM-DD, no auto-correction
 */
export function isValidISODate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dt = new Date(trimmed + "T00:00:00Z");
  if (Number.isNaN(dt.getTime())) return false;

  // Ensure it didn't auto-correct (e.g. 2024-02-31 -> 2024-03-02)
  const iso = dt.toISOString().slice(0, 10);
  return iso === trimmed;
}

/**
 * Accepts either MM/DD/YYYY or YYYY-MM-DD and returns a normalized
 * YYYY-MM-DD string, or null if invalid.
 */
export function parseAndNormalizeTransactionDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidISODate(trimmed) ? trimmed : null;
  }

  // MM/DD/YYYY (1 or 2 digit month/day)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [mStr, dStr, yStr] = trimmed.split("/");
    const month = Number(mStr);
    const day = Number(dStr);
    const year = Number(yStr);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return null;
    }
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const dt = new Date(year, month - 1, day);
    if (Number.isNaN(dt.getTime())) return null;
    // ensure no auto-correct
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return null;
    }
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Period: accept YYYY-M or YYYY-MM (we normalize to YYYY-MM before upload)
 */
export function isValidPeriod(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();

  const m = /^(\d{4})[-/](\d{1,2})$/.exec(trimmed);
  if (!m) return false;

  const year = Number(m[1]);
  const period = Number(m[2]);

  if (!Number.isInteger(year) || !Number.isInteger(period)) return false;
  if (!isReasonableYear(year)) return false;
  if (period < 1 || period > 12) return false;

  return true;
}

export function isBadDeptName(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return BAD_DEPT_VALUES.has(normalized);
}

export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function normalizeHeader(header: string): string {
  return header.trim();
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

export function validateAndBuildRecords(
  table: string,
  schema: { required: string[]; numeric: string[] },
  headers: string[],
  dataRows: string[][]
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const records: Record<string, unknown>[] = [];
  const yearSet = new Set<number>();

  const normalized = headers.map(normalizeHeader);

  // Check for missing required columns
  const missing = schema.required.filter((col) => !normalized.includes(col));
  if (missing.length > 0) {
    issues.push({
      row: null,
      field: null,
      message: `Missing required columns: ${missing.join(", ")}`,
    });
  }

  // Map column indices
  const colIndex: Record<string, number> = {};
  normalized.forEach((h, i) => {
    colIndex[h] = i;
  });

  dataRows.forEach((row, rowNum) => {
    const rec: Record<string, unknown> = {};

    for (const col of schema.required) {
      const idx = colIndex[col];
      const rawVal = idx !== undefined ? (row[idx] ?? "").trim() : "";

      // Empty check
      if (!rawVal) {
        issues.push({
          row: rowNum + 2, // +2 for 1-based and header row
          field: col,
          message: `Missing required value for "${col}"`,
        });
        continue;
      }

      // Numeric fields
      if (schema.numeric.includes(col)) {
        const num = parseNumber(rawVal);
        if (num === null) {
          issues.push({
            row: rowNum + 2,
            field: col,
            message: `Invalid number for "${col}": "${rawVal}"`,
          });
        } else {
          rec[col] = num;
          if (col === "fiscal_year") {
            if (!isReasonableYear(num)) {
              issues.push({
                row: rowNum + 2,
                field: col,
                message: `Unreasonable fiscal_year: ${num}. Expected 2000–2100.`,
              });
            } else {
              yearSet.add(num);
            }
          }
        }
      } else {
        rec[col] = rawVal;
      }
    }

    // Special validation for transactions.date
    if (table === "transactions") {
      const dateIdx = colIndex["date"];
      const rawDate = dateIdx !== undefined ? (row[dateIdx] ?? "").trim() : "";
      const normalizedDate = parseAndNormalizeTransactionDate(rawDate);
      if (normalizedDate) {
        rec["date"] = normalizedDate;
      } else {
        issues.push({
          row: rowNum + 2,
          field: "date",
          message: `Invalid date: "${rawDate}". Expected YYYY-MM-DD or MM/DD/YYYY.`,
        });
      }
    }

    // Special validation for period (actuals, revenues)
    if (table === "actuals" || table === "revenues") {
      const periodIdx = colIndex["period"];
      const rawPeriod =
        periodIdx !== undefined ? (row[periodIdx] ?? "").trim() : "";
      if (rawPeriod && !isValidPeriod(rawPeriod)) {
        issues.push({
          row: rowNum + 2,
          field: "period",
          message:
            'Invalid period. Use a calendar month "YYYY-MM" (e.g. "2027-08"). Fiscal year is derived from period using the FY start (July-start example: 2027-08 belongs to FY2028). We also accept "YYYY-M" and normalize it.',

        });
      }
    }

    records.push(rec);
  });

  return {
    records,
    yearsInData: Array.from(yearSet).sort((a, b) => a - b),
    issues,
  };
}

// =============================================================================
// TEMPLATE BUILDER
// =============================================================================

export function buildTemplateCsv(table: string): string | null {
  const schema = TABLE_SCHEMAS[table];
  if (!schema) return null;

  const headers = schema.required;

  const exampleRow = headers.map((h) => {
    if (h === "fiscal_year") return "2024";
    if (h === "period") return "2024-01"; // year-period format
    if (h === "date") return "07/01/2024"; // MM/DD/YYYY for transactions
    if (h === "amount") return "12345.67";
    if (h === "fund_code") return "100";
    if (h === "fund_name") return "General Fund";
    if (h === "department_code") return "PW";
    if (h === "department_name") return "Public Works";
    if (h === "category") return "Salaries";
    if (h === "account_code") return "5000";
    if (h === "account_name") return "Wages";
    if (h === "vendor") return "Example Vendor Inc.";
    if (h === "description") return "Example description of transaction";
    return h;
  });

  return [headers.join(","), exampleRow.join(",")].join("\n");
}

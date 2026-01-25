/**
 * Data transformation functions for CSV ingestion
 * 
 * These transforms are applied during the parsing pipeline to convert
 * raw CSV values into the correct data types for the database.
 */

// ============================================================================
// AMOUNT PARSING
// ============================================================================

/**
 * Parses various amount formats into a number
 * 
 * Supports:
 * - Standard: 1234.56, 1,234.56
 * - Negative: -1234.56, (1234.56), 1234.56-
 * - Currency symbols: $1,234.56
 * - Spaces: 1 234.56
 * 
 * @param value - Raw amount string from CSV
 * @returns Parsed number or null if invalid
 * 
 * @example
 * parseAmount("1,234.56")    // 1234.56
 * parseAmount("(500.00)")    // -500
 * parseAmount("$1,234.56-")  // -1234.56
 * parseAmount("abc")         // null
 */
export function parseAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  let str = String(value).trim();

  if (str === '') {
    return null;
  }

  // Track if negative
  let isNegative = false;

  // Check for parentheses notation: (1234.56)
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  }

  // Check for trailing minus: 1234.56-
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1);
  }

  // Check for leading minus: -1234.56
  if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1);
  }

  // Remove currency symbols and spaces
  str = str.replace(/[$€£¥\s]/g, '');

  // Remove thousand separators (commas)
  str = str.replace(/,/g, '');

  // Parse as float
  const num = parseFloat(str);

  if (isNaN(num)) {
    return null;
  }

  return isNegative ? -num : num;
}

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parses various date formats into an ISO date string (YYYY-MM-DD)
 * 
 * Supports:
 * - ISO: 2024-07-15
 * - US: 07/15/2024, 7/15/2024
 * - US with dashes: 07-15-2024
 * - European: 15/07/2024 (with hint)
 * - Month name: July 15, 2024, 15 Jul 2024
 * 
 * @param value - Raw date string from CSV
 * @param preferDMY - If true, assumes DD/MM/YYYY for ambiguous dates
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDate(
  value: string | null | undefined,
  preferDMY: boolean = false
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();

  if (str === '') {
    return null;
  }

  // Try ISO format first: 2024-07-15
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return formatDateParts(year, month, day);
  }

  // Try slash or dash format: 07/15/2024 or 07-15-2024
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, part1, part2, year] = slashMatch;
    if (preferDMY) {
      // DD/MM/YYYY
      return formatDateParts(year, part2, part1);
    } else {
      // MM/DD/YYYY (US format)
      return formatDateParts(year, part1, part2);
    }
  }

  // Try 2-digit year: 07/15/24
  const shortYearMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (shortYearMatch) {
    const [, part1, part2, shortYear] = shortYearMatch;
    // Assume 20xx for years 00-50, 19xx for 51-99
    const fullYear = parseInt(shortYear, 10) <= 50 
      ? `20${shortYear}` 
      : `19${shortYear}`;
    if (preferDMY) {
      return formatDateParts(fullYear, part2, part1);
    } else {
      return formatDateParts(fullYear, part1, part2);
    }
  }

  // Try month name formats: "July 15, 2024" or "15 Jul 2024"
  const monthNames: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  // "July 15, 2024" or "July 15 2024"
  const monthFirstMatch = str.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthFirstMatch) {
    const [, monthStr, day, year] = monthFirstMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      return formatDateParts(year, month, day);
    }
  }

  // "15 July 2024" or "15-Jul-2024"
  const dayFirstMatch = str.match(/^(\d{1,2})[\s\-]([a-z]+)[\s\-](\d{4})$/i);
  if (dayFirstMatch) {
    const [, day, monthStr, year] = dayFirstMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      return formatDateParts(year, month, day);
    }
  }

  // Try JavaScript Date parsing as last resort
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Formats date parts into ISO date string with validation
 */
function formatDateParts(
  year: string,
  month: string,
  day: string
): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // Basic validation
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  // More precise day validation
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return null;

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ============================================================================
// PERIOD PARSING
// ============================================================================

/**
 * Parses period strings into YYYY-MM format
 * 
 * Supports:
 * - YYYY-MM: 2024-07
 * - MM/YYYY: 07/2024
 * - Month Year: July 2024, Jul 2024
 * 
 * @param value - Raw period string
 * @returns Period in YYYY-MM format or null if invalid
 */
export function parsePeriod(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();

  if (str === '') {
    return null;
  }

  // Already in YYYY-MM format
  const isoMatch = str.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    return str;
  }

  // MM/YYYY or MM-YYYY format
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}`;
  }

  // Month name formats
  const monthNames: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  // "July 2024" or "Jul 2024"
  const monthYearMatch = str.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYearMatch) {
    const [, monthStr, year] = monthYearMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      return `${year}-${month}`;
    }
  }

  return null;
}

// ============================================================================
// FISCAL YEAR/PERIOD DERIVATION
// ============================================================================

/**
 * Derives fiscal year from a date based on fiscal year start configuration
 * 
 * @param date - Date in YYYY-MM-DD format
 * @param fyStartMonth - Month fiscal year starts (1-12, default 7 for July)
 * @returns Fiscal year number
 * 
 * @example
 * // FY starts in July
 * deriveFiscalYear("2024-08-15", 7)  // 2025 (Aug 2024 is FY 2025)
 * deriveFiscalYear("2024-06-15", 7)  // 2024 (Jun 2024 is FY 2024)
 */
export function deriveFiscalYear(
  date: string,
  fyStartMonth: number = 7
): number | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  // If current month is >= FY start month, we're in next FY
  if (month >= fyStartMonth) {
    return year + 1;
  }
  return year;
}

/**
 * Derives fiscal period (1-12) from a date based on fiscal year start
 * 
 * @param date - Date in YYYY-MM-DD format
 * @param fyStartMonth - Month fiscal year starts (1-12, default 7 for July)
 * @returns Fiscal period (1-12)
 * 
 * @example
 * // FY starts in July
 * deriveFiscalPeriod("2024-07-15", 7)  // 1 (July is period 1)
 * deriveFiscalPeriod("2024-12-15", 7)  // 6 (December is period 6)
 * deriveFiscalPeriod("2025-01-15", 7)  // 7 (January is period 7)
 */
export function deriveFiscalPeriod(
  date: string,
  fyStartMonth: number = 7
): number | null {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const month = parseInt(match[2], 10);

  // Calculate period: offset from FY start month
  let period = month - fyStartMonth + 1;
  if (period <= 0) {
    period += 12;
  }

  return period;
}

// ============================================================================
// TEXT TRANSFORMS
// ============================================================================

/**
 * Trims whitespace from a string value
 */
export function trimText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Converts text to uppercase
 */
export function toUpperCase(value: string | null | undefined): string | null {
  const trimmed = trimText(value);
  return trimmed ? trimmed.toUpperCase() : null;
}

/**
 * Converts text to lowercase
 */
export function toLowerCase(value: string | null | undefined): string | null {
  const trimmed = trimText(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

// ============================================================================
// TRANSFORM REGISTRY
// ============================================================================

export type TransformName = 
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'amount_parse'
  | 'date_parse'
  | 'period_parse';

/**
 * Applies a named transform to a value
 * 
 * @param transformName - Name of the transform to apply
 * @param value - Value to transform
 * @param options - Optional transform options (e.g., preferDMY for dates)
 * @returns Transformed value
 */
export function applyTransform(
  transformName: TransformName,
  value: string | null | undefined,
  options?: { preferDMY?: boolean }
): string | number | null {
  switch (transformName) {
    case 'trim':
      return trimText(value);
    case 'uppercase':
      return toUpperCase(value);
    case 'lowercase':
      return toLowerCase(value);
    case 'amount_parse':
      return parseAmount(value);
    case 'date_parse':
      return parseDate(value, options?.preferDMY);
    case 'period_parse':
      return parsePeriod(value);
    default:
      return trimText(value);
  }
}

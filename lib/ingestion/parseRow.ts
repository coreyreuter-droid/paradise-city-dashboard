/**
 * Shared parsing pipeline for CSV row processing
 * 
 * CRITICAL: This module is used by BOTH the validate endpoint AND the import worker.
 * This guarantees identical parsing behavior between validation preview and actual import.
 * 
 * DO NOT create separate parsing logic elsewhere - always use this module.
 */

import { normalizeCode, normalizeLabel } from '../normalizeCode';
import {
  parseAmount,
  parseDate,
  parsePeriod,
  deriveFiscalYear,
  deriveFiscalPeriod,
  applyTransform,
  TransformName,
} from './transforms';
import {
  DatasetType,
  ColumnMappings,
  COAConfig,
  COASegment,
  ParsedRow,
  RowError,
  ErrorCodes,
  RequiredFields,
  FieldDefinitions,
  AllFields,
} from './types';

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

export interface ParseRowOptions {
  /** The dataset type being parsed */
  datasetType: DatasetType;
  
  /** Column mappings configuration */
  columnMappings: ColumnMappings;
  
  /** COA parsing configuration (optional) */
  coaConfig?: COAConfig;
  
  /** Fiscal year start month (1-12, default 7 for July) */
  fyStartMonth?: number;
  
  /** Whether to prefer DD/MM/YYYY for ambiguous dates */
  preferDMY?: boolean;
}

/**
 * Parses a single CSV row into a validated, transformed record
 * 
 * @param rowNumber - 1-based row number in the CSV
 * @param csvRow - Array of string values from the CSV row
 * @param csvHeaders - Array of header names
 * @param options - Parsing options
 * @returns ParsedRow with validation results and transformed data
 */
export function parseRow(
  rowNumber: number,
  csvRow: string[],
  csvHeaders: string[],
  options: ParseRowOptions
): ParsedRow {
  const errors: RowError[] = [];
  const data: Record<string, string | number | null> = {};
  const rawData: Record<string, string> = {};
  
  const { datasetType, columnMappings, coaConfig, fyStartMonth = 7, preferDMY = false } = options;
  
  // Step 1: Extract raw values using column mappings
  for (const [targetField, mapping] of Object.entries(columnMappings)) {
    if (!mapping.enabled) continue;
    
    const rawValue = csvRow[mapping.csvColumnIndex] ?? '';
    rawData[targetField] = rawValue;
    
    // Apply transforms
    let transformedValue: string | number | null = rawValue;
    
    if (mapping.transforms && mapping.transforms.length > 0) {
      for (const transform of mapping.transforms) {
        transformedValue = applyTransform(
          transform as TransformName,
          String(transformedValue),
          { preferDMY }
        );
      }
    }
    
    // Apply field-specific default transforms
    const fieldDef = FieldDefinitions[targetField];
    if (fieldDef?.defaultTransform && (!mapping.transforms || mapping.transforms.length === 0)) {
      transformedValue = applyTransform(
        fieldDef.defaultTransform as TransformName,
        String(transformedValue),
        { preferDMY }
      );
    }
    
    // Normalize codes
    if (targetField.endsWith('_code')) {
      transformedValue = normalizeCode(String(transformedValue));
    }
    
    // Normalize labels/names
    if (targetField.endsWith('_name') || targetField === 'vendor' || targetField === 'description' || targetField === 'category') {
      transformedValue = normalizeLabel(String(transformedValue));
    }
    
    data[targetField] = transformedValue;
  }
  
  // Step 2: Parse COA string if enabled
  if (coaConfig?.enabled && coaConfig.sourceColumn) {
    const coaResult = parseCOAString(
      rawData[coaConfig.sourceColumn] || '',
      coaConfig,
      rowNumber
    );
    
    // Merge COA-parsed values into data (only if not already mapped)
    for (const [field, value] of Object.entries(coaResult.values)) {
      if (data[field] === null || data[field] === undefined || data[field] === '') {
        data[field] = value;
      }
    }
    
    // Add any COA parsing errors
    errors.push(...coaResult.errors);
  }
  
  // Step 3: Derive fiscal year/period from date if missing
  if (datasetType === 'transactions' && data.date && !data.fiscal_year) {
    const derivedFY = deriveFiscalYear(String(data.date), fyStartMonth);
    if (derivedFY) {
      data.fiscal_year = derivedFY;
    }
  }
  
  if ((datasetType === 'actuals' || datasetType === 'revenues') && data.period) {
    // Derive fiscal_period AND fiscal_year from period (e.g., "2024-07")
    const periodStr = String(data.period);
    const match = periodStr.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      
      // Derive fiscal_period (1-12 within fiscal year)
      let fiscalPeriod = month - fyStartMonth + 1;
      if (fiscalPeriod <= 0) fiscalPeriod += 12;
      data.fiscal_period = fiscalPeriod;
      
      // Derive fiscal_year if not already set
      // If month >= fyStartMonth, we're in the NEXT fiscal year
      // E.g., July 2024 with FY start July = FY 2025
      if (!data.fiscal_year) {
        if (month >= fyStartMonth) {
          data.fiscal_year = year + 1;
        } else {
          data.fiscal_year = year;
        }
      }
    }
  }
  
  // Step 4: Validate required fields
  const requiredFields = RequiredFields[datasetType];
  for (const field of requiredFields) {
    const value = data[field];
    if (value === null || value === undefined || value === '') {
      errors.push({
        row_number: rowNumber,
        error_code: ErrorCodes.REQUIRED_FIELD_MISSING,
        error_level: 'error',
        message: `Required field "${field}" is missing or empty`,
        field_name: field,
        field_value: rawData[field] || '',
      });
    }
  }
  
  // Step 5: Validate specific field types
  validateFieldTypes(rowNumber, data, rawData, errors);
  
  // Step 6: Data quality warnings (non-blocking)
  addDataQualityWarnings(rowNumber, data, errors);
  
  const isValid = !errors.some(e => e.error_level === 'error');
  
  return {
    rowNumber,
    isValid,
    errors,
    data,
    rawData,
  };
}

// ============================================================================
// COA STRING PARSING
// ============================================================================

interface COAParseResult {
  values: Record<string, string | null>;
  errors: RowError[];
}

/**
 * Parses a combined account string (COA) into individual segments
 * 
 * @example
 * parseCOAString("100-4500-6100", { delimiter: "-", segmentOrder: ["fund_code", "department_code", "account_code"] })
 * // Returns: { fund_code: "100", department_code: "4500", account_code: "6100" }
 */
function parseCOAString(
  coaString: string,
  config: COAConfig,
  rowNumber: number
): COAParseResult {
  const values: Record<string, string | null> = {};
  const errors: RowError[] = [];
  
  if (!coaString || !coaString.trim()) {
    return { values, errors };
  }
  
  const segments = coaString.split(config.delimiter);
  
  // Validate segment count if expected count is specified
  if (config.expectedSegments && segments.length !== config.expectedSegments) {
    errors.push({
      row_number: rowNumber,
      error_code: ErrorCodes.COA_WRONG_SEGMENT_COUNT,
      error_level: 'warning',
      message: `COA string has ${segments.length} segments, expected ${config.expectedSegments}`,
      field_name: config.sourceColumn,
      field_value: coaString,
    });
  }
  
  // Map segments to fields
  for (let i = 0; i < config.segmentOrder.length && i < segments.length; i++) {
    const segment = config.segmentOrder[i];
    
    if (segment === 'skip') {
      continue;
    }
    
    const value = normalizeCode(segments[i]);
    values[segment] = value;
  }
  
  return { values, errors };
}

// ============================================================================
// FIELD TYPE VALIDATION
// ============================================================================

function validateFieldTypes(
  rowNumber: number,
  data: Record<string, string | number | null>,
  rawData: Record<string, string>,
  errors: RowError[]
): void {
  // Validate amount
  if (data.amount !== null && data.amount !== undefined) {
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      errors.push({
        row_number: rowNumber,
        error_code: ErrorCodes.INVALID_AMOUNT,
        error_level: 'error',
        message: `Invalid amount: "${rawData.amount || ''}"`,
        field_name: 'amount',
        field_value: rawData.amount || '',
      });
    }
  }
  
  // Validate date
  if (rawData.date && data.date === null) {
    errors.push({
      row_number: rowNumber,
      error_code: ErrorCodes.INVALID_DATE,
      error_level: 'error',
      message: `Invalid date format: "${rawData.date}"`,
      field_name: 'date',
      field_value: rawData.date,
    });
  }
  
  // Validate period
  if (rawData.period && data.period === null) {
    errors.push({
      row_number: rowNumber,
      error_code: ErrorCodes.INVALID_PERIOD,
      error_level: 'error',
      message: `Invalid period format: "${rawData.period}". Expected YYYY-MM`,
      field_name: 'period',
      field_value: rawData.period,
    });
  }
  
  // Validate fiscal year
  if (data.fiscal_year !== null && data.fiscal_year !== undefined) {
    const fy = Number(data.fiscal_year);
    if (isNaN(fy) || fy < 1900 || fy > 2100) {
      errors.push({
        row_number: rowNumber,
        error_code: ErrorCodes.INVALID_FISCAL_YEAR,
        error_level: 'error',
        message: `Invalid fiscal year: "${rawData.fiscal_year || data.fiscal_year}"`,
        field_name: 'fiscal_year',
        field_value: String(rawData.fiscal_year || data.fiscal_year),
      });
    }
  }
}

// ============================================================================
// DATA QUALITY WARNINGS
// ============================================================================

function addDataQualityWarnings(
  rowNumber: number,
  data: Record<string, string | number | null>,
  errors: RowError[]
): void {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Check for future dates
  if (data.date && typeof data.date === 'string') {
    const dateObj = new Date(data.date);
    if (dateObj > now) {
      errors.push({
        row_number: rowNumber,
        error_code: ErrorCodes.FUTURE_DATE,
        error_level: 'warning',
        message: `Date is in the future: ${data.date}`,
        field_name: 'date',
        field_value: data.date,
      });
    }
    
    // Check for very old dates (more than 20 years ago)
    if (dateObj.getFullYear() < currentYear - 20) {
      errors.push({
        row_number: rowNumber,
        error_code: ErrorCodes.VERY_OLD_DATE,
        error_level: 'warning',
        message: `Date is more than 20 years old: ${data.date}`,
        field_name: 'date',
        field_value: data.date,
      });
    }
  }
  
  // Check for very large amounts (>$100 million)
  if (typeof data.amount === 'number' && Math.abs(data.amount) > 100_000_000) {
    errors.push({
      row_number: rowNumber,
      error_code: ErrorCodes.LARGE_AMOUNT,
      error_level: 'warning',
      message: `Unusually large amount: $${data.amount.toLocaleString()}`,
      field_name: 'amount',
      field_value: String(data.amount),
    });
  }
  
  // Note negative amounts (may be intentional for credits)
  if (typeof data.amount === 'number' && data.amount < 0) {
    errors.push({
      row_number: rowNumber,
      error_code: ErrorCodes.NEGATIVE_AMOUNT,
      error_level: 'warning',
      message: `Negative amount: $${data.amount.toLocaleString()}`,
      field_name: 'amount',
      field_value: String(data.amount),
    });
  }
}

// ============================================================================
// BATCH PARSING
// ============================================================================

/**
 * Parses multiple CSV rows
 * 
 * @param csvRows - Array of CSV rows (each row is an array of strings)
 * @param csvHeaders - Array of header names
 * @param options - Parsing options
 * @param startRowNumber - Starting row number (1-based, accounting for header)
 * @returns Array of ParsedRow results
 */
export function parseRows(
  csvRows: string[][],
  csvHeaders: string[],
  options: ParseRowOptions,
  startRowNumber: number = 2  // Default assumes header is row 1
): ParsedRow[] {
  return csvRows.map((row, index) => 
    parseRow(startRowNumber + index, row, csvHeaders, options)
  );
}

// ============================================================================
// VALIDATION SUMMARY
// ============================================================================

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  errorCount: number;
  warningCount: number;
  errorsByCode: Record<string, number>;
  sampleErrors: RowError[];  // First N errors for preview
}

/**
 * Generates a summary of validation results
 */
export function summarizeValidation(
  parsedRows: ParsedRow[],
  maxSampleErrors: number = 10
): ValidationSummary {
  let validRows = 0;
  let invalidRows = 0;
  let warningRows = 0;
  let errorCount = 0;
  let warningCount = 0;
  const errorsByCode: Record<string, number> = {};
  const sampleErrors: RowError[] = [];
  
  for (const row of parsedRows) {
    const hasErrors = row.errors.some(e => e.error_level === 'error');
    const hasWarnings = row.errors.some(e => e.error_level === 'warning');
    
    if (hasErrors) {
      invalidRows++;
    } else {
      validRows++;
    }
    
    if (hasWarnings && !hasErrors) {
      warningRows++;
    }
    
    for (const error of row.errors) {
      if (error.error_level === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }
      
      errorsByCode[error.error_code] = (errorsByCode[error.error_code] || 0) + 1;
      
      if (sampleErrors.length < maxSampleErrors && error.error_level === 'error') {
        sampleErrors.push(error);
      }
    }
  }
  
  return {
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    warningRows,
    errorCount,
    warningCount,
    errorsByCode,
    sampleErrors,
  };
}

// ============================================================================
// AUTO-DETECT COLUMN MAPPINGS
// ============================================================================

/**
 * Common header name variations for auto-detection
 */
const HEADER_ALIASES: Record<string, string[]> = {
  fiscal_year: ['fiscal_year', 'fiscal year', 'fy', 'year', 'fiscalyear'],
  period: ['period', 'month', 'yearmonth', 'year_month', 'accounting_period'],
  date: ['date', 'transaction_date', 'txn_date', 'trans_date', 'posting_date'],
  fund_code: ['fund_code', 'fund code', 'fundcode', 'fund', 'fund_id', 'fund_number'],
  fund_name: ['fund_name', 'fund name', 'fundname', 'fund_description', 'fund_desc'],
  department_code: ['department_code', 'department code', 'deptcode', 'dept_code', 'dept', 'dept_id', 'department', 'org_code'],
  department_name: ['department_name', 'department name', 'deptname', 'dept_name', 'dept_description', 'department_description'],
  category: ['category', 'budget_category', 'expense_category', 'account_category', 'type'],
  account_code: ['account_code', 'account code', 'accountcode', 'account', 'gl_account', 'object_code', 'object', 'acct'],
  account_name: ['account_name', 'account name', 'accountname', 'account_description', 'acct_name', 'gl_description'],
  vendor: ['vendor', 'vendor_name', 'vendorname', 'payee', 'supplier'],
  description: ['description', 'desc', 'memo', 'narrative', 'comments', 'transaction_description'],
  amount: ['amount', 'amt', 'total', 'dollars', 'value', 'sum', 'budget_amount', 'actual_amount'],
};

/**
 * Attempts to auto-detect column mappings based on header names
 * Only detects mappings for fields that are valid for the given dataset type
 */
export function autoDetectMappings(
  headers: string[],
  datasetType: DatasetType
): ColumnMappings {
  const mappings: ColumnMappings = {};
  
  // Get valid fields for this dataset type
  const validFields = new Set(AllFields[datasetType] || []);
  
  // Normalize headers for matching
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  
  for (const [targetField, aliases] of Object.entries(HEADER_ALIASES)) {
    // Skip fields that aren't valid for this dataset type
    if (!validFields.has(targetField)) {
      continue;
    }
    
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];
      
      if (aliases.includes(header)) {
        mappings[targetField] = {
          csvColumnIndex: i,
          csvColumnName: headers[i],
          targetField,
          transforms: [],
          enabled: true,
        };
        break;
      }
    }
  }
  
  return mappings;
}

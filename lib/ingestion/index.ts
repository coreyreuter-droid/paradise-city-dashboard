/**
 * CSV Mapping and Ingestion System
 * 
 * This module provides the complete pipeline for:
 * - Parsing CSV files with flexible column mapping
 * - Validating data with detailed error reporting
 * - Transforming values (dates, amounts, periods)
 * - Parsing combined Chart of Accounts (COA) strings
 * - Managing lookup tables (funds, departments)
 * 
 * @example
 * import { parseRow, autoDetectMappings, ValidationSummary } from '@/lib/ingestion';
 */

// Core types
export * from './types';

// Transforms
export {
  parseAmount,
  parseDate,
  parsePeriod,
  deriveFiscalYear,
  deriveFiscalPeriod,
  applyTransform,
  trimText,
  toUpperCase,
  toLowerCase,
} from './transforms';

// Parsing pipeline
export {
  parseRow,
  parseRows,
  summarizeValidation,
  autoDetectMappings,
} from './parseRow';

export type { ParseRowOptions, ValidationSummary } from './parseRow';

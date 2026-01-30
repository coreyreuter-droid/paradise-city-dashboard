/**
 * TypeScript types for the CSV mapping and ingestion system
 */

// ============================================================================
// DATASET TYPES
// ============================================================================

export type DatasetType = 
  | 'budgets'
  | 'actuals'
  | 'transactions'
  | 'revenues'
  | 'funds_lookup'
  | 'departments_lookup';

export type FinancialDatasetType = 'budgets' | 'actuals' | 'transactions' | 'revenues';
export type LookupDatasetType = 'funds_lookup' | 'departments_lookup';

// ============================================================================
// COLUMN MAPPING
// ============================================================================

/**
 * Maps a CSV column to a target database field
 */
export interface ColumnMapping {
  /** Index of the CSV column (0-based) */
  csvColumnIndex: number;
  
  /** Name of the CSV column header */
  csvColumnName: string;
  
  /** Target database field name */
  targetField: string;
  
  /** Optional transforms to apply (e.g., 'amount_parse', 'date_parse') */
  transforms?: string[];
  
  /** Whether this mapping is enabled */
  enabled: boolean;
}

/**
 * Complete column mappings configuration
 */
export interface ColumnMappings {
  [targetField: string]: ColumnMapping;
}

// ============================================================================
// COA (CHART OF ACCOUNTS) PARSING
// ============================================================================

/**
 * Configuration for parsing a combined account string
 */
export interface COAConfig {
  /** Whether COA parsing is enabled */
  enabled: boolean;
  
  /** CSV column containing the combined account string */
  sourceColumn?: string;
  
  /** Delimiter between segments (e.g., '-', '.', '/') */
  delimiter: string;
  
  /** Order of segments in the string */
  segmentOrder: COASegment[];
  
  /** Expected number of segments (for validation) */
  expectedSegments?: number;
}

export type COASegment = 
  | 'fund_code'
  | 'department_code'
  | 'account_code'
  | 'object_code'
  | 'project_code'
  | 'skip';  // Segment to ignore

// ============================================================================
// INGESTION PROFILE
// ============================================================================

/**
 * Saved mapping profile for a dataset type
 */
export interface IngestionProfile {
  id: string;
  dataset_type: DatasetType;
  name: string;
  version: number;
  is_active: boolean;
  
  /** Column mappings */
  column_mappings: ColumnMappings;
  
  /** 1-based row index of header row */
  header_row_index: number;
  
  /** Number of rows to skip after header */
  skip_rows_after_header: number;
  
  /** COA parsing configuration */
  coa_enabled: boolean;
  coa_source_column?: string;
  coa_delimiter?: string;
  coa_segment_order?: COASegment[];
  coa_expected_segments?: number;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ============================================================================
// RAW FILE
// ============================================================================

/**
 * Uploaded CSV file metadata
 */
export interface RawFile {
  id: string;
  dataset_type: DatasetType;
  filename: string;
  file_size_bytes: number;
  checksum: string;
  storage_path: string;
  row_count?: number;
  uploaded_by?: string;
  uploaded_at: string;
}

// ============================================================================
// INGESTION JOB
// ============================================================================

export type JobStatus = 
  | 'pending'
  | 'validating'
  | 'validated'
  | 'importing'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed';

export type ImportMode = 
  | 'append'
  | 'replace_year'
  | 'replace_batch'
  | 'replace_all';

/**
 * Async import job record
 */
export interface IngestionJob {
  id: string;
  raw_file_id: string;
  profile_id: string;
  profile_snapshot: IngestionProfile;
  dataset_type: DatasetType;
  
  status: JobStatus;
  import_mode: ImportMode;
  replace_target_year?: number;
  replace_target_batch_id?: string;
  
  // Progress
  rows_total: number;
  rows_validated: number;
  rows_loaded: number;
  rows_rejected: number;
  rows_warned: number;
  
  // COA metrics
  coa_parse_attempted: number;
  coa_parse_succeeded: number;
  coa_parse_failed: number;
  
  // Checkpointing
  checkpoint_row_number: number;
  
  // Worker locking
  locked_at?: string;
  locked_by?: string;
  
  // Retry
  attempt_count: number;
  last_error?: string;
  
  // Safety flags
  delete_applied: boolean;
  
  // Results
  coverage_summary?: CoverageSummary;
  detected_years?: number[];
  delete_preview?: DeletePreview;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  started_at?: string;
  validation_completed_at?: string;
  finished_at?: string;
}

// ============================================================================
// VALIDATION & ERRORS
// ============================================================================

export type ErrorLevel = 'error' | 'warning';

export interface RowError {
  row_number: number;
  error_code: string;
  error_level: ErrorLevel;
  message: string;
  field_name?: string;
  field_value?: string;
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Required field errors
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  
  // Type errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_PERIOD: 'INVALID_PERIOD',
  INVALID_FISCAL_YEAR: 'INVALID_FISCAL_YEAR',
  
  // COA errors
  COA_PARSE_FAILED: 'COA_PARSE_FAILED',
  COA_WRONG_SEGMENT_COUNT: 'COA_WRONG_SEGMENT_COUNT',
  
  // Lookup warnings
  UNMAPPED_FUND_CODE: 'UNMAPPED_FUND_CODE',
  UNMAPPED_DEPARTMENT_CODE: 'UNMAPPED_DEPARTMENT_CODE',
  
  // Data quality warnings
  DUPLICATE_ROW: 'DUPLICATE_ROW',
  FUTURE_DATE: 'FUTURE_DATE',
  VERY_OLD_DATE: 'VERY_OLD_DATE',
  LARGE_AMOUNT: 'LARGE_AMOUNT',
  NEGATIVE_AMOUNT: 'NEGATIVE_AMOUNT',
  
  // Label validation
  LABEL_TOO_SHORT: 'LABEL_TOO_SHORT',
  LABEL_LOOKS_LIKE_CODE: 'LABEL_LOOKS_LIKE_CODE',
} as const;

// ============================================================================
// COVERAGE
// ============================================================================

/**
 * Coverage summary for an import job
 */
export interface CoverageSummary {
  fund_codes_total: number;
  fund_codes_mapped: number;
  fund_label_coverage_pct: number;
  
  department_codes_total: number;
  department_codes_mapped: number;
  department_label_coverage_pct: number;
}

// ============================================================================
// DELETE PREVIEW
// ============================================================================

/**
 * Preview of what will be deleted in replace modes
 */
export interface DeletePreview {
  mode: ImportMode;
  target_year?: number;
  target_batch_id?: string;
  
  rows_to_delete: number;
  fiscal_years_affected: number[];
}

// ============================================================================
// PARSED ROW
// ============================================================================

/**
 * Result of parsing a single CSV row
 */
export interface ParsedRow {
  /** 1-based row number in the CSV */
  rowNumber: number;
  
  /** Whether the row passed validation */
  isValid: boolean;
  
  /** Errors found during validation */
  errors: RowError[];
  
  /** Parsed and transformed field values */
  data: Record<string, string | number | null>;
  
  /** Raw values before transformation (for debugging) */
  rawData: Record<string, string>;
}

// ============================================================================
// REQUIRED FIELDS BY DATASET TYPE
// ============================================================================

/**
 * Required fields for each dataset type
 * MVP: Only fiscal_year, amount, and period (for actuals/revenues) are required
 * Everything else optional (supports mapping system)
 * 
 * Note: transactions only requires date + amount; fiscal_year is auto-derived from date
 */
export const RequiredFields: Record<DatasetType, string[]> = {
  budgets: ['fiscal_year', 'amount'],
  actuals: ['fiscal_year', 'period', 'amount'],
  transactions: ['date', 'amount'],
  revenues: ['fiscal_year', 'period', 'amount'],
  funds_lookup: ['fund_code', 'fund_name'],
  departments_lookup: ['department_code', 'department_name'],
};

/**
 * All possible fields for each dataset type
 */
export const AllFields: Record<DatasetType, string[]> = {
  budgets: [
    'fiscal_year',
    'fund_code',
    'fund_name',
    'department_code',
    'department_name',
    'category',
    'account_code',
    'account_name',
    'amount',
  ],
  actuals: [
    'fiscal_year',
    'period',
    'fund_code',
    'fund_name',
    'department_code',
    'department_name',
    'category',
    'account_code',
    'account_name',
    'amount',
  ],
  transactions: [
    'fiscal_year',
    'date',
    'fund_code',
    'fund_name',
    'department_code',
    'department_name',
    'account_code',
    'account_name',
    'vendor',
    'description',
    'amount',
  ],
  revenues: [
    'fiscal_year',
    'period',
    'fund_code',
    'fund_name',
    'department_code',
    'department_name',
    'category',
    'account_code',
    'account_name',
    'amount',
  ],
  funds_lookup: ['fund_code', 'fund_name'],
  departments_lookup: ['department_code', 'department_name'],
};

// ============================================================================
// FIELD METADATA
// ============================================================================

export interface FieldMetadata {
  name: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'period';
  defaultTransform?: string;
  description?: string;
}

export const FieldDefinitions: Record<string, FieldMetadata> = {
  fiscal_year: {
    name: 'fiscal_year',
    label: 'Fiscal Year',
    required: true,
    type: 'number',
    description: 'The fiscal year (e.g., 2024)',
  },
  period: {
    name: 'period',
    label: 'Period',
    required: false,
    type: 'period',
    defaultTransform: 'period_parse',
    description: 'Calendar month in YYYY-MM format',
  },
  date: {
    name: 'date',
    label: 'Date',
    required: false,
    type: 'date',
    defaultTransform: 'date_parse',
    description: 'Transaction date',
  },
  fund_code: {
    name: 'fund_code',
    label: 'Fund Code',
    required: false,
    type: 'string',
    description: 'Code identifying the fund',
  },
  fund_name: {
    name: 'fund_name',
    label: 'Fund Name',
    required: false,
    type: 'string',
    description: 'Display name for the fund',
  },
  department_code: {
    name: 'department_code',
    label: 'Department Code',
    required: false,
    type: 'string',
    description: 'Code identifying the department',
  },
  department_name: {
    name: 'department_name',
    label: 'Department Name',
    required: false,
    type: 'string',
    description: 'Display name for the department',
  },
  category: {
    name: 'category',
    label: 'Category',
    required: false,
    type: 'string',
    description: 'Budget category (e.g., Personnel, Operations)',
  },
  account_code: {
    name: 'account_code',
    label: 'Account Code',
    required: false,
    type: 'string',
    description: 'GL account code',
  },
  account_name: {
    name: 'account_name',
    label: 'Account Name',
    required: false,
    type: 'string',
    description: 'GL account name',
  },
  vendor: {
    name: 'vendor',
    label: 'Vendor',
    required: false,
    type: 'string',
    description: 'Vendor or payee name',
  },
  description: {
    name: 'description',
    label: 'Description',
    required: false,
    type: 'string',
    description: 'Transaction description',
  },
  amount: {
    name: 'amount',
    label: 'Amount',
    required: true,
    type: 'number',
    defaultTransform: 'amount_parse',
    description: 'Dollar amount',
  },
};

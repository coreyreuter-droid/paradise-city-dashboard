// lib/lookups/types.ts
// Type definitions for versioned lookup tables

// ============================================================================
// Database Row Types
// ============================================================================

export interface FundDimRow {
  id: string;
  fund_code: string;
  fund_name: string;
  effective_start_fy: number;
  effective_end_fy: number | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentDimRow {
  id: string;
  department_code: string;
  department_name: string;
  effective_start_fy: number;
  effective_end_fy: number | null;
  created_at: string;
  updated_at: string;
}

export interface FundByYearRow {
  fiscal_year: number;
  fund_code: string;
  fund_name: string;
  fund_dim_id: string;
}

export interface DepartmentByYearRow {
  fiscal_year: number;
  department_code: string;
  department_name: string;
  department_dim_id: string;
}

export interface LookupAuditLogRow {
  id: string;
  lookup_type: 'funds' | 'departments';
  action: 'insert' | 'update' | 'close' | 'delete' | 'bulk_replace' | 'bulk_additional';
  lookup_code: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  affected_fy_start: number | null;
  affected_fy_end: number | null;
  actor_user_id: string | null;
  actor_email: string | null;
  upload_batch_id: string | null;
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export type LookupType = 'funds' | 'departments';
export type UploadMode = 'replace' | 'additional';

// Input row from CSV
export interface LookupInputRow {
  code: string;
  name: string;
}

// Validate Request
export interface ValidateLookupRequest {
  rows: LookupInputRow[];
  effectiveStartFy: number;
  mode: UploadMode;
}

// Change item for preview
export interface LookupChangeInsert {
  code: string;
  name: string;
  effectiveStartFy: number;
}

export interface LookupChangeCloseOut {
  code: string;
  name: string;
  currentStartFy: number;
  willEndFy: number;
}

export interface LookupChangeRenamed {
  code: string;
  oldName: string;
  newName: string;
}

export interface LookupChangeRemoved {
  code: string;
  name: string;
}

// Validation error
export interface LookupValidationError {
  row: number;
  code: string;
  message: string;
}

// Validation warning
export interface LookupValidationWarning {
  type: 'removed_code' | 'renamed_code' | 'duplicate_in_file';
  code: string;
  message: string;
}

// Validate Response
export interface ValidateLookupResponse {
  valid: boolean;
  
  summary: {
    totalInFile: number;
    willInsert: number;
    willCloseOut: number;
    unchangedCodes: number;
    renamedCodes: number;
    removedCodes: number;
    newCodes: number;
  };
  
  changes: {
    toInsert: LookupChangeInsert[];
    toCloseOut: LookupChangeCloseOut[];
    renamed: LookupChangeRenamed[];
    removed: LookupChangeRemoved[];
  };
  
  errors: LookupValidationError[];
  warnings: LookupValidationWarning[];
  
  // For apply step - contains hashed payload for verification
  validationToken: string;
}

// Apply Request
export interface ApplyLookupRequest {
  validationToken: string;
  confirmRemovals: boolean;
  confirmRenames: boolean;
}

// Apply Response
export interface ApplyLookupResponse {
  success: boolean;
  
  applied?: {
    inserted: number;
    closedOut: number;
    affectedFiscalYears: number[];
  };
  
  auditBatchId?: string;
  error?: string;
}

// ============================================================================
// GET (List) Response Types
// ============================================================================

export interface ListLookupsResponse {
  lookups: (FundDimRow | DepartmentDimRow)[];
  byYear?: (FundByYearRow | DepartmentByYearRow)[];
  auditLog?: LookupAuditLogRow[];
}

// ============================================================================
// Edit Single Entry Types
// ============================================================================

export interface UpdateLookupRequest {
  name?: string;
  effectiveStartFy?: number;
  effectiveEndFy?: number | null;
}

export interface UpdateLookupResponse {
  success: boolean;
  lookup?: FundDimRow | DepartmentDimRow;
  error?: string;
}

// ============================================================================
// Validation Token Payload (internal use)
// ============================================================================

export interface ValidationTokenPayload {
  lookupType: LookupType;
  mode: UploadMode;
  effectiveStartFy: number;
  rows: LookupInputRow[];
  changes: ValidateLookupResponse['changes'];
  hasRemovals: boolean;
  hasRenames: boolean;
  userId: string;
  createdAt: number;
  hash: string;
}

// lib/lookups/validation.ts
// Validation and diff computation for lookup uploads

import {
  LookupInputRow,
  LookupValidationError,
  LookupValidationWarning,
  LookupChangeInsert,
  LookupChangeCloseOut,
  LookupChangeRenamed,
  LookupChangeRemoved,
  ValidateLookupResponse,
  UploadMode,
  FundDimRow,
  DepartmentDimRow,
  ValidationTokenPayload,
} from './types';
import crypto from 'crypto';

// ============================================================================
// Row Validation
// ============================================================================

export function validateRows(rows: LookupInputRow[]): LookupValidationError[] {
  const errors: LookupValidationError[] = [];
  const seenCodes = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const code = (row.code ?? '').trim();
    const name = (row.name ?? '').trim();

    // Empty code
    if (!code) {
      errors.push({
        row: rowNum,
        code: code || '(empty)',
        message: 'Code is required and cannot be empty',
      });
      return;
    }

    // Empty name
    if (!name) {
      errors.push({
        row: rowNum,
        code,
        message: 'Name is required and cannot be empty',
      });
      return;
    }

    // Duplicate code in file
    const normalizedCode = code.toLowerCase();
    if (seenCodes.has(normalizedCode)) {
      errors.push({
        row: rowNum,
        code,
        message: `Duplicate code in file. Code "${code}" appears multiple times.`,
      });
      return;
    }
    seenCodes.add(normalizedCode);

    // Code too long (reasonable limit)
    if (code.length > 50) {
      errors.push({
        row: rowNum,
        code: code.substring(0, 20) + '...',
        message: 'Code is too long (max 50 characters)',
      });
    }

    // Name too long
    if (name.length > 255) {
      errors.push({
        row: rowNum,
        code,
        message: 'Name is too long (max 255 characters)',
      });
    }
  });

  return errors;
}

// ============================================================================
// Diff Computation
// ============================================================================

type CurrentLookup = Pick<FundDimRow | DepartmentDimRow, 'id' | 'effective_start_fy' | 'effective_end_fy'> & {
  code: string;
  name: string;
};

export interface DiffResult {
  summary: ValidateLookupResponse['summary'];
  changes: ValidateLookupResponse['changes'];
  warnings: LookupValidationWarning[];
}

export function computeLookupDiff(
  currentLookups: CurrentLookup[],
  inputRows: LookupInputRow[],
  effectiveStartFy: number,
  mode: UploadMode
): DiffResult {
  const warnings: LookupValidationWarning[] = [];

  // Build maps for efficient lookup
  // Current = entries with no end date (still active)
  const currentByCode = new Map<string, CurrentLookup>();
  for (const lookup of currentLookups) {
    if (lookup.effective_end_fy === null) {
      currentByCode.set(lookup.code.toLowerCase(), lookup);
    }
  }

  // Input by code
  const inputByCode = new Map<string, LookupInputRow>();
  for (const row of inputRows) {
    inputByCode.set(row.code.trim().toLowerCase(), {
      code: row.code.trim(),
      name: row.name.trim(),
    });
  }

  // Compute changes
  const toInsert: LookupChangeInsert[] = [];
  const toCloseOut: LookupChangeCloseOut[] = [];
  const renamed: LookupChangeRenamed[] = [];
  const removed: LookupChangeRemoved[] = [];

  let unchangedCodes = 0;
  let newCodes = 0;
  let renamedCodes = 0;

  // Process input rows
  for (const [normalizedCode, input] of inputByCode) {
    const current = currentByCode.get(normalizedCode);

    if (!current) {
      // New code (doesn't exist in current)
      toInsert.push({
        code: input.code,
        name: input.name,
        effectiveStartFy,
      });
      newCodes++;
    } else if (current.name.toLowerCase() !== input.name.toLowerCase()) {
      // Code exists but name changed
      renamed.push({
        code: input.code,
        oldName: current.name,
        newName: input.name,
      });
      renamedCodes++;
      warnings.push({
        type: 'renamed_code',
        code: input.code,
        message: `Name will change from "${current.name}" to "${input.name}"`,
      });

      // In replace mode, we close old and insert new
      // In additional mode, renamed codes are treated as new (won't match)
      if (mode === 'replace') {
        toCloseOut.push({
          code: current.code,
          name: current.name,
          currentStartFy: current.effective_start_fy,
          willEndFy: effectiveStartFy - 1,
        });
        toInsert.push({
          code: input.code,
          name: input.name,
          effectiveStartFy,
        });
      }
    } else {
      // Code and name match - unchanged
      unchangedCodes++;

      // In replace mode, even unchanged codes get closed and re-inserted
      // to maintain clean boundaries
      if (mode === 'replace') {
        toCloseOut.push({
          code: current.code,
          name: current.name,
          currentStartFy: current.effective_start_fy,
          willEndFy: effectiveStartFy - 1,
        });
        toInsert.push({
          code: input.code,
          name: input.name,
          effectiveStartFy,
        });
      }
    }
  }

  // In replace mode, find codes that are being removed (in current but not in input)
  if (mode === 'replace') {
    for (const [normalizedCode, current] of currentByCode) {
      if (!inputByCode.has(normalizedCode)) {
        removed.push({
          code: current.code,
          name: current.name,
        });
        toCloseOut.push({
          code: current.code,
          name: current.name,
          currentStartFy: current.effective_start_fy,
          willEndFy: effectiveStartFy - 1,
        });
        warnings.push({
          type: 'removed_code',
          code: current.code,
          message: `Code "${current.code}" (${current.name}) will no longer be mapped for FY${effectiveStartFy}+`,
        });
      }
    }
  }

  return {
    summary: {
      totalInFile: inputRows.length,
      willInsert: toInsert.length,
      willCloseOut: toCloseOut.length,
      unchangedCodes,
      renamedCodes,
      removedCodes: removed.length,
      newCodes,
    },
    changes: {
      toInsert,
      toCloseOut,
      renamed,
      removed,
    },
    warnings,
  };
}

// ============================================================================
// Validation Token
// ============================================================================

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function generateValidationToken(
  lookupType: 'funds' | 'departments',
  mode: UploadMode,
  effectiveStartFy: number,
  rows: LookupInputRow[],
  changes: ValidateLookupResponse['changes'],
  userId: string,
  secret: string
): string {
  const payload: ValidationTokenPayload = {
    lookupType,
    mode,
    effectiveStartFy,
    rows,
    changes,
    hasRemovals: changes.removed.length > 0,
    hasRenames: changes.renamed.length > 0,
    userId,
    createdAt: Date.now(),
    hash: '', // Will be set below
  };

  // Generate hash of payload for integrity
  const payloadString = JSON.stringify({
    ...payload,
    hash: undefined,
  });
  payload.hash = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  // Encode as base64
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyValidationToken(
  token: string,
  userId: string,
  secret: string
): ValidationTokenPayload | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token, 'base64').toString('utf-8')
    ) as ValidationTokenPayload;

    // Check user match
    if (payload.userId !== userId) {
      console.warn('Validation token user mismatch');
      return null;
    }

    // Check expiry
    if (Date.now() - payload.createdAt > TOKEN_EXPIRY_MS) {
      console.warn('Validation token expired');
      return null;
    }

    // Verify hash
    const expectedPayloadString = JSON.stringify({
      ...payload,
      hash: undefined,
    });
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(expectedPayloadString)
      .digest('hex');

    if (payload.hash !== expectedHash) {
      console.warn('Validation token hash mismatch');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to verify validation token:', error);
    return null;
  }
}

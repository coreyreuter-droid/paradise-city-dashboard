/**
 * Canonical code normalization function
 * 
 * CRITICAL: This function MUST be used for ALL code comparisons:
 * - Facts ingestion (transactions, budgets, actuals, revenues)
 * - Lookup ingestion (funds_lookup, departments_lookup)
 * - Manual UI saves (unmapped codes page)
 * - All queries comparing codes (unmapped, coverage, joins)
 * 
 * Without consistent normalization, codes like "150" vs " 150" won't match,
 * causing false "unlabeled" displays in the citizen UI.
 */

/**
 * Normalizes a code value by trimming whitespace and handling edge cases.
 * Preserves leading zeros (stored as TEXT, not parsed as integer).
 * 
 * @param value - The code value to normalize (string, null, or undefined)
 * @returns Normalized string, or null if empty/invalid
 * 
 * @example
 * normalizeCode("  101  ")  // "101"
 * normalizeCode("0050")     // "0050" (leading zeros preserved)
 * normalizeCode("")         // null
 * normalizeCode(null)       // null
 * normalizeCode(undefined)  // null
 * normalizeCode("  ")       // null
 */
export function normalizeCode(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Convert to string in case a number was passed
  let normalized = String(value);

  // Trim whitespace from both ends
  normalized = normalized.trim();

  // Return null for empty strings
  if (normalized === '') {
    return null;
  }

  // Preserve the value as-is (including leading zeros)
  // Do NOT parseInt or parseFloat - codes are identifiers, not numbers
  return normalized;
}

/**
 * Normalizes a label/name value (fund_name, department_name, etc.)
 * 
 * @param value - The label value to normalize
 * @returns Normalized string, or null if empty/invalid
 * 
 * @example
 * normalizeLabel("  General Fund  ")     // "General Fund"
 * normalizeLabel("Police   Department")  // "Police Department" (collapses spaces)
 * normalizeLabel("")                     // null
 */
export function normalizeLabel(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let normalized = String(value);

  // Trim whitespace
  normalized = normalized.trim();

  // Collapse multiple spaces into single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Return null for empty strings
  if (normalized === '') {
    return null;
  }

  return normalized;
}

/**
 * Validates that a label meets minimum requirements
 * 
 * @param label - The label to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateLabel(label: string | null | undefined): { isValid: boolean; error?: string } {
  const normalized = normalizeLabel(label);

  if (normalized === null) {
    return { isValid: false, error: 'Label is required' };
  }

  if (normalized.length < 2) {
    return { isValid: false, error: 'Label must be at least 2 characters' };
  }

  // Warn if looks like a code (all digits or common code patterns)
  if (/^\d+$/.test(normalized)) {
    return { isValid: true, error: 'Warning: Label looks like a code number' };
  }

  // Warn if all caps (might be a code or acronym)
  if (normalized === normalized.toUpperCase() && normalized.length > 3) {
    return { isValid: true, error: 'Warning: Label is all uppercase' };
  }

  return { isValid: true };
}

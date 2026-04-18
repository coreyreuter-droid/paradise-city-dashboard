// app/api/admin/lookups/departments/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { requireCsrf } from '@/lib/csrf';
import {
  ValidateLookupRequest,
  ValidateLookupResponse,
  LookupInputRow,
} from '@/lib/lookups/types';
import {
  validateRows,
  computeLookupDiff,
  generateValidationToken,
} from '@/lib/lookups/validation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const csrfError = await requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    // Auth check
    const auth = await requireAdmin(req);
    if (!auth.success) return auth.error;
    const user = auth.data.user;

    // Parse request
    const body = await req.json() as ValidateLookupRequest;
    const { rows, effectiveStartFy, mode } = body;

    // Basic validation
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { valid: false, errors: [{ row: 0, code: '', message: 'No rows provided' }] },
        { status: 400 }
      );
    }

    if (!effectiveStartFy || typeof effectiveStartFy !== 'number') {
      return NextResponse.json(
        { valid: false, errors: [{ row: 0, code: '', message: 'Effective start fiscal year is required' }] },
        { status: 400 }
      );
    }

    if (!mode || !['replace', 'additional'].includes(mode)) {
      return NextResponse.json(
        { valid: false, errors: [{ row: 0, code: '', message: 'Mode must be "replace" or "additional"' }] },
        { status: 400 }
      );
    }

    // Normalize input rows
    const normalizedRows: LookupInputRow[] = rows.map(r => ({
      code: (r.code ?? '').toString().trim(),
      name: (r.name ?? '').toString().trim(),
    }));

    // Validate rows
    const errors = validateRows(normalizedRows);
    if (errors.length > 0) {
      return NextResponse.json({
        valid: false,
        summary: { totalInFile: rows.length, willInsert: 0, willCloseOut: 0, unchangedCodes: 0, renamedCodes: 0, removedCodes: 0, newCodes: 0 },
        changes: { toInsert: [], toCloseOut: [], renamed: [], removed: [] },
        errors,
        warnings: [],
        validationToken: '',
      } as ValidateLookupResponse);
    }

    // Fetch current lookups (only active ones - no end date)
    const { data: currentLookups, error: fetchError } = await supabaseAdmin
      .from('departments_dim')
      .select('id, department_code, department_name, effective_start_fy, effective_end_fy')
      .is('effective_end_fy', null);

    if (fetchError) {
      console.error('Failed to fetch current lookups:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch current lookups' }, { status: 500 });
    }

    // Map to common format
    const mappedCurrent = (currentLookups ?? []).map((row) => ({
      id: row.id,
      code: row.department_code,
      name: row.department_name,
      effective_start_fy: row.effective_start_fy,
      effective_end_fy: row.effective_end_fy,
    }));

    // Compute diff
    const diff = computeLookupDiff(mappedCurrent, normalizedRows, effectiveStartFy, mode);

    // Generate validation token
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret';
    const validationToken = generateValidationToken(
      'departments',
      mode,
      effectiveStartFy,
      normalizedRows,
      diff.changes,
      user.id,
      secret
    );

    const response: ValidateLookupResponse = {
      valid: true,
      summary: diff.summary,
      changes: diff.changes,
      errors: [],
      warnings: diff.warnings,
      validationToken,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Departments validate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

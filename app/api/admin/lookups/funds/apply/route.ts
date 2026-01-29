// app/api/admin/lookups/funds/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { ApplyLookupRequest, ApplyLookupResponse } from '@/lib/lookups/types';
import { verifyValidationToken } from '@/lib/lookups/validation';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { user } = await requireAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await req.json() as ApplyLookupRequest;
    const { validationToken, confirmRemovals, confirmRenames } = body;

    if (!validationToken) {
      return NextResponse.json({ error: 'Validation token is required' }, { status: 400 });
    }

    // Verify token
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-secret';
    const validated = verifyValidationToken(validationToken, user.id, secret);

    if (!validated) {
      return NextResponse.json(
        { error: 'Invalid or expired validation token. Please re-validate.' },
        { status: 400 }
      );
    }

    // Check lookup type
    if (validated.lookupType !== 'funds') {
      return NextResponse.json(
        { error: 'Invalid validation token (wrong lookup type)' },
        { status: 400 }
      );
    }

    // Check confirmations
    if (validated.hasRemovals && !confirmRemovals) {
      return NextResponse.json(
        { error: 'Must confirm removals to proceed' },
        { status: 400 }
      );
    }

    if (validated.hasRenames && !confirmRenames) {
      return NextResponse.json(
        { error: 'Must confirm renames to proceed' },
        { status: 400 }
      );
    }

    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { changes, effectiveStartFy, mode } = validated;

    // Execute in a transaction-like manner
    // Step 1: Close out existing entries (if any)
    if (changes.toCloseOut.length > 0) {
      const closeOutCodes = changes.toCloseOut.map(c => c.code);
      
      // Get current entries to log
      const { data: currentEntries } = await supabaseAdmin
        .from('funds_dim')
        .select('*')
        .in('fund_code', closeOutCodes)
        .is('effective_end_fy', null);

      // Update to set end date
      const { error: closeError } = await supabaseAdmin
        .from('funds_dim')
        .update({ 
          effective_end_fy: effectiveStartFy - 1,
          updated_at: now,
        })
        .in('fund_code', closeOutCodes)
        .is('effective_end_fy', null);

      if (closeError) {
        console.error('Failed to close out entries:', closeError);
        return NextResponse.json({ error: 'Failed to close out existing entries' }, { status: 500 });
      }

      // Log close actions
      const closeLogs = (currentEntries ?? []).map(entry => ({
        lookup_type: 'funds',
        action: 'close',
        lookup_code: entry.fund_code,
        old_values: entry,
        new_values: { ...entry, effective_end_fy: effectiveStartFy - 1 },
        affected_fy_start: entry.effective_start_fy,
        affected_fy_end: effectiveStartFy - 1,
        actor_user_id: user.id,
        actor_email: user.email,
        upload_batch_id: batchId,
      }));

      if (closeLogs.length > 0) {
        await supabaseAdmin.from('lookup_audit_log').insert(closeLogs);
      }
    }

    // Step 2: Insert new entries
    let inserted = 0;
    if (changes.toInsert.length > 0) {
      const newEntries = changes.toInsert.map(item => ({
        fund_code: item.code,
        fund_name: item.name,
        effective_start_fy: item.effectiveStartFy,
        effective_end_fy: null,
        created_at: now,
        updated_at: now,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('funds_dim')
        .insert(newEntries);

      if (insertError) {
        console.error('Failed to insert new entries:', insertError);
        return NextResponse.json({ error: `Failed to insert new entries: ${insertError.message}` }, { status: 500 });
      }

      inserted = newEntries.length;

      // Log insert actions
      const insertLogs = changes.toInsert.map(item => ({
        lookup_type: 'funds',
        action: 'insert',
        lookup_code: item.code,
        old_values: null,
        new_values: { fund_code: item.code, fund_name: item.name, effective_start_fy: item.effectiveStartFy },
        affected_fy_start: item.effectiveStartFy,
        affected_fy_end: null,
        actor_user_id: user.id,
        actor_email: user.email,
        upload_batch_id: batchId,
      }));

      if (insertLogs.length > 0) {
        await supabaseAdmin.from('lookup_audit_log').insert(insertLogs);
      }
    }

    // Log bulk action
    await supabaseAdmin.from('lookup_audit_log').insert({
      lookup_type: 'funds',
      action: mode === 'replace' ? 'bulk_replace' : 'bulk_additional',
      lookup_code: '*',
      old_values: null,
      new_values: {
        mode,
        effectiveStartFy,
        totalInserted: inserted,
        totalClosedOut: changes.toCloseOut.length,
      },
      affected_fy_start: effectiveStartFy,
      affected_fy_end: null,
      actor_user_id: user.id,
      actor_email: user.email,
      upload_batch_id: batchId,
    });

    // Step 3: Refresh by-year table
    const { error: refreshError } = await supabaseAdmin.rpc('refresh_funds_by_year');

    if (refreshError) {
      console.error('Failed to refresh by-year table:', refreshError);
      // Don't fail the request, just log it
    }

    // Get affected fiscal years
    const { data: fiscalYears } = await supabaseAdmin
      .from('funds_dim_by_year')
      .select('fiscal_year')
      .order('fiscal_year');

    const affectedFiscalYears = [...new Set((fiscalYears ?? []).map(r => r.fiscal_year))];

    const response: ApplyLookupResponse = {
      success: true,
      applied: {
        inserted,
        closedOut: changes.toCloseOut.length,
        affectedFiscalYears,
      },
      auditBatchId: batchId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Funds apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

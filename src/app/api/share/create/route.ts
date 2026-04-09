import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createAdminSupabaseClient } from '@/lib/db/admin';
import {
  computeExpiryDate,
  generateShareToken,
  hashShareToken,
  normalizeSharePolicy,
} from '@/lib/security/shareLinks';

interface ShareCreateBody {
  assessmentId: string;
  payload: {
    caregiver: Record<string, unknown>;
    clinician: Record<string, unknown>;
    handoffText: string;
  };
  policy?: {
    expiresHours?: number;
    maxAccesses?: number | null;
  };
}

function isMissingSharedPacketsTable(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('shared_packets') && normalized.includes('could not find the table');
}

export async function POST(request: Request) {
  let body: ShareCreateBody;

  try {
    body = (await request.json()) as ShareCreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body?.assessmentId || !body?.payload?.caregiver || !body?.payload?.clinician || !body?.payload?.handoffText) {
    return NextResponse.json({ error: 'Missing required share payload fields.' }, { status: 400 });
  }

  const policy = normalizeSharePolicy(body.policy);
  const expiresAt = computeExpiryDate(policy.expiresHours);
  const token = generateShareToken();
  const tokenHash = hashShareToken(token);

  let createdBy: string | null = null;
  try {
    const supabaseUserClient = await createServerSupabaseClient();
    const { data } = await supabaseUserClient.auth.getUser();
    createdBy = data.user?.id ?? null;
  } catch {
    createdBy = null;
  }

  try {
    const admin = createAdminSupabaseClient();
    const insertPayload = {
      assessment_ref: body.assessmentId,
      created_by: createdBy,
      token_hash: tokenHash,
      payload: body.payload,
      expires_at: expiresAt,
      max_accesses: policy.maxAccesses,
      is_active: true,
    };

    const { error } = await admin.from('shared_packets').insert(insertPayload);

    if (error) {
      if (!isMissingSharedPacketsTable(error.message)) {
        return NextResponse.json({ error: `Failed to create share link: ${error.message}` }, { status: 500 });
      }

      // Legacy fallback for hackathon projects where only hackathon_results exists.
      const { error: legacyError } = await admin.from('hackathon_results').insert({
        id: tokenHash,
        payload: {
          assessment_ref: body.assessmentId,
          created_by: createdBy,
          token_hash: tokenHash,
          payload: body.payload,
          expires_at: expiresAt,
          access_count: 0,
          max_accesses: policy.maxAccesses,
          is_active: true,
          last_accessed_at: null,
        },
      });

      if (legacyError) {
        return NextResponse.json({ error: `Failed to create share link: ${legacyError.message}` }, { status: 500 });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    shareUrl: `${origin}/share/${token}`,
    expiresAt,
    maxAccesses: policy.maxAccesses,
  });
}

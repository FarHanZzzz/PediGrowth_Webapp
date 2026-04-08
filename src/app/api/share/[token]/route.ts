import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/db/admin';
import { hashShareToken } from '@/lib/security/shareLinks';

interface SharedPacketRecord {
  id: string;
  payload: {
    caregiver: Record<string, unknown>;
    clinician: Record<string, unknown>;
    handoffText: string;
  };
  expires_at: string;
  access_count: number;
  max_accesses: number | null;
  is_active: boolean;
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  const token = params.token;

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid share token.' }, { status: 400 });
  }

  const tokenHash = hashShareToken(token);

  let record: SharedPacketRecord | null = null;
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('shared_packets')
      .select('id, payload, expires_at, access_count, max_accesses, is_active')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Failed to resolve share link: ${error.message}` }, { status: 500 });
    }

    record = data as SharedPacketRecord | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!record || !record.is_active) {
    return NextResponse.json({ error: 'Share link is inactive or not found.' }, { status: 404 });
  }

  const now = Date.now();
  const expiry = Date.parse(record.expires_at);
  if (!Number.isFinite(expiry) || expiry <= now) {
    return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
  }

  if (record.max_accesses !== null && record.access_count >= record.max_accesses) {
    return NextResponse.json({ error: 'This share link reached its access limit.' }, { status: 410 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from('shared_packets')
      .update({
        access_count: record.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (error) {
      return NextResponse.json({ error: `Share access accounting failed: ${error.message}` }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    payload: record.payload,
    expiresAt: record.expires_at,
    accessCount: record.access_count + 1,
    maxAccesses: record.max_accesses,
  });
}

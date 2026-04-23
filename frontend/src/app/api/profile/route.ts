import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type ProfilePatchBody = {
  displayName?: unknown;
  wpm?: unknown;
};

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const body = (await req.json()) as ProfilePatchBody;

  const updates: Record<string, string | number> = {};

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 100) {
      return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
    }
    updates.display_name = body.displayName.trim();
  }

  if (body.wpm !== undefined) {
    const wpm = typeof body.wpm === 'number' ? body.wpm : NaN;
    if (isNaN(wpm) || wpm < 100 || wpm > 1000) {
      return NextResponse.json({ error: 'WPM must be between 100 and 1000' }, { status: 400 });
    }
    updates.default_wpm = wpm;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('users')
    .upsert({ id: user.id, ...updates }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

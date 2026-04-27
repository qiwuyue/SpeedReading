import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type ComprehensionCheckBody = {
  sessionId?: string;
  questions?: unknown;
  answers?: unknown;
  score?: unknown;
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const body = (await req.json()) as ComprehensionCheckBody;

  if (!body.sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  if (!Array.isArray(body.questions) || !Array.isArray(body.answers)) {
    return NextResponse.json(
      { error: 'Questions and answers must be arrays' },
      { status: 400 },
    );
  }

  const score = typeof body.score === 'number' ? body.score : NaN;
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
    /\/$/,
    '',
  );
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const { data: readingSession, error: sessionError } = await supabase
    .from('reading_sessions')
    .select('id')
    .eq('id', body.sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !readingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('comprehension_checks')
    .insert({
      session_id: body.sessionId,
      questions_json: body.questions,
      answers_json: body.answers,
      score,
    })
    .select('id, session_id, score, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ check: data }, { status: 201 });
}

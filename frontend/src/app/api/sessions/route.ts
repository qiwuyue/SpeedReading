import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  // Use FormData instead of JSON to preserve raw binary file bytes
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const documentName = formData.get('documentName') as string | null;
  const pagesLength = Number(formData.get('pagesLength') ?? 1);

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!documentName) {
    return NextResponse.json(
      { error: 'No document name provided' },
      { status: 400 },
    );
  }

  if (!pagesLength) {
    return NextResponse.json(
      { error: 'No pages length provided' },
      { status: 400 },
    );
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

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  let fileId: string | null = null;
  let storagePath: string | null = null;
  let targetWpm = 250;

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('default_wpm')
    .eq('id', user.id)
    .single();

  if (!profileError && typeof profileData?.default_wpm === 'number') {
    targetWpm = profileData.default_wpm;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${documentName}`;
    const filePath = `${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('speed reading-documents')
      .upload(filePath, arrayBuffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `File upload failed: ${uploadError.message}` },
        { status: 400 },
      );
    }

    storagePath = uploadData.path;
  } catch (error) {
    return NextResponse.json(
      {
        error: `File processing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 400 },
    );
  }

  // Create document record in the database
  if (storagePath) {
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        original_filename: documentName,
        storage_path: storagePath,
        file_size_bytes: file.size,
        is_sample: false,
      })
      .select()
      .single();

    if (documentError) {
      return NextResponse.json(
        { error: `Document creation failed: ${documentError.message}` },
        { status: 400 },
      );
    }

    fileId = documentData.id;
  }

  // Create a new reading session
  console.log({
    user_id: user.id,
    document_id: fileId,
    target_wpm: targetWpm,
    words_read: 0,
    duration_seconds: 0,
    completed: false,
    start_page: 1,
    end_page: pagesLength,
  });

  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      user_id: user.id,
      document_id: fileId,
      target_wpm: targetWpm,
      words_read: 0,
      duration_seconds: 0,
      completed: false,
      start_page: 1,
      end_page: pagesLength,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type DeleteDocumentParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, { params }: DeleteDocumentParams) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { id: documentId } = await params;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
    /\/$/,
    '',
  );
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { error: sessionsError } = await supabase
      .from('reading_sessions')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', user.id);

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 400 });
    }

    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('speed reading-documents')
        .remove([document.storage_path]);

      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 400 });
      }
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 },
    );
  }
}

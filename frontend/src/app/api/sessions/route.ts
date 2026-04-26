import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type SessionPostBody = {
  documentName?: string;
  pagesLength?: number;
  file?: Uint8Array<ArrayBuffer>; // base64 encoded file
};



export const runtime = 'edge'; // force Node.js runtime

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const body = (await req.json()) as SessionPostBody;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

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
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  let fileId: string | null = null;
  let storagePath: string | null = null;

  if (!body.file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!body.documentName) {
    return NextResponse.json({ error: "No document name provided" }, { status: 400 });
  }

  if (!body.pagesLength) {
    return NextResponse.json({ error: "No pages length provided" }, { status: 400 });
  }


  // Upload file to storage if provided
  try {
    const bytes = body.file;

    const fileName = `${Date.now()}-${body.documentName || "document"}`;
    const filePath = `${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("speed reading-documents")
      .upload(filePath, bytes, {
        contentType: "application/pdf",
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
        error: `File processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 400 },
    );
  }


  // create document record in the database
  if (storagePath) {
    const { data: documentData, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        original_filename: body.documentName || "document",
        storage_path: storagePath,
        file_size_bytes: body.file?.byteLength || 0,
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

    fileId = documentData.id; // use the document record ID as the fileId for the session
  }

  // Create a new session
  console.log({
    user_id: user.id,
    document_id: fileId,
    target_wpm: 300,
    words_read: 0,
    duration_seconds: 0,
    completed: false,
    start_page: 1,
    end_page: body.pagesLength,
  });
  const { data, error } = await supabase
    .from("reading_sessions")
    .insert({
      user_id: user.id,
      document_id: fileId,
      target_wpm: 300, 
      words_read: 0,
      duration_seconds: 0,
      completed: false,
      start_page: 1,
      end_page: body.pagesLength
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}

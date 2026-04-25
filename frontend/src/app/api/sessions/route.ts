import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type SessionPostBody = {
  documentName?: string;
  file?: Uint8Array<ArrayBuffer>; // base64 encoded file
};

export const runtime = "edge";

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

  // Upload file to storage if provided
  if (body.file) {
    try {
      const bytes = body.file;

      const fileName = `${Date.now()}-${body.documentName || "document"}.pdf`;
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

      fileId = uploadData.path;
    } catch (error) {
      return NextResponse.json(
        {
          error: `File processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 400 },
      );
    }
  }

  // Create a new session
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      file_id: fileId,
      created_at: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessionId: data.id }, { status: 201 });
}

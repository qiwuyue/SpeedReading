import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing file id" }, { status: 400 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // get the file metadata from Supabase, join sessions and documents tables to verify ownership
  const { data: fileMeta, error: metaError } = await supabase
    .from("documents")
    .select("id, storage_path, original_filename")
    .eq("id", id)
    .single();

  console.log("File metadata:", fileMeta, "Error:", metaError);
  if (metaError || !fileMeta) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (!fileMeta.storage_path) {
    return NextResponse.json(
      { error: "File storage path is missing" },
      { status: 400 },
    );
  }

  // Download from Supabase Storage
  let fileBytes: ArrayBuffer | null = null;
  let fileError: string | null = null;
  const originalFilename = fileMeta.original_filename || "document.pdf";

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("speed reading-documents")
      .download(fileMeta.storage_path);

    if (downloadError) {
      fileError = downloadError.message;
    } else if (fileData) {
      fileBytes = await fileData.arrayBuffer();
    }
  } catch (err) {
    fileError = err instanceof Error ? err.message : "Failed to download file";
  }

  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 500 });
  }

  if (!fileBytes) {
    return NextResponse.json(
      { error: "File content is empty" },
      { status: 500 },
    );
  }

  return new NextResponse(fileBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${originalFilename}`,
    },
  });
}

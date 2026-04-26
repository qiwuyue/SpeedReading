import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Download from Supabase Storage
  let fileBytes: string | null = null;
  let fileError: string | null = null;

    try {
    const { data: fileData, error: downloadError } = await supabase.storage
        .from("speed reading-documents")
        .download(id);

    if (downloadError) {
        fileError = downloadError.message;
    } else if (fileData) {
        const buffer = await fileData.arrayBuffer();
        fileBytes = Buffer.from(buffer).toString("base64");
    }
    } catch (err) {
    fileError =
        err instanceof Error ? err.message : "Failed to download file";
    }
  

  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 500 });
  }

  return new NextResponse(fileBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=file.pdf",
    },
  });
}

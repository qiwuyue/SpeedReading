import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type GetSessionParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: GetSessionParams) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const { id: sessionId } = await params;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Fetch session by ID and verify it belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // let fileBytes: ArrayBuffer | null = null;
    // let fileError = null;

    // Fetch file from storage if file_id exists
    // if (session.file_id) {
    //   try {
    //     const { data: fileData, error: downloadError } = await supabase.storage
    //       .from("speed reading-documents")
    //       .download(session.file_id);

    //     if (downloadError) {
    //       fileError = downloadError.message;
    //     } else if (fileData) {
    //       const buffer = await fileData.arrayBuffer();
    //       fileBytes = Buffer.from(buffer).toString("base64");
    //     }
    //   } catch (err) {
    //     fileError =
    //       err instanceof Error ? err.message : "Failed to download file";
    //   }
    // }

    return NextResponse.json({
      session: {
        id: session.id,
        user_id: session.user_id,
        file_id: session.file_id,
        created_at: session.created_at,
        status: session.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch session",
      },
      { status: 500 },
    );
  }
}

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

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

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
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
      .from("reading_sessions")
      .select("id, user_id, document_id, target_wpm, created_at, completed")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        user_id: session.user_id,
        file_id: session.document_id,
        target_wpm: session.target_wpm,
        created_at: session.created_at,
        completed: session.completed,
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch session",
      },
      { status: 500 },
    );
  }
}

type SessionPatchBody = {
  words_read?: number;
  achieved_wpm?: number | null;
  duration_seconds?: number;
  completed?: boolean;
};

const getNumberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export async function PATCH(req: NextRequest, { params }: GetSessionParams) {
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

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = (await req.json()) as SessionPatchBody;

    if (typeof body.completed !== "boolean") {
      return NextResponse.json(
        { error: "Session completion status is required" },
        { status: 400 },
      );
    }

    const wordsRead = getNumberValue(body.words_read);
    const achievedWpm = getNumberValue(body.achieved_wpm);
    const durationSeconds = getNumberValue(body.duration_seconds);

    const updatePayload: SessionPatchBody = {
      completed: body.completed,
    };

    if (wordsRead !== null) {
      updatePayload.words_read = Math.max(0, Math.floor(wordsRead));
    }

    if (achievedWpm !== null) {
      updatePayload.achieved_wpm = Math.max(0, Math.round(achievedWpm));
    }

    if (durationSeconds !== null) {
      updatePayload.duration_seconds = Math.max(
        0,
        Math.floor(durationSeconds),
      );
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 },
      );
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("reading_sessions")
      .update(updatePayload)
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select("id, words_read, achieved_wpm, duration_seconds, completed")
      .single();

    if (updateError || !updatedSession) {
      return NextResponse.json(
        { error: updateError?.message ?? "Session not found" },
        { status: 400 },
      );
    }

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update session",
      },
      { status: 500 },
    );
  }
}

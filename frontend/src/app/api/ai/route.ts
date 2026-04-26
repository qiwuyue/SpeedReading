import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
export const runtime = "nodejs";

const client = new Groq({ apiKey: process.env.GROQ_KEY });
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const SUPPORTED_MIME_TYPES = new Set(["application/pdf"]);

const SYSTEM_PROMPT = `
You are a reading-speed trainer assistant.
You will receive ONE chunk of text.
Generate 4 MCQs with 4 options and correct index for that chunk.
Return ONLY valid JSON:
{
  "title": "string",
  "text": "string",
  "questions": [
    {
      "q": "string",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const authHeader = req.headers.get("authorization");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token" },
        { status: 401 },
      );
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/extract-text?wordsPerChunk=200`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/pdf",
        },
        body: Buffer.from(await file.arrayBuffer()),
      },
    );

    if (!backendResponse.ok) {
      const backendError = await backendResponse.text();
      console.error("Backend error:", backendError);

      return NextResponse.json(
        { error: backendError },
        { status: backendResponse.status },
      );
    }

    const extracted = (await backendResponse.json()) as {
      text?: string;
      chunks?: string[];
      wordsPerChunk?: number;
      chunkCount?: number;
    };

    const chunks = Array.isArray(extracted.chunks) ? extracted.chunks : [];

    if (!chunks.length) {
      return NextResponse.json(
        { error: "File appears to be empty" },
        { status: 400 },
      );
    }

    console.log(`Split into ${chunks.length} chunks`);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          // ✅ Process each chunk separately
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            const response = await client.chat.completions.create({
              model: "llama3-8b-8192",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "user",
                  content: `Document: ${file.name}\nChunk ${i + 1} of ${chunks.length}:\n\n${chunk}`,
                },
              ],
              stream: true,
            });

            let chunkResponse = "";

            for await (const event of response) {
              const delta = event.choices[0]?.delta?.content;
              const finishReason = event.choices[0]?.finish_reason;

              if (delta) {
                chunkResponse += delta;
              }

              if (finishReason === "stop") {
                // ✅ Send completed chunk result to client
                try {
                  const parsed = JSON.parse(chunkResponse);
                  enqueue(
                    JSON.stringify({
                      chunkIndex: i,
                      total: chunks.length,
                      data: parsed,
                    }),
                  );
                } catch {
                  enqueue(
                    JSON.stringify({
                      chunkIndex: i,
                      total: chunks.length,
                      error: "Failed to parse JSON",
                    }),
                  );
                }
                break;
              }
            }
          }

          enqueue("[DONE]");
          controller.close();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          console.error("Error processing chunks:", err);
          enqueue(JSON.stringify({ error: errorMessage }));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /api/ai:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

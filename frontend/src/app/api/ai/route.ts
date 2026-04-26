import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { z } from "zod";

const client = new Groq({
  apiKey: process.env.GROQ_KEY,
});

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

const SYSTEM_PROMPT = `
You are a reading-speed trainer assistant.

Split the document into 2–4 chunks (150–250 words each).
For each chunk, generate 4 MCQs with 4 options and correct index.

Return ONLY valid JSON:
{
  "chunks": [
    {
      "title": "string",
      "text": "string",
      "questions": [
        {
          "q": "string",
          "options": ["A","B","C","D"],
          "answer": 0
        }
      ]
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString("base64");

    // ✅ 2. Stream response correctly
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    document: {
                      data: {
                        data: base64String,
                        mime_type: "application/pdf",
                      },
                    },
                  },
                ],
              },
            ],
            stream: true,
          });

          // ✅ correct streaming iteration
          for await (const event of response) {
              controller.enqueue(encoder.encode(`data: ${event.choices[0].delta}\n\n`));

            if (event.choices[0].finish_reason === "stop") {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`,
            ),
          );
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
  } catch (error){
    console.log("Error in /api/ai:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}

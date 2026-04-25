import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
const client = new OpenAI({
  apiKey: process.env.GROQ_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export interface Question {
  q: string;
  options: [string, string, string, string];
  answer: number;
}

export interface Chunk {
  title: string;
  text: string;
  questions: Question[];
}

import { z } from "zod";

export const QuestionSchema = z.object({
  q: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  answer: z.number().int().min(0).max(3),
});

export const ChunkSchema = z.object({
  title: z.string(),
  text: z.string(),
  questions: z.array(QuestionSchema).length(4),
});

export const AnalyzeResponseSchema = z.object({
  chunks: z.array(ChunkSchema),
});

export interface AnalyzeResponse {
  chunks: Chunk[];
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

const SYSTEM_PROMPT = `You are a reading-speed trainer assistant. Given the document content, do two things:

1. Split it into 2–4 coherent chunks of roughly 150–250 words each. Each chunk should be self-contained and readable on its own.
2. For each chunk, generate exactly 4 multiple-choice comprehension questions with 4 answer options each. Indicate the correct answer as a 0-based index.

Return ONLY valid JSON matching this exact shape — no preamble, no markdown fences:
{
  "chunks": [
    {
      "title": "Short descriptive title",
      "text": "The chunk text...",
      "questions": [
        {
          "q": "Question text?",
          "options": ["A", "B", "C", "D"],
          "answer": 0
        }
      ]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const encoder = new TextEncoder();

  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const mimeType = file.type || "text/plain";

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Use PDF or plain text.` },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const fileData = `data:${file.type};base64,${base64}`;

  const stream = new ReadableStream({
    async start(controller) {
      const openaiStream = await client.responses.parse(
        {
          model: "openai/gpt-oss-120b",
          text: {
            format: {
              name: "analyze",
              type: "json_object",
              schema: zodResponseFormat(AnalyzeResponseSchema, "analyze"),
            },
          },
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: SYSTEM_PROMPT }],
            },
            {
              role: "user",
              content: [{ type: "input_file", file_data: fileData }],
            },
          ],
        },
        { stream: true },
      );
      for await (const event of openaiStream.output) {
        if (event.type === "message") {
          controller.enqueue(encoder.encode(`data: ${event.content}\n\n`));
        }

        if (event.type === "message" && event.status === "completed") {
          const parsed = event.content;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, result: parsed })}\n\n`,
            ),
          );
          controller.close();
        }
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
}
import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const client = new Groq({ apiKey: process.env.GROQ_KEY });
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

const SYSTEM_PROMPT = `
You are a reading-speed trainer assistant.
You will receive ONE chunk of text. The text may have missing spaces between words due to PDF extraction — fix the spacing in the text field before generating questions.
Generate 4 MCQs with 4 options and correct index for that chunk.
Return ONLY valid JSON:
{
  "title": "string",
  "text": "string (with proper spacing restored)",
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
    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Authorization Bearer token' },
        { status: 401 },
      );
    }

    const token = authHeader.split(' ')[1];
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
      /\/$/,
      '',
    );
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get file metadata
    const { data: fileMeta, error: metaError } = await supabase
      .from('documents')
      .select('id, storage_path, original_filename')
      .eq('id', fileId)
      .single();

    if (metaError || !fileMeta) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Create a signed URL and fetch raw binary directly
    // This bypasses Supabase JS client serialization issues with .download()
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from('speed reading-documents')
        .createSignedUrl(fileMeta.storage_path, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 },
      );
    }

    const rawResponse = await fetch(signedUrlData.signedUrl);
    if (!rawResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file from storage' },
        { status: 500 },
      );
    }

    const arrayBuffer = await rawResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      'First 5 bytes:',
      buffer[0],
      buffer[1],
      buffer[2],
      buffer[3],
      buffer[4],
    );

    const backendResponse = await fetch(
      `${BACKEND_URL}/extract-text?wordsPerChunk=200`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/pdf',
        },
        body: buffer,
      },
    );

    if (!backendResponse.ok) {
      const backendError = await backendResponse.text();
      console.error('Backend error:', backendError);
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
        { error: 'File appears to be empty' },
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
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            const response = await client.chat.completions.create({
              model: 'openai/gpt-oss-120b',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: `Document: ${fileMeta.original_filename}\nChunk ${
                    i + 1
                  } of ${chunks.length}:\n\n${chunk}`,
                },
              ],
              stream: true,
            });

            let chunkResponse = '';

            for await (const event of response) {
              const delta = event.choices[0]?.delta?.content;
              const finishReason = event.choices[0]?.finish_reason;

              if (delta) {
                chunkResponse += delta;
              }

              if (finishReason === 'stop') {
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
                      error: 'Failed to parse JSON',
                    }),
                  );
                }
                break;
              }
            }
          }

          enqueue('[DONE]');
          controller.close();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An error occurred';
          console.error('Error processing chunks:', err);
          enqueue(JSON.stringify({ error: errorMessage }));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in /api/ai:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

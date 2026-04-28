const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { PDFParse } = require('pdf-parse');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

function chunkText(text, wordsPerChunk = 200) {
  // Insert spaces before capital letters that follow lowercase (CamelCase words merged)
  const normalized = text
    .replace(/([a-z,\.])([A-Z])/g, '$1 $2') // "faintly,Shop" → "faintly, Shop"
    .replace(/([a-zA-Z])(\d)/g, '$1 $2') // letters followed by numbers
    .replace(/(\d)([a-zA-Z])/g, '$1 $2'); // numbers followed by letters

  const words = normalized.trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  console.log(`Total words extracted: ${words.length}`);
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

function getWordsPerChunk(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 200;
  }
  return Math.floor(parsed);
}

function isPdfBytes(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    return false;
  }
  const pdfSignature = inputBuffer.subarray(0, 5).toString('utf8');
  return pdfSignature === '%PDF-';
}

async function extractPdfText(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const result = await parser.getText({ pageJoiner: '\n\n' });
    console.log(
      `Pages: ${result.total}, extracted text length: ${result.text.length}`,
    );
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}
async function requireSupabaseAuth(req, res, next) {
  if (!supabase) {
    return res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing JWT token' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  return next();
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
);

// Skip global JSON parsing for /extract-text so express.raw can handle it cleanly
app.use((req, res, next) => {
  if (req.path === '/extract-text') return next();
  express.json()(req, res, next);
});

app.get('/', (req, res) => {
  res.json({
    message: 'SpeedReading backend is running',
    status: 'ok',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.post(
  '/extract-text',
  express.raw({ type: '*/*', limit: '20mb' }),
  (req, res, next) => {
    console.log('--- DEBUG /extract-text ---');
    console.log(
      'Body type:',
      typeof req.body,
      '| Is Buffer:',
      Buffer.isBuffer(req.body),
    );
    console.log('Body length:', req.body?.length);
    console.log(
      'First 10 bytes (utf8):',
      req.body?.subarray(0, 10).toString('utf8'),
    );
    console.log(
      'First 10 bytes (hex):',
      req.body?.subarray(0, 10).toString('hex'),
    );
    console.log('---------------------------');
    next();
  },
  requireSupabaseAuth,
  async (req, res) => {
    const contentType = (
      req.headers['content-type'] || 'application/octet-stream'
    ).toLowerCase();
    const wordsPerChunk = getWordsPerChunk(req.query.wordsPerChunk);

    if (!contentType.startsWith('application/pdf')) {
      return res.status(415).json({
        error:
          'Only PDF blobs are supported. Use Content-Type: application/pdf.',
      });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({ error: 'Input must be a non-empty PDF blob' });
    }

    if (!isPdfBytes(req.body)) {
      return res
        .status(400)
        .json({ error: 'Buffer does not appear to be a valid PDF' });
    }

    let text = '';

    try {
      text = await extractPdfText(req.body);
    } catch (err) {
      console.error('PDF parse error:', err);
      return res.status(400).json({ error: 'Failed to parse PDF blob' });
    }

    if (!text) {
      return res
        .status(400)
        .json({ error: 'Could not extract text from PDF blob' });
    }

    const chunks = chunkText(text, wordsPerChunk);

    return res.json({
      userId: req.user.id,
      text,
      chunkCount: chunks.length,
      wordsPerChunk,
      chunks,
    });
  },
);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

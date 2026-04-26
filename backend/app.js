const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const { PDFParse } = require("pdf-parse");

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
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  console.log(`Total words extracted: ${words.length}`, words);
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
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

  const pdfSignature = inputBuffer.subarray(0, 5).toString("utf8");
  return pdfSignature === "%PDF-";
}


async function extractPdfText(pdfBuffer) {
  try {
   	const parser = new PDFParse(pdfBuffer);
    return (await parser.getText()).text || "";
  } catch {
    console.warn("pdf-parse failed, falling back to basic PDF text extraction");
  }
}

async function requireSupabaseAuth(req, res, next) {
  if (!supabase) {
    return res.status(500).json({
      error:
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing JWT token" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  return next();
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "SpeedReading backend is running",
    status: "ok",
  });
});

app.post(
  "/extract-text",
  requireSupabaseAuth,
  express.raw({ type: "*/*", limit: "20mb" }),
  async (req, res) => {
    const contentType = (
      req.headers["content-type"] || "application/octet-stream"
    ).toLowerCase();
    const wordsPerChunk = getWordsPerChunk(req.query.wordsPerChunk);

    if (!contentType.startsWith("application/pdf")) {
      return res.status(415).json({
        error:
          "Only PDF blobs are supported. Use Content-Type: application/pdf.",
      });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({ error: "Input must be a non-empty PDF blob" });
    }


    let text = "";

    try {
      text = await extractPdfText(req.body);
    } catch {
      return res.status(400).json({ error: "Failed to parse PDF blob" });
    }

    if (!text) {
      return res
        .status(400)
        .json({ error: "Could not extract text from PDF blob" });
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

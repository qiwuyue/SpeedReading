"use client";

import { useState } from "react";
import { Chunk, Screen } from "@/lib/types";
import { UploadScreen } from "./UploadScreen";
import { ChunkScreen } from "./ChunkScreen";
import { ReadScreen } from "./ReadScreen";
import { QuizScreen } from "./QuizScreen";
import { ResultsScreen } from "./ResultsScreen";

export function SpeedReader() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [wpm, setWpm] = useState(250);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const chunk = chunks[chunkIdx];

  function handleAnalyzed(c: Chunk[]) {
    setChunks(c);
    setChunkIdx(0);
    setScreen("chunks");
  }

  function handleStart(idx: number, w: number) {
    setChunkIdx(idx);
    setWpm(w);
    setScreen("read");
  }

  function handleReadFinish(_elapsed: number, actualWpm: number) {
    setWpm(actualWpm);
    setScreen("quiz");
  }

  function handleSubmit(a: (number | null)[]) {
    setAnswers(a);
    setScreen("results");
  }

  function handleRetryFaster() {
    setWpm((prev) => Math.min(prev + 50, 800));
    setScreen("read");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {screen === "upload" && (
        <UploadScreen onAnalyzed={handleAnalyzed} />
      )}
      {screen === "chunks" && chunk && (
        <ChunkScreen
          chunks={chunks}
          onStart={handleStart}
          onBack={() => setScreen("upload")}
        />
      )}
      {screen === "read" && chunk && (
        <ReadScreen
          title={chunk.title}
          partLabel={`Part ${chunkIdx + 1} of ${chunks.length} · ${
            chunk.text.split(/\s+/).filter(Boolean).length
          } words`}
          words={chunk.text.split(/\s+/).filter(Boolean)}
          initialWpm={wpm}
          onFinish={handleReadFinish}
          onQuit={() => setScreen("chunks")}
        />
      )}
      {screen === "quiz" && chunk && (
        <QuizScreen
          chunkTitle={chunk.title}
          wpm={wpm}
          questions={chunk.questions}
          onSubmit={handleSubmit}
        />
      )}
      {screen === "results" && chunk && (
        <ResultsScreen
          questions={chunk.questions}
          answers={answers}
          wpm={wpm}
          onRetryFaster={handleRetryFaster}
          onAnotherChunk={() => setScreen("chunks")}
          onNewText={() => setScreen("upload")}
        />
      )}
    </div>
  );
}

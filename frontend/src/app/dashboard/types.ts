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

export type Screen =
  | "upload"
  | "chunks"
  | "read"
  | "quiz"
  | "results";

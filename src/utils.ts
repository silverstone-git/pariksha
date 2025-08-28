import { Question } from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? "http://localhost:8671"
  : "https://outsie.aryan.cfd";

export const isValidExamQuestions = (
  questions: any,
): questions is Question[] => {
  return (
    Array.isArray(questions) &&
    questions.length > 0 &&
    questions.every(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.every(
          (opt: any) =>
            typeof opt.label === "number" && typeof opt.value === "string",
        ) &&
        typeof q.answer_label === "number" &&
        typeof q.topic === "string" &&
        typeof q.explanation === "string",
    )
  );
};

export const robustJsonParse = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof SyntaxError && error.message.includes("at position")) {
      const positionMatch = /at position (\d+)/.exec(error.message);
      if (positionMatch && positionMatch[1]) {
        const position = parseInt(positionMatch[1], 10);
        const fixedJsonString =
          jsonString.slice(0, position) + "\\" + jsonString.slice(position);
        try {
          return JSON.parse(fixedJsonString);
        } catch (secondError) {
          console.error("JSON parsing fix failed. Original error:", error);
          throw error;
        }
      }
    }
    throw error;
  }
};

export const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
};

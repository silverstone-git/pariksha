export interface Option {
  label: number;
  value: string;
}

export interface Question {
  question: string;
  options: Option[];
  answer_label: number;
  topic: string;
  explanation: string;
  image_path?: string;
}

export interface ShuffledQuestion extends Question {
  shuffledOptions: Option[];
  id: string;
}

export interface ExamConfig {
  name: string;
  questions: Question[];
  settings?: ExamSettings;
}

export interface ExamSettings {
  timerMinutes: number;
  timerHours: number;
  negativeMarking: number; // 0, 0.25, 0.33, etc.
  positiveMarking: number; // 1, 2, 3, etc.
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount?: number;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionLabel: number | null;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

export type SWOTAnalysis = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export interface ExamResult {
  id: string;
  examName: string;
  date: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  totalTimeTaken: number; // in seconds
  timePerTopic: Record<string, number>;
  accuracyPerTopic: Record<string, number>;
  swot: SWOTAnalysis;
  answers: UserAnswer[];
  originalQuestions: ShuffledQuestion[];
}

export interface ServerExam {
  exam_id: string;
  exam_title: string;
  datetime_uploaded: number;
}

export interface ServerExamDetail extends ServerExam {
  exam_json_str: string;
}

export type ExamPreset = "GATE" | "CSIR_NET" | "TIFR_GS" | "BARC_OCES" | "CUSTOM";

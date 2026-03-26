export type QuestionType = "MCQ" | "MSQ" | "NAT";

export interface Option {
  label: number;
  value: string;
}

export interface Question {
  id?: string; // Optional for backward compatibility
  type?: QuestionType; // Defaults to MCQ if undefined
  question: string;
  options?: Option[]; // Null for NAT
  answer_label?: number; // MCQ
  answer_labels?: number[]; // MSQ
  answer_range?: { min: number; max: number }; // NAT range
  answer_value?: string; // NAT exact
  topic: string;
  explanation: string;
  image_path?: string;
}

export interface ExamSection {
  id: string;
  name: string;
  questions: Question[];
  marking: { positive: number; negative: number };
  maxAttempts?: number; // e.g., "Answer 15/20"
  allowedTypes?: QuestionType[]; // New: Filter by question type for this section
}

export interface ShuffledQuestion extends Question {
  shuffledOptions: Option[];
  id: string; // Required for active exam sessions
}

export interface ExamConfig {
  name: string;
  sections?: ExamSection[]; // New structure
  questions?: Question[]; // Legacy structure
  settings?: ExamSettings;
}

export interface ExamSettings {
  timerMinutes: number;
  timerHours: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questionCount?: number;
  // Legacy global marking
  negativeMarking?: number;
  positiveMarking?: number;
}

export interface UserAnswer {
  questionId: string;
  type: QuestionType;
  selectedOptionLabel?: number | null; // MCQ
  selectedOptionLabels?: number[]; // MSQ
  enteredAnswer?: string; // NAT
  isCorrect: boolean;
  timeSpent: number; // in seconds
  isFlagged?: boolean; // New: Flag for review
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
  sectionScores?: Record<string, number>;
}

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
  sectionScores?: Record<string, number>;
}

export interface ServerExam {
  exam_id: string;
  exam_title: string;
  datetime_uploaded: number;
}

export interface ServerExamDetail extends ServerExam {
  exam_json_str: string;
  sections?: ExamSection[];
}

export type ExamPreset = "GATE" | "CSIR_NET" | "TIFR_GS" | "BARC_OCES" | "CUSTOM";


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
}

export interface ShuffledQuestion extends Question {
  shuffledOptions: Option[];
  id: string;
}

export interface ExamConfig {
  name: string;
  questions: Question[];
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

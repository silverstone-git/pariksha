import React from "react";
import { ChevronsLeft, ChevronsRight, AlertTriangle } from "lucide-react";
import { Latex } from "./Latex";
import type {
  ExamConfig,
  ExamResult,
  ShuffledQuestion,
  UserAnswer,
  SWOTAnalysis,
} from "../types";
import { shuffleArray } from "../utils";
import { Button } from "./Button";
import { Card } from "../App";

const SubmitConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unattemptedCount: number;
}> = ({ isOpen, onClose, onConfirm, unattemptedCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="text-yellow-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">Confirm Submission</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You have{" "}
            <span className="font-bold text-yellow-600">
              {unattemptedCount} unattempted question
              {unattemptedCount > 1 ? "s" : ""}
            </span>
            .
          </p>
          <p className="mb-6">Are you sure you want to submit the exam?</p>
          <div className="flex justify-center gap-4 w-full">
            <Button onClick={onClose} variant="secondary" className="w-1/2">
              Cancel
            </Button>
            <Button onClick={onConfirm} variant="danger" className="w-1/2">
              Submit Anyway
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const generateSwotAnalysis = (results: ExamResult): SWOTAnalysis => {
  const swot: SWOTAnalysis = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  };
  const topics = Object.keys(results.timePerTopic);

  if (topics.length === 0) return swot;

  const avgAccuracy = results.accuracy;
  const avgTimePerQuestion =
    results.totalQuestions > 0
      ? results.totalTimeTaken / results.totalQuestions
      : 0;

  topics.forEach((topic) => {
    const topicAccuracy = (results.accuracyPerTopic[topic] || 0) * 100;

    const questionsInTopic = results.originalQuestions.filter(
      (q) => q.topic === topic,
    );
    const numQuestionsInTopic = questionsInTopic.length;

    const totalTimeForTopic = results.timePerTopic[topic] || 0;
    const topicTimePerQuestion =
      numQuestionsInTopic > 0 ? totalTimeForTopic / numQuestionsInTopic : 0;

    const isAccurate = topicAccuracy > avgAccuracy + 5;
    const isFast = topicTimePerQuestion < avgTimePerQuestion - 5;
    const isSlow = topicTimePerQuestion > avgTimePerQuestion + 10;
    const isInaccurate = topicAccuracy < avgAccuracy - 10;

    if (isAccurate && isFast) {
      swot.strengths.push(`${topic}: High accuracy with excellent speed.`);
    } else if (isAccurate && !isFast) {
      swot.opportunities.push(
        `${topic}: Good accuracy, but speed can be improved.`,
      );
    } else if (isInaccurate && isSlow) {
      swot.weaknesses.push(
        `${topic}: Low accuracy and slow speed indicate a need for fundamental review.`,
      );
    } else if (isInaccurate && !isSlow) {
      swot.threats.push(
        `${topic}: Low accuracy with fast speed might suggest guessing or careless errors.`,
      );
    }
  });

  if (swot.strengths.length === 0)
    swot.strengths.push(
      "No standout strengths identified. Focus on overall improvement.",
    );
  if (swot.weaknesses.length === 0)
    swot.weaknesses.push(
      "No major weaknesses identified. Continue to practice consistently.",
    );
  if (swot.opportunities.length === 0)
    swot.opportunities.push(
      "Keep practicing all topics to improve speed and maintain accuracy.",
    );
  if (swot.threats.length === 0)
    swot.threats.push(
      "Be mindful of careless errors and avoid guessing. Review questions you are unsure about.",
    );

  return swot;
};

export const ExamScreen: React.FC<{
  config: ExamConfig;
  timerConfig: { hours: number; minutes: number };
  setScreen: (screen: "home" | "results") => void;
  setLastResult: (result: ExamResult) => void;
  setMainTimer: (time: number) => void;
}> = ({ config, timerConfig, setScreen, setLastResult, setMainTimer }) => {
  const [questions, setQuestions] = React.useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [userAnswers, setUserAnswers] = React.useState<
    Record<string, number | null>
  >({});
  const [questionTimers, setQuestionTimers] = React.useState<
    Record<string, number>
  >({});
  const [topicTimers, setTopicTimers] = React.useState<Record<string, number>>(
    {},
  );
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);

  const startTimeRef = React.useRef(Date.now());
  const questionStartTimeRef = React.useRef(Date.now());
  const timerInitialized = React.useRef(false);

  React.useEffect(() => {
    const shuffledQuestions = shuffleArray(config.questions).map(
      (q, index) => ({
        ...q,
        id: `q-${index}`,
        shuffledOptions: shuffleArray(q.options),
      }),
    );
    setQuestions(shuffledQuestions);

    const initialTopicTimers: Record<string, number> = {};
    config.questions.forEach((q) => {
      if (!initialTopicTimers[q.topic]) {
        initialTopicTimers[q.topic] = 0;
      }
    });
    setTopicTimers(initialTopicTimers);
  }, [config]);

  const updateQuestionTime = React.useCallback(() => {
    if (questions.length === 0) return;
    const currentQuestionId = questions[currentQuestionIndex].id;
    const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000;
    setQuestionTimers((prev) => ({
      ...prev,
      [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent,
    }));
    questionStartTimeRef.current = Date.now();
  }, [currentQuestionIndex, questions]);

  const submitExam = React.useCallback(() => {
    updateQuestionTime();
    setIsSubmitModalOpen(false);

    let correctAnswers = 0;
    const processedAnswers: UserAnswer[] = questions.map((q) => {
      const selectedOptionLabel = userAnswers[q.id] ?? null;
      const isCorrect = selectedOptionLabel === q.answer_label;
      if (isCorrect) correctAnswers++;

      return {
        questionId: q.id,
        selectedOptionLabel: selectedOptionLabel,
        isCorrect,
        timeSpent: questionTimers[q.id] || 0,
      };
    });

    const accuracyPerTopic: Record<string, number> = {};
    const questionsPerTopic: Record<string, number> = {};
    questions.forEach((q) => {
      const answer = processedAnswers.find((a) => a.questionId === q.id);
      if (!questionsPerTopic[q.topic]) {
        questionsPerTopic[q.topic] = 0;
        accuracyPerTopic[q.topic] = 0;
      }
      questionsPerTopic[q.topic]++;
      if (answer?.isCorrect) {
        accuracyPerTopic[q.topic]++;
      }
    });

    Object.keys(accuracyPerTopic).forEach((topic) => {
      accuracyPerTopic[topic] =
        questionsPerTopic[topic] > 0
          ? accuracyPerTopic[topic] / questionsPerTopic[topic]
          : 0;
    });

    const totalTimeTaken = (Date.now() - startTimeRef.current) / 1000;
    const result: ExamResult = {
      id: `res-${Date.now()}`,
      examName: config.name,
      date: Date.now(),
      score: correctAnswers,
      totalQuestions: questions.length,
      correctAnswers,
      incorrectAnswers: questions.length - correctAnswers,
      accuracy:
        questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0,
      totalTimeTaken,
      timePerTopic: topicTimers,
      accuracyPerTopic,
      answers: processedAnswers,
      originalQuestions: questions,
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    };
    result.swot = generateSwotAnalysis(result);

    setLastResult(result);
    setScreen("results");
  }, [
    userAnswers,
    questions,
    questionTimers,
    topicTimers,
    config.name,
    setLastResult,
    setScreen,
    updateQuestionTime,
  ]);

  const handleSubmitClick = () => {
    const unattemptedCount = questions.length - Object.keys(userAnswers).length;
    if (unattemptedCount > 0) {
      setIsSubmitModalOpen(true);
    } else {
      submitExam();
    }
  };

  React.useEffect(() => {
    if (!timerInitialized.current) {
      const timerValue = timerConfig.hours * 3600 + timerConfig.minutes * 60;
      setMainTimer(timerValue);
      timerInitialized.current = true;
    }

    const interval = setInterval(() => {
      setMainTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitExam();
          return 0;
        }
        return prev - 1;
      });

      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        setTopicTimers((prev) => ({
          ...prev,
          [currentQuestion.topic]: (prev[currentQuestion.topic] || 0) + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [questions, currentQuestionIndex, submitExam, timerConfig, setMainTimer]);

  const handleOptionSelect = (optionLabel: number) => {
    const currentQuestionId = questions[currentQuestionIndex].id;
    setUserAnswers((prev) => ({ ...prev, [currentQuestionId]: optionLabel }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      updateQuestionTime();
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      updateQuestionTime();
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        Loading Exam...
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedOption = userAnswers[currentQuestion.id];
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div
      className="flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
      style={{ height: "calc(100vh - 68px)" }}
    >
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <div className="mt-2 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-lg leading-relaxed">
              <Latex>{currentQuestion.question}</Latex>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.shuffledOptions.map((option, index) => (
              <button
                key={option.label}
                onClick={() => handleOptionSelect(option.label)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                  selectedOption === option.label
                    ? "bg-green-100 dark:bg-green-900 border-green-500 ring-2 ring-green-500"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600"
                }`}
              >
                <span className="font-bold mr-4">{optionLetters[index]}.</span>
                <Latex>{option.value}</Latex>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-4 bg-white dark:bg-gray-800 shadow-inner mt-auto">
        <div className="max-w-4xl mx-auto flex justify-center items-center gap-4">
          <Button
            onClick={goToPrev}
            disabled={currentQuestionIndex === 0}
            variant="secondary"
            className="w-40"
          >
            <ChevronsLeft size={20} /> Previous
          </Button>
          <Button onClick={handleSubmitClick} variant="danger" className="w-48">
            Submit Exam
          </Button>
          <Button
            onClick={goToNext}
            disabled={currentQuestionIndex === questions.length - 1}
            variant="secondary"
            className="w-40"
          >
            Next <ChevronsRight size={20} />
          </Button>
        </div>
      </footer>
      <SubmitConfirmationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={submitExam}
        unattemptedCount={questions.length - Object.keys(userAnswers).length}
      />
    </div>
  );
};
import React from "react";
import { 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle, 
  RefreshCw, 
  CheckSquare, 
  Type, 
  Flag, 
  Layers, 
  GripVertical,
  Target,
  Zap,
  X
} from "lucide-react";
import { Latex } from "./Latex";
import type {
  ExamConfig,
  ExamResult,
  ShuffledQuestion,
  UserAnswer,
  SWOTAnalysis,
} from "../types";
import { shuffleArray, resolveImagePath, normalizeExamConfig, isQuestionCorrect } from "../utils";
import { Button } from "./Button";
import { Card } from "./Card";

const SubmitConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  unattemptedCount: number;
  config: ExamConfig;
  userAnswers: Record<string, StructuredAnswer>;
}> = ({ isOpen, onClose, onConfirm, unattemptedCount, config, userAnswers }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[100] p-4">
      <Card className="w-full max-w-lg p-8 border-red-500/50 shadow-2xl dark:bg-science-900">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Final Submission</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You have <span className="font-bold text-red-500 underline decoration-red-500/30 underline-offset-4">{unattemptedCount} unattempted questions</span>.
          </p>

          <div className="w-full bg-slate-100 dark:bg-science-950/50 rounded-2xl p-4 mb-6 text-left border border-slate-200 dark:border-white/5 shadow-inner">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
              <Layers size={12} /> Section Summary
            </h3>
            <div className="space-y-2">
              {config.sections?.map(s => {
                const sectionQs = s.questions.map(sq => sq.id);
                const attempted = Object.keys(userAnswers).filter(id => 
                  sectionQs.includes(id) && 
                  (userAnswers[id].label != null || (userAnswers[id].labels && userAnswers[id].labels.length > 0) || (userAnswers[id].text !== undefined && userAnswers[id].text !== ""))
                ).length;
                return (
                  <div key={s.id} className="flex justify-between items-center p-2.5 px-3 bg-white dark:bg-science-800/40 rounded-xl border border-slate-100 dark:border-white/5 transition-colors">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{s.name}</span>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-black/30 px-2 py-0.5 rounded text-teal-500 border border-teal-500/20">
                      {attempted} / {s.questions.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={onConfirm} variant="danger" className="w-full py-4 text-lg shadow-lg shadow-red-500/20">
              Submit Exam Now
            </Button>
            <Button onClick={onClose} variant="secondary" className="w-full">
              Back to Questions
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
  const avgTimePerQuestion = results.totalQuestions > 0 ? results.totalTimeTaken / results.totalQuestions : 0;

  topics.forEach((topic) => {
    const topicAccuracy = (results.accuracyPerTopic[topic] || 0) * 100;
    const questionsInTopic = results.originalQuestions.filter((q) => q.topic === topic);
    const numQuestionsInTopic = questionsInTopic.length;
    const totalTimeForTopic = results.timePerTopic[topic] || 0;
    const topicTimePerQuestion = numQuestionsInTopic > 0 ? totalTimeForTopic / numQuestionsInTopic : 0;
    const isAccurate = topicAccuracy > avgAccuracy + 5;
    const isFast = topicTimePerQuestion < avgTimePerQuestion - 5;
    const isSlow = topicTimePerQuestion > avgTimePerQuestion + 10;
    const isInaccurate = topicAccuracy < avgAccuracy - 10;
    if (isAccurate && isFast) swot.strengths.push(`${topic}: High accuracy with excellent speed.`);
    else if (isAccurate && !isFast) swot.opportunities.push(`${topic}: Good accuracy, but speed can be improved.`);
    else if (isInaccurate && isSlow) swot.weaknesses.push(`${topic}: Low accuracy and slow speed indicate a need for fundamental review.`);
    else if (isInaccurate && !isSlow) swot.threats.push(`${topic}: Low accuracy with fast speed might suggest guessing or careless errors.`);
  });
  if (swot.strengths.length === 0) swot.strengths.push("No standout strengths identified. Focus on overall improvement.");
  if (swot.weaknesses.length === 0) swot.weaknesses.push("No major weaknesses identified. Continue to practice consistently.");
  if (swot.opportunities.length === 0) swot.opportunities.push("Keep practicing all topics to improve speed and maintain accuracy.");
  if (swot.threats.length === 0) swot.threats.push("Be mindful of careless errors and avoid guessing. Review questions you are unsure about.");
  return swot;
};

interface StructuredAnswer {
  label?: number | null; // MCQ
  labels?: number[]; // MSQ
  text?: string; // NAT
  isFlagged?: boolean;
}

export const ExamScreen: React.FC<{
  config: ExamConfig;
  timerConfig: { hours: number; minutes: number };
  setScreen: (screen: "home" | "results") => void;
  setLastResult: (result: ExamResult) => void;
  setMainTimer: React.Dispatch<React.SetStateAction<number>>;
}> = ({ config: rawConfig, timerConfig, setScreen, setLastResult, setMainTimer }) => {
  const config = React.useMemo(() => normalizeExamConfig(rawConfig), [rawConfig]);
  const [questions, setQuestions] = React.useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [userAnswers, setUserAnswers] = React.useState<Record<string, StructuredAnswer>>({});
  const [questionTimers, setQuestionTimers] = React.useState<Record<string, number>>({});
  const [topicTimers, setTopicTimers] = React.useState<Record<string, number>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 768);

  const startTimeRef = React.useRef(Date.now());
  const questionStartTimeRef = React.useRef(Date.now());
  const timerInitialized = React.useRef(false);

  React.useEffect(() => {
    let allQuestions: ShuffledQuestion[] = [];
    config.sections?.forEach((section) => {
      let sectionQuestions = config.settings?.shuffleQuestions ? shuffleArray(section.questions) : [...section.questions];
      allQuestions.push(
        ...sectionQuestions.map((q, idx) => ({
          ...q,
          id: q.id || `${section.id}-q-${idx}`,
          shuffledOptions: (q.options && config.settings?.shuffleOptions) ? shuffleArray(q.options) : [...(q.options || [])],
        }) as ShuffledQuestion)
      );
    });
    if (config.settings?.questionCount && config.settings.questionCount < allQuestions.length) {
      allQuestions = allQuestions.slice(0, config.settings.questionCount);
    }
    setQuestions(allQuestions);
    const initialTopicTimers: Record<string, number> = {};
    allQuestions.forEach((q) => { if (!initialTopicTimers[q.topic]) initialTopicTimers[q.topic] = 0; });
    setTopicTimers(initialTopicTimers);
  }, [config]);

  const updateQuestionTime = React.useCallback(() => {
    if (questions.length === 0) return;
    const currentQuestionId = questions[currentQuestionIndex].id;
    const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000;
    setQuestionTimers((prev) => ({ ...prev, [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent }));
    questionStartTimeRef.current = Date.now();
  }, [currentQuestionIndex, questions]);

  const submitExam = React.useCallback(() => {
    updateQuestionTime();
    let totalCorrect = 0;
    let totalScore = 0;
    const sectionScores: Record<string, number> = {};

    const processedAnswers: UserAnswer[] = questions.map((q) => {
      const answer = userAnswers[q.id] || {};
      const isCorrect = isQuestionCorrect(q, {
        selectedOptionLabel: answer.label,
        selectedOptionLabels: answer.labels,
        enteredAnswer: answer.text,
      });
      return {
        questionId: q.id,
        type: q.type || "MCQ",
        selectedOptionLabel: answer.label ?? null,
        selectedOptionLabels: answer.labels,
        enteredAnswer: answer.text,
        isCorrect,
        timeSpent: questionTimers[q.id] || 0,
        isFlagged: answer.isFlagged
      };
    });

    config.sections?.forEach((section) => {
      let sectionScore = 0;
      let sectionCorrect = 0;
      let attemptedInSection = 0;
      const sectionQuestionIds = section.questions.map(sq => sq.id);
      const sectionAnswers = processedAnswers.filter(pa => sectionQuestionIds.includes(pa.questionId));

      sectionAnswers.forEach((ans) => {
        const isAttempted = ans.selectedOptionLabel != null || (ans.selectedOptionLabels && ans.selectedOptionLabels.length > 0) || (ans.enteredAnswer !== undefined && ans.enteredAnswer !== "");
        if (isAttempted) {
          if (section.maxAttempts && attemptedInSection >= section.maxAttempts) return;
          attemptedInSection++;
          if (ans.isCorrect) {
            sectionCorrect++;
            sectionScore += section.marking.positive;
          } else {
            sectionScore -= section.marking.negative;
          }
        }
      });
      sectionScores[section.id] = sectionScore;
      totalScore += sectionScore;
      totalCorrect += sectionCorrect;
    });

    const accuracyPerTopic: Record<string, number> = {};
    const questionsPerTopic: Record<string, number> = {};
    questions.forEach((q) => {
      const answer = processedAnswers.find((a) => a.questionId === q.id);
      if (!questionsPerTopic[q.topic]) { questionsPerTopic[q.topic] = 0; accuracyPerTopic[q.topic] = 0; }
      questionsPerTopic[q.topic]++;
      if (answer?.isCorrect) accuracyPerTopic[q.topic]++;
    });
    Object.keys(accuracyPerTopic).forEach((topic) => {
      accuracyPerTopic[topic] = questionsPerTopic[topic] > 0 ? accuracyPerTopic[topic] / questionsPerTopic[topic] : 0;
    });

    const totalTimeTaken = (Date.now() - startTimeRef.current) / 1000;
    const result: ExamResult = {
      id: `res-${Date.now()}`,
      examName: config.name,
      date: Date.now(),
      score: totalScore,
      totalQuestions: questions.length,
      correctAnswers: totalCorrect,
      incorrectAnswers: questions.length - totalCorrect,
      accuracy: questions.length > 0 ? (totalCorrect / questions.length) * 100 : 0,
      totalTimeTaken,
      timePerTopic: topicTimers,
      accuracyPerTopic,
      answers: processedAnswers,
      originalQuestions: questions,
      sectionScores,
      originalConfig: config,
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
    };
    result.swot = generateSwotAnalysis(result);
    setLastResult(result);
    setScreen("results");
  }, [userAnswers, questions, questionTimers, topicTimers, config, setLastResult, setScreen, updateQuestionTime]);

  const toggleFlag = () => {
    const qId = questions[currentQuestionIndex].id;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], isFlagged: !prev[qId]?.isFlagged }
    }));
  };

  const jumpToQuestion = (index: number) => {
    updateQuestionTime();
    setCurrentQuestionIndex(index);
  };

  const jumpToSection = (sectionId: string) => {
    console.log(`[NAV] Attempting jump to: ${sectionId}`);
    console.log(`[NAV] Available Section IDs:`, config.sections?.map(s => s.id));
    
    const section = config.sections?.find(s => s.id === sectionId);
    if (!section || section.questions.length === 0) {
      console.warn(`[NAV] Section not found or empty: ${sectionId}`);
      return;
    }
    
    const firstQId = section.questions[0].id;
    const firstQIndex = questions.findIndex(q => q.id === firstQId || q.question === section.questions[0].question);

    if (firstQIndex !== -1) {
      updateQuestionTime();
      setCurrentQuestionIndex(firstQIndex);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } else {
      console.error(`[NAV] Could not find question ${firstQId} in active question pool.`);
    }
  };
  const metrics = React.useMemo(() => {
    let attempted = 0;
    let marksLeft = 0;
    let potentialMax = 0;
    let potentialMin = 0;
    questions.forEach(q => {
      const ans = userAnswers[q.id];
      const section = config.sections?.find(s => s.questions.some(sq => sq.id === q.id));
      if (!section) return;
      const pos = section.marking.positive;
      const neg = section.marking.negative;
      const isAttempted = ans && (ans.label != null || (ans.labels && ans.labels.length > 0) || (ans.text !== undefined && ans.text !== ""));
      if (isAttempted) {
        attempted++;
        potentialMax += pos;
        potentialMin -= neg;
      } else {
        marksLeft += pos;
      }
    });
    return { attempted, marksLeft, potentialMax, potentialMin };
  }, [questions, userAnswers, config]);

  const handleSubmitClick = () => {
    const unattemptedCount = questions.length - metrics.attempted;
    if (unattemptedCount > 0) setIsSubmitModalOpen(true);
    else submitExam();
  };

  React.useEffect(() => {
    if (!timerInitialized.current) {
      setMainTimer(timerConfig.hours * 3600 + timerConfig.minutes * 60);
      timerInitialized.current = true;
    }
    const interval = setInterval(() => {
      setMainTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); submitExam(); return 0; }
        return prev - 1;
      });
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) setTopicTimers((prev) => ({ ...prev, [currentQuestion.topic]: (prev[currentQuestion.topic] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [questions, currentQuestionIndex, submitExam, timerConfig, setMainTimer]);

  const handleMCQSelect = (optionLabel: number) => {
    const qId = questions[currentQuestionIndex].id;
    setUserAnswers((prev) => {
      const currentLabel = prev[qId]?.label;
      if (currentLabel === optionLabel) {
        // Unselect
        const newState = { ...prev };
        newState[qId] = { ...prev[qId], label: null };
        return newState;
      }
      return { ...prev, [qId]: { ...prev[qId], label: optionLabel } };
    });
  };

  const handleMSQToggle = (optionLabel: number) => {
    const qId = questions[currentQuestionIndex].id;
    setUserAnswers((prev) => {
      const currentLabels = prev[qId]?.labels || [];
      const newLabels = currentLabels.includes(optionLabel) ? currentLabels.filter(l => l !== optionLabel) : [...currentLabels, optionLabel];
      return { ...prev, [qId]: { ...prev[qId], labels: newLabels } };
    });
  };

  const handleNATChange = (value: string) => {
    const qId = questions[currentQuestionIndex].id;
    setUserAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], text: value } }));
  };

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center h-full text-teal-500 bg-science-950">
        <RefreshCw className="animate-spin mr-2" /> Initializing Advanced Scientific Engine...
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const qId = currentQuestion.id;
  const qType = currentQuestion.type || "MCQ";
  const selectedAnswer = userAnswers[qId] || {};
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const currentSection = config.sections?.find(s => s.questions.some(sq => sq.id === qId));

  return (
    <div className="flex h-[calc(100vh-68px)] bg-slate-50 dark:bg-science-950 overflow-hidden science-grid relative">
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 top-[68px] z-[45] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Upgraded Mobile FAB */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed bottom-24 z-[60] md:hidden h-14 rounded-full shadow-2xl shadow-teal-500/30 flex items-center justify-center active:scale-95 transition-all duration-300 ${
          isSidebarOpen 
            ? "w-14 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 right-6"
            : "px-6 bg-gradient-to-r from-teal-500 to-blue-500 text-white right-6 hover:shadow-teal-500/50"
        }`}
      >
        {isSidebarOpen ? (
          <X size={24} />
        ) : (
          <>
            <Layers size={20} className="mr-2" /> 
            <span className="font-bold tracking-wider text-sm">NAVIGATOR</span>
          </>
        )}
      </button>

      <div className={`flex-grow flex flex-col transition-all duration-300 w-full ${isSidebarOpen ? "md:mr-80 md:w-[calc(100%-20rem)]" : ""}`}>
        <main className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="space-y-2 min-w-0 w-full">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-teal-600 px-3 py-1 rounded-md shadow-sm truncate max-w-[150px] sm:max-w-xs">
                    {currentSection?.name || "General"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800/80 px-2 py-1 rounded-md flex-shrink-0">
                    {qType}
                  </span>
                  {selectedAnswer.isFlagged && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md animate-pulse flex-shrink-0">
                      <Flag size={10} fill="currentColor" /> FLAGGED
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-start w-full gap-4">
                  <h1 className="text-sm font-medium text-slate-500 uppercase tracking-widest truncate">
                    Question <span className="text-slate-900 dark:text-white font-black">{currentQuestionIndex + 1}</span> of {questions.length}
                  </h1>
                  <button 
                    onClick={toggleFlag}
                    className={`sm:hidden p-2 rounded-xl border-2 transition-all flex-shrink-0 ${
                      selectedAnswer.isFlagged 
                      ? "bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/10" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-orange-500/50"
                    }`}
                  >
                    <Flag size={18} fill={selectedAnswer.isFlagged ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex gap-2 flex-shrink-0">
                <button 
                  onClick={toggleFlag}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    selectedAnswer.isFlagged 
                    ? "bg-orange-500/10 border-orange-500 text-orange-500 shadow-lg shadow-orange-500/10" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-orange-500/50"
                  }`}
                >
                  <Flag size={20} fill={selectedAnswer.isFlagged ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative p-4 sm:p-8 md:p-12 bg-white dark:bg-science-900/80 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl space-y-6 sm:space-y-8 w-full overflow-hidden">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/5 border border-teal-500/10 text-[10px] font-mono text-teal-500 font-bold uppercase tracking-tighter truncate max-w-full">
                  <Target size={12} className="flex-shrink-0" /> <span className="truncate">{currentQuestion.topic}</span>
                </div>
                <div className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-slate-800 dark:text-slate-100 break-words overflow-x-auto custom-scrollbar pb-2">
                  <Latex>{currentQuestion.question}</Latex>
                </div>
                {currentQuestion.image_path && (
                  <div className="p-2 sm:p-4 bg-slate-100 dark:bg-black/40 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden">
                    <img src={resolveImagePath(currentQuestion.image_path)} alt="Scientific Visualization" className="max-w-full h-auto rounded-xl mx-auto shadow-2xl" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6 w-full">
              {qType === "NAT" ? (
                <div className="p-6 sm:p-8 bg-white dark:bg-science-900/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] border-2 border-teal-500/20 focus-within:border-teal-500/50 transition-all shadow-xl">
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-500 flex-shrink-0">
                      <Type size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs">Numerical Response</span>
                  </div>
                  <input
                    type="number" step="any" autoFocus value={selectedAnswer.text || ""}
                    onChange={(e) => handleNATChange(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full bg-slate-50 dark:bg-science-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-xl sm:text-3xl font-mono focus:border-teal-500 focus:outline-none dark:text-white transition-all"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {currentQuestion.shuffledOptions.map((option, index) => {
                    const isSelected = qType === "MCQ" ? selectedAnswer.label === option.label : selectedAnswer.labels?.includes(option.label);
                    return (
                      <button
                        key={option.label}
                        onClick={() => qType === "MCQ" ? handleMCQSelect(option.label) : handleMSQToggle(option.label)}
                        className={`p-4 sm:p-6 rounded-[1rem] sm:rounded-[1.5rem] text-left transition-all duration-300 border-2 group relative overflow-hidden flex items-start gap-3 sm:gap-4 w-full ${
                          isSelected
                            ? "bg-teal-500/10 border-teal-500 ring-4 ring-teal-500/10 shadow-lg"
                            : "bg-white dark:bg-science-900/40 backdrop-blur-md border-slate-200 dark:border-white/5 hover:border-teal-500/30"
                        }`}
                      >
                        <div className={`mt-0.5 sm:mt-1 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center border-2 transition-all ${
                          isSelected ? "bg-teal-500 border-teal-500 text-white" : "border-slate-300 dark:border-slate-700"
                        }`}>
                          {qType === "MSQ" ? (isSelected ? <CheckSquare size={12} className="sm:w-3.5 sm:h-3.5" /> : null) : <span className="text-[9px] sm:text-[10px] font-black">{optionLetters[index]}</span>}
                        </div>
                        <div className="text-sm sm:text-base md:text-lg dark:text-slate-200 break-words min-w-0 overflow-x-auto custom-scrollbar">
                          <Latex>{option.value}</Latex>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="p-3 sm:p-4 md:p-6 bg-white dark:bg-science-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-2 sm:gap-4 md:gap-8">
            <Button onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0} variant="secondary" className="flex-1 max-w-[100px] sm:max-w-[140px] h-10 sm:h-12 rounded-xl font-bold px-2 sm:px-6">
              <ChevronsLeft size={20} className="sm:mr-1" /> <span className="hidden sm:inline">PREV</span>
            </Button>
            
            <div className="hidden md:block flex-grow h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full relative overflow-visible mx-4">
              <div 
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
              {questions.map((q, i) => {
                const isFlagged = userAnswers[q.id]?.isFlagged;
                if (!isFlagged) return null;
                return (
                  <div
                    key={q.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                    style={{ left: `${(i / Math.max(1, questions.length - 1)) * 100}%` }}
                  >
                    <Flag 
                      size={18} 
                      className="text-slate-900 dark:text-white fill-orange-500 animate-pulse drop-shadow-lg" 
                      strokeWidth={2.5}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 sm:gap-3 flex-1 justify-end">
              <Button onClick={handleSubmitClick} variant="danger" className="px-3 sm:px-6 h-10 sm:h-12 rounded-xl font-bold shadow-lg shadow-red-500/10 text-xs sm:text-base">FINISH</Button>
              <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} disabled={currentQuestionIndex === questions.length - 1} variant="primary" className="flex-1 max-w-[100px] sm:max-w-[140px] h-10 sm:h-12 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 px-2 sm:px-6">
                <span className="hidden sm:inline">NEXT</span> <ChevronsRight size={20} className="sm:ml-1" />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <aside className={`fixed top-0 md:top-[68px] right-0 bottom-0 w-[85vw] max-w-[320px] md:w-80 bg-white/95 dark:bg-science-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 z-[55] md:z-50 transition-transform duration-500 transform ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} flex flex-col shadow-2xl`}>
        <div className="p-6 pt-12 md:pt-6 space-y-8 flex-grow overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><Layers size={14} /> Sections</h3>
            <div className="grid gap-2">
              {config.sections?.map(s => (
                <button key={s.id} onClick={() => jumpToSection(s.id)} className={`p-3 rounded-xl text-left text-xs font-bold transition-all border-2 ${currentSection?.id === s.id ? "bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20" : "bg-slate-100 dark:bg-science-950 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-science-800"}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><GripVertical size={14} /> Question Navigator</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => {
                const ans = userAnswers[q.id];
                const isAttempted = ans && (ans.label != null || (ans.labels && ans.labels.length > 0) || (ans.text !== undefined && ans.text !== ""));
                const isCurrent = i === currentQuestionIndex;
                return (
                  <button key={q.id} onClick={() => jumpToQuestion(i)} className={`h-10 rounded-lg text-xs font-black transition-all border-2 relative ${isCurrent ? "bg-teal-500 border-teal-500 text-white scale-110 z-10 shadow-lg shadow-teal-500/30" : isAttempted ? "bg-teal-500/10 border-teal-500/30 text-teal-500" : "bg-slate-100 dark:bg-science-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300"}`}>
                    {i + 1}
                    {ans?.isFlagged && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-science-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><Zap size={14} /> Live Analysis</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Potential Max Score</div>
                <div className="text-2xl font-black text-blue-500">{metrics.potentialMax.toFixed(1)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-center">
                  <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">Marks Left</div>
                  <div className="text-xl font-black text-orange-500">{metrics.marksLeft.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-center">
                  <div className="text-[10px] font-bold text-red-500 uppercase mb-1">Worst Case</div>
                  <div className="text-xl font-black text-red-500">{metrics.potentialMin.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Attempted</span>
            <span className="text-teal-500">{metrics.attempted} / {questions.length}</span>
          </div>
          <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-blue-500 transition-all duration-500" style={{ width: `${(metrics.attempted / questions.length) * 100}%` }} />
          </div>
        </div>
      </aside>

      <SubmitConfirmationModal 
        isOpen={isSubmitModalOpen} 
        onClose={() => setIsSubmitModalOpen(false)} 
        onConfirm={submitExam} 
        unattemptedCount={questions.length - metrics.attempted}
        config={config}
        userAnswers={userAnswers}
      />
    </div>
  );
};

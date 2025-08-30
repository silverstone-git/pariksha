import React from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Moon,
  Sun,
  Upload,
  Download,
  Clock,
  Home,
  FileText,
  History,
  Lightbulb,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Bot,
  RefreshCw,
} from "lucide-react";
import "katex/dist/katex.min.css";
import "katex/dist/katex.min.css";
import { Latex } from "./components/Latex";
import { AIExamGenerator } from "./components/AIExamGenerator";

import type {
  ExamConfig,
  ExamResult,
  ServerExam,
  ServerExamDetail,
  ShuffledQuestion,
  SWOTAnalysis,
  UserAnswer,
} from "./types";

import {
  formatTime,
  isValidExamQuestions,
  robustJsonParse,
  shuffleArray,
  API_BASE_URL,
} from "./utils";

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

// --- LOCALSTORAGE HOOK ---
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === "undefined") {
      console.log(
        `[LocalStorage] Window is undefined. Using initial value for key: ${key}`,
      );
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      console.log(`[LocalStorage] Reading key '${key}':`, item);
      // If a value is stored in localStorage, use it.
      if (item) {
        return robustJsonParse(item);
      }
      // If no value is stored, and we are setting the theme, check system preference.
      if (key === "theme") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        console.log(
          `[LocalStorage] No theme in storage. System prefers dark mode: ${prefersDark}`,
        );
        return prefersDark as T;
      }
      // Otherwise, use the initialValue provided.
      return initialValue;
    } catch (error) {
      console.error(`[LocalStorage] Error reading key '${key}':`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        console.log(
          `[LocalStorage] Writing to key '${key}':`,
          JSON.stringify(valueToStore),
        );
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`[LocalStorage] Error writing to key '${key}':`, error);
    }
  };

  return [storedValue, setValue];
}

// --- THEME MANAGEMENT ---
const ThemeToggle: React.FC<{
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}> = ({ isDark, setIsDark }) => {
  return (
    <button
      onClick={() => {
        console.log(
          "[ThemeToggle] Button clicked. Current isDark:",
          isDark,
          "Setting to:",
          !isDark,
        );
        setIsDark(!isDark);
      }}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// --- HEADER COMPONENT ---
const Header: React.FC<{
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  screen: "home" | "exam" | "results";
  examConfig: ExamConfig | null;
  mainTimer: number;
}> = ({ isDark, setIsDark, screen, examConfig, mainTimer }) => {
  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Pariksha
      </h1>
      <div className="flex items-center gap-4">
        {screen === "exam" && (
          <div className="flex items-center gap-2 p-2 px-4 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
            <Clock size={20} />
            <span className="font-mono text-lg font-semibold">
              {formatTime(mainTimer)}
            </span>
          </div>
        )}
        <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
      </div>
    </header>
  );
};

// --- UI COMPONENTS ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6 transition-colors ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}> = ({
  onClick,
  children,
  className = "",
  variant = "primary",
  disabled = false,
}) => {
  const baseClasses =
    "px-6 py-3 font-semibold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-300 ease-in-out transform flex items-center justify-center gap-2 hover:shadow-xl";
  const variantClasses = {
    primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };
  const disabledClasses = "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-lg";
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : "hover:scale-105"} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const UploadModal: React.FC<{
  examJson: string;
  fileName: string;
  onClose: () => void;
  onUpload: (config: ExamConfig) => void;
}> = ({ examJson, fileName, onClose, onUpload }) => {
  const [userName, setUserName] = React.useState("");
  const [examTitle, setExamTitle] = React.useState(
    fileName.replace(".json", ""),
  );
  const [isPosting, setIsPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePost = async () => {
    if (!userName.trim() || !examTitle.trim()) {
      setError("Name and title are required.");
      return;
    }
    setError(null);
    setIsPosting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/pariksha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_title: `${userName} - ${examTitle}`,
          exam_json_str: examJson,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const parsedJson = robustJsonParse(examJson);
      onUpload({ name: examTitle, questions: parsedJson });
      onClose();
    } catch (err) {
      setError("Failed to post exam. Please try again.");
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Upload Exam</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value.slice(0, 50))}
              maxLength={50}
              className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Exam Title
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
              placeholder="Enter exam title"
            />
          </div>
        </div>
        {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
        <div className="mt-6 flex justify-end gap-4">
          <Button onClick={onClose} variant="secondary" disabled={isPosting}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isPosting}>
            {isPosting ? "Posting..." : "Post and save in browser"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const FileUploader: React.FC<{
  onFileUpload: (config: ExamConfig) => void;
}> = ({ onFileUpload }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [uploadData, setUploadData] = React.useState<{
    examJson: string;
    fileName: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setError("Invalid file type. Please upload a JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target?.result;
        if (typeof content !== "string")
          throw new Error("Failed to read file content.");

        // Fault tolerance: find the first '{' or '[' and the last '}' or ']'
        const firstBracket = content.indexOf("{");
        const firstSquare = content.indexOf("[");

        let start = -1;
        if (firstBracket === -1) start = firstSquare;
        else if (firstSquare === -1) start = firstBracket;
        else start = Math.min(firstBracket, firstSquare);

        const lastBracket = content.lastIndexOf("}");
        const lastSquare = content.lastIndexOf("]");

        let end = Math.max(lastBracket, lastSquare);

        if (start !== -1 && end !== -1 && end > start) {
          content = content.substring(start, end + 1);
        }

        const parsed = robustJsonParse(content);
        if (
          !Array.isArray(parsed) ||
          parsed.length === 0 ||
          !parsed[0].question ||
          !parsed[0].options ||
          !parsed[0].explanation
        ) {
          throw new Error("Invalid JSON format.");
        }
        setUploadData({ examJson: content, fileName: file.name });
        setError(null);
      } catch (err) {
        setError("Failed to parse JSON file. Please check the format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCloseModal = () => {
    setUploadData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
      />
      <Button onClick={handleClick} className="w-full">
        <Upload size={20} /> Upload New Exam JSON
      </Button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      {uploadData && (
        <UploadModal
          {...uploadData}
          onClose={handleCloseModal}
          onUpload={onFileUpload}
        />
      )}
    </div>
  );
};

const ResultUploader: React.FC<{
  onResultUpload: (result: ExamResult) => void;
}> = ({ onResultUpload }) => {
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setError("Invalid file type. Please upload a JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target?.result;
        if (typeof content !== "string")
          throw new Error("Failed to read file content.");

        // Fault tolerance: find the first '{' or '[' and the last '}' or ']'
        const firstBracket = content.indexOf("{");
        const firstSquare = content.indexOf("[");

        let start = -1;
        if (firstBracket === -1) start = firstSquare;
        else if (firstSquare === -1) start = firstBracket;
        else start = Math.min(firstBracket, firstSquare);

        const lastBracket = content.lastIndexOf("}");
        const lastSquare = content.lastIndexOf("]");

        let end = Math.max(lastBracket, lastSquare);

        if (start !== -1 && end !== -1 && end > start) {
          content = content.substring(start, end + 1);
        }

        const parsed = robustJsonParse(content);
        // Basic validation
        if (!parsed.id || !parsed.examName || !parsed.answers) {
          throw new Error("Invalid exam result JSON format.");
        }
        onResultUpload(parsed);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setError("Failed to parse JSON file. Please check the format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
      />
      <Button onClick={handleClick} className="w-full" variant="secondary">
        <Upload size={20} /> Upload Exam Result JSON
      </Button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

// --- SCREENS ---

const HomeScreen: React.FC<{
  setExamConfig: (config: ExamConfig) => void;
  setScreen: (screen: "exam" | "results") => void;
  setTimerConfig: (config: { hours: number; minutes: number }) => void;
  viewResult: (result: ExamResult) => void;
  handleFileUpload: (config: ExamConfig) => void;
  availableExams: ExamConfig[];
}> = ({
  setExamConfig,
  setScreen,
  setTimerConfig,
  viewResult,
  handleFileUpload,
  availableExams,
}) => {

  const [serverExams, setServerExams] = React.useState<ServerExam[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [examHistory] = useLocalStorage<ExamResult[]>("examHistory", []);
  const [hours, setHours] = React.useState(1);
  const [minutes, setMinutes] = React.useState(30);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/pariksha?page=${currentPage}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setServerExams(data);
        setTotalPages(1);
      } else {
        setServerExams(data.exams || []);
        setTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch server exams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExams();
  }, [currentPage]);

  React.useEffect(() => {
    console.log("Server exams updated:", serverExams);
  }, [serverExams]);

  const startExam = async (configOrId: ExamConfig | string) => {
    setTimerConfig({ hours, minutes });
    if (typeof configOrId === "string") {
      try {
        const response = await fetch(`${API_BASE_URL}/pariksha/${configOrId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const examDetail: ServerExamDetail = await response.json();
        const questions = robustJsonParse(examDetail.exam_json_str);

        if (!isValidExamQuestions(questions)) {
          throw new Error("Invalid exam question format from server.");
        }

        const examConfig: ExamConfig = {
          name: examDetail.exam_title,
          questions: questions,
        };
        setExamConfig(examConfig);
        setScreen("exam");
      } catch (error) {
        console.error("Failed to fetch exam details:", error);
        alert("Failed to load the exam. Please try again.");
      }
    } else {
      setExamConfig(configOrId);
      setScreen("exam");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <Card className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
          New Exam Session
        </h2>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Set Timer
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                value={hours}
                onChange={(e) =>
                  setHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="Hours"
                aria-label="Hours for timer"
              />
              <input
                type="number"
                value={minutes}
                onChange={(e) =>
                  setMinutes(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="Minutes"
                aria-label="Minutes for timer"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <FileUploader onFileUpload={handleFileUpload} />
            <Button
              onClick={() => setIsAiModalOpen(true)}
              className="w-full"
              variant="secondary"
            >
              <Bot size={20} /> Generate with AI
            </Button>
          </div>
        </div>
      </Card>

      {isAiModalOpen && (
        <AIExamGenerator
          onClose={() => setIsAiModalOpen(false)}
          onExamGenerated={handleFileUpload}
        />
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <FileText /> Available Exams
            </h2>
            <Button onClick={fetchExams} variant="secondary" disabled={isLoading}>
              <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {availableExams.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-600 dark:text-gray-400">
                  Local Exams
                </h3>
                {availableExams.map((exam, index) => (
                  <div
                    key={`local-${index}`}
                    className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="font-medium">{exam.name}</span>
                    <Button onClick={() => startExam(exam)}>Start</Button>
                  </div>
                ))}
              </>
            )}
            <div>
              <h3 className="font-semibold text-gray-600 dark:text-gray-400 mt-4">
                Community Exams
              </h3>
              {isLoading ? (
                <div className="flex justify-center items-center p-4">
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : serverExams.length > 0 ? (
                <>
                  {serverExams.map((exam) => (
                    <div
                      key={exam.exam_id}
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mt-2"
                    >
                      <div>
                        <span className="font-medium">{exam.exam_title}</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Uploaded:{" "}
                          {new Date(exam.datetime_uploaded).toLocaleString()}
                        </p>
                      </div>
                      <Button onClick={() => startExam(exam.exam_id)}>
                        Start
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </Button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 p-4">
                  No community exams are uploaded.
                </p>
              )}
            </div>
            {availableExams.length === 0 && serverExams.length === 0 && !isLoading && (
              <p className="text-gray-500 dark:text-gray-400">
                Upload an exam JSON to begin.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <History /> Exam History
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {examHistory.length > 0 ? (
              examHistory.map((result) => (
                <div
                  key={result.id}
                  onClick={() => viewResult(result)}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.examName}</span>
                    <span
                      className={`font-bold ${result.accuracy > 70 ? "text-green-500" : "text-red-500"}`}
                    >
                      {result.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(result.date).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No exams taken yet.
              </p>
            )}
          </div>
          <div className="mt-4">
            <ResultUploader onResultUpload={viewResult} />
          </div>
        </Card>
      </div>
    </div>
  );
};

import { ExamScreen } from "./components/ExamScreen";

const ResultsScreen: React.FC<{
  result: ExamResult;
  setScreen: (screen: "home") => void;
}> = ({ result, setScreen }) => {
  const [reviewQuestionId, setReviewQuestionId] = React.useState<string | null>(
    null,
  );

  const downloadResults = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `exam_results_${result.examName}_${result.date}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const SWOTIcon = ({ type }: { type: "S" | "W" | "O" | "T" }) => {
    switch (type) {
      case "S":
        return <Lightbulb className="text-green-500" />;
      case "W":
        return <Zap className="text-red-500" />;
      case "O":
        return <Shield className="text-blue-500" />;
      case "T":
        return <AlertTriangle className="text-yellow-500" />;
    }
  };

  const reviewingQuestion = result.originalQuestions.find(
    (q) => q.id === reviewQuestionId,
  );
  const reviewingAnswer = result.answers.find(
    (a) => a.questionId === reviewQuestionId,
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 text-center">
        Exam Results
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
        {result.examName}
      </p>

      <Card className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Score</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {result.correctAnswers}/{result.totalQuestions}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
            <p
              className={`text-3xl font-bold ${result.accuracy > 70 ? "text-green-500" : "text-red-500"}`}
            >
              {result.accuracy.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Time
            </p>
            <p className="text-3xl font-bold">
              {formatTime(result.totalTimeTaken)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Avg. Time/Q
            </p>
            <p className="text-3xl font-bold">
              {result.totalQuestions > 0
                ? (result.totalTimeTaken / result.totalQuestions).toFixed(1)
                : "0.0"}
              s
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            Topic Performance
          </h2>
          <div className="space-y-4">
            {Object.keys(result.timePerTopic).map((topic) => (
              <div key={topic}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{topic}</span>
                  <span
                    className={`font-semibold ${result.accuracyPerTopic[topic] > 0.7 ? "text-green-500" : "text-red-500"}`}
                  >
                    {((result.accuracyPerTopic[topic] || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${(result.accuracyPerTopic[topic] || 0) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1">
                  Total time: {formatTime(result.timePerTopic[topic])}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            SWOT Analysis
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                <SWOTIcon type="S" /> Strengths
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                {result.swot.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                <SWOTIcon type="W" /> Weaknesses
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                {result.swot.weaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                <SWOTIcon type="O" /> Opportunities
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                {result.swot.opportunities.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-yellow-600 dark:text-yellow-400">
                <SWOTIcon type="T" /> Threats
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-gray-600 dark:text-gray-300">
                {result.swot.threats.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
          Answer Review
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {result.originalQuestions.map((q, index) => {
              const answer = result.answers.find((a) => a.questionId === q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => setReviewQuestionId(q.id)}
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${reviewQuestionId === q.id ? "bg-green-100 dark:bg-green-900" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                >
                  <div className="flex items-center gap-3">
                    {answer?.isCorrect ? (
                      <CheckCircle2 className="text-green-500" />
                    ) : (
                      <XCircle className="text-red-500" />
                    )}
                    <span className="font-medium">Question {index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {q.topic}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            {reviewingQuestion && reviewingAnswer ? (
              <div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                  <Latex>{reviewingQuestion.question}</Latex>
                </div>
                <div className="space-y-2">
                  {reviewingQuestion.options.map((option) => {
                    const isCorrect =
                      option.label === reviewingQuestion.answer_label;
                    const isSelected =
                      option.label === reviewingAnswer.selectedOptionLabel;
                    let styles = "border-gray-300 dark:border-gray-600";
                    if (isCorrect) {
                      styles =
                        "bg-green-100 dark:bg-green-900 border-green-500 ring-2 ring-green-500";
                    } else if (isSelected && !isCorrect) {
                      styles =
                        "bg-red-100 dark:bg-red-900 border-red-500 ring-2 ring-red-500";
                    }
                    return (
                      <div
                        key={option.label}
                        className={`p-3 border rounded-lg ${styles}`}
                      >
                        <Latex>{option.value}</Latex>
                      </div>
                    );
                  })}
                </div>
                {reviewingQuestion.explanation && (
                  <div
                    className={`mt-4 p-3 rounded-lg ${
                      reviewingAnswer.isCorrect
                        ? "bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                        : "bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                    }`}
                  >
                    <h4 className="font-bold mb-2">Explanation</h4>
                    <Latex>{reviewingQuestion.explanation}</Latex>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <Eye size={24} className="mr-2" /> Select a question to review
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex justify-center gap-4">
        <Button onClick={() => setScreen("home")} variant="secondary">
          <Home size={20} /> Back to Home
        </Button>
        <Button onClick={downloadResults}>
          <Download size={20} /> Download Results
        </Button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [isDark, setIsDark] = useLocalStorage("theme", false);
  const [screen, setScreen] = React.useState<"home" | "exam" | "results">(
    "home",
  );
  const [examConfig, setExamConfig] = React.useState<ExamConfig | null>(null);
  const [timerConfig, setTimerConfig] = React.useState({
    hours: 1,
    minutes: 30,
  });
  const [lastResult, setLastResult] = React.useState<ExamResult | null>(null);
  const [availableExams, setAvailableExams] = useLocalStorage<ExamConfig[]>(
    "availableExams",
    [],
  );
  const [, setExamHistory] = useLocalStorage<ExamResult[]>("examHistory", []);

  const handleFileUpload = (config: ExamConfig) => {
    if (!availableExams.some((exam) => exam.name === config.name)) {
      setAvailableExams((prev) => [...prev, config]);
    } else {
      alert("An exam with this name already exists.");
    }
  };

  const [mainTimer, setMainTimer] = React.useState(0);

  React.useEffect(() => {
    console.log("[App useEffect] isDark changed:", isDark);
    if (isDark) {
      console.log('[App useEffect] Adding "dark" class to documentElement.');
      document.documentElement.classList.add("dark");
    } else {
      console.log(
        '[App useEffect] Removing "dark" class from documentElement.',
      );
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const handleSetLastResult = (result: ExamResult) => {
    setLastResult(result);
    setExamHistory((prev) => [
      result,
      ...prev.filter((r) => r.id !== result.id),
    ]);
  };

  const viewResult = (result: ExamResult) => {
    setLastResult(result);
    setScreen("results");
  };

  const renderScreen = () => {
    switch (screen) {
      case "exam":
        if (!examConfig) {
          setScreen("home");
          return null;
        }
        return (
          <ExamScreen
            config={examConfig}
            timerConfig={timerConfig}
            setScreen={setScreen}
            setLastResult={handleSetLastResult}
            setMainTimer={setMainTimer}
          />
        );
      case "results":
        if (!lastResult) {
          setScreen("home");
          return null;
        }
        return <ResultsScreen result={lastResult} setScreen={setScreen} />;
      case "home":
      default:
        return (
          <HomeScreen
            setExamConfig={setExamConfig}
            setScreen={setScreen}
            setTimerConfig={setTimerConfig}
            viewResult={viewResult}
            handleFileUpload={handleFileUpload}
            availableExams={availableExams}
          />
        );
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans transition-colors">
      <Header
        isDark={isDark}
        setIsDark={setIsDark}
        screen={screen}
        examConfig={examConfig}
        mainTimer={mainTimer}
      />
      {renderScreen()}
    </div>
  );
}

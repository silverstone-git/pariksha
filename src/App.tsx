import React from "react";
import {
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
  Search,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { Latex } from "./components/Latex";
import { AIExamGenerator } from "./components/AIExamGenerator";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeToggle } from "./components/ThemeToggle";

import type {
  ExamConfig,
  ExamResult,
  ServerExam,
  ServerExamDetail,
} from "./types";

import {
  formatTime,
  isValidExamQuestions,
  robustJsonParse,
  API_BASE_URL,
} from "./utils";

// --- LOCALSTORAGE HOOK ---
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return robustJsonParse(item);
      }
      if (key === "theme") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        return prefersDark as T;
      }
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
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`[LocalStorage] Error writing to key '${key}':`, error);
    }
  };

  return [storedValue, setValue];
}

// --- THEME MANAGEMENT ---

// const ThemeToggle: React.FC<{
//   isDark: boolean;
//   setIsDark: (value: boolean) => void;
// }> = ({ isDark, setIsDark }) => {
//   return (
//     <button
//       onClick={() => {
//         setIsDark(!isDark);
//       }}
//       className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
//       aria-label="Toggle theme"
//     >
//       {isDark ? <Sun size={20} /> : <Moon size={20} />}
//     </button>
//   );
// };

// --- HEADER COMPONENT ---
const Header: React.FC<{
  screen: "home" | "exam" | "results";
  mainTimer: number;
}> = ({ screen, mainTimer }) => {
  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white font-bebas">
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
        <ThemeToggle />
      </div>
    </header>
  );
};

// --- UI COMPONENTS ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}> = ({ children, className = "", title, icon }) => (
  <div
    className={`bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 transition-all border border-gray-200 dark:border-gray-700 hover:shadow-2xl ${className}`}
  >
    {(title || icon) && (
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center gap-2">
        {icon} {title}
      </h2>
    )}
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
    "px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-300 ease-in-out transform flex items-center justify-center gap-2";
  const variantClasses = {
    primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    secondary:
      "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };
  const disabledClasses =
    "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-md";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
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
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
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
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
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

        const firstBracket = content.indexOf("{");
        const firstSquare = content.indexOf("[");
        let start = -1;
        if (firstBracket === -1) start = firstSquare;
        else if (firstSquare === -1) start = firstBracket;
        else start = Math.min(firstBracket, firstSquare);
        const lastBracket = content.lastIndexOf("}");
        const lastSquare = content.lastIndexOf("]");
        const end = Math.max(lastBracket, lastSquare);
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

        const firstBracket = content.indexOf("{");
        const firstSquare = content.indexOf("[");
        let start = -1;
        if (firstBracket === -1) start = firstSquare;
        else if (firstSquare === -1) start = firstBracket;
        else start = Math.min(firstBracket, firstSquare);
        const lastBracket = content.lastIndexOf("}");
        const lastSquare = content.lastIndexOf("]");
        const end = Math.max(lastBracket, lastSquare);
        if (start !== -1 && end !== -1 && end > start) {
          content = content.substring(start, end + 1);
        }

        const parsed = robustJsonParse(content);
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

const ExamListItem: React.FC<{
  name: string;
  source: string;
  totalQuestions: number;
  onStart: () => void;
  date?: Date;
}> = ({ name, source, totalQuestions, onStart, date }) => (
  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-shadow duration-300 ease-in-out hover:shadow-lg hover:border-green-500">
    <div>
      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {source === "local"
          ? `Total Questions: ${totalQuestions}`
          : `Uploaded: ${date?.toLocaleString()}`}
      </p>
    </div>
    <Button onClick={onStart} className="flex-shrink-0">
      <Clock size={20} /> Start
    </Button>
  </div>
);

const ExamHistoryItem: React.FC<{
  result: ExamResult;
  onClick: () => void;
}> = ({ result, onClick }) => (
  <div
    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer transition-shadow duration-300 ease-in-out hover:shadow-lg"
    onClick={onClick}
  >
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-lg">{result.examName}</span>
      <span
        className={`font-bold text-xl ${
          result.accuracy > 70 ? "text-green-500" : "text-red-500"
        }`}
      >
        {result.accuracy.toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 mb-2">
      <div
        className={`h-2.5 rounded-full ${
          result.accuracy > 70 ? "bg-green-600" : "bg-red-600"
        }`}
        style={{ width: `${result.accuracy}%` }}
      ></div>
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {new Date(result.date).toLocaleString()}
    </p>
  </div>
);

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
  const [searchQuery, setSearchQuery] = React.useState("");

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

  const filteredLocalExams = availableExams.filter((exam) =>
    exam.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredServerExams = serverExams.filter((exam) =>
    exam.exam_title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 dark:text-gray-300 text-gray-700">
      <Card title="New Exam Session" className="mb-8">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Set Timer
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={hours}
                  onChange={(e) =>
                    setHours(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0 pr-12"
                  aria-label="Hours for timer"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  Hours
                </span>
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0 pr-12"
                  aria-label="Minutes for timer"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  Mins
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:col-span-2">
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

      <div className="grid lg:grid-cols-3 gap-8">
        <Card
          title="Available Exams"
          icon={<FileText />}
          className="lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="Search exams..."
              />
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
            </div>
            <Button
              onClick={fetchExams}
              variant="secondary"
              disabled={isLoading}
              className="px-4 py-3"
            >
              <RefreshCw
                size={20}
                className={isLoading ? "animate-spin" : ""}
              />
            </Button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {filteredLocalExams.length > 0 && (
              <>
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                  Local Exams
                </h3>
                {filteredLocalExams.map((exam, index) => (
                  <ExamListItem
                    key={`local-${index}`}
                    name={exam.name}
                    source="local"
                    totalQuestions={exam.questions.length}
                    onStart={() => startExam(exam)}
                  />
                ))}
              </>
            )}
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
              Community Exams
            </h3>
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : filteredServerExams.length > 0 ? (
              <>
                {filteredServerExams.map((exam) => (
                  <ExamListItem
                    key={exam.exam_id}
                    name={exam.exam_title}
                    source="server"
                    totalQuestions={0}
                    date={new Date(exam.datetime_uploaded)}
                    onStart={() => startExam(exam.exam_id)}
                  />
                ))}
                <div className="flex justify-center items-center gap-4 mt-4">
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="secondary"
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 p-4">
                No community exams are available or match your search.
              </p>
            )}
            {filteredLocalExams.length === 0 &&
              filteredServerExams.length === 0 &&
              !isLoading && (
                <p className="text-gray-500 dark:text-gray-400">
                  No exams found. Upload an exam JSON to begin.
                </p>
              )}
          </div>
        </Card>
        <Card title="Exam History" icon={<History />}>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {examHistory.length > 0 ? (
              examHistory.map((result) => (
                <ExamHistoryItem
                  key={result.id}
                  result={result}
                  onClick={() => viewResult(result)}
                />
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
    <div className="max-w-5xl mx-auto p-4 md:p-8 dark:text-gray-300 text-gray-700">
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
              className={`text-3xl font-bold ${
                result.accuracy > 70 ? "text-green-500" : "text-red-500"
              }`}
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
        <Card title="Topic Performance">
          <div className="space-y-4">
            {Object.keys(result.timePerTopic).map((topic) => (
              <div key={topic}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{topic}</span>
                  <span
                    className={`font-semibold ${
                      (result.accuracyPerTopic[topic] || 0) * 100 > 70
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
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
        <Card title="SWOT Analysis">
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
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    reviewQuestionId === q.id
                      ? "bg-green-100 dark:bg-green-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
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
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
                <Eye size={48} className="mb-4" />
                <span className="text-lg font-medium">
                  Select a question to review its details and explanation.
                </span>
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

  // React.useEffect(() => {
  //   if (isDark) {
  //     document.documentElement.classList.add("dark");
  //   } else {
  //     document.documentElement.classList.remove("dark");
  //   }
  // }, [isDark]);

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
    <ThemeProvider>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans transition-colors">
        <Header screen={screen} mainTimer={mainTimer} />
        {renderScreen()}
      </div>
    </ThemeProvider>
  );
}

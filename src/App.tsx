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
  Settings,
  Activity,
  Trash2,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { Latex } from "./components/Latex";
import { AIExamGenerator } from "./components/AIExamGenerator";
import AdminDashboard from "./admin/AdminDashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeToggle } from "./components/ThemeToggle";

import type {
  ExamConfig,
  ExamResult,
  ServerExam,
  ServerExamDetail,
  ExamPreset,
} from "./types";

import {
  formatTime,
  isValidExamQuestions,
  isValidExamConfig,
  robustJsonParse,
  API_BASE_URL,
  generatePresetExam,
  isLocalhost,
  SUBJECT_GROUPS,
  resolveImagePath,
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

// --- HEADER COMPONENT ---
const Header: React.FC<{
  screen: "home" | "exam" | "results" | "admin";
  mainTimer: number;
  onAdminClick: () => void;
}> = ({ screen, mainTimer, onAdminClick }) => {
  return (
    <header className="flex justify-between items-center p-4 glass sticky top-0 z-50 transition-all border-b border-white/20 dark:border-white/10">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent font-bebas tracking-wider">
          Pariksha <span className="text-sm font-sans font-light text-slate-400 align-middle ml-2 uppercase tracking-tighter">Physics Edition</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {screen === "exam" && (
          <div className="flex items-center gap-2 p-2 px-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
            <Clock size={20} />
            <span className="font-mono text-lg font-semibold tracking-widest">
              {formatTime(mainTimer)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {screen === "home" && isLocalhost() && (
            <button 
              onClick={onAdminClick}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title="Admin Dashboard"
            >
              <Settings size={20} />
            </button>
          )}
          <ThemeToggle />
        </div>
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
    className={`glass rounded-2xl p-6 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 hover:border-teal-500/30 ${className}`}
  >
    {(title || icon) && (
      <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="text-teal-500">{icon}</span> {title}
      </h2>
    )}
    {children}
  </div>
);

export const Button: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger" | "blue";
  disabled?: boolean;
}> = ({
  onClick,
  children,
  className = "",
  variant = "primary",
  disabled = false,
}) => {
  const baseClasses =
    "px-6 py-3 font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-300 ease-in-out transform flex items-center justify-center gap-2 active:scale-95";
  const variantClasses = {
    primary: "glowing-primary",
    secondary:
      "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 focus:ring-slate-500 border border-slate-300 dark:border-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-red-900/20",
    blue: "glowing-blue",
  };
  const disabledClasses =
    "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-md pointer-events-none";
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : "hover:-translate-y-1"} ${className}`}
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
      const parsedJson = robustJsonParse(examJson);
      const payload: any = {
        exam_title: `${userName} - ${examTitle}`,
        exam_json_str: examJson,
      };

      // NEW: Support for sections architecture in POST
      if (parsedJson.sections) {
        payload.sections = parsedJson.sections.map((s: any) => ({
          name: s.name,
          questions: s.questions.map((q: any) => q.id).filter(Boolean), // IDs only
          marking: s.marking,
          max_attempts: s.maxAttempts
        }));
      }

      const response = await fetch(`${API_BASE_URL}/pariksha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // If it's a full config, use it; otherwise wrap questions in a basic config
      const finalConfig: ExamConfig = (parsedJson.sections || parsedJson.questions)
        ? { ...parsedJson, name: examTitle }
        : { name: examTitle, questions: parsedJson };
      onUpload(finalConfig);
      onClose();
    } catch (err) {
      setError("Failed to post exam. Please try again.");
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4 text-slate-100">Upload Exam</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value.slice(0, 50))}
              maxLength={50}
              className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Exam Title
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none"
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
            {isPosting ? "Posting..." : "Post and save"}
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
        if (!isValidExamConfig(parsed)) {
          throw new Error("Invalid JSON format. Expected an ExamConfig object or an array of Questions.");
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
      <Button onClick={handleClick} className="w-full" variant="secondary">
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
  onDelete?: () => void;
  date?: Date;
}> = ({ name, source, totalQuestions, onStart, onDelete, date }) => (
  <div className="flex justify-between items-center p-4 glass rounded-xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 group">
    <div>
      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{name}</h3>
      <p className="text-sm text-slate-500 mt-1 uppercase tracking-tighter">
        {source === "local"
          ? `Total Questions: ${totalQuestions}`
          : `Uploaded: ${date?.toLocaleString()}`}
      </p>
    </div>
    <div className="flex items-center gap-2">
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
          title="Delete Exam"
        >
          <Trash2 size={18} />
        </button>
      )}
      <Button onClick={onStart} className="flex-shrink-0 px-4 py-2 text-sm">
        <Clock size={16} /> Start
      </Button>
    </div>
  </div>
);

const ExamHistoryItem: React.FC<{
  result: ExamResult;
  onClick: () => void;
}> = ({ result, onClick }) => (
  <div
    className="p-4 glass rounded-xl border border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30"
    onClick={onClick}
  >
    <div className="flex justify-between items-center mb-2">
      <span className="font-semibold text-lg text-slate-800 dark:text-slate-100">{result.examName}</span>
      <span
        className={`font-bold text-xl ${
          result.accuracy > 70 ? "text-teal-500" : "text-red-500"
        }`}
      >
        {result.accuracy.toFixed(1)}%
      </span>
    </div>
    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${
          result.accuracy > 70 ? "bg-teal-500" : "bg-red-500"
        }`}
        style={{ width: `${result.accuracy}%` }}
      ></div>
    </div>
    <p className="text-xs text-slate-500 uppercase tracking-widest">
      {new Date(result.date).toLocaleString()}
    </p>
  </div>
);

const ExamConfigModal: React.FC<{
  exam: ExamConfig;
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: ExamConfig) => void;
}> = ({ exam, isOpen, onClose, onStart }) => {
  const [hours, setHours] = React.useState(exam.settings?.timerHours ?? 1);
  const [minutes, setMinutes] = React.useState(exam.settings?.timerMinutes ?? 30);
  const [posMarking, setPosMarking] = React.useState(exam.settings?.positiveMarking ?? 1);
  const [negMarking, setNegMarking] = React.useState(exam.settings?.negativeMarking ?? 0);
  
  // Safe calculation of total questions
  const totalQuestions = exam.questions 
    ? exam.questions.length 
    : (exam.sections?.reduce((sum, section) => sum + section.questions.length, 0) || 0);

  // Use actual question count from settings if present and less than total fetched
  const initialQCount = exam.settings?.questionCount && exam.settings.questionCount <= totalQuestions
    ? exam.settings.questionCount
    : totalQuestions;

  const [qCount, setQCount] = React.useState(initialQCount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
      <Card title="Exam Configuration" className="w-full max-w-lg shadow-2xl border-teal-500/50">
        <div className="space-y-6">
          <div>            <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Duration</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input 
                  type="number" 
                  value={hours} 
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">Hours</span>
              </div>
              <div className="flex-1">
                <input 
                  type="number" 
                  value={minutes} 
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">Minutes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Marks / Correct</label>
              <input 
                type="number" 
                step="0.5"
                value={posMarking} 
                onChange={(e) => setPosMarking(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 font-bold text-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider text-right">Negative Marking</label>
              <div className="relative">
                <select
                  value={negMarking}
                  onChange={(e) => setNegMarking(parseFloat(e.target.value))}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 appearance-none text-red-500 font-bold"
                >
                  <option value="0">None</option>
                  <option value="0.25">-0.25</option>
                  <option value="0.33">-0.33</option>
                  <option value="0.5">-0.50</option>
                  <option value="0.66">-0.66</option>
                  <option value="0.875">-0.875</option>
                  <option value="1">-1.00</option>
                  <option value="1.25">-1.25</option>
                  <option value="1.5">-1.50</option>
                  <option value="2">-2.00</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Number of Questions</label>
            <input
              type="range"
              min="1"
              max={totalQuestions}
              value={qCount}
              onChange={(e) => setQCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>1</span>
              <span className="font-bold text-teal-500 text-base">{qCount}</span>
              <span>{totalQuestions}</span>
            </div>
            </div>
          <div className="flex gap-4 pt-4">
            <Button onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
            <Button 
              onClick={() => onStart({
                ...exam,
                settings: {
                  timerHours: hours,
                  timerMinutes: minutes,
                  positiveMarking: posMarking,
                  negativeMarking: negMarking,
                  questionCount: qCount,
                  shuffleQuestions: true,
                  shuffleOptions: true,
                }
              })} 
              className="flex-1"
            >
              Start Exam
            </Button>
          </div>
          
          <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                <strong>Note on Mixed Patterns:</strong> Pariksha currently applies a uniform marking scheme. 
                For exams like CSIR NET or GATE which have different marks/penalties per section (or no penalties for NATs/MSQs), 
                the values above represent an <em>average or default</em> global scheme.
              </span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const PhysicsExamGeneratorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExamGenerated: (config: ExamConfig) => void;
}> = ({ isOpen, onClose, onExamGenerated }) => {
  const [shouldUpload, setShouldUpload] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  const [customCounts, setCustomCounts] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    Object.keys(SUBJECT_GROUPS).forEach(group => initial[group] = 5);
    return initial;
  });

  if (!isOpen) return null;

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
        <Card className="w-full max-w-sm border-blue-500/50 shadow-2xl shadow-blue-500/20 flex flex-col items-center justify-center p-12 text-center">
          <RefreshCw className="animate-spin text-blue-500 mb-6" size={48} />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Generating Exam</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Fetching topic distributions and sampling scientific questions from the database...
          </p>
        </Card>
      </div>
    );
  }

  const presets: { id: ExamPreset; name: string; desc: string }[] = [
    { id: "GATE", name: "GATE Physics", desc: "65 Questions | 180 Mins | Precise Pattern" },
    { id: "CSIR_NET", name: "CSIR NET Physical Sciences", desc: "75 Questions | Part A, B & C" },
    { id: "TIFR_GS", name: "TIFR GS (Physics)", desc: "40 Questions | Concept Depth Focus" },
    { id: "BARC_OCES", name: "BARC OCES", desc: "100 Questions | Speed Test Pattern" },
  ];

  const handleGenerate = async (presetId: ExamPreset) => {
    setIsGenerating(true);
    try {
      const config = await generatePresetExam(presetId, presetId === "CUSTOM" ? customCounts : undefined);
      
      if (shouldUpload) {
        try {
          await fetch(`${API_BASE_URL}/pariksha`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exam_title: config.name,
              exam_json_str: JSON.stringify(config.questions),
            }),
          });
        } catch (uploadErr) {
          console.warn("Failed to upload auto-generated exam to community server.");
        }
      }

      onExamGenerated(config);
      onClose();
    } catch (err) {
      alert("Error generating exam from bank. Ensure you have run Phase 1 generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomCountChange = (group: string, val: string) => {
    setCustomCounts(prev => ({ ...prev, [group]: Math.max(0, parseInt(val) || 0) }));
  };

  const totalCustomQuestions = Object.values(customCounts).reduce((a, b) => a + b, 0);

  if (isCustomMode) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
        <Card title="Advanced Preset Editor" className="w-full max-w-3xl border-teal-500/50 max-h-[90vh] flex flex-col">
          <p className="text-sm text-slate-500 mb-6">Distribute questions across major physics subject groups.</p>
          
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow mb-6">
            {Object.keys(SUBJECT_GROUPS).map(group => (
              <div key={group} className="flex justify-between items-center p-3 glass rounded-xl border border-white/5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{group}</span>
                <input 
                  type="number"
                  min="0"
                  value={customCounts[group]}
                  onChange={(e) => handleCustomCountChange(group, e.target.value)}
                  className="w-20 p-2 text-center rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-teal-500"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Total Questions: <span className="text-teal-500">{totalCustomQuestions}</span>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setIsCustomMode(false)} variant="secondary" disabled={isGenerating}>Back</Button>
              <Button onClick={() => handleGenerate("CUSTOM")} disabled={isGenerating || totalCustomQuestions === 0}>
                {isGenerating ? "Generating..." : "Generate Custom Exam"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
      <Card title="Physics Exam Generator" className="w-full max-w-2xl border-blue-500/50">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => handleGenerate(p.id)}
              disabled={isGenerating}
              className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 transition-all group disabled:opacity-50"
            >
              <h3 className="font-bold text-lg group-hover:text-blue-500">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.desc}</p>
            </button>
          ))}
        </div>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
            <h4 className="font-semibold text-blue-500 flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
              <Zap size={14} /> Custom Preset
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Adjust topic weightage manually to create a tailored practice session (e.g. 50% QM, 50% EMT).
            </p>
            <Button onClick={() => setIsCustomMode(true)} variant="secondary" className="w-full text-xs py-2 bg-slate-200/50 dark:bg-slate-900/50 border-blue-500/30 hover:border-blue-500 text-blue-500">
              Open Advanced Preset Editor
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="secondary" disabled={isGenerating}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
};

const HomeScreen: React.FC<{
  setExamConfig: (config: ExamConfig) => void;
  setScreen: (screen: "exam" | "results") => void;
  setTimerConfig: (config: { hours: number; minutes: number }) => void;
  viewResult: (result: ExamResult) => void;
  handleFileUpload: (config: ExamConfig) => void;
  handleDeleteExam: (examName: string) => void;
  availableExams: ExamConfig[];
}> = ({
  setExamConfig,
  setScreen,
  setTimerConfig,
  viewResult,
  handleFileUpload,
  handleDeleteExam,
  availableExams,
}) => {
  const [serverExams, setServerExams] = React.useState<ServerExam[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [examHistory] = useLocalStorage<ExamResult[]>("examHistory", []);
  const [isAiModalOpen, setIsAiModalOpen] = React.useState(false);
  const [isPhysicsGenModalOpen, setIsPhysicsGenModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [configExam, setConfigExam] = React.useState<ExamConfig | null>(null);

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
        setTotalPages(data.length === 10 ? currentPage + 1 : currentPage);
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

  const handleExamClick = async (configOrId: ExamConfig | string) => {
    if (typeof configOrId === "string") {
      try {
        const response = await fetch(`${API_BASE_URL}/pariksha/${configOrId}`);
        if (!response.ok) throw new Error("Failed to fetch exam");
        const examDetail: ServerExamDetail = await response.json();

        // NEW: Check for modern structured sections first
        if (examDetail.sections && examDetail.sections.length > 0) {
          // Normalize section naming (max_attempts vs maxAttempts handled by UI usually, but mapping is safer)
          const sections = (examDetail as any).sections.map((s: any) => ({
            ...s,
            maxAttempts: s.max_attempts || s.maxAttempts
          }));
          setConfigExam({ name: examDetail.exam_title, sections });
        } else {
          // Legacy Fallback
          const questions = robustJsonParse(examDetail.exam_json_str);
          if (!isValidExamQuestions(questions)) throw new Error("Invalid format");
          setConfigExam({ name: examDetail.exam_title, questions });
        }
      } catch (error) {
        console.error("Failed to load exam:", error);
        alert("Failed to load exam from server.");
      }
    } else {
      setConfigExam(configOrId);
    }
  };

  const startExam = (config: ExamConfig) => {
    setTimerConfig({ 
      hours: config.settings?.timerHours ?? 1, 
      minutes: config.settings?.timerMinutes ?? 30 
    });
    setExamConfig(config);
    setScreen("exam");
    setConfigExam(null);
  };

  const filteredLocalExams = availableExams.filter((exam) =>
    exam.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredServerExams = serverExams.filter((exam) =>
    exam.exam_title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="science-grid min-h-[calc(100vh-68px)] transition-all">
      <div className="max-w-7xl mx-auto p-4 md:p-8 dark:text-slate-300 text-slate-700">
        
        {/* Main Action Area */}
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-8">
            <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
              Scientific Exam <span className="text-teal-500">Simulator</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-2xl">
              Master complex physics concepts through our AI-enhanced question bank. 
              Practice for GATE, NET, and TIFR with real-world patterns.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Button onClick={() => setIsPhysicsGenModalOpen(true)} variant="blue" className="h-24 text-xl">
                <Zap size={28} /> Auto-Generate Physics Exam
              </Button>
              <Button onClick={() => setIsAiModalOpen(true)} className="h-24 text-xl">
                <Bot size={28} /> Custom AI Generation
              </Button>
            </div>
          </div>
          
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="bg-teal-500/5 border-teal-500/20">
              <h3 className="font-bold text-teal-500 flex items-center gap-2 mb-2"><Shield size={18}/> Question Bank Status</h3>
              <p className="text-sm text-slate-500">840 Questions across 42 Physics Topics. Fully indexed and AI-verified.</p>
              <div className="mt-4 flex gap-2">
                <div className="h-1 bg-teal-500 flex-1 rounded-full"></div>
                <div className="h-1 bg-teal-500 flex-1 rounded-full"></div>
                <div className="h-1 bg-slate-300 dark:bg-slate-700 flex-1 rounded-full"></div>
              </div>
            </Card>
            <div className="flex gap-4">
              <FileUploader onFileUpload={handleFileUpload} />
            </div>
          </div>
        </div>

        {isAiModalOpen && (
          <AIExamGenerator
            onClose={() => setIsAiModalOpen(false)}
            onExamGenerated={handleFileUpload}
          />
        )}

        {isPhysicsGenModalOpen && (
          <PhysicsExamGeneratorModal
            isOpen={isPhysicsGenModalOpen}
            onClose={() => setIsPhysicsGenModalOpen(false)}
            onExamGenerated={handleFileUpload}
          />
        )}

        {configExam && (
          <ExamConfigModal
            exam={configExam}
            isOpen={!!configExam}
            onClose={() => setConfigExam(null)}
            onStart={startExam}
          />
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <Card
            title="Available Exams"
            icon={<FileText />}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-4 pl-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  placeholder="Search exam bank..."
                />
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <Button
                onClick={fetchExams}
                variant="secondary"
                disabled={isLoading}
                className="p-4"
              >
                <RefreshCw
                  size={20}
                  className={isLoading ? "animate-spin" : ""}
                />
              </Button>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredLocalExams.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div> Local Exams
                  </h3>
                  <div className="grid gap-3 mb-6">
                    {filteredLocalExams.map((exam, index) => {
                      const tCount = exam.questions 
                        ? exam.questions.length 
                        : (exam.sections?.reduce((s, sec) => s + sec.questions.length, 0) || 0);
                      return (
                        <ExamListItem
                          key={`local-${index}`}
                          name={exam.name}
                          source="local"
                          totalQuestions={tCount}
                          onStart={() => handleExamClick(exam)}
                          onDelete={() => handleDeleteExam(exam.name)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
              
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Community Exams
              </h3>
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <RefreshCw className="animate-spin text-teal-500" size={32} />
                </div>
              ) : filteredServerExams.length > 0 ? (
                <>
                  <div className="grid gap-3">
                    {filteredServerExams.map((exam) => (
                      <ExamListItem
                        key={exam.exam_id}
                        name={exam.exam_title}
                        source="server"
                        totalQuestions={0}
                        date={new Date(exam.datetime_uploaded)}
                        onStart={() => handleExamClick(exam.exam_id)}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="secondary"
                      className="px-4 py-2"
                    >
                      Prev
                    </Button>
                    <span className="text-sm font-medium text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      variant="secondary"
                      className="px-4 py-2"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-10 italic">No community exams found matching your search.</p>
              )}
            </div>
          </Card>
          
          <Card title="Recent History" icon={<History />}>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {examHistory.length > 0 ? (
                examHistory.map((result) => (
                  <ExamHistoryItem
                    key={result.id}
                    result={result}
                    onClick={() => viewResult(result)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <Activity size={40} className="mb-4 opacity-20" />
                  <p className="text-sm italic text-center">Your performance analytics will appear here once you take an exam.</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <ResultUploader onResultUpload={viewResult} />
            </div>
          </Card>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
};

import { ExamScreen } from "./components/ExamScreen";

const ResultsScreen: React.FC<{
  result: ExamResult;
  setScreen: (screen: "home") => void;
}> = ({ result, setScreen }) => {
  const [reviewQuestionId, setReviewQuestionId] = React.useState<string | null>(
    result.originalQuestions[0]?.id || null,
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

      <Card className="mb-8 overflow-hidden relative border-b-4 border-teal-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Final Score</p>
            <p className="text-3xl font-bold text-teal-500">
              {result.score.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ({result.correctAnswers} Correct)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Accuracy</p>
            <p
              className={`text-3xl font-bold ${
                result.accuracy > 70 ? "text-green-500" : "text-red-500"
              }`}
            >
              {result.accuracy.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Total Time
            </p>
            <p className="text-3xl font-bold">
              {formatTime(result.totalTimeTaken)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
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

      {result.sectionScores && Object.keys(result.sectionScores).length > 1 && (
        <Card title="Section Breakdown" className="mb-8" icon={<Activity />}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(result.sectionScores).map(([id, score]) => (
              <div key={id} className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-teal-500 uppercase tracking-tighter mb-1">Section ID: {id}</p>
                <p className="text-2xl font-bold">{score.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <Card title="Topic Performance" icon={<Activity />}>
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
                    className="bg-teal-500 h-2.5 rounded-full"
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
        <Card title="SWOT Analysis" icon={<Bot />}>
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

      <Card className="mt-8" title="Answer Review" icon={<Eye />}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {result.originalQuestions.map((q, index) => {
              const answer = result.answers.find((a) => a.questionId === q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => setReviewQuestionId(q.id)}
                  className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all border-l-4 ${
                    reviewQuestionId === q.id
                      ? "bg-teal-500/10 border-teal-500 shadow-lg"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {answer?.isCorrect ? (
                      <CheckCircle2 className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-red-500" size={20} />
                    )}
                    <span className="font-medium text-sm">Question {index + 1}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {q.type || "MCQ"}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            {reviewingQuestion && reviewingAnswer ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-6 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6 border border-slate-200 dark:border-white/5 shadow-inner">
                  <div className="text-[10px] font-bold text-teal-500 mb-2 uppercase tracking-widest">{reviewingQuestion.topic}</div>
                  <Latex>{reviewingQuestion.question}</Latex>
                  {reviewingQuestion.image_path && (
                    <div className="mt-4 flex justify-center p-2 bg-white/5 rounded-lg">
                      <img src={resolveImagePath(reviewingQuestion.image_path)} alt="Review Illustration" className="max-w-full h-auto rounded" />
                    </div>
                  )}
                </div>

                {reviewingQuestion.type === "NAT" ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-400 mb-1">YOUR ANSWER</p>
                      <p className="text-xl font-mono">{reviewingAnswer.enteredAnswer || "Unattempted"}</p>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-green-500 bg-green-500/10">
                      <p className="text-xs font-bold text-green-500 mb-1">CORRECT ANSWER</p>
                      <p className="text-xl font-mono">
                        {reviewingQuestion.answer_value || 
                          `${reviewingQuestion.answer_range?.min} to ${reviewingQuestion.answer_range?.max}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewingQuestion.options?.map((option) => {
                      const isCorrect = reviewingQuestion.type === "MCQ" 
                        ? option.label === reviewingQuestion.answer_label
                        : reviewingQuestion.answer_labels?.includes(option.label);
                      
                      const isSelected = reviewingQuestion.type === "MCQ"
                        ? option.label === reviewingAnswer.selectedOptionLabel
                        : reviewingAnswer.selectedOptionLabels?.includes(option.label);

                      let styles = "border-slate-200 dark:border-slate-700 text-slate-500";
                      if (isCorrect) {
                        styles = "bg-green-500/10 border-green-500 text-green-600 dark:text-green-400 font-medium";
                      } else if (isSelected && !isCorrect) {
                        styles = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-medium";
                      }
                      
                      return (
                        <div key={option.label} className={`p-4 border-2 rounded-xl transition-all ${styles} flex gap-3`}>
                          <span className="font-bold opacity-50">{String.fromCharCode(64 + option.label)}.</span>
                          <Latex>{option.value}</Latex>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {reviewingQuestion.explanation && (
                  <div className="mt-8 p-6 rounded-2xl bg-teal-500/5 border border-teal-500/20">
                    <h4 className="font-bold mb-3 text-teal-500 flex items-center gap-2">
                      <RefreshCw size={16} /> Explanation
                    </h4>
                    <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      <Latex>{reviewingQuestion.explanation}</Latex>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-8 text-center bg-slate-100/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5">
                <Eye size={48} className="mb-4 opacity-20" />
                <span className="text-lg font-medium opacity-50">
                  Select a question to review scientific details.
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex justify-center gap-4">
        <Button onClick={() => setScreen("home")} variant="secondary" className="px-8">
          <Home size={20} /> Back to Home
        </Button>
        <Button onClick={downloadResults} className="px-8">
          <Download size={20} /> Download Results
        </Button>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [screen, setScreen] = React.useState<"home" | "exam" | "results" | "admin">(
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

  const handleDeleteExam = (examName: string) => {
    if (confirm(`Are you sure you want to delete "${examName}"?`)) {
      setAvailableExams((prev) => prev.filter((e) => e.name !== examName));
    }
  };

  const [mainTimer, setMainTimer] = React.useState(0);

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
      case "admin":
        if (!isLocalhost()) {
          setScreen("home");
          return null;
        }
        return <AdminDashboard onBack={() => setScreen("home")} />;
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
            handleDeleteExam={handleDeleteExam}
            availableExams={availableExams}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <div className="bg-slate-50 dark:bg-science-900 min-h-screen font-sans transition-colors selection:bg-teal-500/30">
        {screen !== "admin" && (
          <Header 
            screen={screen} 
            mainTimer={mainTimer} 
            onAdminClick={() => setScreen("admin")} 
          />
        )}
        {renderScreen()}
      </div>
    </ThemeProvider>
  );
}

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
  Plus,
  Save,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { Latex } from "./components/Latex";
import { Card } from "./components/Card";
import { Button } from "./components/Button";
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
  QuestionType,
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
  type CustomConfig,
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
    <header className="flex flex-wrap justify-between items-center px-2 py-2 sm:px-4 sm:py-4 glass sticky top-0 z-50 transition-all border-b border-white/20 dark:border-white/10 gap-1 sm:gap-2">
      <div className="flex items-center flex-shrink min-w-0 pr-1">
        <h1 className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent font-sans tracking-wider truncate">
          pariksha. <span className="hidden xs:inline text-[10px] sm:text-sm font-sans font-light text-slate-400 align-middle ml-1 sm:ml-2 uppercase tracking-tighter">Physics</span>
        </h1>
      </div>
      <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
        {screen === "exam" && (
          <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 px-2 sm:px-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
            <Clock size={14} className="sm:w-5 sm:h-5" />
            <span className="font-mono text-xs sm:text-lg font-semibold tracking-widest">
              {formatTime(mainTimer)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 sm:gap-2">
          {screen === "home" && isLocalhost() && (
            <button 
              onClick={onAdminClick}
              className="p-1.5 sm:p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title="Admin Dashboard"
            >
              <Settings size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

// --- UI COMPONENTS ---
// Local Card and Button removed, using imports from ./components/

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
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none"
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
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none"
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
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 glass rounded-xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/50 group gap-3 sm:gap-4">
    <div className="flex-1 w-full sm:w-auto pr-0 sm:pr-4">
      <h3 className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-tight mb-1" style={{ wordBreak: 'break-word' }}>{name}</h3>
      <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-tighter">
        {source === "local"
          ? `Total Questions: ${totalQuestions}`
          : `Uploaded: ${date?.toLocaleDateString()} ${date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      </p>
    </div>
    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0 mt-2 sm:mt-0">
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
      <Button onClick={onStart} className="flex-shrink-0 px-5 py-2 text-sm shadow-md">
        <Clock size={16} className="mr-2" /> Start
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
    <div className="flex justify-between items-start mb-2 gap-4">
      <h3 className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-tight flex-1 pr-2" style={{ wordBreak: 'break-word' }}>
        {result.examName}
      </h3>
      <span
        className={`font-bold text-lg sm:text-xl flex-shrink-0 mt-0.5 ${
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
        </div>
      </Card>
    </div>
  );
};

interface CustomSectionConfig {
  name: string;
  topicWeights: Record<string, number>;
  marking: { positive: number; negative: number };
  allowedTypes: QuestionType[];
  maxAttempts?: number;
}

const PhysicsExamGeneratorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExamGenerated: (config: ExamConfig) => void;
}> = ({ isOpen, onClose, onExamGenerated }) => {
  const [shouldUpload] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  
  // Custom multi-section state
  const [customSections, setCustomSections] = React.useState<CustomSectionConfig[]>([
    {
      name: "Section 1",
      topicWeights: Object.keys(SUBJECT_GROUPS).reduce((acc, group) => ({ ...acc, [group]: group === "Quantum Mechanics" ? 5 : 0 }), {}),
      marking: { positive: 1, negative: 0 },
      allowedTypes: ["MCQ", "MSQ", "NAT"],
    }
  ]);
  const [activeSectionIdx, setActiveSectionIdx] = React.useState(0);

  const presets: { id: ExamPreset; name: string; desc: string }[] = [
    { id: "GATE", name: "GATE Physics", desc: "65 Questions | 180 Mins | Precise Pattern" },
    { id: "CSIR_NET", name: "CSIR NET Physical Sciences", desc: "75 Questions | Part A, B & C" },
    { id: "TIFR_GS", name: "TIFR GS (Physics)", desc: "40 Questions | Concept Depth Focus" },
    { id: "BARC_OCES", name: "BARC OCES", desc: "100 Questions | Speed Test Pattern" },
  ];

  if (!isOpen) return null;

  const activeSection = customSections[activeSectionIdx];

  const handleGenerate = async (presetId: ExamPreset) => {
    setIsGenerating(true);
    try {
      let config: ExamConfig;
      if (presetId === "CUSTOM") {
        const customConfig: CustomConfig = {
          sections: customSections
        };
        config = await generatePresetExam("CUSTOM", customConfig);
      } else {
        config = await generatePresetExam(presetId);
      }
      
      if (shouldUpload) {
        try {
          // If the exam has sections, we upload the consolidated questions for legacy compatibility
          const allQs = config.sections 
            ? config.sections.flatMap(s => s.questions)
            : config.questions;

          await fetch(`${API_BASE_URL}/pariksha`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exam_title: config.name,
              exam_json_str: JSON.stringify(allQs),
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

  const addSection = () => {
    const newSection: CustomSectionConfig = {
      name: `Section ${customSections.length + 1}`,
      topicWeights: Object.keys(SUBJECT_GROUPS).reduce((acc, group) => ({ ...acc, [group]: 0 }), {}),
      marking: { positive: 1, negative: 0 },
      allowedTypes: ["MCQ", "MSQ", "NAT"],
    };
    setCustomSections([...customSections, newSection]);
    setActiveSectionIdx(customSections.length);
  };

  const removeSection = (idx: number) => {
    if (customSections.length <= 1) return;
    const newSections = customSections.filter((_, i) => i !== idx);
    setCustomSections(newSections);
    setActiveSectionIdx(Math.max(0, activeSectionIdx - 1));
  };

  const updateActiveSection = (updates: Partial<CustomSectionConfig>) => {
    const newSections = [...customSections];
    newSections[activeSectionIdx] = { ...newSections[activeSectionIdx], ...updates };
    setCustomSections(newSections);
  };

  const handleTopicWeightChange = (group: string, val: string) => {
    const newWeights = { ...activeSection.topicWeights, [group]: Math.max(0, parseInt(val) || 0) };
    updateActiveSection({ topicWeights: newWeights });
  };

  const toggleType = (type: QuestionType) => {
    const current = activeSection.allowedTypes;
    const next = current.includes(type) 
      ? current.filter(t => t !== type)
      : [...current, type];
    updateActiveSection({ allowedTypes: next });
  };

  const totalQuestions = customSections.reduce((sum, s) => 
    sum + Object.values(s.topicWeights).reduce((a, b) => a + b, 0), 0
  );

  if (isCustomMode) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
        <Card title="Advanced Preset Editor" className="w-full max-w-5xl border-teal-500/50 max-h-[95vh] flex flex-col overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6 flex-grow overflow-hidden">
            {/* Left Sidebar: Section List */}
            <div className="w-full md:w-64 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sections</h3>
                <button onClick={addSection} className="p-1 hover:bg-teal-500/10 text-teal-500 rounded-lg transition-colors">
                  <Plus size={18} />
                </button>
              </div>
              {customSections.map((s, i) => (
                <div 
                  key={i}
                  onClick={() => setActiveSectionIdx(i)}
                  className={`group flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${
                    activeSectionIdx === i 
                    ? "bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  {customSections.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSection(i); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-red-500 rounded-md transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Right Side: Active Section Editor */}
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Section Identity</label>
                  <input 
                    type="text"
                    value={activeSection.name}
                    onChange={(e) => updateActiveSection({ name: e.target.value })}
                    placeholder="Section Name"
                    className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Marking Scheme</label>
                  <div className="flex gap-4">
                    <div className="flex-grow">
                      <div className="text-[10px] text-slate-500 mb-1">CORRECT</div>
                      <input 
                        type="number"
                        step="0.1"
                        value={activeSection.marking.positive}
                        onChange={(e) => updateActiveSection({ marking: { ...activeSection.marking, positive: parseFloat(e.target.value) || 0 } })}
                        className="w-full p-2 text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="text-[10px] text-slate-500 mb-1">WRONG</div>
                      <input 
                        type="number"
                        step="0.1"
                        value={activeSection.marking.negative}
                        onChange={(e) => updateActiveSection({ marking: { ...activeSection.marking, negative: parseFloat(e.target.value) || 0 } })}
                        className="w-full p-2 text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Allowed Question Types</label>
                <div className="flex gap-2">
                  {(["MCQ", "MSQ", "NAT"] as QuestionType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`flex-grow p-2 rounded-xl border text-xs font-bold transition-all ${
                        activeSection.allowedTypes.includes(type)
                        ? "bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Topic Distribution</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(SUBJECT_GROUPS).map(group => (
                    <div key={group} className="flex justify-between items-center p-2 px-3 glass rounded-xl border border-white/5">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{group}</span>
                      <input 
                        type="number"
                        min="0"
                        value={activeSection.topicWeights[group]}
                        onChange={(e) => handleTopicWeightChange(group, e.target.value)}
                        className="w-16 p-1 text-center text-sm rounded-lg bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 outline-none focus:border-teal-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-slate-500 uppercase tracking-widest font-bold text-[10px] block">Global Total</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  <span className="text-teal-500">{totalQuestions}</span> Qs
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500 uppercase tracking-widest font-bold text-[10px] block">Current Section</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {Object.values(activeSection.topicWeights).reduce((a, b) => a + b, 0)} Qs
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setIsCustomMode(false)} variant="secondary" disabled={isGenerating}>Cancel</Button>
              <Button onClick={() => handleGenerate("CUSTOM")} disabled={isGenerating || totalQuestions === 0} className="bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-500/20">
                {isGenerating ? "Sampling Database..." : "Generate Exam"}
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
    <div className="science-grid min-h-[calc(100vh-68px)] transition-all overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 dark:text-slate-300 text-slate-700 w-full">
        
        {/* Main Action Area */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="lg:col-span-8 w-full">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-4">
              Scientific Exam <span className="text-teal-500">Simulator</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-6 sm:mb-8 max-w-2xl">
              Master complex physics concepts through our AI-enhanced question bank. 
              Practice for GATE, NET, and TIFR with real-world patterns.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => setIsPhysicsGenModalOpen(true)} variant="blue" className="h-20 sm:h-24 text-lg sm:text-xl">
                <Zap size={24} className="sm:w-7 sm:h-7" /> Auto-Generate
              </Button>
              <Button onClick={() => setIsAiModalOpen(true)} className="h-20 sm:h-24 text-lg sm:text-xl">
                <Bot size={24} className="sm:w-7 sm:h-7" /> Custom AI
              </Button>
            </div>
          </div>
          
          <div className="lg:col-span-4 flex flex-col gap-4 w-full">
            <Card className="bg-teal-500/5 border-teal-500/20">
              <h3 className="font-bold text-teal-500 flex items-center gap-2 mb-2 text-sm sm:text-base"><Shield size={18}/> Question Bank Status</h3>
              <p className="text-xs sm:text-sm text-slate-500">840 Questions across 42 Physics Topics. Fully indexed and AI-verified.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <Card
            title="Available Exams"
            icon={<FileText />}
            className="lg:col-span-2 w-full overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 sm:p-4 pl-10 sm:pl-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all text-sm sm:text-base"
                  placeholder="Search exam bank..."
                />
                <Search
                  size={18}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <Button
                onClick={fetchExams}
                variant="secondary"
                disabled={isLoading}
                className="p-3 sm:p-4"
              >
                <RefreshCw
                  size={18}
                  className={isLoading ? "animate-spin" : ""}
                />
              </Button>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {filteredLocalExams.length > 0 && (
                <>
                  <h3 className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500"></div> Local Exams
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
              
              <h3 className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div> Community Exams
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
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-3 sm:p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl gap-3">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="secondary"
                      className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm"
                    >
                      Prev
                    </Button>
                    <span className="text-xs sm:text-sm font-medium text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      variant="secondary"
                      className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-10 italic text-sm">No community exams found.</p>
              )}
            </div>
          </Card>
          
          <Card title="Recent History" icon={<History />} className="w-full overflow-hidden">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
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
  setScreen: (screen: "home" | "exam") => void;
  onSaveToLocal?: (config: ExamConfig) => void;
  onReattempt?: (config: ExamConfig) => void;
}> = ({ result, setScreen, onSaveToLocal, onReattempt }) => {
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

  const handleSaveToLocal = () => {
    if (onSaveToLocal) {
      if (result.originalConfig) {
        onSaveToLocal(result.originalConfig);
        alert("Exam saved to local successfully!");
      } else {
        // Fallback: reconstruct config from originalQuestions
        const config: ExamConfig = {
          name: result.examName,
          questions: result.originalQuestions
        };
        onSaveToLocal(config);
        alert("Exam saved to local successfully! (Note: sections and marking scheme might be basic for older results)");
      }
    }
  };

  const handleReattempt = () => {
    if (onReattempt) {
      if (result.originalConfig) {
        onReattempt(result.originalConfig);
      } else {
        const config: ExamConfig = {
          name: result.examName,
          questions: result.originalQuestions
        };
        onReattempt(config);
      }
    }
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
                    <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
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

      <div className="mt-12 p-4 md:p-6 bg-white dark:bg-science-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex w-full md:w-auto gap-3">
          <Button onClick={() => setScreen("home")} variant="secondary" className="flex-1 md:flex-none py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-0 rounded-xl">
            <Home size={18} className="mr-2" /> Home
          </Button>
          <Button onClick={handleReattempt} variant="primary" className="flex-1 md:flex-none py-3 px-6 bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 border-0 rounded-xl">
            <RefreshCw size={18} className="mr-2" /> Re-attempt
          </Button>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <Button onClick={handleSaveToLocal} variant="secondary" className="flex-1 md:flex-none py-3 px-6 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 rounded-xl transition-colors">
            <Save size={18} className="mr-2" /> Save Exam
          </Button>
          <Button onClick={downloadResults} variant="secondary" className="flex-1 md:flex-none py-3 px-6 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 rounded-xl transition-colors">
            <Download size={18} className="mr-2" /> Download Results
          </Button>
        </div>
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
    let finalName = config.name;
    let counter = 1;
    
    // Auto-rename if collision occurs
    while (availableExams.some((exam) => exam.name === finalName)) {
      counter++;
      // If it's a custom exam, it might already have a name like "Custom Physics Exam"
      // We append (2), (3), etc.
      finalName = `${config.name} (${counter})`;
    }

    const updatedConfig = { ...config, name: finalName };
    setAvailableExams((prev) => [...prev, updatedConfig]);
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

  const handleReattempt = (config: ExamConfig) => {
    setTimerConfig({
      hours: config.settings?.timerHours ?? 1,
      minutes: config.settings?.timerMinutes ?? 30,
    });
    setExamConfig(config);
    setScreen("exam");
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
        return (
          <ResultsScreen
            result={lastResult}
            setScreen={setScreen as any}
            onSaveToLocal={handleFileUpload}
            onReattempt={handleReattempt}
          />
        );
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

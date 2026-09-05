import React from "react";
import { 
  Plus, 
  Trash2, 
  Database, 
  FileText, 
  Activity, 
  ArrowLeft,
  RefreshCw,
  Search,
  BookOpen,
  UploadCloud,
  FolderOpen,
  Lightbulb,
  Cloud,
  CloudDownload,
  CloudUpload,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { API_BASE_URL, formatGroupLabel } from "../utils";

// --- Types ---
interface TopicSummary {
  name: string;
  count: number;
  lastUpdated: string;
  remoteCount?: number;
  discrepancy?: number;
  types?: {
    mcq: number;
    msq: number;
    nat: number;
  };
}

const GenerateQuestionsModal: React.FC<{
  isOpen: boolean;
  topic: string;
  group: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, topic, group, onClose, onSuccess }) => {
  const [count, setCount] = React.useState(topic === "__all__" ? 5 : 20);
  const [difficulty, setDifficulty] = React.useState("intermediate");
  const [provider, setProvider] = React.useState("openai");
  const [model, setModel] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [logs, setLogs] = React.useState("");
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const isBatch = topic === "__all__";

  const handleStart = async () => {
    setIsGenerating(true);
    const startMsg = isBatch
      ? `Starting batch expansion for ALL topics in group [${group}]...\nTarget: ${count} questions per topic at ${difficulty} level using ${provider} (${model || 'default model'})...\n\n`
      : `Starting generation for: ${topic}\nTarget: ${count} questions at ${difficulty} level in group [${group}] using ${provider} (${model || 'default model'})...\n\n`;

    setLogs(startMsg);

    try {
      const response = await fetch(`/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, difficulty, group, provider, model }),
      });

      if (!response.ok) throw new Error("Failed to start generation");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          setLogs(prev => prev + text);
        }
      }
      onSuccess();
    } catch (err: any) {
      setLogs(prev => prev + `\n\n[FATAL ERROR] ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <Card title={isBatch ? `Batch Expand Group: ${group.replace(/_/g, ' ').toUpperCase()}` : `Deepen Topic: ${topic}`} className="w-full max-w-3xl border-teal-500/50 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">
              {isBatch ? "Questions PER Topic" : "Number of Questions"}
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isGenerating}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Target Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isGenerating}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50 dark:text-white"
            >
             <option value="easy">Easy (Foundations)</option>
             <option value="intermediate">Intermediate (Standard)</option>
             <option value="hard">Hard (Advanced/Proofs)</option>
            </select>
          </div>

          <div>
           <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Provider</label>
           <div className="flex gap-2">
               {['openai', 'anthropic', 'google'].map(p => (
                   <button
                       key={p}
                       onClick={() => setProvider(p)}
                       className={`flex-1 p-2 rounded-xl text-sm capitalize ${provider === p ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                   >
                       {p}
                   </button>
               ))}
           </div>
          </div>
          <div>
           <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Model Name (Optional)</label>
           <input
               type="text"
               value={model}
               onChange={(e) => setModel(e.target.value)}
               placeholder="e.g. gpt-4o"
               disabled={isGenerating}
               className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50 dark:text-white"
           />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} /> Console Output
          </label>
          <div className="bg-[#0c0c0c] border border-slate-700 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm text-green-400 shadow-inner">
            {logs ? (
              <pre className="whitespace-pre-wrap">{logs}</pre>
            ) : (
              <span className="text-slate-600 italic">Waiting for process to start...</span>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button onClick={onClose} variant="secondary" disabled={isGenerating}>Close</Button>
          <Button onClick={handleStart} disabled={isGenerating} className="bg-teal-600 hover:bg-teal-500">
            {isGenerating ? <><RefreshCw className="animate-spin" size={18} /> Running CLI...</> : "Start Process"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

interface SyncModalProps {
  isOpen: boolean;
  type: 'upload' | 'download';
  group: string;
  topic?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SyncOperationModal: React.FC<SyncModalProps> = ({
  isOpen,
  type,
  group,
  topic,
  onClose,
  onSuccess
}) => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [logs, setLogs] = React.useState("");
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setIsRunning(false);
      setIsCompleted(false);
      setLogs("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const isBatch = !topic || topic === "__all__";
  const title = type === 'upload'
    ? (isBatch ? `Safe Upload Group to Cloud: ${group}` : `Safe Upload Topic: ${topic}`)
    : (isBatch ? `Safe Download Group from Cloud: ${group}` : `Safe Download Topic: ${topic}`);

  const handleStartSync = async () => {
    setIsRunning(true);
    setIsCompleted(false);
    const endpoint = type === 'upload' ? '/api/sync/upload_safe' : '/api/sync/download_safe';
    const startMsg = type === 'upload'
      ? `[SYNC] Initiating Safe Upload (PATCH) to Cloud...\nScope: ${isBatch ? `All topics in ${group}` : topic}\n\n`
      : `[SYNC] Initiating Safe Additive Download from Cloud...\nScope: ${isBatch ? `All topics in ${group}` : topic}\n\n`;

    setLogs(startMsg);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group,
          topic: topic ? topic.replace(/ /g, '_').toLowerCase() : '__all__'
        }),
      });

      if (!response.ok) throw new Error(`Sync request failed (${response.statusText})`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          setLogs(prev => prev + text);
        }
      }
      setIsCompleted(true);
      onSuccess();
    } catch (err: any) {
      setLogs(prev => prev + `\n\n[FATAL ERROR] ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <Card title={title} className={`w-full max-w-3xl shadow-2xl ${type === 'upload' ? 'border-amber-500/50' : 'border-blue-500/50'}`}>
        <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm">
          <p className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
            {type === 'upload' ? <CloudUpload className="text-amber-400" size={18} /> : <CloudDownload className="text-blue-400" size={18} />}
            {type === 'upload' ? "Safe Cloud Upload Strategy" : "Safe Additive Download Strategy"}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            {type === 'upload'
              ? "Uploads local questions using idempotent PATCH requests. Cloud question bank is enriched without duplicate insertion or deleting existing questions."
              : "Downloads cloud questions additively. Uses hash-based deduplication to only insert questions that are missing from your local JSON files."}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} /> Console Output
          </label>
          <div className="bg-[#0c0c0c] border border-slate-700 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm text-green-400 shadow-inner">
            {logs ? (
              <pre className="whitespace-pre-wrap">{logs}</pre>
            ) : (
              <span className="text-slate-600 italic">Click &apos;Execute Sync&apos; to run CLI script...</span>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button onClick={onClose} variant="secondary" disabled={isRunning}>Close</Button>
          {!isCompleted && (
            <Button
              onClick={handleStartSync}
              disabled={isRunning}
              className={type === 'upload' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}
            >
              {isRunning ? (
                <><RefreshCw className="animate-spin" size={18} /> Running CLI Sync...</>
              ) : (
                <>{type === 'upload' ? <CloudUpload size={18} /> : <CloudDownload size={18} />} Execute Sync</>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

const AddTopicGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [groupName, setGroupName] = React.useState("");
  const [topicsFile, setTopicsFile] = React.useState<File | null>(null);
  const [kbFiles, setKbFiles] = React.useState<File[]>([]);
  
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [logs, setLogs] = React.useState("");
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result as string;
        // strip the data:image/png;base64, prefix
        encoded = encoded.split(',')[1] || encoded;
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  };

  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!groupName || !topicsFile || kbFiles.length === 0) {
      alert("Please provide a group name, a topics .txt file, and at least one knowledge base file.");
      return;
    }

    setIsProcessing(true);
    setLogs("Preparing payload...\n");

    try {
      const topicsContent = await fileToText(topicsFile);
      
      const knowledgeFiles = [];
      for (const f of kbFiles) {
        if (f.name.endsWith('.txt') || f.name.endsWith('.md') || f.name.endsWith('.html')) {
          knowledgeFiles.push({ name: f.name, content: await fileToText(f) });
        } else {
          knowledgeFiles.push({ name: f.name, contentBase64: await fileToBase64(f) });
        }
      }

      setLogs(prev => prev + "Uploading to Admin Backend...\n\n");

      const response = await fetch(`/api/upload_topic_group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName, topicsContent, knowledgeFiles }),
      });

      if (!response.ok) throw new Error("Failed to start initialization process");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          setLogs(prev => prev + text);
        }
      }
      
      setLogs(prev => prev + "\n\nDONE! You can now close this window and refresh the dashboard.");
      onSuccess();
    } catch (err: any) {
      setLogs(prev => prev + `\n\n[FATAL ERROR] ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <Card title={`Initialize New Topic Group`} className="w-full max-w-4xl border-teal-500/50 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Group Name</label>
              <input 
                type="text" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isProcessing}
                placeholder="e.g. UG Social Sciences"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50 dark:text-white"
              />
            </div>
            
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Topics List (.txt)</p>
              <input 
                type="file" 
                accept=".txt" 
                disabled={isProcessing}
                onChange={(e) => setTopicsFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              {topicsFile && <p className="text-xs text-teal-500 mt-2">{topicsFile.name} loaded.</p>}
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Knowledge Base Files</p>
              <input 
                type="file" 
                multiple 
                disabled={isProcessing}
                accept=".md,.txt,.html,image/*"
                onChange={(e) => {
                  if (e.target.files) setKbFiles(Array.from(e.target.files));
                }}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {kbFiles.length > 0 && <p className="text-xs text-blue-500 mt-2">{kbFiles.length} files queued.</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} /> Console Output
            </label>
            <div className="bg-[#0c0c0c] border border-slate-700 rounded-xl p-4 h-[300px] overflow-y-auto font-mono text-sm text-green-400 shadow-inner">
              {logs ? (
                <pre className="whitespace-pre-wrap text-xs">{logs}</pre>
              ) : (
                <span className="text-slate-600 italic">Waiting for form submission...</span>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} variant="secondary" disabled={isProcessing}>Close</Button>
          <Button onClick={handleSubmit} disabled={isProcessing || !groupName || !topicsFile || kbFiles.length === 0} className="bg-teal-600 hover:bg-teal-500 shadow-teal-500/20 shadow-lg">
            {isProcessing ? <><RefreshCw className="animate-spin" size={18} /> Processing...</> : <><UploadCloud size={18} /> Initialize Group</>}
          </Button>
        </div>
      </Card>
    </div>
  );
};


// --- Admin Dashboard Component ---
export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const isLocalOnly = process.env.VITE_LOCAL_ONLY === 'true';
  const [topics, setTopics] = React.useState<TopicSummary[]>([]);
  const [groups, setGroups] = React.useState<string[]>(['pg_physics']);
  const [selectedGroup, setSelectedGroup] = React.useState<string>('pg_physics');
  
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  
  const [generatorModalTopic, setGeneratorModalTopic] = React.useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = React.useState(false);

  // Sync Modal State
  const [syncModalConfig, setSyncModalConfig] = React.useState<{
    isOpen: boolean;
    type: 'upload' | 'download';
    topic?: string;
  }>({
    isOpen: false,
    type: 'upload',
    topic: undefined,
  });

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/question_bank/groups`);
      const data = await res.json();
      if (data && data.length) {
        setGroups(data);
        if (!data.includes(selectedGroup)) {
          setSelectedGroup(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchGroups();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    setTopics([]);
    setSelectedTopic(null);
    try {
      // 1. Fetch cloud topics & question counts if not in local-only mode
      const remoteCountMap: Record<string, number> = {};
      if (!isLocalOnly) {
        try {
          const cloudMetaRes = await fetch(`${API_BASE_URL}/api/question_bank/topics`);
          if (cloudMetaRes.ok) {
            const cloudMeta = await cloudMetaRes.json();
            if (Array.isArray(cloudMeta)) {
              cloudMeta.forEach((item: { name: string; slug: string; count: number }) => {
                const normName = item.name.toLowerCase().trim();
                const normSlug = item.slug.toLowerCase().replace(/_/g, ' ').trim();
                remoteCountMap[normName] = item.count;
                remoteCountMap[normSlug] = item.count;
              });
            }
          }
        } catch (e) {
          console.warn("Could not fetch remote topic counts:", e);
        }
      }

      // 2. Fetch the dynamic list of topics for the selected group
      const topicsResponse = await fetch(`${API_BASE_URL}/api/question_bank/topics?group=${selectedGroup}`);
      if (!topicsResponse.ok) throw new Error("Failed to load topic plan");
      const data = await topicsResponse.json();
      
      // Determine if we get back the new structured JSON or need to parse
      const topicNames = Array.isArray(data) ? data : (data[selectedGroup] || Object.values(data).flat());

      // 3. Map through topic names and fetch their local bank files
      const summaryData: TopicSummary[] = await Promise.all(
        topicNames.map(async (name: string) => {
          const fileName = name.replace(/ /g, "_").toLowerCase() + ".json";
          const normName = name.toLowerCase().trim();
          const normSlug = name.replace(/ /g, '_').toLowerCase().trim();
          const remoteCount = !isLocalOnly ? (remoteCountMap[normName] ?? remoteCountMap[normSlug] ?? 0) : undefined;

          try {
            const response = await fetch(`/api/local_bank/${selectedGroup}/${encodeURIComponent(fileName)}`);
            if (!response.ok) {
              return {
                name,
                count: 0,
                lastUpdated: "Never",
                remoteCount,
                discrepancy: remoteCount !== undefined ? 0 - remoteCount : 0,
                types: { mcq: 0, msq: 0, nat: 0 }
              };
            }
            const questions = await response.json();

            // Deduplicate by id (fallback: question text)
            let workingSet = questions;
            if (Array.isArray(questions)) {
              const seen = new Set<string>();
              workingSet = questions.filter((q: any) => {
                const key = q.id || q.question || JSON.stringify(q);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              const dupCount = questions.length - workingSet.length;
              // Auto-write back if dedup reconciles local count with cloud
              if (dupCount > 0 && remoteCount !== undefined && workingSet.length === remoteCount) {
                fetch(`/api/local_bank/dedup`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ group: selectedGroup, fileName, questions: workingSet }),
                }).catch(console.error);
              }
            }

            let mcq = 0, msq = 0, nat = 0;
            if (Array.isArray(workingSet)) {
              workingSet.forEach((q: any) => {
                const t = q.type?.toUpperCase();
                if (t === 'MCQ') mcq++;
                else if (t === 'MSQ') msq++;
                else if (t === 'NAT') nat++;
                else mcq++; // default to MCQ
              });
            }
            
            const localCount = Array.isArray(workingSet) ? workingSet.length : 0;
            return {
              name,
              count: localCount,
              lastUpdated: "Local Bank",
              remoteCount,
              discrepancy: remoteCount !== undefined ? localCount - remoteCount : 0,
              types: { mcq, msq, nat }
            };
          } catch {
            return {
              name,
              count: 0,
              lastUpdated: "Not Generated",
              remoteCount,
              discrepancy: remoteCount !== undefined ? 0 - remoteCount : 0,
              types: { mcq: 0, msq: 0, nat: 0 }
            };
          }
        })
      );

      setTopics(summaryData);
    } catch (err) {
      console.error("Failed to sync bank:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTopics();
  }, [selectedGroup]);

  const handleGenerateMore = (topic: string) => {
    setGeneratorModalTopic(topic);
  };

  const handleOpenSync = (type: 'upload' | 'download', topic?: string) => {
    setSyncModalConfig({
      isOpen: true,
      type,
      topic,
    });
  };

  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen science-grid p-8 font-sans transition-colors">
      {isLocalOnly && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-xl mb-6">
          <Lightbulb size={18} />
          <span className="text-sm font-bold">Local-Only Mode (Testing Bank)</span>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent font-bebas tracking-wider">
              Pariksha Admin
            </h1>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium outline-none focus:border-teal-500 text-sm dark:text-white"
            >
              {groups.map(g => <option key={g} value={g}>{formatGroupLabel(g)}</option>)}
            </select>
            
            <Button onClick={fetchTopics} variant="secondary" title="Refresh local and cloud stats">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </Button>

            {!isLocalOnly && (
              <>
                <Button
                  onClick={() => handleOpenSync('download')}
                  className="bg-sky-600 hover:bg-sky-500 shadow-sky-900/20 text-white"
                  title="Additive pull of missing questions from Cloud to Local for this group"
                >
                  <CloudDownload size={18} /> Pull Cloud
                </Button>
                <Button
                  onClick={() => handleOpenSync('upload')}
                  className="bg-amber-600 hover:bg-amber-500 shadow-amber-900/20 text-white"
                  title="Safe upload of new local questions to Cloud (PATCH) for this group"
                >
                  <CloudUpload size={18} /> Push Cloud
                </Button>
              </>
            )}

            <Button onClick={() => setIsAddGroupModalOpen(true)} className="bg-teal-600 hover:bg-teal-500 shadow-teal-900/20">
              <FolderOpen size={18} /> New Group
            </Button>
            <Button 
              onClick={() => handleGenerateMore("__all__")} 
              className="bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
              title="Add 'n' questions to EVERY topic in this group"
            >
              <Database size={18} /> Batch Expand
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 ${!isLocalOnly ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-10`}>
          <Card className="bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                <Database size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm uppercase tracking-wider">Local Questions</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {topics.reduce((sum, t) => sum + t.count, 0)}
                </p>
              </div>
            </div>
          </Card>

          {!isLocalOnly && (
            <Card className="bg-sky-500/5 border-sky-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/20 rounded-lg text-sky-500">
                  <Cloud size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-sm uppercase tracking-wider">Cloud Questions</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">
                    {topics.reduce((sum, t) => sum + (t.remoteCount || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {!isLocalOnly ? (
            <Card className="bg-amber-500/5 border-amber-500/10">
              {(() => {
                const totalLocal = topics.reduce((sum, t) => sum + t.count, 0);
                const totalRemote = topics.reduce((sum, t) => sum + (t.remoteCount || 0), 0);
                const diff = totalLocal - totalRemote;
                const outOfSyncTopics = topics.filter(t => (t.discrepancy || 0) !== 0).length;

                return (
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${diff === 0 ? 'bg-teal-500/20 text-teal-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {diff === 0 ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm uppercase tracking-wider">Cloud Discrepancy</p>
                      <p className="text-xl font-bold text-slate-800 dark:text-white">
                        {diff === 0 ? (
                          <span className="text-teal-400">In Sync</span>
                        ) : diff > 0 ? (
                          <span className="text-amber-400">+{diff} Local Ahead</span>
                        ) : (
                          <span className="text-sky-400">{Math.abs(diff)} Cloud Ahead</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {outOfSyncTopics === 0 ? 'All topics matched' : `${outOfSyncTopics} topics with drift`}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card className="bg-purple-500/5 border-purple-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg text-purple-500">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-slate-500 text-sm uppercase tracking-wider">Avg. Difficulty</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">Advanced</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-teal-500/5 border-teal-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-500/20 rounded-lg text-teal-500">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm uppercase tracking-wider">Active Topics</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{topics.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Main Content */}
        <div className="relative mb-6">
          <input 
            type="text"
            placeholder={`Search topics in ${selectedGroup.replace(/_/g, ' ')}...`}
            className="w-full glass rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Topic Explorer" className="overflow-hidden hover:-translate-y-1">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-teal-500" size={40} /></div>
              ) : filteredTopics.map(topic => (
                <div 
                  key={topic.name}
                  onClick={() => setSelectedTopic(topic.name)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                    selectedTopic === topic.name 
                    ? "bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20" 
                    : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-teal-500/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{topic.name}</h3>
                      {!isLocalOnly && topic.remoteCount !== undefined && (
                        topic.discrepancy === 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                            Cloud Synced ({topic.remoteCount})
                          </span>
                        ) : (topic.discrepancy || 0) > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                            +{topic.discrepancy} Local (Cloud: {topic.remoteCount})
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                            {topic.discrepancy} Behind Cloud ({topic.remoteCount})
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      Local: {topic.count} questions • Last expansion: {topic.lastUpdated}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isLocalOnly && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenSync('download', topic.name); }}
                          className="p-2 hover:bg-sky-500/20 rounded-lg text-sky-400 transition-colors"
                          title="Safe Pull Cloud for this topic"
                        >
                          <ArrowDownLeft size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenSync('upload', topic.name); }}
                          className="p-2 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-colors"
                          title="Safe Push Cloud (PATCH) for this topic"
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleGenerateMore(topic.name); }}
                      className="p-2 hover:bg-teal-500/20 rounded-lg text-teal-500 transition-colors"
                      title="Expand with AI (No-Repeat Depth)"
                    >
                      <Plus size={18} />
                    </button>
                    <button className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Topic Composition" className="hover:-translate-y-1">
            {selectedTopic ? (
              <div className="space-y-6">
                <div className="p-6 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{selectedTopic}</h4>
                  {(() => {
                    const topicData = topics.find(t => t.name === selectedTopic);
                    const count = topicData?.count || 0;
                    if (count === 0) return <p className="text-slate-500 italic">No questions generated yet.</p>;
                    
                    const types = topicData?.types || { mcq: 0, msq: 0, nat: 0 };
                    const mcqPct = Math.round((types.mcq / count) * 100);
                    const msqPct = Math.round((types.msq / count) * 100);
                    const natPct = Math.round((types.nat / count) * 100);
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1 text-slate-500 font-medium uppercase tracking-tighter">
                            <span>MCQs (Multiple Choice)</span>
                            <span>{types.mcq} ({mcqPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-teal-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${mcqPct}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1 text-slate-500 font-medium uppercase tracking-tighter">
                            <span>MSQs (Multiple Select)</span>
                            <span>{types.msq} ({msqPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${msqPct}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1 text-slate-500 font-medium uppercase tracking-tighter">
                            <span>NATs (Numerical Answer)</span>
                            <span>{types.nat} ({natPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${natPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="secondary">
                    <FileText size={18} /> View Questions
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => handleGenerateMore(selectedTopic)}
                  >
                    Deepen Topic
                  </Button>
                </div>
                {!isLocalOnly && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <Button
                      onClick={() => handleOpenSync('download', selectedTopic)}
                      variant="secondary"
                      className="flex-1 text-xs py-2 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
                    >
                      <CloudDownload size={14} /> Pull from Cloud
                    </Button>
                    <Button
                      onClick={() => handleOpenSync('upload', selectedTopic)}
                      variant="secondary"
                      className="flex-1 text-xs py-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      <CloudUpload size={14} /> Push to Cloud (PATCH)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
                <Activity size={48} className="mb-4 opacity-20" />
                <p className="italic">Select a topic to analyze composition</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <GenerateQuestionsModal 
        key={generatorModalTopic || "closed"}
        isOpen={!!generatorModalTopic}
        topic={generatorModalTopic || ""}
        group={selectedGroup}
        onClose={() => {
          setGeneratorModalTopic(null);
        }}
        onSuccess={() => fetchTopics()}
      />

      <SyncOperationModal
        key={`sync-${syncModalConfig.isOpen}-${syncModalConfig.type}-${syncModalConfig.topic || 'all'}`}
        isOpen={syncModalConfig.isOpen}
        type={syncModalConfig.type}
        group={selectedGroup}
        topic={syncModalConfig.topic}
        onClose={() => setSyncModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          // Optimistic update: immediately clear discrepancy for synced topics
          // so the UI reflects sync without waiting for a full refetch.
          const { type, topic } = syncModalConfig;
          const isBatch = !topic || topic === '__all__';
          setTopics(prev => prev.map(t => {
            if (!isBatch && t.name !== topic) return t;
            if (type === 'upload') {
              // Local pushed to cloud → remote now matches local
              return { ...t, remoteCount: t.count, discrepancy: 0 };
            } else {
              // Cloud pulled to local → local now matches remote
              const newCount = t.remoteCount ?? t.count;
              return { ...t, count: newCount, discrepancy: 0, lastUpdated: 'Local Bank' };
            }
          }));
          // Then re-fetch for ground-truth accuracy
          fetchTopics();
        }}
      />

      <AddTopicGroupModal
        isOpen={isAddGroupModalOpen}
        onClose={() => setIsAddGroupModalOpen(false)}
        onSuccess={() => {
          fetchGroups();
          setIsAddGroupModalOpen(false);
        }}
      />

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
}

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
  FolderOpen
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

// --- Types ---
interface TopicSummary {
  name: string;
  count: number;
  lastUpdated: string;
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
      ? `Starting batch expansion for ALL topics in group [${group}]...\nTarget: ${count} questions per topic at ${difficulty} level...\n\n`
      : `Starting generation for: ${topic}\nTarget: ${count} questions at ${difficulty} level in group [${group}]...\n\n`;
    
    setLogs(startMsg);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, difficulty, group }),
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
              <option value="basic">Basic (Foundations)</option>
              <option value="intermediate">Intermediate (Standard)</option>
              <option value="hard">Hard (Advanced/Proofs)</option>
            </select>
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

      const response = await fetch('/api/upload_topic_group', {
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
  const [topics, setTopics] = React.useState<TopicSummary[]>([]);
  const [groups, setGroups] = React.useState<string[]>(['pg_physics']);
  const [selectedGroup, setSelectedGroup] = React.useState<string>('pg_physics');
  
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  
  const [generatorModalTopic, setGeneratorModalTopic] = React.useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = React.useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
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
      // 1. Fetch the dynamic list of topics for the selected group
      const topicsResponse = await fetch(`/api/topics?group=${selectedGroup}`);
      if (!topicsResponse.ok) throw new Error("Failed to load topic plan");
      const text = await topicsResponse.text();
      const topicNames = text.split("\n").map(t => t.replace(/^#+/, '').replace(/^\* /, "").trim()).filter(t => t.length > 0);

      // 2. Map through topic names and fetch their local bank files
      const summaryData: TopicSummary[] = await Promise.all(
        topicNames.map(async (name) => {
          const fileName = name.replace(/ /g, "_").toLowerCase() + ".json";
          try {
            const response = await fetch(`/api/local_bank/${selectedGroup}/${encodeURIComponent(fileName)}`);
            if (!response.ok) return { name, count: 0, lastUpdated: "Never", types: { mcq: 0, msq: 0, nat: 0 } };
            
            const questions = await response.json();
            let mcq = 0, msq = 0, nat = 0;
            if (Array.isArray(questions)) {
              questions.forEach((q: any) => {
                const t = q.type?.toUpperCase();
                if (t === 'MCQ') mcq++;
                else if (t === 'MSQ') msq++;
                else if (t === 'NAT') nat++;
                else mcq++; // default to MCQ
              });
            }
            
            return {
              name,
              count: Array.isArray(questions) ? questions.length : 0,
              lastUpdated: "Local Bank",
              types: { mcq, msq, nat }
            };
          } catch {
            return { name, count: 0, lastUpdated: "Not Generated", types: { mcq: 0, msq: 0, nat: 0 } };
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

  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen science-grid p-8 font-sans transition-colors">
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
          
          <div className="flex items-center gap-4">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium outline-none focus:border-teal-500 text-sm dark:text-white"
            >
              {groups.map(g => <option key={g} value={g}>{g.replace(/_/g, ' ').toUpperCase()}</option>)}
            </select>
            
            <Button onClick={fetchTopics} variant="secondary">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </Button>
            <Button onClick={() => setIsAddGroupModalOpen(true)} className="bg-teal-600 hover:bg-teal-500 shadow-teal-900/20">
              <FolderOpen size={20} /> New Topic Group
            </Button>
            <Button 
              onClick={() => handleGenerateMore("__all__")} 
              className="bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
              title="Add 'n' questions to EVERY topic in this group"
            >
              <Database size={20} /> Batch Expand
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                <Database size={24} />
              </div>
              <div>
                <p className="text-slate-500 text-sm uppercase tracking-wider">Total Questions</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {topics.reduce((sum, t) => sum + t.count, 0)}
                </p>
              </div>
            </div>
          </Card>
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
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{topic.name}</h3>
                    <p className="text-sm text-slate-500">
                      {topic.count} questions • Last expansion: {topic.lastUpdated}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleGenerateMore(topic.name); }}
                      className="p-2 hover:bg-teal-500/20 rounded-lg text-teal-500 transition-colors"
                      title="Expand with AI (No-Repeat Depth)"
                    >
                      <Plus size={20} />
                    </button>
                    <button className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={20} />
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

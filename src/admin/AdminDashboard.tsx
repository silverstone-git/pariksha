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
  BookOpen
} from "lucide-react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

// --- Types ---
interface TopicSummary {
  name: string;
  count: number;
  lastUpdated: string;
}

const GenerateQuestionsModal: React.FC<{
  isOpen: boolean;
  topic: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, topic, onClose, onSuccess }) => {
  const [count, setCount] = React.useState(20);
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

  const handleStart = async () => {
    setIsGenerating(true);
    setLogs(`Starting generation for: ${topic}\nTarget: ${count} questions at ${difficulty} level...\n\n`);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, difficulty }),
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
      <Card title={`Deepen Topic: ${topic}`} className="w-full max-w-3xl border-teal-500/50 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Number of Questions</label>
            <input 
              type="number" 
              value={count} 
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isGenerating}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Target Difficulty</label>
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isGenerating}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none disabled:opacity-50"
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

// --- Admin Dashboard Component ---
export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [topics, setTopics] = React.useState<TopicSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
  const [generatorModalTopic, setGeneratorModalTopic] = React.useState<string | null>(null);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      // 1. Fetch the master list of topics from the plan file (accessible via public/proxy)
      const topicsResponse = await fetch("/physics_question_bank_plan.txt");
      if (!topicsResponse.ok) throw new Error("Failed to load topic plan");
      const text = await topicsResponse.text();
      const topicNames = text.split("\n").map(t => t.replace(/^\* /, "").trim()).filter(t => t.length > 0);

      // 2. Map through topic names and fetch their local bank files to get counts
      const summaryData: TopicSummary[] = await Promise.all(
        topicNames.map(async (name) => {
          const fileName = name.replace(/ /g, "_").toLowerCase() + ".json";
          try {
            const response = await fetch(`/question_bank/${fileName}`);
            if (!response.ok) return { name, count: 0, lastUpdated: "Never" };
            
            const questions = await response.json();
            return {
              name,
              count: Array.isArray(questions) ? questions.length : 0,
              lastUpdated: "Local Bank"
            };
          } catch {
            return { name, count: 0, lastUpdated: "Not Generated" };
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
  }, []);

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
          <div className="flex gap-4">
            <Button onClick={fetchTopics} variant="secondary">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} /> Sync Bank
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-500 shadow-teal-900/20">
              <Plus size={20} /> Add Topic
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
                <p className="text-2xl font-bold text-slate-800 dark:text-white">840</p>
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
            placeholder="Search topics in question bank..."
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

          <Card title="Concept Analytics" className="hover:-translate-y-1">
            {selectedTopic ? (
              <div className="space-y-6">
                <div className="p-6 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{selectedTopic} Coverage</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1 text-slate-500 font-medium uppercase tracking-tighter">
                        <span>Conceptual Base</span>
                        <span>90%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-teal-500 h-2 rounded-full transition-all duration-1000" style={{ width: '90%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1 text-slate-500 font-medium uppercase tracking-tighter">
                        <span>Numerical Depth</span>
                        <span>45%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  </div>
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
                <p className="italic">Select a topic to analyze coverage depth</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <GenerateQuestionsModal 
        isOpen={!!generatorModalTopic}
        topic={generatorModalTopic || ""}
        onClose={() => {
          setGeneratorModalTopic(null);
          fetchTopics();
        }}
        onSuccess={() => fetchTopics()}
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

import React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { X, Clipboard, Check, Sparkles, Bot, Zap, Globe, MessageSquare, RefreshCw } from "lucide-react";
import type { ExamConfig } from "../types";
import { isValidExamQuestions, robustJsonParse, API_BASE_URL } from "../utils";

export const AIExamGenerator: React.FC<{
  onClose: () => void;
  onExamGenerated: (config: ExamConfig) => void;
}> = ({ onClose, onExamGenerated }) => {
  const [examName, setExamName] = React.useState("");
  const [userName, setUserName] = React.useState("");
  const [difficulty, setDifficulty] = React.useState("Medium");
  const [referenceExams, setReferenceExams] = React.useState("");
  const [numQuestions, setNumQuestions] = React.useState(10);
  const [generatedPrompt, setGeneratedPrompt] = React.useState("");
  const [isPromptGenerated, setIsPromptGenerated] = React.useState(false);
  const [llmOutput, setLlmOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPosting, setIsPosting] = React.useState(false);
  const [suggestionsVisible, setSuggestionsVisible] = React.useState(false);

  const generatePrompt = () => {
    if (!examName.trim()) {
      setError("Exam Name is required to generate a prompt.");
      return;
    }
    setError(null);

    const prompt = `
You are an expert in creating educational content. Your task is to generate a JSON array of multiple-choice questions for an exam.

**Exam Details:**
- **Exam Name:** "${examName}"
- **Difficulty Level:** ${difficulty}
- **Reference/Similar Exams:** ${referenceExams || "General knowledge"}
- **Number of Questions to Generate:** ${numQuestions}

**JSON syntax instructions**

#### **1. Always Escape Backslashes: \`\\\` → \`\\\\\`**
In JSON, the backslash \`\\\` is the escape character. So every literal backslash (like in LaTeX commands) must be **doubled**:
- ❌ Wrong: \`"\\mathbf{x}"\`
- ✅ Correct: \`"\\\\mathbf{x}"\`

- ❌ Wrong: \`($\\epsilon_0$)\`
- ✅ Correct: \`($\\\\epsilon_0$)\`

> Every \`\\\` in LaTeX (e.g., \`\\frac\`, \`\\alpha\`, \`\\times\`) becomes \`\\\\\` in JSON strings.

---

#### **2. Use Double Quotes Consistently and Escape Inner Ones**
JSON requires double quotes (\`"\`) for keys and string values. If your math or text contains literal double quotes, escape them with \`\\"\`.
- ❌ \`"He said "hello""\` → Invalid
- ✅ \`"He said \\"hello\\""\` → Valid

> Avoid using unescaped \`"\` inside strings.

---

#### **3. Prefer Inline Math (\`$...$\`) in JSON**

---

#### **4. Use Unicode for Simple Symbols (Cleaner)**
Instead of \`\\alpha\`, \`\\beta\`, consider Unicode where appropriate:
- \`"\\alpha"\` → \`"α"\` (U+03B1)
- \`"\\beta"\` → \`"β"\` (U+03B2)
- \`"\\times"\` → \`"×"\` (U+00D7)

> Reduces backslash count, improves readability — but only if your system supports UTF-8.

---

#### **5. Avoid Unnecessary LaTeX Complexity**
Keep LaTeX minimal and renderer-friendly:
- ❌ Overkill: \`\\\\displaystyle\\\\frac{\\\\partial^2 E}{\\\\partial z^2}\`
- ✅ Sufficient: \`\\\\frac{\\\\partial^2 E}{\\\\partial z^2}\`

---

#### **10. Always Test Rendering End-to-End**
Even if JSON parses correctly, the **renderer** (e.g., MathJax, KaTeX) might fail if:
- Delimiters are mismatched (\`$...$\` not closed)
- Commands are unsupported
- Extra braces or escaped characters linger

---

### 🔁 Summary Cheat Sheet

| Issue | Rule | Fix |
|------|------|-----|
| \`\\mathbf\` breaks JSON | Escape backslashes | \`\\\\mathbf\` |
| Unescaped \`"\` | Escape quotes | \`\\"\` |


---


**JSON structure Instructions:**
1.  Generate exactly ${numQuestions} questions.
2.  Each question must be a JSON object with the following exact structure:
\`\`\`json
{
  "question": "Your question text here. It can include markdown and LaTeX for formatting.",
  "options": [
    { "label": 1, "value": "First option" },
    { "label": 2, "value": "Second option" },
    { "label": 3, "value": "Third option" },
    { "label": 4, "value": "Fourth option" }
  ],
  "answer_label": 2, // The 'label' of the correct option
  "topic": "A relevant topic for the question (e.g., 'Algebra', 'History', 'Biology')",
  "explanation": "A detailed explanation of why the correct answer is right and the others are wrong. This should be comprehensive and educational."
}
\`\`\`
3.  The entire output must be a single valid JSON array \`[]\` containing these question objects. Do not wrap it in markdown backticks or any other text.
4.  Ensure the options are well-distinguished and the explanation is thorough.
5.  The \`answer_label\` must correspond to one of the labels in the \`options\` array.

Please provide only the raw JSON array as the output.
`;
    setGeneratedPrompt(prompt.trim());
    setIsPromptGenerated(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setIsCopied(true);
    setSuggestionsVisible(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveToLocal = () => {
    if (!llmOutput.trim()) {
      setError(
        "Please paste the output from the LLM (Preferably Claude or ChatGPT).",
      );
      return;
    }

    try {
      const parsed = robustJsonParse(llmOutput);
      if (!isValidExamQuestions(parsed)) {
        throw new Error(
          "Invalid JSON structure. Ensure it's an array of questions with all required fields.",
        );
      }
      onExamGenerated({
        name: examName || "AI Generated Exam",
        questions: parsed,
      });
      onClose();
    } catch (err) {
      setError(
        "Failed to parse or validate the JSON. Please check the format and ensure it matches the requested structure.",
      );
      console.error(err);
    }
  };

  const handlePostToCommunity = async () => {
    if (!llmOutput.trim()) {
      setError(
        "Please paste the output from the LLM (Preferable Claude or Chatgpt).",
      );
      return;
    }
    if (!userName.trim() || !examName.trim()) {
      setError("Your name and exam name are required to post.");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      const parsed = robustJsonParse(llmOutput);
      if (!isValidExamQuestions(parsed)) {
        throw new Error(
          "Invalid JSON structure. Ensure it's an array of questions with all required fields.",
        );
      }

      const response = await fetch(`${API_BASE_URL}/pariksha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_title: `${userName} - ${examName}`,
          exam_json_str: JSON.stringify(parsed),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      onExamGenerated({
        name: examName,
        questions: parsed,
      });
      onClose();
    } catch (err) {
      setError("Failed to post exam. Please check the format and try again.");
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  const inputClasses = "w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 transition-all";
  const labelClasses = "block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[70] p-4">
      <Card 
        title="Custom AI Exam Generator" 
        icon={<Bot size={24} />}
        className="w-full max-w-4xl max-h-[95vh] border-teal-500/50 flex flex-col overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
        >
          <X size={24} />
        </button>

        <div className="overflow-y-auto pr-4 custom-scrollbar flex-grow py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>Author Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={inputClasses}
                  placeholder="Your name for community posting"
                />
              </div>
              <div>
                <label className={labelClasses}>Exam Name</label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className={inputClasses}
                  placeholder="e.g., Quantum Mechanics Masterclass"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className={inputClasses}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Question Count</label>
                  <input
                    type="number"
                    value={numQuestions}
                    onChange={(e) =>
                      setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Reference Framework / Context</label>
                <input
                  type="text"
                  value={referenceExams}
                  onChange={(e) => setReferenceExams(e.target.value)}
                  className={inputClasses}
                  placeholder="e.g., GATE 2024, CSIR-NET JRF"
                />
              </div>
            </div>
          </div>

          <div className="mb-8 p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl relative">
            {!isPromptGenerated ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Sparkles className="text-teal-500 mb-4 opacity-40" size={48} />
                <h3 className="text-lg font-bold mb-2">Ready to Engineer your Prompt?</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-md">
                  We've optimized the JSON schema requirements for the best LaTeX rendering compatibility. 
                  Generate the prompt and paste it into your favorite LLM.
                </p>
                <Button onClick={generatePrompt} className="w-full md:w-auto px-12">
                  <Zap size={18} /> Generate AI Prompt
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-2">
                  <label className={labelClasses}>Optimized LLM Prompt</label>
                  <Button
                    onClick={handleCopy}
                    variant="secondary"
                    className="py-1 px-3 text-xs"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} /> Copied!
                      </>
                    ) : (
                      <>
                        <Clipboard size={14} /> Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={generatedPrompt}
                  className="w-full p-4 h-40 rounded-xl bg-slate-900/50 dark:bg-slate-950/50 border border-slate-700 font-mono text-xs leading-relaxed custom-scrollbar"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    onClick={() =>
                      window.open(
                        `https://claude.ai/new?q=${encodeURIComponent(generatedPrompt)}`,
                        "_blank"
                      )
                    }
                    variant="blue"
                    className="text-xs py-2 bg-slate-200/50 dark:bg-slate-900/50 border-blue-500/30 hover:border-blue-500 text-blue-500"
                  >
                    <MessageSquare size={14} /> Open Claude
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://chatgpt.com/?q=${encodeURIComponent(generatedPrompt)}`,
                        "_blank"
                      )
                    }
                    variant="blue"
                    className="text-xs py-2 bg-slate-200/50 dark:bg-slate-900/50 border-teal-500/30 hover:border-teal-500 text-teal-500"
                  >
                    <Zap size={14} /> Open ChatGPT
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://www.google.com/search?udm=50&q=${encodeURIComponent(generatedPrompt)}`,
                        "_blank"
                      )
                    }
                    variant="secondary"
                    className="text-xs py-2"
                  >
                    <Globe size={14} /> Search AI
                  </Button>
                </div>

                {suggestionsVisible && (
                  <div className="p-4 bg-slate-200/50 dark:bg-slate-900/50 border border-white/5 rounded-xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">More LLM Providers</p>
                      <button onClick={() => setSuggestionsVisible(false)} className="text-slate-500 hover:text-slate-300">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <a href="https://gemini.google.com" target="_blank" className="text-teal-500 hover:underline">Gemini</a>
                      <a href="https://chat.deepseek.com" target="_blank" className="text-teal-500 hover:underline">Deepseek</a>
                      <a href="https://chat.qwen.ai" target="_blank" className="text-teal-500 hover:underline">Qwen</a>
                      <a href="https://huggingface.co/chat" target="_blank" className="text-teal-500 hover:underline">HF Chat</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className={labelClasses}>Step 2: Paste LLM Output (JSON Array)</label>
            <div className="relative group">
              <textarea
                value={llmOutput}
                onChange={(e) => setLlmOutput(e.target.value)}
                className={`${inputClasses} h-48 font-mono text-sm border-2 ${error ? 'border-red-500/50' : 'group-hover:border-teal-500/30'}`}
                placeholder='[{"question": "...", "options": [...], "answer_label": 1, ...}, ...]'
              />
              {llmOutput === "" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 flex-col">
                  <Clipboard size={32} className="mb-2" />
                  <p className="text-xs">Paste the generated JSON here</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
              <X size={18} /> {error}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-800">
           <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 sm:mb-0">
             Ensure JSON starts with <span className="text-teal-500 font-bold">[</span> and ends with <span className="text-teal-500 font-bold">]</span>
           </p>
           <div className="flex gap-4 w-full sm:w-auto">
            <Button onClick={onClose} variant="secondary" className="flex-1 sm:flex-none" disabled={isPosting}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveToLocal}
              variant="blue"
              className="flex-1 sm:flex-none px-8"
              disabled={isPosting || !llmOutput.trim()}
            >
              Save to Local
            </Button>
            <Button
              onClick={handlePostToCommunity}
              disabled={isPosting || !llmOutput.trim() || !userName.trim()}
              className="flex-1 sm:flex-none px-8 bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-500/20"
            >
              {isPosting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Posting...
                </>
              ) : (
                <>
                  <Globe size={18} /> Post to Community
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
      
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

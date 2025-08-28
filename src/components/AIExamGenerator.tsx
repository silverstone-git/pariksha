import React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { X, Clipboard, Check } from "lucide-react";
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
  const [llmOutput, setLlmOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPosting, setIsPosting] = React.useState(false);

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
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setIsCopied(true);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Generate Exam with AI</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto pr-2 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="Enter your name to post"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Exam Name
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="e.g., Advanced Calculus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Reference Exams
              </label>
              <input
                type="text"
                value={referenceExams}
                onChange={(e) => setReferenceExams(e.target.value)}
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
                placeholder="e.g., GRE, SAT"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Number of Questions
              </label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) =>
                  setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
              />
            </div>
          </div>

          <Button onClick={generatePrompt} className="w-full mb-4">
            Generate Prompt
          </Button>

          {generatedPrompt && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Generated Prompt
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedPrompt}
                  className="w-full p-2 h-32 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  {isCopied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Clipboard size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Paste LLM Output Here
            </label>
            <textarea
              value={llmOutput}
              onChange={(e) => setLlmOutput(e.target.value)}
              className="w-full p-2 h-32 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-green-500 focus:ring-0"
              placeholder="Paste the JSON array from the LLM (Preferably CLaude or ChatGPT) here."
            />
          </div>

          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="secondary" disabled={isPosting}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveToLocal}
            variant="primary"
            disabled={isPosting}
          >
            Save to Local
          </Button>
          <Button
            onClick={handlePostToCommunity}
            variant="primary"
            disabled={isPosting}
          >
            {isPosting ? "Posting..." : "Post to Community"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

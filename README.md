# 🎓 Pariksha - AI-Enhanced Physics Exam Simulator

Pariksha is a production-grade exam simulator designed for high-stakes scientific exams (GATE, CSIR NET, TIFR). It leverages AI to generate high-quality questions and provides a professional, distraction-free environment for practice.

## 🚀 Key Features

- **Advanced Exam Engine**: Full support for Multiple Choice (MCQ), Multiple Select (MSQ), and Numerical Answer Type (NAT) questions.
- **Sectional Infrastructure**: Create exams with specific sections (e.g., General Aptitude, Core Physics) each with its own marking scheme and attempt caps.
- **Advanced Preset Editor**: Mix and match topics, set specific question type filters, and define custom marking rules.
- **Live Performance Analysis**: Sidebar metrics track your potential max score and worst-case scenario in real-time.
- **Scientific Visualization**: Integrated support for diagrams hosted on Cloudflare R2 and high-fidelity LaTeX rendering.

## 🛠️ CLI Tools

The `cli/` directory contains powerful scripts for maintaining the question bank:

- `sync_and_summarize.py`: Syncs your local local bank with the deployed API and provides a statistical breakdown of question types and topics.
- `generate_question_bank.py`: Uses Gemini 3.5 Flash and RAG to generate new scientific questions from textbooks.

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, KaTeX.
- **Cloud**: Cloudflare R2 (Images), Deployed API at `https://outsie.aryan.cfd`.
- **AI**: Google Gemini API, ChromaDB (Vector Search).

## 🚦 Getting Started

1. **Install Dependencies**: `npm install`
2. **Environment Setup**: Create a `.env.development` with `VITE_API_BASE_URL`.
3. **Run Dev Server**: `npm run dev`
4. **Access Admin Panel**: Click the **Settings** icon on the home screen to manage the question bank.

---
*Built for serious aspirants. 🚀🧪*

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

- `sync_and_summarize.py`: Destructively downloads the remote bank to the local folder for a clean rebuild.
- `generate_question_bank.py`: Uses Gemini 3.5 Flash and RAG to generate new scientific questions. Uses `PATCH` for idempotent additions to the cloud.
- `additive_sync.py`: Performs a safe, non-destructive cloud-to-local sync, appending only missing questions locally.
- `sync_manager.py`: Performs a "surgical sync" (Fetch-Merge-Delete-Push) to clean remote duplicates and re-upload unique questions.
- `upload_existing_bank.py`: Safely uploads local JSON files to the cloud using `PATCH` for idempotent additions.

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

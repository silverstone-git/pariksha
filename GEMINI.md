# Pariksha - Complete Codebase Documentation

## Project Overview
Pariksha ("Exam") is a modern, AI-enhanced web-based exam simulator built with React, TypeScript, and Vite. It supports complex scientific exam formats including MCQs, MSQs, and NATs with robust LaTeX rendering.

## Architecture

### Frontend Stack
- **React 19** with TypeScript
- **Tailwind CSS v4** (Dark mode optimized)
- **KaTeX** for LaTeX rendering with a custom repair layer for LLM-generated strings.
- **Lucide React** for iconography.

### Backend & Infrastructure
- **Structured Relational API**: Deployed at `https://outsie.aryan.cfd`.
- **Cloudflare R2**: Dedicated `pariksha` bucket for hosting scientific diagrams.
- **ChromaDB**: Vector store for RAG-based question generation.
- **Local Admin Proxy**: Vite middleware for executing background Python tasks and handling dynamic file system operations.

## Key Features

### 1. Advanced Exam Engine
- **Section Support**: Exams are divided into sections (e.g., Part A, Part B) with independent marking schemes and attempt caps.
- **Advanced Preset Editor**: UI for creating custom exams by selecting topic groups, topic weights, marking schemes, and allowed question types (MCQ/MSQ/NAT) per section.
- **Topic Group System**: Support for isolated subject disciplines (e.g., `pg_physics`, `ug_social_sciences`). Each group has its own knowledge base, topics list, and ChromaDB collection.
- **Live Analysis**: Real-time metrics in the sidebar showing Potential Max Score, Worst Case, and Marks Left based on current attempts.

### 2. Administrator & Topic Management
- **Topic Group Uploader**: Drag-and-drop interface in the Admin Dashboard for initializing new subject areas. Accepts Markdown, HTML, and image files for knowledge base and text files for topics.
- **Real-Time Task Monitoring**: Streaming terminal output in the Admin UI for background Python tasks (indexing and question generation).
- **Topic Explorer & Batch Expand**: Group-aware analytics tool for monitoring question bank coverage, generating new questions per topic, or doing a full "Batch Expand" across an entire subject group.
- **Topic Composition Analytics**: Accurate bar graphs mapping the exact distribution of MCQs, MSQs, and NATs based on local JSON bank data.

### 3. Scientific Rendering & Navigation
- **Robust LaTeX**: A sophisticated `Latex` component that repairs common LLM mistakes (missing delimiters) and preserves complex environments like matrices (`pmatrix`).
- **Section Navigation**: Interactive sidebar with a question grid and section-jump tabs.
- **Review Flagging**: Ability to flag questions for later review during the exam.

### 4. CLI RAG Pipeline
- **Automatic Sync**: `sync_and_summarize.py` fetches the deployed bank down to the local `cli/<group>_question_bank/` folder, now with `--group` support to keep subjects isolated.
- **Multimodal Generation**: `generate_question_bank.py` produces questions with R2-hosted images, now with `--group` support for isolated subject generation.
- **Indexing**: `index_knowledge.py` supports isolation via `--group`, creating unique ChromaDB collections per subject.

### 5. CLI Sync Strategies (August 2026)
To maintain data integrity and prevent duplicates, follow these strategies:
- **Idempotent Upload**: Use `upload_existing_bank.py` (or `generate_question_bank.py`), which now uses `PATCH` instead of `POST`. This ensures only unique questions are added to the cloud.
- **Surgical Sync**: Use `sync_manager.py` (Fetch-Merge-Delete-Push) to clean remote duplicates and ensure the remote bank is pristine.
- **Additive Sync**: Use `additive_sync.py` for a safe, non-destructive cloud-to-local synchronization that only appends missing questions to local files.
- **Destructive Sync**: Use `sync_and_summarize.py` for a full, clean rebuild of local files from the cloud.

## Development Notes

### R2 Image Hosting
- **Bucket-Level Public Access**: Cloudflare R2 does not support S3-style Object ACLs. Public access must be enabled at the **Bucket Level** via the Cloudflare Dashboard.
- **URL Structure**: Public URLs follow the pattern `https://pub-<hash>.r2.dev/`.

### Topic Group Setup
- **Directory Structure**:
    - Knowledge Base: `cli/<group_name>_knowledge_base/`
    - Question Bank: `cli/<group_name>_question_bank/`
    - Topics List: `<group_name>_question_bank_topics.txt`
- **Indexing**: Always use `cli/venv_pariksha/bin/python3 cli/index_knowledge.py --group <name>` to ensure isolation.

### Known Fixes (2026-08-14)
- **Topic Distribution API**: Refactored `vite.config.ts` and `App.tsx` to consume structured JSON responses for topics instead of raw text parsing. This resolves visibility issues for flat topic lists.
- **Difficulty Proportions**: Introduced `difficulty` field in `Question` and `difficultyProportions` in `ExamSection` types. Implemented slider-based UI controls for better proportionality visualization.
    - **Robustness Update**: Proportions now default to 1:1:1 and include runtime checks to prevent division-by-zero errors in UI components.
- **Advanced Preset Editor UI/UX**:
    - Replaced numeric inputs with ergonomic `+/-` button controls.
    - Improved layout and responsiveness to prevent text clipping in headers.
    - Implemented `PresetConfirmationModal` for generation workflows.
    - Added comprehensive validation for section configuration (positive/negative marks, question counts).
- **Pitfalls to Avoid**: 
    - **Frontend Parsing**: Avoid complex client-side parsing of raw text files; favor structured JSON APIs.
    - **CSS Clipping**: Avoid `truncate` on container titles if the text length can vary and space permits wrapping.
    - **React State Conventions**: Always use `React.useState` consistently within the same component file to avoid `ReferenceError` when mixing with `useState` from imports.

### Known Fixes (2026-03-30)
- **Vite Proxy Fix**: Updated `vite.config.ts` to use `loadEnv` and handle dynamic `/api/local_bank/` and `/api/topics` routes.
- **JSON Encoding**: Middleware now uses `decodeURIComponent` to correctly serve files with special characters.
- **Streaming Logs**: Python processes are run with `PYTHONUNBUFFERED="1"` to enable real-time log streaming to the React frontend.
- **Stable IDs**: `normalizeExamConfig` ensures every question and section has a stable ID, fixing navigation and scoring mismatches.
- **Auto-Renaming**: `handleFileUpload` automatically appends a counter to duplicate exam names to prevent collisions.

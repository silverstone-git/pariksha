# Pariksha - Complete Codebase Documentation

## Project Overview

Pariksha (meaning "Exam" in Hindi) is a modern, AI-enhanced web-based exam simulator built with React, TypeScript, and Vite. It allows users to create, take, and share practice exams with advanced features including AI-powered exam generation, detailed performance analytics, and community sharing.

## Architecture

### Frontend Stack
- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling with dark mode support
- **KaTeX** for LaTeX rendering of mathematical expressions
- **Lucide React** for icons

### Backend/API Integration
- **Client-side application** - No backend server required
- **Local Storage** for data persistence
- **Third-party APIs** for AI integration (Claude, ChatGPT, Google AI)
- **ChromaDB** for vector storage and retrieval (in CLI)
- **Cloudflare R2** for automated image hosting (in CLI)

## Key Features

### 1. AI-Powered Exam Generation
- **Multimodal RAG**: Generates exams using a local knowledge base of textbooks and papers.
- **Image Support**: Automatically identifies and includes relevant diagrams/charts from the knowledge base using Gemini's multimodal capabilities.
- **Automated Pipeline**: CLI tool indexes text and dynamically uploads referenced images to Cloudflare R2.
- **LaTeX Handling**: Comprehensive handling for mathematical/scientific content with robust backslash repair.

### 2. Exam Management
- **Local Exams**: Upload and save personal exam JSON files.
- **Community Exams**: Browse and take exams shared by other users.
- **Fault-tolerant JSON Parser**: Handles malformed JSON with extra text and common LLM escape errors.
- **Search Functionality**: Filter exams by name/title.

### 3. Exam Taking Experience
- **Custom Timer**: Configurable exam duration (hours/minutes).
- **Dynamic Content**: Questions and options are shuffled for varied experience.
- **LaTeX Support**: Full rendering of mathematical notation (inline $...$ and block $$...$$).
- **Image Context**: Questions can include high-quality diagrams hosted on R2.
- **Progressive Navigation**: Question-by-question interface.

### 4. Detailed Results Analysis
- **Score Breakdown**: Correct/incorrect answers with percentages.
- **Topic-wise Performance**: Accuracy and time spent per topic.
- **SWOT Analysis**: Automated generation of Strengths, Weaknesses, Opportunities, Threats.
- **Answer Review**: Detailed question-by-question review with explanations.

### 5. Data Persistence
- **Exam History**: Local storage of all taken exams.
- **Import/Export**: Download results as JSON and upload later for review.
- **Theme Persistence**: Dark/light mode preferences saved locally.

## File Structure

```
pariksha/
├── public/                    # Static assets
├── src/                       # Source code
│   ├── components/           # React components
│   │   ├── AIExamGenerator.tsx     # AI exam generation modal
│   │   ├── Button.tsx              # Reusable button component
│   │   ├── Card.tsx                # Reusable card component
│   │   ├── ExamScreen.tsx          # Main exam taking interface (with Image support)
│   │   ├── Latex.tsx               # LaTeX rendering wrapper (Fixed delimiters)
│   │   └── ThemeToggle.tsx         # Dark/light mode toggle
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom React hooks
│   ├── types.ts              # TypeScript type definitions
│   ├── utils.ts              # Utility functions (with Image resolution)
│   ├── App.tsx               # Main application component
│   └── ...
├── cli/                      # Command Line Interface (LlamaIndex + ChromaDB)
│   ├── index_knowledge.py    # Knowledge base indexing script
│   ├── exam_generator.py     # Main generation tool (with R2 support)
│   ├── utils.py              # Robust JSON repair and cleaning
│   ├── knowledge_base/       # Source materials (MD, HTML, Images)
│   ├── requirements.txt      # Python dependencies (LlamaIndex, boto3, etc.)
│   └── ...
├── sample_exams/            # Generated exam storage
├── package.json             # Node.js dependencies
├── vite.config.ts           # Vite configuration (with Tailwind plugin)
└── README.md                # Project documentation
```

## CLI Section

### Overview
The CLI tool uses **LlamaIndex** and **ChromaDB** to provide a sophisticated RAG pipeline for exam generation. It leverages **Gemini 3 Flash** for its native multimodal capabilities, allowing it to "see" and reason over diagrams in the knowledge base.

### Key Features
- **Modern SDK**: Uses the unified `google-genai` SDK for high performance.
- **Text-led Multimodal RAG**: Indexes text for efficient retrieval and dynamically attaches local images to the prompt when referenced in the context.
- **Automated Image Hosting**: Integrates with **Cloudflare R2** via `boto3` to upload local images and replace them with public URLs in the final JSON.
- **Robust Parsing**: Multi-stage repair pipeline (`heuristics` -> `json-repair`) to handle complex LaTeX strings that often break standard JSON parsers.

### CLI Components

#### `index_knowledge.py`
- **Role**: Indexes the `knowledge_base/` directory into ChromaDB.
- **Features**: Batch processing, MD5-based checkpointing (resumable), and recursive directory scanning.

#### `exam_generator.py`
- **Role**: Orchestrates the RAG and generation process.
- **Features**: 
  - Retrieves relevant text from ChromaDB.
  - Scans text for local image paths (`![]()` or `<img>`).
  - Uploads images to R2 and replaces paths.
  - Queries Gemini MultiModal with interleaved text/image context.

#### `utils.py`
- **Role**: JSON cleaning and LaTeX repair.
- **New**: Enhanced `fix_json_escapes` with a whitelist of 50+ common LaTeX commands to prevent accidental escape character corruption (e.g., `\tau` -> `\t`).

## Development Notes & Known Issues

### Development Log (2026-03-25) - Physics-Centric Overhaul

- **Question Bank Generation**: Created `cli/generate_question_bank.py` to auto-generate topic-wise physics questions with context-aware depth (preventing repetition and increasing difficulty for subsequent additions).
- **Admin Dashboard**: Added a new, local-only Admin Panel (`src/admin/AdminDashboard.tsx`) to trigger AI generation, stream CLI logs, and view topic coverage analytics.
- **Scientific UI/UX Redesign**: Revamped the frontend styling to a "Science Blue" and "Teal" theme with glassmorphism, glowing states, and a new `science-grid` background.
- **Advanced Exam Configurations**: Upgraded `ExamConfigModal` to support dynamic variables (Marks/Correct, negative marking values matching standard exams like -0.875).
- **Exam Presets**: Added auto-generation for GATE, CSIR NET, TIFR GS, and BARC OCES based on accurate topic weightages (using `src/utils.ts` pattern mapping).
- **Vite Local Proxy Integration**: Configured `vite.config.ts` to expose the local `cli/question_bank` directory and an `/api/generate` endpoint, allowing the frontend to sample and expand the question bank exclusively during local development.

### Development Log (2026-03-25) - LlamaIndex & Multimodal Migration

-   **LlamaIndex Migration**: Replaced `smolagents` with a robust LlamaIndex pipeline using ChromaDB (localhost:9000).
-   **Multimodal support**: Implemented a dynamic image-attaching strategy for Gemini 3 Flash. The system now automatically resolves local image paths from the knowledge base and sends them as vision context during generation.
-   **Cloudflare R2 Integration**: Added `R2Uploader` to the CLI. Generated exams now contain public R2 URLs for images, ensuring they work seamlessly on the Pariksha web platform.
-   **Frontend Image Support**: Updated `ExamScreen.tsx` to render images from `image_path` fields and added `resolveImagePath` in `src/utils.ts` for URL resolution.
-   **LaTeX Rendering Fix**: Corrected delimiters in `Latex.tsx`. Single `$` is now correctly treated as **inline math** (non-display), preventing unwanted newlines in questions.
-   **JSON Repair Pipeline**: Integrated the `json-repair` library and expanded heuristic backslash fixing in `cli/utils.py` to handle 40+ additional LaTeX symbols and formatting commands.
-   **Modern SDK Upgrade**: Switched all CLI components to the new `google-genai` SDK and `llama-index-llms-google-genai` for better performance and long-term support.

### Development Log (Previous)

-   **Robust JSON Repair**: Implemented `fix_json_escapes` in `cli/utils.py` to handle common LLM output errors where LaTeX backslashes are not properly escaped.
-   **PDF Support in Search**: Enhanced search to detect and extract text from PDF URLs using `pdfplumber`.
-   **Web-App Compatible Output**: Modified `save_exam` in `cli/exam_generator.py` to save the generated questions as a raw JSON list `[...]`.

### Current Issues & Future Roadmap

- **Detailed Limitations**: See `TODO.txt` for in-depth explanations regarding:
  - **Advanced Exam Engine Needs**: Missing support for distinct sections, MSQs/NATs, attempt limits, and section-specific marking.
  - **Centralized Question Bank API**: The current reliance on the local Vite proxy (`cli/question_bank/`) needs to be refactored into a centralized `outsie.aryan.cfd` endpoint so production users can utilize the Preset Auto-Generator.
- **Dark Mode Toggle**: The dark/light mode toggle remains a known issue. While the application state updates correctly and the `.dark` class is applied to `<html>`, Tailwind CSS styles do not always update visually due to a potential configuration conflict between Tailwind v4 and Vite's HMR.

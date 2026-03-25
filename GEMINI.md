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
- **Structured Relational API**: Move from monolithic JSON strings to structured sections containing specific question IDs.
- **Local Storage**: For client-side data persistence and session history.
- **Third-party APIs**: For AI integration (Google Gemini 3 Flash).
- **ChromaDB**: Vector store for RAG (retrieval-augmented generation).
- **Cloudflare R2**: Automated public-read image hosting for scientific diagrams.

## Key Features

### 1. Advanced Exam Engine
- **Section Support**: Exams are now structured into sections (e.g., Part A, Part B) with independent marking schemes and attempt caps (e.g., "Answer 15/20").
- **Multimodal Question Types**: Full support for **MCQ**, **MSQ** (Multiple Select), and **NAT** (Numerical Answer Type).
- **LaTeX Handling**: Comprehensive cleanup layer for mathematical/scientific content with robust backslash repair for LLM-generated strings.

### 2. AI-Powered Question Bank
- **Multimodal RAG**: Generates questions using a local knowledge base of textbooks and papers.
- **Sampling API**: Frontend dynamically samples questions from the centralized bank via `/api/question_bank/sample`.
- **Automatic Upload**: CLI tool (`generate_question_bank.py`) generates and automatically `POST`s new questions to the API using `PARIKSHA_ADMIN_SECRET`.

### 3. Exam Taking Experience
- **Sectional UI**: Tabbed or grouped navigation between exam sections.
- **Dynamic Input Fields**: Checkboxes for MSQs and numeric inputs for NATs.
- **Timer & Persistence**: Configurable duration with automatic submission and local state recovery.

### 4. Detailed Results Analysis
- **Section Breakdown**: Individual scores per section.
- **SWOT Analysis**: Automated generation of Strengths, Weaknesses, Opportunities, Threats.
- **Type-Aware Review**: Detailed review for MSQ/NAT with correct vs. entered answer comparisons and explanations.

## File Structure

```
pariksha/
├── public/                    # Static assets
├── src/                       # Source code
│   ├── components/           # React components
│   │   ├── AIExamGenerator.tsx     # AI exam generation modal
│   │   ├── ExamScreen.tsx          # Advanced engine with Section & MSQ/NAT support
│   │   ├── Latex.tsx               # LaTeX rendering with backslash cleanup
│   │   └── ...
│   ├── types.ts              # Refined polymorphic types for Sections & MSQ/NAT
│   ├── utils.ts              # Normalization layer & API routing logic
│   ├── App.tsx               # Main application and Results handling
│   └── ...
├── cli/                      # Python RAG Pipeline
│   ├── generate_question_bank.py  # Builder with direct API upload and MSQ/NAT support
│   ├── exam_generator.py     # Multimodal RAG core with R2 public upload
│   ├── index_knowledge.py    # ChromaDB indexing
│   └── ...
├── README.md                # Project overview
└── GEMINI.md                # Technical documentation
```

## CLI & Pipeline

### Question Bank Generation
- **MSQ/NAT Support**: Prompts updated to force a variety of question types.
- **API Integration**: Uses `PARIKSHA_ADMIN_SECRET` to populate the remote database.
- **ChromaDB Fallback**: Automatically switches to local `PersistentClient` if the background server isn't running.

### R2 Image Hosting
- **Public ACL**: Every uploaded diagram is set to `public-read` via S3 `copy_object` metadata updates to ensure frontend visibility.

## Development Notes

### Advanced Exam Engine Migration (2026-03-26)
- **Backward Compatibility**: Implemented a `normalizeExamConfig` utility that wraps legacy flat-list exams into a single "General" section on the fly.
- **CORS & Proxying**: Configured Vite dev server to proxy `/pariksha` and `/api/question_bank` to port `8671`, enabling local development without CORS issues.
- **UI Robustness**: Added loading states for exam generation and safe property access for `exam.questions` vs `exam.sections`.

### Known Issues
- **Dark Mode Toggle**: Application state updates correctly and applies `.dark` class to `<html>`, but Tailwind v4 styles may require a full page reload or HMR restart due to Vite configuration conflicts.

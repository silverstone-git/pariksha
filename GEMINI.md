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

## Key Features

### 1. Advanced Exam Engine
- **Section Support**: Exams are divided into sections (e.g., Part A, Part B) with independent marking schemes and attempt caps.
- **Advanced Preset Editor**: UI for creating custom exams by selecting topic weights, marking schemes, and allowed question types (MCQ/MSQ/NAT) per section.
- **Live Analysis**: Real-time metrics in the sidebar showing Potential Max Score, Worst Case, and Marks Left based on current attempts.

### 2. Scientific Rendering & Navigation
- **Robust LaTeX**: A sophisticated `Latex` component that repairs common LLM mistakes (missing delimiters) and preserves complex environments like matrices (`pmatrix`).
- **Section Navigation**: Interactive sidebar with a question grid and section-jump tabs.
- **Review Flagging**: Ability to flag questions for later review during the exam.

### 3. CLI RAG Pipeline
- **Automatic Sync**: `sync_and_summarize.py` fetches the entire deployed bank to the local `cli/question_bank` folder.
- **Multimodal Generation**: `generate_question_bank.py` produces questions with R2-hosted images.

## Development Notes

### R2 Image Hosting
- **Bucket-Level Public Access**: Cloudflare R2 does not support S3-style Object ACLs. Public access must be enabled at the **Bucket Level** via the Cloudflare Dashboard.
- **URL Structure**: Public URLs follow the pattern `https://pub-<hash>.r2.dev/`.

### Known Fixes (2026-03-26)
- **Vite Proxy Fix**: Updated `vite.config.ts` to use `loadEnv` so proxy targets are correctly read from `.env` files.
- **JSON Encoding**: Middleware now uses `decodeURIComponent` to correctly serve files with special characters (e.g., `ö`).
- **Stable IDs**: `normalizeExamConfig` now ensures every question and section has a stable ID, fixing navigation and scoring mismatches.
- **Auto-Renaming**: `handleFileUpload` automatically appends a counter to duplicate exam names to prevent collisions.

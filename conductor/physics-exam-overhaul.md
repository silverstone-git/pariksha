# Physics-Centric Exam Overhaul Plan

This plan outlines the strategy for transforming "Pariksha" into a physics-centric exam simulator with a modern design, comprehensive question bank, and advanced configuration options.

## 1. Objectives

- **Question Bank**: Generate 20 high-quality questions for each of the 40+ physics topics using the AI CLI.
- **Incremental Depth**: Implement a "no-repeat" generation logic that analyzes existing questions to ensure new additions cover new concepts and increase in difficulty.
- **Modern Design**: Overhaul the frontend with a physics/modern science theme.
- **Admin Dashboard**: Create a standalone Admin Frontend for managing the question bank (generating, reviewing, and expanding topic coverage).
- **Advanced Configuration**: Add a dialog for exam settings (timer, question count, negative marking).
- **Exam Presets**: Implement auto-generation based on exam patterns (GATE, CSIR NET, TIFR GS, BARC OCES).

## 2. Phase 1: Question Bank Generation & Admin Dashboard

### Incremental Depth Logic (CLI):
- Update `cli/exam_generator.py` to support "Context-Aware Generation":
    - Before generating new questions for a topic, the agent will read existing question titles/concepts from `cli/question_bank/{topic}.json`.
    - The prompt will explicitly instruct the AI to **avoid existing concepts** and **increase the difficulty level** (e.g., from basic to advanced numericals/conceptual proofs).
- Use `cli/generate_question_bank.py` for bulk generation.

### Admin Frontend (Standalone):
- **Tech Stack**: React + Vite + Tailwind (shared with main app but separate entry point).
- **Features**:
    - **Topic Overview**: List all 40+ topics with question counts and coverage status.
    - **Question Browser**: View and edit existing questions in the bank.
    - **AI Adder**: A "Generate More" button for each topic that triggers the CLI (via a simple local API or direct execution).
    - **Analytics**: Visualization of topic weightage and difficulty distribution.

## 3. Phase 2: Modern Scientific UI/UX Redesign

### Design Theme:
- **Colors**: Deep "Science Blue" (#0f172a), Slate Gray (#1e293b), and vibrant "Teal/Green" (#10b981) for actions.
- **Typography**: Clean, sans-serif for UI; LaTeX (KaTeX) for all physics formulas.
- **Aesthetic Elements**:
    - Subtle "Scientific Grid" background pattern.
    - Glassmorphism effects for cards.
    - Glowing state transitions for buttons.

### Component Updates:
- **`Header`**: More compact and modern, with "Physics Edition" branding.
- **`Card`**: Updated with glassmorphism (translucent background, subtle border).
- **`Button`**: New variants (glowing primary, scientific secondary).
- **`HomeScreen`**: Overhauled layout for better readability and focus on the new "Physics Exam" button.

## 4. Phase 3: Exam Configuration & Presets

### New Components:
- **`ExamConfigModal`**:
    - Triggered by clicking "Start" on any exam.
    - Settings: Timer (HH:MM), Question Count (default: All), Negative Marking (None, -1/4, -1/3).
    - Toggle: Shuffle questions/options.
- **`PhysicsExamGeneratorModal`**:
    - Triggered by "Auto-Generate Physics Exam" button.
    - Displays preset buttons (GATE, CSIR NET, TIFR GS, BARC OCES).
    - Includes a "Custom Preset" UI with sliders for topic weightage.

### Sampling Logic (`src/utils.ts`):
- Define a mapping between "Subject Groups" and specific topics from the question bank.
- Implement a `generatePresetExam` function that:
    - Calculates the number of questions per group based on the selected preset's weightage.
    - Randomly samples from the relevant topic JSON files.
    - Returns a consolidated `ExamConfig`.

## 5. Verification & Testing

- **Depth Check**: Verify that adding 20 more questions to "Quantum Mechanics" results in advanced topics (e.g., Perturbation Theory) instead of repeating basic Schrödinger equations.
- **Admin Flow**: Ensure the Admin Frontend can correctly trigger generation and update the local JSON files.
- **UI Verification**: Ensure dark/light mode consistency with the new theme.
- **Generation Test**: Verify that the auto-generated exams correctly follow the weightage rules.

## 6. Migration & Rollback

- **Data Migration**: Existing local exams in `localStorage` will remain compatible.
- **Rollback**: Standard git-based rollback of frontend changes if UI performance issues arise.

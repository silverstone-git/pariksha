# Project: Pariksha

## Overview

Pariksha is a feature-rich, web-based exam simulator built with a modern stack: React, TypeScript, and Vite. It provides a comprehensive platform for users to take practice exams. Users can upload their own JSON files, generate exams using AI, or select from a list of community-provided tests. The application offers key features like a session timer, question and option shuffling, detailed post-exam results analysis, and persistent exam history tracking.

## Project Structure

The project structure has been updated to include new reusable UI components.

```
/home/cyto/dev/pariksha/
├───.gitignore
├───css_logfile.txt
├───eslint.config.js
├───index.html
├───package-lock.json
├───package.json
├───README.md
├───sample_paper.json
├───tsconfig.app.json
├───tsconfig.json
├───tsconfig.node.json
├───vite.config.ts
├───node_modules/
├───public/
│   └───vite.svg
└───src/
    ├───App.css
    ├───App.tsx
    ├───index.css
    ├───main.tsx
    ├───vite-env.d.ts
    ├───assets/
    │   └───react.svg
    └───components/
        ├───AIExamGenerator.tsx
        ├───Button.tsx          // New
        ├───Card.tsx            // New
        └───Latex.tsx
```

### Key Files and Directories

-   **`public/`**: Contains static assets like `vite.svg`.
-   **`src/`**: The main source code directory.
    -   **`components/`**: Contains reusable React components.
        -   `AIExamGenerator.tsx`: A modal component for generating exams using an AI service.
        -   `Button.tsx`: A general-purpose button component with styling variants.
        -   `Card.tsx`: A container component for displaying content in a styled card format.
        -   `Latex.tsx`: A component for rendering LaTeX expressions using KaTeX.
    -   `App.tsx`: The core of the application. It manages state and renders the different screens (Home, Exam, Results). It contains the primary logic for the application's functionality.
-   **`package.json`**: Defines project metadata, dependencies (like React, Tailwind CSS, Lucide), and scripts.
-   **`css_logfile.txt`**: A log file detailing troubleshooting steps taken to resolve a persistent dark mode styling issue.

## Application Flow

The application is a single-page application (SPA) with three main screens:

1.  **Home Screen**: The main landing page where users can:
    -   Upload a new exam configuration from a JSON file. The parser is fault-tolerant and can extract JSON from text that includes extraneous content.
    -   Generate a new exam using an AI-powered modal.
    -   View a list of available exams, including locally saved and community-uploaded exams.
    -   Start an exam session.
    -   View their exam history.
    -   Upload a previously saved exam result JSON to review it again.
    -   Set the timer duration for the exam.

2.  **Exam Screen**: This screen is displayed when an exam is in progress. It features a clean, focused layout with:
    -   A prominent countdown timer.
    -   The current question and shuffled multiple-choice options.
    -   Navigation controls to move between questions.
    -   A button to submit the exam at any time.

3.  **Results Screen**: After submitting an exam, the user is taken to this screen, which provides a detailed breakdown of their performance, including a SWOT analysis and an answer review section.

## Development Notes & Known Issues

### Development Log

-   **Componentization**: Created `Card.tsx` and `Button.tsx` to standardize UI elements and improve code reusability, following the existing Tailwind CSS conventions.
-   **Fault-Tolerant Parsing**: Implemented logic in `App.tsx` to make the JSON file upload process more robust. The code now finds the first and last square or curly bracket (`[`/`]` or `{`/`}`), extracts the content between them, and then attempts to parse it. This allows users to paste content directly, even if it's part of a larger text block, significantly improving usability.
-   **UI Layout Adjustment**: Modified the layout of the Home Screen to stack the "Upload New Exam" and "Generate with AI" buttons vertically. This prevents the text from wrapping on smaller screens and provides a cleaner, more organized look.
-   **Tooling Error Recovery**: During development, a `replace` tool call failed because the `old_string` argument did not perfectly match the target code in `App.tsx`. This was resolved by re-reading the file with `read_file` to get the exact, up-to-date content and then re-issuing the `replace` command with the correct context. This highlights the importance of ensuring context is precise when performing file modifications.
-   **AI Exam Generator UI/UX**: Improved the user experience in the "Generate Exam with AI" dialog. Replaced the single "Generate Prompt" button with three dedicated buttons: "Claude," "ChatGPT," and "Copy to Clipboard." This allows users to directly open their preferred AI tool in a new tab with the prompt pre-filled or copy it manually. Added a sparkle icon for better visual distinction.
-   **Dark Mode Styling**: Fixed a styling bug in the AI Exam Generator where the dialog card would remain light in dark mode. Applied the correct Tailwind CSS classes (`dark:bg-gray-800` and `dark:text-gray-200`) to ensure the dialog adheres to the selected theme.
-   **Enhanced AI Exam Generation**: Further improved the AI Exam Generator by adding a "Google AI" button for direct prompt generation. After copying a prompt, a persistent list of suggested AI chat links (including DuckDuckGo, Gemini, GLM-4.5, etc.) now appears, which can be manually closed by the user, replacing the previous auto-hiding behavior.

### Current Issues

-   **Dark Mode Toggle**: The dark/light mode toggle remains a known issue. While the application state updates correctly and the `.dark` class is successfully applied to the `<html>` element, the Tailwind CSS styles do not update visually as expected. The application seems to be "stuck" in the theme that matches the browser's default `prefers-color-scheme`. The `css_logfile.txt` contains a detailed record of the debugging attempts. This seems to be a configuration issue between Tailwind CSS and Vite's HMR (Hot Module Replacement).

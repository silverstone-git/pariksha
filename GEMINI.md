# Project: Pariksha

## Overview

Pariksha is a web-based exam simulator built with React, TypeScript, and Vite. It provides a platform for users to take practice exams by uploading JSON files containing questions and answers. The application offers features like a timer, question shuffling, detailed results analysis, and exam history tracking.

## Project Structure

```
/home/cyto/dev/pariksha/
├───.gitignore
├───css_logfile.txt
├───eslint.config.js
├───index.html
├───package-lock.json
├───package.json
├───README.md
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
        └───Latex.tsx
```

### Key Files and Directories

-   **`public/`**: Contains static assets like `vite.svg`.
-   **`src/`**: The main source code directory.
    -   **`assets/`**: Contains static assets used in the application, such as `react.svg`.
    -   **`components/`**: Contains reusable React components.
        -   `Latex.tsx`: A component for rendering LaTeX expressions using KaTeX.
    -   `App.css`: Styles for the main `App` component.
    -   `App.tsx`: The core of the application, containing the main logic for the different screens (Home, Exam, Results).
    -   `index.css`: Global styles for the application, including Tailwind CSS imports.
    -   `main.tsx`: The entry point of the application, where the React app is mounted to the DOM.
-   **`package.json`**: Defines project metadata, dependencies, and scripts.
-   **`vite.config.ts`**: Configuration file for the Vite build tool, including Tailwind CSS setup.
-   **`css_logfile.txt`**: A log file detailing the troubleshooting steps taken to resolve the dark mode issue.

## Application Flow

The application is a single-page application (SPA) with three main screens:

1.  **Home Screen**: This is the initial screen where users can:
    -   Upload a new exam configuration from a JSON file.
    -   View a list of available exams.
    -   Start an exam.
    -   View their exam history.
    -   **Upload a previously saved exam result JSON to review it.**
    -   Set the timer for the exam.

2.  **Exam Screen**: This screen is displayed when an exam is in progress. It features:
    -   A countdown timer.
    -   The current question and shuffled multiple-choice options.
    -   Navigation to move between questions.
    -   A button to submit the exam.

3.  **Results Screen**: After submitting an exam, the user is taken to this screen, which provides:
    -   A summary of the exam performance (score, accuracy, total time).
    -   A breakdown of performance by topic.
    -   A SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.
    -   An answer review section to see correct and incorrect answers.
    -   An option to download the results as a JSON file.

## Core Components and Logic

-   **`App.tsx`**: This file is the heart of the application and manages the state for the current screen, exam configuration, and results. It contains the logic for switching between screens and passing data between them.
-   **State Management**: The application uses React's `useState` and a custom `useLocalStorage` hook for state management. The `useLocalStorage` hook is used to persist available exams and exam history.
-   **Styling**: The application is styled using Tailwind CSS for a modern and responsive user interface.

## Current Issues

-   **Dark Mode Toggle**: The dark/light mode toggle is currently not functional. While the application state updates correctly and the `.dark` class is applied to the `<html>` element, the CSS styles do not update visually. The application appears to be "stuck" in the theme that matches the browser's default (`prefers-color-scheme`). A detailed log of the troubleshooting attempts can be found in `css_logfile.txt`.
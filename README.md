# 📝 Pariksha - Exam Simulator

Pariksha is a modern, web-based exam simulator built with React, TypeScript, and Vite. It provides a platform for users to take practice exams by uploading JSON files, offering features like a timer, question shuffling, detailed results analysis, and exam history tracking. The application is designed to be intuitive and flexible, allowing users to easily create, share, and take exams.

## ✨ Features

-   **AI-Powered Exam Generation**: Automatically generate exams on any topic using AI.
    -   Provides direct prompt generation for Claude, ChatGPT, and Google AI.
    -   Includes a "Copy to Clipboard" option and suggests other popular AI chat platforms for convenience, such as DuckDuckGo, Gemini, GLM-4.5, Qwen AI, and Deepseek.
-   **Fault-Tolerant JSON Upload**: Easily upload your own exams using a simple JSON format. The parser is designed to be robust, tolerating extra text or formatting issues in the uploaded file.
-   **Community-Sourced Exams**: Browse and take exams uploaded by other users.
-   **Timed Sessions**: Set a custom timer for each exam session to simulate real exam conditions.
-   **Dynamic Content**: Questions and their multiple-choice options are automatically shuffled for a different experience each time.
-   **Full LaTeX Support**: Renders complex mathematical and scientific notations beautifully using KaTeX.
-   **Detailed Results**: Get instant feedback with a comprehensive, multi-faceted results page.
-   **In-Depth Performance Analysis**:
    -   Overall score and accuracy percentages.
    -   Performance breakdown by topic, including accuracy and time spent.
    -   A detailed SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis to pinpoint areas for improvement.
-   **Answer Review**: Go through your answers question-by-question to understand mistakes and reinforce learning.
-   **Persistent History**: Your exam history is saved locally in your browser for easy tracking of your progress.
-   **Import/Export Results**: Download your exam results as a JSON file and upload them later to review them anytime.
-   **Dark Mode**: A sleek, eye-friendly dark mode for late-night study sessions.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (version 18 or higher recommended)
-   [npm](https://www.npmjs.com/) (or your package manager of choice)

### Installation & Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/pariksha.git
    cd pariksha
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

4.  **Create or Upload an Exam**:
    -   Click "Upload New Exam JSON" and select a valid JSON file. Refer to `sample_paper.json` in the project root for the required format.
    -   Alternatively, click "Generate with AI" to create a new exam on the fly.

### Available Scripts

-   `npm run dev`: Starts the Vite development server with hot reloading.
-   `npm run build`: Compiles and bundles the application for production.
-   `npm run lint`: Lints the codebase using ESLint to ensure code quality.
-   `npm run preview`: Serves the production build locally to preview before deploying.

## 🛠️ Technology Stack

-   **Frontend**: [React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: Custom-built, reusable components for Cards and Buttons.
-   **Icons**: [Lucide React](https://lucide.dev/) for crisp, lightweight icons.
-   **LaTeX Rendering**: [KaTeX](https://katex.org/) for high-performance math typesetting.

---

<p align="center">
  <em>This entire project was vibe coded using the <a href="https://developers.google.com/gemini/cli">Gemini CLI</a>.</em>
</p>
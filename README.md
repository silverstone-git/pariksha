# 📝 Pariksha - Exam Simulator

Pariksha is a modern, web-based exam simulator built with React, TypeScript, and Vite. It provides a platform for users to take practice exams by uploading JSON files, offering features like a timer, question shuffling, detailed results analysis, and exam history tracking.

## ✨ Features

-   **JSON-based Exams**: Easily create and upload your own exams using a simple JSON format.
-   **Timed Sessions**: Set a custom timer for each exam session.
-   **Dynamic Content**: Questions and options are automatically shuffled for a different experience each time.
-   **LaTeX Support**: Renders mathematical notations beautifully using KaTeX.
-   **Detailed Results**: Get instant feedback with a comprehensive results page.
-   **Performance Analysis**:
    -   Score and accuracy percentages.
    -   Performance breakdown by topic.
    -   In-depth SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.
-   **Answer Review**: Go through your answers to see where you went right or wrong.
-   **Persistent History**: Your exam history is saved locally in your browser.
-   **Import/Export**: Download your exam results as a JSON file and upload them later to review.
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
    The application will be available at `http://localhost:5173`.

4. Upload an exam json file. Refer the `sample_paper.json` in the project root for the syntax. Enclose math in `$`-s to enable LaTeX

### Available Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run lint`: Lints the codebase using ESLint.
-   `npm run preview`: Serves the production build locally for preview.

## 🛠️ Technology Stack

-   **Frontend**: [React](https://reactjs.org/) & [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **LaTeX Rendering**: [KaTeX](https://katex.org/)

---

<p align="center">
  <em>This entire project was vibe coded using the <a href="https://developers.google.com/gemini/cli">Gemini CLI</a>.</em>
</p>

# 📝 Pariksha - AI-Enhanced Exam Simulator

Pariksha is a modern, web-based exam simulator built with React, TypeScript, and Vite. It provides a platform for users to create, take, and share practice exams with advanced features like **Multimodal AI RAG**, automated image hosting, and detailed performance analytics.

## ✨ Features

-   **Advanced Exam Engine**: Supports complex exam formats like **GATE**, **CSIR NET**, and **TIFR**.
    -   **Sections**: Multiple sections per exam with independent marking schemes (positive/negative marks) and attempt limits (e.g., "Answer 20 of 30").
    -   **Multimodal Questions**: Supports standard **MCQ**, **MSQ** (Multiple Select), and **NAT** (Numerical Answer Type) questions.
-   **Multimodal AI Exam Generation**: Automatically generate exams using a local knowledge base of textbooks, PDFs, and papers.
    -   **Context-Aware**: Uses LlamaIndex and ChromaDB to retrieve relevant study material.
    -   **Image Support**: AI "sees" technical diagrams and charts from your materials and includes them in questions.
    -   **Automated Image Pipeline**: Dynamically uploads referenced images to Cloudflare R2 with public read access.
-   **Centralized Question Bank**: Integration with a structured API for sampling questions by topic and slug.
-   **Full LaTeX Support**: Renders complex mathematical and scientific notations beautifully using KaTeX, with a robust cleanup layer for LLM-generated backslashes.
-   **Timed Sessions**: Set a custom timer to simulate real exam conditions.
-   **Dynamic Content**: Questions and options are automatically shuffled for every attempt.
-   **In-Depth Performance Analysis**:
    -   Overall score, section breakdown, and topic-wise performance.
    -   Automated **SWOT Analysis** (Strengths, Weaknesses, Opportunities, Threats).
    -   Question-by-question review with detailed explanations and image visualizations.
-   **Persistent History**: Exam history and preferences (including Dark Mode) are saved locally.
-   **Import/Export**: Download results as JSON to share or review later.

## 🚀 Getting Started

### Web Application

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Ensure `.env.development` or `.env` has:
    - `VITE_API_BASE_URL` (defaults to `https://outsie.aryan.cfd` or `http://localhost:8671`)
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Access at `http://localhost:5173`. Requests to `/pariksha` and `/api/question_bank` are proxied to the backend.

### CLI Tool (Exam Generator)

The CLI tool allows you to index your own knowledge base and generate questions for the bank.

1.  **Setup Virtual Environment:**
    ```bash
    cd cli
    python3 -m venv venv_pariksha
    source venv_pariksha/bin/activate
    pip install -r requirements.txt
    ```
2.  **Configure API Keys:**
    Create a `.env` file in the `cli/` directory with:
    - `GEMINI_API_KEY`
    - `PARIKSHA_ADMIN_SECRET` (for uploading to the question bank)
    - `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (for images)
3.  **Generate and Upload to Bank:**
    ```bash
    # Generate questions for a specific topic and upload to local API
    python generate_question_bank.py --topic "Quantum Mechanics" --count 20 --local-api
    ```

## 🛠️ Technology Stack

-   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4.
-   **AI Engine**: Google Gemini 3 Flash (Multimodal), LlamaIndex.
-   **Database**: ChromaDB (Vector Store).
-   **Backend API**: Fast API / Relational (Structured Sections & Questions).
-   **Storage**: Cloudflare R2 (for exam images).
-   **Math Rendering**: KaTeX.

---

<p align="center">
  <em>This entire project was vibe coded using the <a href="https://developers.google.com/gemini/cli">Gemini CLI</a>.</em>
</p>

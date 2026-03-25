# 📝 Pariksha - AI-Enhanced Exam Simulator

Pariksha is a modern, web-based exam simulator built with React, TypeScript, and Vite. It provides a platform for users to create, take, and share practice exams with advanced features like **Multimodal AI RAG**, automated image hosting, and detailed performance analytics.

## ✨ Features

-   **Multimodal AI Exam Generation**: Automatically generate exams using a local knowledge base of textbooks, PDFs, and papers.
    -   **Context-Aware**: Uses LlamaIndex and ChromaDB to retrieve relevant study material.
    -   **Image Support**: AI "sees" technical diagrams and charts from your materials and includes them in questions.
    -   **Automated Image Pipeline**: Dynamically uploads referenced images to Cloudflare R2 for seamless hosting.
-   **Fault-Tolerant JSON Upload**: Robust parser handles malformed JSON and common LLM escape errors, especially in complex LaTeX strings.
-   **Full LaTeX Support**: Renders complex mathematical and scientific notations beautifully using KaTeX, supporting both inline ($) and block ($$) modes.
-   **Timed Sessions**: Set a custom timer to simulate real exam conditions.
-   **Dynamic Content**: Questions and options are automatically shuffled for every attempt.
-   **In-Depth Performance Analysis**:
    -   Overall score, accuracy, and topic-wise breakdown.
    -   Automated **SWOT Analysis** (Strengths, Weaknesses, Opportunities, Threats).
    -   Question-by-question review with detailed explanations.
-   **Persistent History**: Exam history and preferences (including Dark Mode) are saved locally.
-   **Import/Export**: Download results as JSON to share or review later.

## 🚀 Getting Started

### Web Application

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Access at `http://localhost:5173`.

### CLI Tool (Exam Generator)

The CLI tool allows you to index your own knowledge base and generate exams.

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
    - `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (for images)
3.  **Index Knowledge Base:**
    Place your MD/HTML files in `cli/knowledge_base/` and run:
    ```bash
    python index_knowledge.py
    ```
4.  **Generate an Exam:**
    ```bash
    python exam_generator.py --name "Topic Name" --description "Short description" --questions 10
    ```

## 🛠️ Technology Stack

-   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4.
-   **AI Engine**: Google Gemini 3 Flash (Multimodal), LlamaIndex.
-   **Database**: ChromaDB (Vector Store).
-   **Storage**: Cloudflare R2 (for exam images).
-   **Math Rendering**: KaTeX.

---

<p align="center">
  <em>This entire project was vibe coded using the <a href="https://developers.google.com/gemini/cli">Gemini CLI</a>.</em>
</p>

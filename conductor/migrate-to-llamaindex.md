# Migration Plan: Hugging Face smolagents to LlamaIndex + ChromaDB (Multimodal RAG)

## Objective
Migrate the existing CLI exam generation system from `smolagents` to a LlamaIndex-based Multimodal RAG workflow using ChromaDB as the vector store. This will allow the system to reason over both text (HTML/Markdown) and images (technical diagrams, charts) in the knowledge base.

## Key Files & Context
- **Knowledge Base:** `cli/knowledge_base/` (recursive directories with HTML, Markdown, and WebP images).
- **Existing CLI:** `cli/exam_generator.py`, `cli/search.py`, `cli/utils.py`.
- **ChromaDB:** Running on `localhost:9000`.
- **Models:** 
  - LLM: `gemini-3-flash-preview`
  - Embeddings: `gemini-embedding-2-preview`
  - MultiModal LLM: `gemini-3-flash-preview`

## Implementation Steps

### Phase 1: Environment Setup
1. **Dependency Installation:**
   - Install the following packages in `cli/venv_pariksha`:
     ```bash
     pip install llama-index llama-index-llms-gemini llama-index-embeddings-google-genai llama-index-vector-stores-chroma chromadb llama-index-readers-file unstructured llama-index-multi-modal-llms-gemini
     ```

### Phase 2: Indexing Infrastructure
1. **Create Indexing Script (`cli/index_knowledge.py`):**
   - Connect to ChromaDB at `localhost:9000`.
   - Setup separate collections: `text_data` and `image_data`.
   - Initialize `GeminiEmbedding` and `Gemini` models.
   - Use `SimpleDirectoryReader` with `recursive=True` and `UnstructuredReader` for `.html` files.
   - **Checkpointing:**
     - Maintain `cli/index_checkpoint.json` to track processed files.
     - Catch 429 (Rate Limit) errors, save progress, and exit gracefully.
   - Create and persist `MultiModalVectorStoreIndex`.

### Phase 3: CLI Refactoring
1. **Update `cli/exam_generator.py`:**
   - Modify `ExamGeneratorAgent` to use LlamaIndex `QueryEngine`.
   - Connect to the indexed ChromaDB collections instead of initializing `smolagents`.
   - Update the system prompt to leverage retrieved context from the knowledge base.
   - Ensure the `generate_exam` method still returns a clean JSON array compatible with the Pariksha web app.

### Phase 4: Verification & Testing
1. **Sanity Check:**
   - Index a small subdirectory (e.g., `cli/knowledge_base/tifr2019/`).
   - Run a test query asking about a specific diagram to verify visual context.
2. **Full Indexing:**
   - Run the indexing script on the entire knowledge base.
   - Handle interruptions using the checkpointing mechanism.
3. **Integration Test:**
   - Generate a full exam and verify the JSON output format and question quality.

## Migration & Rollback
- Keep `cli/exam_generator.py` (backup as `cli/exam_generator_smol.py`) until the new system is verified.
- The knowledge base remains untouched; only the indexing and retrieval mechanism changes.

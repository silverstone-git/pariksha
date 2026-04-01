import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import chromadb

# LlamaIndex imports
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import Settings, VectorStoreIndex
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
CHROMA_HOST = "localhost"
CHROMA_PORT = 9000
GROUP = "pg_physics"

def test_retrieval(query: str):
    # Load env
    dotenv_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=dotenv_path)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment.")
        return

    # Setup Embedding
    # Using the same embed model as exam_generator.py defaults
    embed_model_name = "models/gemini-embedding-2-preview"
    logger.info(f"Using embed model: {embed_model_name}")
    Settings.embed_model = GoogleGenAIEmbedding(model_name=embed_model_name, api_key=api_key)

    # Load Index
    text_collection_name = "text_data"
    try:
        remote_db = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        remote_db.get_version()
        logger.info(f"Connected to ChromaDB server at {CHROMA_HOST}:{CHROMA_PORT}")
    except Exception:
        logger.warning(f"Could not connect to ChromaDB server at {CHROMA_HOST}:{CHROMA_PORT}. Falling back to local PersistentClient.")
        db_path = str(Path(__file__).parent / "chroma_db")
        remote_db = chromadb.PersistentClient(path=db_path)

    text_collection = remote_db.get_or_create_collection(name=text_collection_name)
    logger.info(f"Collection '{text_collection_name}' has {text_collection.count()} items.")

    text_store = ChromaVectorStore(chroma_collection=text_collection)
    index = VectorStoreIndex.from_vector_store(vector_store=text_store)

    retriever = index.as_retriever(similarity_top_k=3)
    logger.info(f"Retrieving nodes for query: '{query}'")
    nodes = retriever.retrieve(query)
    
    for i, node in enumerate(nodes):
        logger.info(f"\n--- Result {i+1} (Score: {node.score}) ---")
        logger.info(f"Source: {node.metadata.get('file_path', 'Unknown')}")
        logger.info(f"Content Preview: {node.get_text()[:200].replace(chr(10), ' ')}...")

if __name__ == "__main__":
    test_retrieval("vector calculus stokes theorem")

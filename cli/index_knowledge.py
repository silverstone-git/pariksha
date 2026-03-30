import os
import sys
import json
import logging
import hashlib
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
import chromadb
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext, SimpleDirectoryReader, Settings, VectorStoreIndex
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from llama_index.llms.google_genai import GoogleGenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
CHROMA_HOST = "localhost"
CHROMA_PORT = 9000

# Model names
LLM_MODEL = "models/gemini-3-flash-preview"
EMBED_MODEL = "models/gemini-embedding-2-preview"

def get_file_hash(file_path: Path) -> str:
    """Calculate MD5 hash of a file."""
    hasher = hashlib.md5()
    try:
        with open(file_path, 'rb') as f:
            buf = f.read(65536)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(65536)
        return hasher.hexdigest()
    except Exception as e:
        logger.error(f"Error hashing file {file_path}: {e}")
        return ""

def load_checkpoint(checkpoint_file: Path) -> Dict[str, str]:
    if checkpoint_file.exists():
        try:
            with open(checkpoint_file, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_checkpoint(checkpoint_file: Path, checkpoint: Dict[str, str]):
    with open(checkpoint_file, 'w') as f:
        json.dump(checkpoint, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Index knowledge base files into ChromaDB.")
    parser.add_argument("--group", type=str, default="pg_physics", help="Topic group name (e.g., pg_physics)")
    args = parser.parse_args()

    group = args.group
    KNOWLEDGE_BASE_DIR = Path(f"cli/{group}_knowledge_base")
    CHECKPOINT_FILE = Path(f"cli/{group}_index_checkpoint.json")
    TEXT_COLLECTION_NAME = f"text_data_{group}"

    if not KNOWLEDGE_BASE_DIR.exists():
        logger.warning(f"Knowledge base directory {KNOWLEDGE_BASE_DIR} does not exist. Creating it.")
        KNOWLEDGE_BASE_DIR.mkdir(parents=True, exist_ok=True)

    dotenv_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=dotenv_path)
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment.")
        return

    # Initialize Gemini models using modern SDK
    logger.info(f"Initializing Gemini models: {LLM_MODEL}, {EMBED_MODEL}")
    Settings.llm = GoogleGenAI(model_name=LLM_MODEL, api_key=api_key)
    Settings.embed_model = GoogleGenAIEmbedding(model_name=EMBED_MODEL, api_key=api_key)
    
    # Setup ChromaDB
    logger.info(f"Connecting to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}")
    remote_db = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    
    text_collection = remote_db.get_or_create_collection(TEXT_COLLECTION_NAME)
    text_store = ChromaVectorStore(chroma_collection=text_collection)
    
    storage_context = StorageContext.from_defaults(vector_store=text_store)

    # Load checkpoint
    checkpoint = load_checkpoint(CHECKPOINT_FILE)
    
    # Identify ONLY text files (MD, HTML)
    all_files = list(KNOWLEDGE_BASE_DIR.rglob("*"))
    files_to_index = []
    
    for file_path in all_files:
        if file_path.is_file() and file_path.suffix.lower() in ['.html', '.md']:
            file_rel_path = str(file_path.relative_to(KNOWLEDGE_BASE_DIR))
            file_hash = get_file_hash(file_path)
            
            if checkpoint.get(file_rel_path) != file_hash:
                files_to_index.append(file_path)

    if not files_to_index:
        logger.info(f"All text files in {group} are already indexed.")
        return

    logger.info(f"Found {len(files_to_index)} text files to index in {group}.")

    # Initialize index
    index = VectorStoreIndex.from_documents(
        [],
        storage_context=storage_context,
    )

    batch_size = 20 
    for i in range(0, len(files_to_index), batch_size):
        batch = files_to_index[i:i+batch_size]
        logger.info(f"Processing batch {i//batch_size + 1}/{(len(files_to_index)-1)//batch_size + 1} ({len(batch)} files)...")
        
        try:
            reader = SimpleDirectoryReader(input_files=[str(p) for p in batch])
            documents = reader.load_data()
            
            for doc in documents:
                index.insert(doc)
            
            for file_path in batch:
                file_rel_path = str(file_path.relative_to(KNOWLEDGE_BASE_DIR))
                checkpoint[file_rel_path] = get_file_hash(file_path)
            save_checkpoint(CHECKPOINT_FILE, checkpoint)
            logger.info(f"Batch {i//batch_size + 1} indexed successfully.")

        except Exception as e:
            logger.error(f"Error indexing batch: {e}")
            if "429" in str(e) or "ResourceExhausted" in str(e):
                return
            save_checkpoint(CHECKPOINT_FILE, checkpoint)

    logger.info("Indexing complete!")

if __name__ == "__main__":
    main()

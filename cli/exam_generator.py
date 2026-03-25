#!/usr/bin/env python3
"""
CLI Exam Generator Tool using LlamaIndex and ChromaDB (Text-led Multimodal RAG)
Uses modern google-genai SDK for high performance
"""

import os
import json
import argparse
import logging
import re
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass

import chromadb
import boto3
from botocore.config import Config
from dotenv import load_dotenv
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext, Settings, VectorStoreIndex
from llama_index.core.schema import ImageDocument
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from llama_index.llms.google_genai import GoogleGenAI

# Import utility functions
from utils import remove_bs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
CHROMA_HOST = "localhost"
CHROMA_PORT = 9000
TEXT_COLLECTION_NAME = "text_data"
KNOWLEDGE_BASE_DIR = Path("cli/knowledge_base")

class R2Uploader:
    """Helper to upload local images to Cloudflare R2"""
    def __init__(self):
        # Check root .env first
        dotenv_path = Path(__file__).parent.parent / ".env"
        if not dotenv_path.exists():
            dotenv_path = Path(__file__).parent / ".env"
        load_dotenv(dotenv_path=dotenv_path)

        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.bucket_name = os.getenv("R2_BUCKET_NAME")
        # Support both S3 and R2 prefixed keys
        self.access_key = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("S3_ACCESS_KEY_ID")
        self.secret_key = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("S3_SECRET_ACCESS_KEY")
        self.public_url = os.getenv("R2_PUBLIC_URL")

        if not all([self.account_id, self.bucket_name, self.access_key, self.secret_key]):
            logger.warning("R2 configuration incomplete. Check your .env file. Images will stay as local paths.")
            self.enabled = False
        else:
            self.enabled = True
            self.s3 = boto3.client(
                's3',
                endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=Config(signature_version='s3v4'),
                region_name='auto'
            )

    def upload(self, local_path: str) -> Optional[str]:
        if not self.enabled: return None
        
        path = Path(local_path)
        if not path.exists(): return None

        # Create a unique filename based on hash
        with open(path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        remote_name = f"pariksha/{file_hash}{path.suffix}"

        try:
            logger.info(f"Uploading {path.name} to R2 bucket {self.bucket_name}...")
            content_type = "image/webp" if path.suffix == ".webp" else "image/jpeg"
            if path.suffix == ".png": content_type = "image/png"
            
            self.s3.upload_file(
                str(path), 
                self.bucket_name, 
                remote_name,
                ExtraArgs={'ContentType': content_type}
            )
            
            if self.public_url:
                return f"{self.public_url.rstrip('/')}/{remote_name}"
            
            return remote_name
        except Exception as e:
            logger.error(f"R2 Upload failed: {e}")
            return None

@dataclass
class ExamConfig:
    """Configuration for exam generation"""
    name: str
    description: str
    num_questions: int = 10
    difficulty: str = "intermediate"
    model_name: str = "models/gemini-3-flash-preview"
    embed_model: str = "models/gemini-embedding-2-preview"
    api_key: Optional[str] = None
    output_path: Optional[str] = None

class ExamGeneratorAgent:
    """Agent for generating exams using LlamaIndex with modern Google GenAI"""

    def __init__(self, config: ExamConfig):
        self.config = config
        self._setup_llamaindex()
        self.index = self._load_index()
        self.uploader = R2Uploader()

    def _setup_llamaindex(self):
        """Initialize LlamaIndex settings and models"""
        dotenv_path = Path(__file__).parent / ".env"
        load_dotenv(dotenv_path=dotenv_path)

        api_key = self.config.api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment.")

        Settings.llm = GoogleGenAI(model_name=self.config.model_name, api_key=api_key)
        Settings.embed_model = GoogleGenAIEmbedding(model_name=self.config.embed_model, api_key=api_key)

    def _load_index(self):
        """Connect to ChromaDB and load the index"""
        remote_db = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        text_collection = remote_db.get_or_create_collection(TEXT_COLLECTION_NAME)
        text_store = ChromaVectorStore(chroma_collection=text_collection)
        return VectorStoreIndex.from_vector_store(vector_store=text_store)

    def _extract_image_paths(self, text: str, source_file_path: Optional[str] = None) -> List[str]:
        """Extract local image paths from Markdown or HTML syntax"""
        paths = []
        md_matches = re.findall(r'!\[.*?\]\((.*?)\)', text)
        paths.extend(md_matches)
        html_matches = re.findall(r'<img [^>]*src=["\']([^"\']+)["\']', text)
        paths.extend(html_matches)
        
        resolved_paths = []
        for p in paths:
            if p.startswith(('http://', 'https://', 'data:')): continue
            img_path = Path(p)
            
            if source_file_path:
                potential = Path(source_file_path).parent / img_path
                if potential.exists():
                    resolved_paths.append(str(potential))
                    continue
            
            potential = KNOWLEDGE_BASE_DIR / img_path
            if potential.exists():
                resolved_paths.append(str(potential))
                continue
                
            for found in KNOWLEDGE_BASE_DIR.rglob(img_path.name):
                resolved_paths.append(str(found))
                break
                
        return list(set(resolved_paths))

    def _resolve_to_absolute(self, path_str: str) -> Optional[str]:
        """Convert a path found in JSON to an absolute local path for uploading"""
        p = Path(path_str)
        if p.is_absolute() and p.exists(): return str(p)
        potential = KNOWLEDGE_BASE_DIR / p
        if potential.exists(): return str(potential)
        for found in KNOWLEDGE_BASE_DIR.rglob(p.name):
            return str(found)
        return None

    def generate_exam(self) -> List[Dict[str, Any]]:
        """Generate an exam by retrieving text and providing images to Gemini"""
        retriever = self.index.as_retriever(similarity_top_k=5)
        query_text = f"Exam Topic: {self.config.name}. Description: {self.config.description}"
        logger.info(f"Retrieving context for: {self.config.name}")
        nodes = retriever.retrieve(query_text)
        
        context_text = ""
        image_documents = []
        seen_images = set()
        
        for node in nodes:
            text = node.get_content()
            context_text += f"\n--- Source: {node.metadata.get('file_path', 'Unknown')} ---\n{text}\n"
            
            img_paths = self._extract_image_paths(text, node.metadata.get('file_path'))
            for p in img_paths:
                if p not in seen_images:
                    try:
                        image_documents.append(ImageDocument(image_path=p))
                        seen_images.add(p)
                        logger.info(f"Attached image context: {p}")
                    except Exception as e:
                        logger.warning(f"Could not load image {p}: {e}")

        system_prompt = f"""
You are an expert educational content creator.
Generate {self.config.num_questions} multiple-choice questions for: {self.config.name}
Description: {self.config.description}
Difficulty: {self.config.difficulty}

Use the provided text context and any attached images from the study materials.
Attached images are diagrams/charts. Refer to them if they are relevant!

STRICT RULES for JSON format:
1. "options" MUST be an array of objects with "label" (1-4) and "value" (string).
2. "answer_label" MUST be the integer label of the correct option (1, 2, 3, or 4).
3. "topic" should be a specific string.
4. Use LaTeX: $...$ for inline, $$...$$ for display.
5. IF you see a relevant diagram in the "ATTACHED IMAGES" context, you MUST use it for at least one question.
6. When using an image, add an "image_path" field with the filename ONLY (e.g., "diagram_01.webp"). The uploader will handle the rest.
7. Return ONLY a valid JSON array. No other text.

Example format:
[
  {{
    "question": "What is the value of $x$?",
    "options": [
      {{"label": 1, "value": "$x=1$"}},
      {{"label": 2, "value": "$x=2$"}},
      {{"label": 3, "value": "$x=3$"}},
      {{"label": 4, "value": "$x=4$"}}
    ],
    "answer_label": 2,
    "topic": "Math",
    "explanation": "Because...",
    "image_path": "path/to/img.webp"
  }}
]
"""
        full_prompt = f"""
{system_prompt}

### ATTACHED IMAGES (Context) ###
{[Path(img.image_path).name for img in image_documents]}

### RETRIEVED TEXT CONTEXT ###
{context_text}

Generate the complete exam JSON array now. Refer to the attached images by their filenames in the "image_path" field.
"""
        logger.info("Querying Google GenAI with context...")
        
        if image_documents:
            try:
                response = Settings.llm.multi_modal_complete(
                    prompt=full_prompt,
                    image_documents=image_documents
                )
            except AttributeError:
                response = Settings.llm.complete(full_prompt, image_documents=image_documents)
        else:
            response = Settings.llm.complete(full_prompt)
            
        result_text = str(response)

        logger.info("Parsing JSON response...")
        try:
            cleaned_json_str = remove_bs(result_text)
            final_answer_json = json.loads(cleaned_json_str)
            
            if isinstance(final_answer_json, list):
                for q in final_answer_json:
                    if "image_path" in q and q["image_path"]:
                        local_p = self._resolve_to_absolute(q["image_path"])
                        if local_p:
                            r2_url = self.uploader.upload(local_p)
                            if r2_url:
                                q["image_path"] = r2_url
                            else:
                                try:
                                    q["image_path"] = str(Path(local_p).relative_to(KNOWLEDGE_BASE_DIR))
                                except ValueError:
                                    q["image_path"] = Path(local_p).name
                return final_answer_json
            return [final_answer_json]
        except Exception as e:
            logger.error(f"Failed to parse JSON: {e}")
            raise ValueError(f"Invalid JSON: {e}")

def save_exam(exam_data: List[Dict[str, Any]], config: ExamConfig) -> Path:
    sample_exams_dir = Path("sample_exams")
    sample_exams_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{config.name} {timestamp}.json"
    output_path = sample_exams_dir / filename
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(exam_data, f, indent=2, ensure_ascii=False)
    return output_path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", "-n", required=True)
    parser.add_argument("--description", "-d", required=True)
    parser.add_argument("--questions", "-q", type=int, default=10)
    parser.add_argument("--difficulty", choices=["easy", "intermediate", "hard"], default="intermediate")
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()
    if args.verbose: logging.getLogger().setLevel(logging.DEBUG)

    try:
        config = ExamConfig(name=args.name, description=args.description, num_questions=args.questions, difficulty=args.difficulty)
        generator = ExamGeneratorAgent(config)
        exam_data = generator.generate_exam()
        output_path = save_exam(exam_data, config)
        print(f"\n🎉 Success!\n📁 Location: {output_path.absolute()}")
    except Exception as e:
        logger.error(f"Error: {e}")
        return 1
    return 0

if __name__ == "__main__":
    exit(main())

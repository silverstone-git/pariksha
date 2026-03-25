import os
import sys
import json
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

API_BASE_URL = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip('/')
ADMIN_SECRET = os.getenv("PARIKSHA_ADMIN_SECRET")
if ADMIN_SECRET:
    ADMIN_SECRET = ADMIN_SECRET.strip(' "\'')

BANK_DIR = Path(__file__).parent / "question_bank"

def main():
    if not ADMIN_SECRET:
        logger.error("PARIKSHA_ADMIN_SECRET not found in .env. Exiting.")
        sys.exit(1)

    if not BANK_DIR.exists():
        logger.error(f"Directory {BANK_DIR} does not exist.")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {ADMIN_SECRET}",
        "Content-Type": "application/json"
    }

    files_uploaded = 0
    total_files = 0

    for json_file in BANK_DIR.glob("*.json"):
        total_files += 1
        slug = json_file.stem  # Get filename without extension (e.g., 'quantum_mechanics')
        
        with open(json_file, 'r', encoding='utf-8') as f:
            try:
                questions = json.load(f)
            except Exception as e:
                logger.error(f"Failed to parse {json_file.name}: {e}")
                continue
        
        if not isinstance(questions, list) or len(questions) == 0:
            logger.warning(f"Skipping {json_file.name}: not a JSON list or is empty.")
            continue

        # Sanitize data to match the expected schema
        upload_data = []
        
        # Helper to process a single question dictionary
        def process_question(q_dict):
            upload_data.append({
                "type": q_dict.get("type", "MCQ"),
                "question": q_dict.get("question"),
                "options": q_dict.get("options"),
                "answer_label": q_dict.get("answer_label"),
                "answer_labels": q_dict.get("answer_labels"),
                "answer_range": q_dict.get("answer_range"),
                "answer_value": q_dict.get("answer_value"),
                "explanation": q_dict.get("explanation"),
                "image_path": q_dict.get("image_path")
            })

        for q in questions:
            if isinstance(q, dict):
                process_question(q)
            elif isinstance(q, list):
                # Handle accidentally nested lists
                for inner_q in q:
                    if isinstance(inner_q, dict):
                        process_question(inner_q)
        
        url = f"{API_BASE_URL}/api/question_bank/topics/{slug}"
        logger.info(f"Uploading {len(upload_data)} questions for topic '{slug}' to {url}...")
        
        try:
            response = requests.post(url, headers=headers, json=upload_data)
            if response.ok:
                logger.info(f"✅ Success for '{slug}': {response.json()}")
                files_uploaded += 1
            else:
                logger.error(f"❌ Failed for '{slug}' (Status {response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"Network error while uploading '{slug}': {e}")

    logger.info(f"Upload complete. Processed {files_uploaded} out of {total_files} files successfully.")

if __name__ == "__main__":
    main()

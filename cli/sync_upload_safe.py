import os
import sys
import json
import logging
import requests
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger(__name__)

# Load environment variables from cli/.env and root .env.development if present
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

root_env_dev = Path(__file__).parent.parent / ".env.development"
if root_env_dev.exists():
    load_dotenv(dotenv_path=root_env_dev, override=True)

API_BASE_URL = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip('/')
ADMIN_SECRET = os.getenv("PARIKSHA_ADMIN_SECRET")
if ADMIN_SECRET:
    ADMIN_SECRET = ADMIN_SECRET.strip(' "\'')

def upload_topic_file(json_file: Path, headers: dict) -> bool:
    slug = json_file.stem  # e.g. 'quantum_mechanics'
    with open(json_file, 'r', encoding='utf-8') as f:
        try:
            questions = json.load(f)
        except Exception as e:
            logger.error(f"Failed to parse {json_file.name}: {e}")
            return False
    
    if not isinstance(questions, list) or len(questions) == 0:
        logger.warning(f"Skipping {json_file.name}: not a JSON list or is empty.")
        return False

    upload_data = []

    def process_question(q_dict):
        upload_data.append({
            "type": q_dict.get("type", "MCQ"),
            "question": q_dict.get("question"),
            "options": q_dict.get("options"),
            "answer_label": q_dict.get("answer_label"),
            "answer_labels": q_dict.get("answer_labels"),
            "explanation": q_dict.get("explanation"),
            "image_path": q_dict.get("image_path")
        })

    if isinstance(questions, list):
        for q in questions:
            if isinstance(q, dict):
                process_question(q)
            elif isinstance(q, list):
                for inner_q in q:
                    if isinstance(inner_q, dict):
                        process_question(inner_q)

    local_count = len(upload_data)
    url = f"{API_BASE_URL}/api/question_bank/topics/{slug}"
    logger.info(f"Uploading {local_count} questions for topic '{slug}' to {url} (PATCH)...")

    try:
        response = requests.patch(url, headers=headers, json=upload_data)
        if response.ok:
            result = response.json()
            cloud_total = result.get("total", local_count)
            logger.info(f"✅ Success for '{slug}': {result}")

            # If cloud total differs from local count, the cloud deduped some questions.
            # Fetch the canonical cloud list and overwrite local to stay in sync.
            if cloud_total != local_count:
                logger.info(
                    f"⚠️  Local had {local_count} questions but cloud has {cloud_total}. "
                    f"Fetching canonical cloud list to reconcile local file..."
                )
                try:
                    fetch_url = f"{API_BASE_URL}/api/question_bank/sample?topic={slug}&count=1000"
                    fetch_resp = requests.get(fetch_url, headers=headers)
                    if fetch_resp.ok:
                        cloud_questions = fetch_resp.json()
                        if isinstance(cloud_questions, list) and len(cloud_questions) == cloud_total:
                            with open(json_file, 'w', encoding='utf-8') as out:
                                json.dump(cloud_questions, out, indent=2, ensure_ascii=False)
                            logger.info(
                                f"✅ Local file overwritten with {cloud_total} canonical cloud questions. "
                                f"Removed {local_count - cloud_total} ghost duplicate(s)."
                            )
                        else:
                            logger.warning(f"Cloud returned unexpected count/format for '{slug}' (got {len(cloud_questions) if isinstance(cloud_questions, list) else 'non-list'}, expected {cloud_total}), skipping local overwrite.")
                    else:
                        logger.warning(f"Could not fetch canonical cloud list for '{slug}' (status {fetch_resp.status_code}).")
                except Exception as fetch_err:
                    logger.warning(f"Failed to fetch canonical cloud list for '{slug}': {fetch_err}")

            return True
        else:
            logger.error(f"❌ Failed for '{slug}' (Status {response.status_code}): {response.text}")
            return False
    except Exception as e:
        logger.error(f"Network error while uploading '{slug}': {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Upload local question bank to API.")
    parser.add_argument("--group", type=str, default="pg_physics", help="The topic group (e.g., pg_physics)")
    parser.add_argument("--topic", type=str, help="Specific topic slug to upload (optional, defaults to all)")
    args = parser.parse_args()

    if not ADMIN_SECRET:
        logger.error("PARIKSHA_ADMIN_SECRET not found in environment. Exiting.")
        sys.exit(1)

    bank_dir = Path(__file__).parent / f"{args.group}_question_bank"
    if not bank_dir.exists():
        logger.error(f"Directory {bank_dir} does not exist.")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {ADMIN_SECRET}",
        "Content-Type": "application/json"
    }

    if args.topic and args.topic != '__all__':
        target_file = bank_dir / f"{args.topic}.json"
        if not target_file.exists():
            logger.error(f"Topic file not found: {target_file}")
            sys.exit(1)
        success = upload_topic_file(target_file, headers)
        sys.exit(0 if success else 1)

    files_uploaded = 0
    total_files = 0

    for json_file in sorted(bank_dir.glob("*.json")):
        total_files += 1
        if upload_topic_file(json_file, headers):
            files_uploaded += 1

    logger.info(f"Upload complete. Processed {files_uploaded} out of {total_files} files successfully.")

if __name__ == "__main__":
    main()

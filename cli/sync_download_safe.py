#!/usr/bin/env python3
import os
import sys
import json
import logging
import requests
import argparse
import hashlib
from pathlib import Path
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Prioritize VITE_API_BASE_URL from the root .env.development if it exists
root_env_dev = Path(__file__).parent.parent / ".env.development"
if root_env_dev.exists():
    load_dotenv(dotenv_path=root_env_dev, override=True)

API_BASE_URL = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip('/')

def get_question_hash(q):
    """Create a stable hash for a question."""
    # Use question text + options sorted
    content = f"{q.get('question', '')}{json.dumps(q.get('options', []), sort_keys=True)}"
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def fetch_remote(slug):
    # Uses the sample endpoint to get a snapshot of current remote questions
    url = f"{API_BASE_URL}/api/question_bank/sample?topic={slug}&count=1000"
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return []
        else:
            logger.error(f"Failed to fetch remote: {resp.status_code} {resp.text}")
            return []
    except Exception as e:
        logger.error(f"Network error fetching remote: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Additive sync from cloud to local.")
    parser.add_argument("--topic", required=True, help="Topic slug")
    parser.add_argument("--group", default="pg_physics", help="Topic group")
    args = parser.parse_args()

    # 1. Fetch Remote
    remote_questions = fetch_remote(args.topic)
    if not remote_questions:
        logger.info("No remote questions found or fetch failed. Skipping sync.")
        return

    # 2. Load Local
    bank_dir = Path(__file__).parent / f"{args.group}_question_bank"
    local_file = bank_dir / f"{args.topic}.json"
    
    local_questions = []
    if local_file.exists():
        with open(local_file, 'r', encoding='utf-8') as f:
            try:
                local_questions = json.load(f)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode {local_file}")
                sys.exit(1)
    
    # 3. Deduplicate / Merge
    # Create a set of hashes from local questions
    local_hashes = {get_question_hash(q) for q in local_questions}
    
    # Identify new questions from remote
    new_questions = []
    for q in remote_questions:
        if get_question_hash(q) not in local_hashes:
            new_questions.append(q)
            # Add to set to prevent duplicates if remote itself has them
            local_hashes.add(get_question_hash(q))
            
    # 4. Save
    if new_questions:
        local_questions.extend(new_questions)
        with open(local_file, 'w', encoding='utf-8') as f:
            json.dump(local_questions, f, indent=2)
        logger.info(f"Successfully added {len(new_questions)} new questions from cloud to local.")
    else:
        logger.info("Local bank is already up to date.")

if __name__ == "__main__":
    main()

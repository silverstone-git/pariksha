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
ADMIN_SECRET = os.getenv("PARIKSHA_ADMIN_SECRET")
if ADMIN_SECRET:
    ADMIN_SECRET = ADMIN_SECRET.strip(' "\'')

def get_question_hash(q):
    """Create a stable hash for a question."""
    # Use question text + options sorted
    content = f"{q.get('question', '')}{json.dumps(q.get('options', []), sort_keys=True)}"
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def fetch_remote(slug):
    url = f"{API_BASE_URL}/api/question_bank/sample?topic={slug}&count=1000"
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return []
        else:
            logger.error(f"Failed to fetch remote: {resp.status_code} {resp.text}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Network error fetching remote: {e}")
        sys.exit(1)

def delete_remote(slug, headers):
    url = f"{API_BASE_URL}/api/question_bank/topics/{slug}"
    try:
        resp = requests.delete(url, headers=headers)
        if not resp.ok:
            logger.error(f"Failed to delete remote: {resp.status_code} {resp.text}")
            sys.exit(1)
        logger.info(f"Successfully deleted remote topic: {slug}")
    except Exception as e:
        logger.error(f"Network error deleting remote: {e}")
        sys.exit(1)

def upload_questions(slug, questions, headers):
    url = f"{API_BASE_URL}/api/question_bank/topics/{slug}"
    try:
        resp = requests.post(url, headers=headers, json=questions)
        if not resp.ok:
            logger.error(f"Failed to upload questions: {resp.status_code} {resp.text}")
            sys.exit(1)
        logger.info(f"Successfully uploaded {len(questions)} unique questions to {slug}")
    except Exception as e:
        logger.error(f"Network error uploading questions: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Surgical sync for question bank.")
    parser.add_argument("--topic", required=True, help="Topic slug (e.g., analog_electronics)")
    parser.add_argument("--group", default="pg_physics", help="Topic group")
    args = parser.parse_args()

    if not ADMIN_SECRET:
        logger.error("PARIKSHA_ADMIN_SECRET missing.")
        sys.exit(1)

    headers = {"Authorization": f"Bearer {ADMIN_SECRET}", "Content-Type": "application/json"}
    
    # 1. Pull
    remote_questions = fetch_remote(args.topic)
    
    # 2. Snapshot
    local_file = Path(__file__).parent / f"{args.group}_question_bank" / f"{args.topic}.json"
    if not local_file.exists():
        logger.error(f"Local file not found: {local_file}")
        sys.exit(1)
        
    with open(local_file, 'r', encoding='utf-8') as f:
        local_questions = json.load(f)
        
    # 3. Deduplicate
    all_qs = remote_questions + local_questions
    unique_qs = {}
    for q in all_qs:
        q_hash = get_question_hash(q)
        unique_qs[q_hash] = q
        
    merged_list = list(unique_qs.values())
    logger.info(f"Original: {len(remote_questions)} remote + {len(local_questions)} local. Unique: {len(merged_list)}")
    
    # 4. Wipe
    delete_remote(args.topic, headers)
    
    # 5. Push
    upload_questions(args.topic, merged_list, headers)

if __name__ == "__main__":
    main()

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
    content = f"{q.get('question', '')}{json.dumps(q.get('options', []), sort_keys=True)}"
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def fetch_remote(slug):
    url = f"{API_BASE_URL}/api/question_bank/sample?topic={slug}&count=1000"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return []
        else:
            logger.error(f"Failed to fetch remote for '{slug}': {resp.status_code} {resp.text}")
            return []
    except Exception as e:
        logger.error(f"Network error fetching remote for '{slug}': {e}")
        return []

def sync_topic(slug: str, group: str) -> bool:
    remote_questions = fetch_remote(slug)
    if not remote_questions:
        logger.info(f"[{slug}] No remote questions found or fetch failed. Skipping sync.")
        return False

    bank_dir = Path(__file__).parent / f"{group}_question_bank"
    bank_dir.mkdir(parents=True, exist_ok=True)
    local_file = bank_dir / f"{slug}.json"

    local_questions = []
    if local_file.exists():
        with open(local_file, 'r', encoding='utf-8') as f:
            try:
                local_questions = json.load(f)
            except json.JSONDecodeError:
                logger.error(f"Failed to decode {local_file}")
                return False

    local_hashes = {get_question_hash(q) for q in local_questions}
    new_questions = []
    for q in remote_questions:
        h = get_question_hash(q)
        if h not in local_hashes:
            new_questions.append(q)
            local_hashes.add(h)

    if new_questions:
        local_questions.extend(new_questions)
        with open(local_file, 'w', encoding='utf-8') as f:
            json.dump(local_questions, f, indent=2, ensure_ascii=False)
        logger.info(f"[{slug}] ✅ Successfully added {len(new_questions)} new questions from cloud. Total local: {len(local_questions)}")
        return True
    else:
        logger.info(f"[{slug}] ⚡ Local bank is already up to date ({len(local_questions)} questions).")
        return True

def get_topics_for_group(group: str) -> list:
    topics_file = f"{group}_question_bank_topics.txt"
    plan_path = Path(__file__).parent.parent / topics_file
    if not plan_path.exists():
        plan_path = Path(__file__).parent / topics_file
    if not plan_path.exists():
        return []
    with open(plan_path, 'r', encoding='utf-8') as f:
        return [
            line.strip().replace("* ", "").replace(" ", "_").lower()
            for line in f if line.strip() and not line.strip().startswith("#")
        ]

def main():
    parser = argparse.ArgumentParser(description="Additive sync from cloud to local.")
    parser.add_argument("--topic", help="Topic slug (or '__all__' / omit if --all is set)")
    parser.add_argument("--group", default="pg_physics", help="Topic group")
    parser.add_argument("--all", action="store_true", help="Sync all topics in the group")
    args = parser.parse_args()

    if args.all or args.topic == '__all__' or not args.topic:
        topics = get_topics_for_group(args.group)
        if not topics:
            bank_dir = Path(__file__).parent / f"{args.group}_question_bank"
            topics = [f.stem for f in bank_dir.glob("*.json")]
        
        logger.info(f"Starting additive download sync for {len(topics)} topics in group '{args.group}'...")
        count_updated = 0
        for t in topics:
            if sync_topic(t, args.group):
                count_updated += 1
        logger.info(f"Additive download sync complete. Processed {count_updated}/{len(topics)} topics.")
    else:
        sync_topic(args.topic, args.group)

if __name__ == "__main__":
    main()

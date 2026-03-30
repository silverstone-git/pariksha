#!/usr/bin/env python3
"""
Incremental Question Bank Generator
Generates questions for each topic while ensuring no repetition and increasing depth.
"""

import os
import sys
import json
import logging
import argparse
import requests
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
from exam_generator import ExamGeneratorAgent, ExamConfig

# Load environment variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Prioritize VITE_API_BASE_URL from the root .env.development if it exists
root_env_dev = Path(__file__).parent.parent / ".env.development"
if root_env_dev.exists():
    load_dotenv(dotenv_path=root_env_dev, override=True)

# Configure logging to also output immediately
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger(__name__)

# API Configuration
API_BASE_URL = os.getenv("VITE_API_BASE_URL", "https://outsie.aryan.cfd").rstrip('/')
ADMIN_SECRET = os.getenv("PARIKSHA_ADMIN_SECRET")

def get_bank_dir(group: str) -> Path:
    bank_dir = Path(__file__).parent / f"{group}_question_bank"
    bank_dir.mkdir(parents=True, exist_ok=True)
    return bank_dir

def upload_to_question_bank(topic_slug: str, questions: List[Dict[str, Any]]):
    """Uploads newly generated questions to the centralized question bank API."""
    if not ADMIN_SECRET:
        logger.warning("PARIKSHA_ADMIN_SECRET not found. Skipping API upload.")
        return

    url = f"{API_BASE_URL}/api/question_bank/topics/{topic_slug}"
    headers = {
        "Authorization": f"Bearer {ADMIN_SECRET}",
        "Content-Type": "application/json"
    }
    
    # Strip unnecessary fields for upload (like id and topic which server handles)
    upload_data = []
    for q in questions:
        upload_data.append({
            "type": q.get("type", "MCQ"),
            "question": q.get("question"),
            "options": q.get("options"),
            "answer_label": q.get("answer_label"),
            "answer_labels": q.get("answer_labels"),
            "answer_range": q.get("answer_range"),
            "answer_value": str(q.get("answer_value")) if q.get("answer_value") is not None else None,
            "explanation": q.get("explanation"),
            "image_path": q.get("image_path")
        })

    try:
        logger.info(f"Uploading {len(upload_data)} questions to {url}...")
        response = requests.post(url, headers=headers, json=upload_data)
        if response.ok:
            logger.info(f"API Upload Successful: {response.json()}")
        else:
            logger.error(f"API Upload Failed ({response.status_code}): {response.text}")
    except Exception as e:
        logger.error(f"Network error during API upload: {e}")

def get_existing_questions(topic: str, group: str) -> List[Dict[str, Any]]:
    topic_file = get_bank_dir(group) / f"{topic.replace(' ', '_').lower()}.json"
    if topic_file.exists():
        with open(topic_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_topic_questions(topic: str, group: str, questions: List[Dict[str, Any]]):
    topic_file = get_bank_dir(group) / f"{topic.replace(' ', '_').lower()}.json"
    with open(topic_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

def generate_for_topic(topic: str, group: str, count: int = 20, difficulty: str = "intermediate"):
    existing = get_existing_questions(topic, group)
    existing_concepts = [q.get('question', '')[:100] for q in existing]
    
    logger.info(f"Generating {count} new questions for '{topic}' (Group: {group}). Existing: {len(existing)}")
    
    depth_prompt = f"""
    You are an expert Professor generating an advanced question bank for the topic: "{topic}".
    
    CRITICAL INSTRUCTIONS:
    1. DO NOT repeat concepts covered in these existing questions: {json.dumps(existing_concepts)}
    2. TARGET DIFFICULTY: {difficulty}. Adjust theoretical depth and complexity accordingly.
    3. FOCUS: Include applications, theoretical derivations, and conceptual edge cases.
    4. VARIETY: Ensure a mix of MCQ (Multiple Choice), MSQ (Multiple Select), and NAT (Numerical Answer) questions.
    5. FORMAT: Return a JSON array of question objects respecting the strict format rules (type, options, answer_label/answer_labels/answer_range, etc.).
    """
    
    # If the user asks for a specific difficulty, use it. Otherwise auto-scale based on existing count.
    applied_diff = difficulty if difficulty else ("hard" if len(existing) > 0 else "intermediate")

    config = ExamConfig(
        name=f"{topic} Bank Expansion",
        description=depth_prompt,
        num_questions=count,
        difficulty=applied_diff,
        group=group
    )
    
    generator = ExamGeneratorAgent(config)
    try:
        new_questions = generator.generate_exam()
        
        # Upload new questions to API before merging with existing local list
        slug = topic.replace(' ', '_').lower()
        upload_to_question_bank(slug, new_questions)

        all_questions = existing + new_questions
        save_topic_questions(topic, group, all_questions)
        logger.info(f"Successfully added {len(new_questions)} questions to '{topic}'. Total: {len(all_questions)}")
    except Exception as e:
        logger.error(f"Failed to generate for '{topic}': {e}")

def main():
    global API_BASE_URL
    parser = argparse.ArgumentParser(description="Generate Questions for the Bank.")
    parser.add_argument("--topic", type=str, help="Specific topic to generate questions for")
    parser.add_argument("--count", type=int, default=20, help="Number of questions to generate")
    parser.add_argument("--difficulty", type=str, default="intermediate", help="Difficulty level (basic, intermediate, hard)")
    parser.add_argument("--all", action="store_true", help="Run for all topics in the plan file")
    parser.add_argument("--local-api", action="store_true", help="Use http://localhost:8671 instead of the default actual API")
    parser.add_argument("--group", type=str, default="pg_physics", help="The topic group (e.g., pg_physics)")
    
    args = parser.parse_args()

    if args.local_api:
        API_BASE_URL = "http://localhost:8671"
        logger.info(f"Using local API at: {API_BASE_URL}")

    if args.topic:
        generate_for_topic(args.topic, args.group, args.count, args.difficulty)
    elif args.all:
        TOPICS_FILE = f"{args.group}_question_bank_topics.txt"
        # Move up one directory to read the plan file correctly if run from cli dir
        plan_path = Path(__file__).parent.parent / TOPICS_FILE
        if not plan_path.exists():
            plan_path = Path(__file__).parent / TOPICS_FILE # Try local
            
        if not plan_path.exists():
            logger.error(f"{TOPICS_FILE} not found!")
            return

        with open(plan_path, 'r') as f:
            topics = [line.strip().replace("* ", "") for line in f if line.strip() and not line.strip().startswith("#")]

        for t in topics:
            generate_for_topic(t, args.group, args.count, args.difficulty)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

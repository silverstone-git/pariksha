#!/usr/bin/env python3
"""
Incremental Physics Question Bank Generator
Generates questions for each topic while ensuring no repetition and increasing depth.

ACCEPTED TOPIC FORMAT (DO NOT DELETE THIS COMMENT):
- Each topic must be on a new line in 'physics_question_bank_plan.txt'.
- Format: "Topic Name" or "Topic Name (Subtopic)".
- Example: "Quantum Mechanics", "Classical Mechanics (Lagrangian)".
- Case-insensitive, but proper casing is preferred for display.
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import List, Dict, Any
from exam_generator import ExamGeneratorAgent, ExamConfig

# Configure logging to also output immediately
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', stream=sys.stdout)
logger = logging.getLogger(__name__)

TOPICS_FILE = "physics_question_bank_plan.txt"
BANK_DIR = Path(__file__).parent / "question_bank"
BANK_DIR.mkdir(parents=True, exist_ok=True)

def get_existing_questions(topic: str) -> List[Dict[str, Any]]:
    topic_file = BANK_DIR / f"{topic.replace(' ', '_').lower()}.json"
    if topic_file.exists():
        with open(topic_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_topic_questions(topic: str, questions: List[Dict[str, Any]]):
    topic_file = BANK_DIR / f"{topic.replace(' ', '_').lower()}.json"
    with open(topic_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)

def generate_for_topic(topic: str, count: int = 20, difficulty: str = "intermediate"):
    existing = get_existing_questions(topic)
    existing_concepts = [q.get('question', '')[:100] for q in existing]
    
    logger.info(f"Generating {count} new questions for '{topic}'. Existing: {len(existing)}")
    
    depth_prompt = f"""
    You are a Physics Professor generating an advanced question bank for the topic: "{topic}".
    
    CRITICAL INSTRUCTIONS:
    1. DO NOT repeat concepts covered in these existing questions: {json.dumps(existing_concepts)}
    2. TARGET DIFFICULTY: {difficulty}. Adjust theoretical depth and numerical complexity accordingly.
    3. FOCUS: Include numerical applications, theoretical derivations, and conceptual edge cases.
    4. VARIETY: Ensure a mix of MCQs and multiple-select style questions (but formatted as MCQs).
    5. FORMAT: Return a JSON array of question objects.
    """
    
    # If the user asks for a specific difficulty, use it. Otherwise auto-scale based on existing count.
    applied_diff = difficulty if difficulty else ("hard" if len(existing) > 0 else "intermediate")

    config = ExamConfig(
        name=f"{topic} Bank Expansion",
        description=depth_prompt,
        num_questions=count,
        difficulty=applied_diff
    )
    
    generator = ExamGeneratorAgent(config)
    try:
        new_questions = generator.generate_exam()
        all_questions = existing + new_questions
        save_topic_questions(topic, all_questions)
        logger.info(f"Successfully added {len(new_questions)} questions to '{topic}'. Total: {len(all_questions)}")
    except Exception as e:
        logger.error(f"Failed to generate for '{topic}': {e}")

def main():
    parser = argparse.ArgumentParser(description="Generate Physics Questions for the Bank.")
    parser.add_argument("--topic", type=str, help="Specific topic to generate questions for")
    parser.add_argument("--count", type=int, default=20, help="Number of questions to generate")
    parser.add_argument("--difficulty", type=str, default="intermediate", help="Difficulty level (basic, intermediate, hard)")
    parser.add_argument("--all", action="store_true", help="Run for all topics in the plan file")
    
    args = parser.parse_args()

    if args.topic:
        generate_for_topic(args.topic, args.count, args.difficulty)
    elif args.all:
        # Move up one directory to read the plan file correctly if run from cli dir
        plan_path = Path(__file__).parent.parent / TOPICS_FILE
        if not plan_path.exists():
            plan_path = Path(TOPICS_FILE) # Try local
            
        if not plan_path.exists():
            logger.error(f"{TOPICS_FILE} not found!")
            return

        with open(plan_path, 'r') as f:
            topics = [line.strip().replace("* ", "") for line in f if line.strip() and line.strip().startswith("* ")]

        for t in topics:
            generate_for_topic(t, args.count, args.difficulty)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Simple Exam Generator using direct Gemini API
Avoids Smolagents compatibility issues
"""

import os
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path
import google.generativeai as genai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def generate_exam_direct(name: str, description: str, num_questions: int = 10) -> dict:
    """Generate exam using direct Gemini API"""

    # Configure Gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)

    # Use Gemini 2.0 Flash (stable version)
    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = f"""Create a comprehensive exam on: {name}

Description: {description}

Generate {num_questions} multiple choice questions at intermediate difficulty level.

Requirements:
- Each question must have exactly 4 options
- Use LaTeX notation for mathematical expressions: $...$ for inline
- Include detailed explanations for each answer
- Categorize questions by topic/subtopic
- Ensure questions test understanding, not just memorization

Format the output as a JSON array with this exact structure:
[
  {{
    "question": "Question text with $LaTeX$ support",
    "options": [
      {{"label": 1, "value": "First option"}},
      {{"label": 2, "value": "Second option"}},
      {{"label": 3, "value": "Third option"}},
      {{"label": 4, "value": "Fourth option"}}
    ],
    "answer_label": 2,
    "topic": "Subject - Subtopic",
    "explanation": "Detailed explanation of the correct answer"
  }}
]

Return only the JSON array, no additional text."""

    logger.info(f"Generating {num_questions} questions for: {name}")

    try:
        response = model.generate_content(prompt)

        # Parse the response
        try:
            # Try to extract JSON from response
            content = response.text.strip()

            # Look for JSON array
            start = content.find('[')
            end = content.rfind(']') + 1

            if start != -1 and end != 0:
                json_str = content[start:end]

                # Clean the JSON string - remove control characters
                json_str = ''.join(char for char in json_str if ord(char) >= 32 or char in '\n\r\t')

                questions = json.loads(json_str)

                # Add IDs to questions
                for i, q in enumerate(questions, 1):
                    q['id'] = f"q-{i}"

                logger.info(f"Successfully generated {len(questions)} questions")
                return questions
            else:
                raise ValueError("No JSON array found in response")

        except Exception as e:
            logger.error(f"Failed to parse response: {e}")
            # Don't log the full response to avoid spam
            logger.error(f"Response preview: {response.text[:200]}...")
            raise

    except Exception as e:
        logger.error(f"Failed to generate content: {e}")
        raise

def save_exam(questions: list, name: str, description: str, model_used: str) -> Path:
    """Save exam to JSON file"""

    # Create sample_exams directory
    sample_exams_dir = Path("sample_exams")
    sample_exams_dir.mkdir(exist_ok=True)

    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{name.lower().replace(' ', '_')}_{timestamp}.json"
    filepath = sample_exams_dir / filename

    # Create exam structure
    exam = {
        "metadata": {
            "name": name,
            "description": description,
            "generated_at": datetime.now().isoformat(),
            "model_used": model_used,
            "total_questions": len(questions)
        },
        "questions": questions
    }

    # Save to file
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(exam, f, indent=2, ensure_ascii=False)

    return filepath

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="Generate exam questions using Gemini API directly",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate a basic exam
  python simple_exam_generator.py --name "Physics Quiz" --description "Basic physics concepts"

  # Generate with specific number of questions
  python simple_exam_generator.py --name "Calculus" --description "Integration techniques" --questions 20
        """
    )

    parser.add_argument(
        "--name", "-n",
        required=True,
        help="Name of the exam"
    )
    parser.add_argument(
        "--description", "-d",
        required=True,
        help="Description of the exam content"
    )
    parser.add_argument(
        "--questions", "-q",
        type=int,
        default=10,
        help="Number of questions to generate (default: 10)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        # Generate exam
        questions = generate_exam_direct(
            name=args.name,
            description=args.description,
            num_questions=args.questions
        )

        # Save exam
        output_path = save_exam(
            questions=questions,
            name=args.name,
            description=args.description,
            model_used="gemini-2.0-flash"
        )

        print(f"\n🎉 Exam '{args.name}' generated successfully!")
        print(f"📁 Location: {output_path.absolute()}")
        print(f"📊 Questions: {len(questions)}")

        # Preview first question
        if questions:
            print(f"\n🔍 Preview of first question:")
            first_q = questions[0]
            print(f"   Q: {first_q.get('question', 'N/A')[:100]}...")
            print(f"   Topic: {first_q.get('topic', 'N/A')}")

    except Exception as e:
        logger.error(f"Failed to generate exam: {e}")
        print(f"\n❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
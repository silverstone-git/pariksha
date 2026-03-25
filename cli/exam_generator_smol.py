#!/usr/bin/env python3
"""
CLI Exam Generator Tool using Hugging Face Smolagents
Generates exam questions in Pariksha format using AI and web search
"""

import os
import json
import argparse
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass

from smolagents import ToolCallingAgent, InferenceClientModel, LiteLLMModel, OpenAIServerModel, GradioUI
from smolagents import tool
from smolagents.default_tools import VisitWebpageTool

# Import the existing search tool
from search import brave_search_tool
# Import utility functions
from utils import remove_bs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ExamConfig:
    """Configuration for exam generation"""
    name: str
    description: str
    num_questions: int = 10
    difficulty: str = "intermediate"
    model_name: str = "gemini-3-flash-preview"
    api_key: Optional[str] = None
    output_path: Optional[str] = None

# Model configurations
MODEL_CONFIGS = {
    "gemini-3-pro-preview": {
        "provider": "gemini",
        "model_id": "gemini-3-pro-preview",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY"
    },
    "gemini-3-flash-preview": {
        "provider": "gemini",
        "model_id": "gemini-3-flash-preview",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY"
    },
    "gemini-2.5-flash": {
        "provider": "gemini",
        "model_id": "gemini-2.5-flash",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY"
    },
    "gemini-2.5-pro": {
        "provider": "gemini",
        "model_id": "gemini-2.5-pro",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY"
    },
    "gemini-2.0-pro": {
        "provider": "gemini",
        "model_id": "gemini-2.0-pro",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env_key": "GEMINI_API_KEY"
    },
    "gpt-4o-mini": {
        "provider": "openai",
        "model_id": "gpt-4o-mini",
        "env_key": "OPENAI_API_KEY"
    },
    "gpt-4o": {
        "provider": "openai",
        "model_id": "gpt-4o",
        "env_key": "OPENAI_API_KEY"
    },
    "claude-3-haiku": {
        "provider": "anthropic",
        "model_id": "claude-3-haiku",
        "env_key": "ANTHROPIC_API_KEY"
    },
    "hf-deepseek": {
        "provider": "huggingface",
        "model_id": "deepseek-ai/DeepSeek-V3.2",
        "env_key": "HF_TOKEN"
    }
}

# Custom tool for validating and structuring questions
@tool
def structure_exam_questions(
    questions_data: List[Dict[str, Any]],
    exam_name: str,
    difficulty: str
) -> str:
    """
    Validate and structure exam questions according to Pariksha format.

    Args:
        questions_data: Raw questions data from the model
        exam_name: Name of the exam
        difficulty: Difficulty level

    Returns:
        str: JSON string with properly formatted questions
    """
    formatted_questions = []

    for i, q in enumerate(questions_data, 1):
        # Ensure all required fields are present
        question = {
            "question": q.get("question", ""),
            "options": [],
            "answer_label": q.get("answer_label", 1),
            "topic": q.get("topic", exam_name),
            "explanation": q.get("explanation", ""),
            "id": f"q-{i}"
        }

        # Format options properly
        options = q.get("options", [])
        if isinstance(options, list):
            for j, opt in enumerate(options, 1):
                if isinstance(opt, dict) and "label" in opt and "value" in opt:
                    question["options"].append(opt)
                else:
                    # Convert string options to proper format
                    question["options"].append({
                        "label": j,
                        "value": str(opt)
                    })

        formatted_questions.append(question)

    return json.dumps(formatted_questions, indent=2)

class ExamGeneratorAgent:
    """Agent for generating exams using AI and web search"""

    def __init__(self, config: ExamConfig):
        self.config = config
        self.model = self._initialize_model()
        self.agent = self._create_agent()

    def _initialize_model(self):
        """Initialize the appropriate model based on configuration"""
        model_config = MODEL_CONFIGS.get(self.config.model_name)
        if not model_config:
            raise ValueError(f"Unknown model: {self.config.model_name}")

        # Get API key
        api_key = self.config.api_key or os.getenv(model_config["env_key"])
        if not api_key:
            raise ValueError(
                f"API key not found for {self.config.model_name}. "
                f"Please set {model_config['env_key']} environment variable or use --api-key flag."
            )

        provider = model_config["provider"]

        if provider == "gemini":
            return LiteLLMModel(
                model_id=f"gemini/{model_config['model_id']}",
                api_key=api_key
            )
        elif provider == "openai":
            return LiteLLMModel(
                model_id=model_config["model_id"],
                api_key=api_key
            )
        elif provider == "anthropic":
            return LiteLLMModel(
                model_id=f"anthropic/{model_config['model_id']}",
                api_key=api_key
            )
        elif provider == "huggingface":
            return InferenceClientModel(
                model_id=model_config["model_id"],
                token=api_key
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def _create_agent(self):
        """Create the ToolCallingAgent with necessary tools"""
        tools = [
            brave_search_tool,
            VisitWebpageTool()
        ]

        system_prompt = f"""You are an expert educational content creator specializing in exam generation.

Your task is to create high-quality exam questions for the topic: {self.config.name}

Follow these guidelines STRICTLY:

1. **Search Phase**: First, use web search to find authoritative educational content on the topic
2. **Question Creation**: After gathering information, generate {self.config.num_questions} questions at {self.config.difficulty} difficulty
3. **Format Requirements**:
   - Each question must have exactly 4 multiple choice options
   - Use LaTeX notation for mathematical expressions: $...$ for inline, $$...$$ for display
   - Ensure questions test understanding, not just memorization
   - Include detailed explanations for each answer
   - Categorize questions by topic/subtopic

4. **Quality Check**:
   - Questions must be clear and unambiguous
   - All options should be plausible (no obvious wrong answers)
   - Only one correct answer per question
   - Explanations should be educational

5. **CRITICAL INSTRUCTION**: You MUST return a complete, valid JSON array containing ALL questions.
   - Do NOT call any tools with the questions
   - Do NOT use the structure_exam_questions tool
   - Return the JSON array directly as your final answer
   - Ensure the JSON is properly formatted and valid

6. **Output Format**: Return a JSON array of question objects in this exact structure:
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

Process:
1. First, search for educational content
2. Then, create the complete JSON array with all {self.config.num_questions} questions
3. Return ONLY the JSON array as your final answer - no additional text"""

        return ToolCallingAgent(
            tools=tools,
            model=self.model,
            add_base_tools=False,
            instructions=system_prompt
        )

    def generate_exam(self) -> List[Dict[str, Any]]:
        """Generate an exam based on the configuration"""

        prompt = f"""
Create a comprehensive exam on: {self.config.name}

Description: {self.config.description}

Search for educational content and create {self.config.num_questions} questions.

Ensure variety in question types:
- Conceptual understanding
- Problem-solving/application
- Analysis and reasoning

Use the search tools to find reliable educational sources and Competitive exam PYQ questions before creating the final exam.
After doing the search for some sources, search further inside at least 2-3 sources for more detailed questions extraction.

IMPORTANT: You must return a valid JSON array containing all {self.config.num_questions} questions. Each question must have the exact structure specified in your instructions.
"""

        logger.info(f"Generating exam: {self.config.name}")
        logger.info(f"Searching for educational content on: {self.config.description}")

        result = self.agent.run(prompt)

        final_answer_content = ''
        
        # Access the agent's memory steps
        # This approach ensures we capture the final answer even if the return value is somewhat malformed
        try:
            if hasattr(self.agent, 'memory') and self.agent.memory.steps:
                last_step = self.agent.memory.steps[-1]
                # For ToolCallingAgent, check if last tool call is 'final_answer'
                tool_calls = getattr(getattr(last_step, "model_output_message", None), "tool_calls", None)
                if tool_calls and len(tool_calls) > 0 and tool_calls[-1].function.name == "final_answer":
                    # Use the result directly as the content to parse
                    final_answer_content = str(result)
        except Exception as e:
            logger.warning(f"Could not extract from agent memory: {e}")

        if not final_answer_content:
            final_answer_content = str(result) if result is not None else "Agent did not provide a final answer in the expected format. Unrecoverable Error."

        logger.info("Attempting to parse JSON from final answer...")
        
        try:
            # Use remove_bs to clean the content and extract JSON
            final_answer_content_jsononlystr = remove_bs(final_answer_content)
            final_answer_json = json.loads(final_answer_content_jsononlystr)
            
            logger.info("Successfully parsed JSON!")
            
            if isinstance(final_answer_json, list):
                logger.info(f"Got {len(final_answer_json)} questions")
                return final_answer_json
            elif isinstance(final_answer_json, dict) and "questions" in final_answer_json:
                 # Handle case where AI wraps it in a "questions" object
                logger.info(f"Got {len(final_answer_json['questions'])} questions from object")
                return final_answer_json["questions"]
            else:
                 # It might be a single object, try to wrap it
                 return [final_answer_json]

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.debug(f"Content attempted to parse: {final_answer_content_jsononlystr[:500]}...")
            
            # Fallback to the old iterative parsing just in case remove_bs failed slightly
            # but usually remove_bs covers these cases.
            raise ValueError(f"Failed to generate valid exam JSON: {e}")

def save_exam(exam_data: List[Dict[str, Any]], config: ExamConfig) -> Path:
    """Save the exam to a JSON file"""
    # Create sample_exams directory if it doesn't exist
    sample_exams_dir = Path("sample_exams")
    sample_exams_dir.mkdir(exist_ok=True)

    # Generate filename
    if config.output_path:
        output_path = Path(config.output_path)
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # filename = f"{config.name.lower().replace(' ', '_')}_{timestamp}.json"
        filename = f"{config.name} {timestamp}.json"
        output_path = sample_exams_dir / filename

    # Check if it's a list JSON and save it directly if so
    # This ensures compatibility with Pariksha web app's expected format
    if isinstance(exam_data, list):
        data_to_save = exam_data
    else:
        # Fallback to wrapping if it's not a list for some reason
        data_to_save = {
            "metadata": {
                "name": config.name,
                "description": config.description,
                "generated_at": datetime.now().isoformat(),
                "model_used": config.model_name,
                "difficulty": config.difficulty,
                "total_questions": len(exam_data) if isinstance(exam_data, list) else 1
            },
            "questions": exam_data
        }

    # Save to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    return output_path

def check_api_keys():
    """Check and report available API keys"""
    api_keys = {
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        "HF_TOKEN": os.getenv("HF_TOKEN"),
        "BRAVE_API_KEY": os.getenv("BRAVE_API_KEY")
    }

    print("🔑 API Key Status:")
    for key, value in api_keys.items():
        status = "✅ Set" if value else "❌ Not set"
        print(f"  {key}: {status}")
    print()

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="Generate exam questions using AI and web search",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate a basic physics exam using default Gemini model
  python exam_generator.py --name "Physics Mechanics" --description "High school physics mechanics exam"

  # Generate exam with specific number of questions and difficulty
  python exam_generator.py --name "Calculus I" --description "College-level differential calculus" --questions 15 --difficulty hard

  # Use a different model (GPT-4o)
  python exam_generator.py --name "Chemistry Basics" --description "Introduction to chemistry" --model gpt-4o-mini
  
  # Open in Gradio GUI
  python exam_generator.py --name "Math" --description "Math test" --gui

  # Check available API keys
  python exam_generator.py --check-keys
        """
    )

    # Required arguments
    parser.add_argument(
        "--name", "-n",
        help="Name of the exam"
    )
    parser.add_argument(
        "--description", "-d",
        help="Description of the exam content"
    )

    # Optional arguments
    parser.add_argument(
        "--model", "-m",
        default="gemini-3-flash-preview",
        choices=list(MODEL_CONFIGS.keys()),
        help="AI model to use (default: gemini-3-flash-preview)"
    )
    parser.add_argument(
        "--questions", "-q",
        type=int,
        default=10,
        help="Number of questions to generate (default: 10)"
    )
    parser.add_argument(
        "--difficulty",
        choices=["easy", "intermediate", "hard"],
        default="intermediate",
        help="Difficulty level of questions (default: intermediate)"
    )
    parser.add_argument(
        "--api-key",
        help="API key for the selected model (if not set in environment)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Output file path (default: auto-generated in sample_exams/)"
    )
    parser.add_argument(
        "--check-keys",
        action="store_true",
        help="Check available API keys and exit"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Launch the agent in a Gradio GUI"
    )

    args = parser.parse_args()

    # Check API keys if requested
    if args.check_keys:
        check_api_keys()
        return 0

    # Validate required arguments
    if not args.name or not args.description:
        parser.error("--name and --description are required (unless using --check-keys)")

    # Set verbose logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        # Create exam configuration
        config = ExamConfig(
            name=args.name,
            description=args.description,
            num_questions=args.questions,
            difficulty=args.difficulty,
            model_name=args.model,
            api_key=args.api_key,
            output_path=args.output
        )

        # Check API availability
        model_config = MODEL_CONFIGS.get(config.model_name)
        api_key = config.api_key or os.getenv(model_config["env_key"])
        if not api_key:
            print(f"\n❌ Error: API key not found for {config.model_name}")
            print(f"Please set the {model_config['env_key']} environment variable or use --api-key flag")
            print("\nAvailable models and their required API keys:")
            for model_name, model_info in MODEL_CONFIGS.items():
                print(f"  {model_name}: {model_info['env_key']}")
            return 1

        # Check Brave API key for search
        if not os.getenv("BRAVE_API_KEY"):
            print("\n⚠️  Warning: BRAVE_API_KEY not set. Web search functionality may be limited.")
            print("   Get a free API key at: https://api.search.brave.com/")
            print()

        logger.info(f"Initializing exam generator with model: {config.model_name}")

        # Initialize the exam generator
        generator = ExamGeneratorAgent(config)

        if args.gui:
            logger.info("🚀 Launching Gradio UI...")
            GradioUI(generator.agent).launch()
            return 0

        # Generate the exam
        exam_data = generator.generate_exam()

        # Save the exam
        output_path = save_exam(exam_data, config)

        logger.info(f"✅ Exam generated successfully!")

        # Print summary
        print(f"\n🎉 Exam '{config.name}' generated successfully!")
        print(f"📁 Location: {output_path.absolute()}")
        print(f"🤖 Model: {config.model_name}")
        print(f"📊 Questions: {len(exam_data)}")
        print(f"🎯 Difficulty: {config.difficulty}")

        # Preview first question
        if exam_data and len(exam_data) > 0:
            print(f"\n🔍 Preview of first question:")
            first_q = exam_data[0]
            print(f"   Q: {first_q.get('question', 'N/A')[:100]}...")
            print(f"   Topic: {first_q.get('topic', 'N/A')}")

    except KeyboardInterrupt:
        print("\n\n⚠️  Generation interrupted by user")
        return 1
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

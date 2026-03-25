#!/usr/bin/env python3
"""
Example usage of the exam generator as a Python module
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from exam_generator import ExamGeneratorAgent, ExamConfig

def example_basic_usage():
    """Example of basic exam generation"""
    print("📝 Basic Exam Generation Example")
    print("-" * 40)

    # Configure the exam
    config = ExamConfig(
        name="Introduction to Machine Learning",
        description="Basic concepts of machine learning including supervised learning, neural networks, and evaluation metrics",
        num_questions=5,
        difficulty="intermediate",
        model_name="gemini-3-flash-preview"
    )

    try:
        # Create generator and generate exam
        generator = ExamGeneratorAgent(config)
        exam_questions = generator.generate_exam()

        print(f"✅ Generated {len(exam_questions)} questions")

        # Print first question as example
        if exam_questions:
            first_q = exam_questions[0]
            print(f"\n🎯 Sample Question:")
            print(f"Q: {first_q['question']}")
            print(f"Options:")
            for opt in first_q['options']:
                print(f"  {opt['label']}. {opt['value']}")
            print(f"Answer: {first_q['answer_label']}")
            print(f"Topic: {first_q['topic']}")

        return exam_questions

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def example_math_exam():
    """Example of generating a math exam with LaTeX"""
    print("\n🧮 Math Exam with LaTeX Example")
    print("-" * 40)

    config = ExamConfig(
        name="Calculus - Integration",
        description="College-level integration techniques including substitution, integration by parts, and definite integrals",
        num_questions=3,
        difficulty="hard",
        model_name="gemini-3-flash-preview"
    )

    try:
        generator = ExamGeneratorAgent(config)
        questions = generator.generate_exam()

        print(f"✅ Generated {len(questions)} calculus questions")

        # Show a question with LaTeX
        for i, q in enumerate(questions, 1):
            if '$' in q['question']:
                print(f"\n📐 Question {i} (with LaTeX):")
                print(f"Q: {q['question']}")
                break

        return questions

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def example_with_custom_output():
    """Example showing how to save to a specific location"""
    print("\n💾 Custom Output Location Example")
    print("-" * 40)

    config = ExamConfig(
        name="Python Programming Basics",
        description="Fundamental Python concepts including data types, control structures, and functions",
        num_questions=4,
        difficulty="easy",
        model_name="gemini-3-flash-preview",
        output_path="my_python_exam.json"
    )

    try:
        generator = ExamGeneratorAgent(config)
        questions = generator.generate_exam()

        # Save to the specified location
        from exam_generator import save_exam
        output_path = save_exam(questions, config)

        print(f"✅ Exam saved to: {output_path}")
        print(f"📊 Total questions: {len(questions)}")

        # Verify the file was created
        if output_path.exists():
            print("✅ File successfully created!")
            # Load and verify
            import json
            with open(output_path) as f:
                data = json.load(f)
            print(f"📋 Exam metadata: {data['metadata']}")

        return output_path

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def example_different_models():
    """Example showing how to use different models"""
    print("\n🤖 Different Models Example")
    print("-" * 40)

    models_to_test = []

    # Check which API keys are available
    if os.getenv("GEMINI_API_KEY"):
        models_to_test.append("gemini-3-flash-preview")
    if os.getenv("OPENAI_API_KEY"):
        models_to_test.append("gpt-4o-mini")
    if os.getenv("ANTHROPIC_API_KEY"):
        models_to_test.append("claude-3-haiku")

    if not models_to_test:
        print("⚠️  No API keys found. Please set at least one of:")
        print("   - GEMINI_API_KEY")
        print("   - OPENAI_API_KEY")
        print("   - ANTHROPIC_API_KEY")
        return

    for model in models_to_test:
        print(f"\nTesting {model}...")
        try:
            config = ExamConfig(
                name=f"Test Exam - {model}",
                description="Simple test to verify model is working",
                num_questions=2,
                model_name=model
            )

            generator = ExamGeneratorAgent(config)
            questions = generator.generate_exam()

            print(f"✅ {model}: Generated {len(questions)} questions")

        except Exception as e:
            print(f"❌ {model}: Failed - {e}")

def main():
    """Run all examples"""
    print("🚀 Exam Generator Examples")
    print("=" * 50)

    # Run examples
    example_basic_usage()
    example_math_exam()
    example_with_custom_output()
    example_different_models()

    print("\n" + "=" * 50)
    print("✅ All examples completed!")
    print("\n💡 Tips:")
    print("   - Always check your API keys before running")
    print("   - Be specific with descriptions for better results")
    print("   - Review generated questions before using")
    print("   - Use LaTeX for mathematical content")

if __name__ == "__main__":
    # Set a test API key if not already set
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("OPENAI_API_KEY") and not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  Warning: No API keys detected!")
        print("Please set one of the following environment variables:")
        print("  - GEMINI_API_KEY")
        print("  - OPENAI_API_KEY")
        print("  - ANTHROPIC_API_KEY")
        print("\nYou can get free API keys from:")
        print("  - Gemini: https://makersuite.google.com/app/apikey")
        print("  - OpenAI: https://platform.openai.com/api-keys")
        print("  - Anthropic: https://console.anthropic.com/")
        print("\nContinuing with examples anyway...")
        print("=" * 50)

    main()

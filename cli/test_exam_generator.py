#!/usr/bin/env python3
"""
Test script for the exam generator CLI tool
"""

import subprocess
import json
import sys
from pathlib import Path

def run_command(cmd):
    """Run a command and return the result"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(f"Exit code: {result.returncode}")
    if result.stdout:
        print(f"Output:\n{result.stdout}")
    if result.stderr:
        print(f"Error:\n{result.stderr}")
    return result

def test_check_keys():
    """Test the --check-keys functionality"""
    print("\n=== Testing --check-keys ===")
    result = run_command("python exam_generator.py --check-keys")
    return result.returncode == 0

def test_help():
    """Test the help output"""
    print("\n=== Testing --help ===")
    result = run_command("python exam_generator.py --help")
    return result.returncode == 0 and "Generate exam questions" in result.stdout

def test_basic_generation():
    """Test basic exam generation with mock data"""
    print("\n=== Testing basic exam generation ===")

    # Create a simple test exam
    cmd = ('python exam_generator.py '
           '--name "Test Math Exam" '
           '--description "Basic arithmetic and algebra" '
           '--questions 3 '
           '--difficulty easy '
           '--output test_output.json')

    result = run_command(cmd)

    # Check if file was created
    if Path("test_output.json").exists():
        print("✅ Output file created successfully")

        # Try to parse the JSON
        try:
            with open("test_output.json", "r") as f:
                data = json.load(f)

            print(f"✅ Valid JSON format")
            print(f"   Questions: {len(data.get('questions', []))}")
            print(f"   Metadata: {data.get('metadata', {})}")

            # Validate first question structure
            questions = data.get('questions', [])
            if questions:
                first_q = questions[0]
                required_fields = ['question', 'options', 'answer_label', 'topic', 'explanation', 'id']
                missing_fields = [f for f in required_fields if f not in first_q]
                if missing_fields:
                    print(f"⚠️  Missing fields in first question: {missing_fields}")
                else:
                    print("✅ First question has all required fields")

                # Check options format
                options = first_q.get('options', [])
                if len(options) == 4:
                    print("✅ Correct number of options (4)")
                else:
                    print(f"⚠️  Expected 4 options, got {len(options)}")

            return True
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            return False
    else:
        print("❌ Output file not created")
        return False

def test_with_different_models():
    """Test with different model configurations"""
    print("\n=== Testing different models ===")

    # Test Gemini model
    if "GEMINI_API_KEY" in subprocess.run("env", capture_output=True, text=True).stdout:
        print("Testing with Gemini model...")
        cmd = ('python exam_generator.py '
               '--name "Gemini Test" '
               '--description "Testing Gemini model" '
               '--questions 2 '
               '--model gemini-3-flash-preview '
               '--output gemini_test.json')
        result = run_command(cmd)
        print(f"Gemini test result: {'✅ Success' if result.returncode == 0 else '❌ Failed'}")
    else:
        print("⚠️  GEMINI_API_KEY not set, skipping Gemini test")

    # Test OpenAI model
    if "OPENAI_API_KEY" in subprocess.run("env", capture_output=True, text=True).stdout:
        print("Testing with OpenAI model...")
        cmd = ('python exam_generator.py '
               '--name "OpenAI Test" '
               '--description "Testing OpenAI model" '
               '--questions 2 '
               '--model gpt-4o-mini '
               '--output openai_test.json')
        result = run_command(cmd)
        print(f"OpenAI test result: {'✅ Success' if result.returncode == 0 else '❌ Failed'}")
    else:
        print("⚠️  OPENAI_API_KEY not set, skipping OpenAI test")

def cleanup():
    """Clean up test files"""
    print("\n=== Cleaning up test files ===")
    test_files = [
        "test_output.json",
        "gemini_test.json",
        "openai_test.json"
    ]

    for file in test_files:
        if Path(file).exists():
            Path(file).unlink()
            print(f"Removed {file}")

def main():
    """Run all tests"""
    print("🧪 Starting Exam Generator Tests")
    print("=" * 50)

    # Check if exam_generator.py exists
    if not Path("exam_generator.py").exists():
        print("❌ exam_generator.py not found in current directory")
        sys.exit(1)

    tests = [
        ("Help command", test_help),
        ("Check keys", test_check_keys),
        ("Basic generation", test_basic_generation),
        ("Different models", test_with_different_models),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*20} {test_name} {'='*20}")
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)

    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name}: {status}")
        if success:
            passed += 1

    print(f"\nTotal: {passed}/{len(results)} tests passed")

    # Cleanup
    cleanup()

    # Exit with appropriate code
    sys.exit(0 if passed == len(results) else 1)

if __name__ == "__main__":
    main()

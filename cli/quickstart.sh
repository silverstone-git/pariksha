#!/bin/bash

# Pariksha CLI Exam Generator - Quick Start Script

echo "🚀 Pariksha CLI Exam Generator - Quick Start"
echo "============================================"
echo

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>/dev/null || python --version)
if [[ $? -ne 0 ]]; then
    echo "❌ Python not found. Please install Python 3.8 or higher."
    exit 1
fi
echo "✅ Found: $python_version"

# Check if pip is available
echo
echo "📋 Checking pip..."
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo "❌ pip not found. Please install pip."
    exit 1
fi
echo "✅ Found: $PIP_CMD"

# Install dependencies
echo
echo "📦 Installing dependencies..."
$PIP_CMD install -r requirements.txt

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi
echo "✅ Dependencies installed successfully!"

# Check API keys
echo
echo "🔑 Checking API keys..."
echo "Current API key status:"
python3 exam_generator.py --check-keys

# Instructions
echo
echo "🎯 Next Steps:"
echo "==============="
echo
echo "1. Get API keys if you haven't already:"
echo "   - Gemini (free): https://makersuite.google.com/app/apikey"
echo "   - Brave Search (free): https://api.search.brave.com/"
echo "   - OpenAI (paid): https://platform.openai.com/api-keys"
echo "   - Anthropic (paid): https://console.anthropic.com/"
echo
echo "2. Set your API keys as environment variables:"
echo "   export GEMINI_API_KEY='your-key-here'"
echo "   export BRAVE_API_KEY='your-key-here'"
echo
echo "3. Generate your first exam:"
echo "   python exam_generator.py --name 'Physics Quiz' --description 'Basic physics concepts'"
echo
echo "4. Try the examples:"
echo "   python example_usage.py"
echo
echo "5. Run tests to verify everything works:"
echo "   python test_exam_generator.py"
echo
echo "📖 For more information, see README.md"
echo
echo "Happy exam generating! 🎉"
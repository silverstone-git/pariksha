# Pariksha CLI Exam Generator

A powerful CLI tool for generating exam questions using AI and web search, built with Hugging Face Smolagents. This tool creates high-quality exam content in the Pariksha format.

## Features

- **Multi-Model Support**: Use various LLM providers (Gemini, GPT-4o, Claude, Hugging Face models)
- **Web Search Integration**: Automatically searches for educational content to create well-informed questions
- **Pariksha Format**: Generates questions in the exact JSON format required by Pariksha
- **LaTeX Support**: Full support for mathematical expressions using LaTeX notation
- **Flexible Configuration**: Control difficulty, number of questions, and output location
- **Bring Your Own LLM**: Use any supported model by providing your own API keys

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your API keys:
```bash
# For Gemini (default)
export GEMINI_API_KEY="your-gemini-api-key"

# For web search (required)
export BRAVE_API_KEY="your-brave-search-api-key"

# For other models (optional)
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export HF_TOKEN="your-huggingface-token"
```

Get API keys:
- **Gemini**: https://makersuite.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Brave Search**: https://api.search.brave.com/
- **Hugging Face**: https://huggingface.co/settings/tokens

## Usage

### Basic Usage

Generate a basic exam:
```bash
python exam_generator.py \
  --name "Physics Mechanics" \
  --description "High school physics mechanics exam covering Newton's laws, kinematics, and energy"
```

### Advanced Usage

Generate exam with specific parameters:
```bash
python exam_generator.py \
  --name "Calculus I - Derivatives" \
  --description "College-level differential calculus exam covering limits, derivatives, and applications" \
  --questions 15 \
  --difficulty hard \
  --model gpt-4o-mini \
  --output my_exam.json
```

### Check Available API Keys

```bash
python exam_generator.py --check-keys
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--name` | `-n` | Name of the exam | Required |
| `--description` | `-d` | Description of exam content | Required |
| `--model` | `-m` | AI model to use | gemini-3-flash-preview |
| `--questions` | `-q` | Number of questions | 10 |
| `--difficulty` | | Difficulty level (easy/intermediate/hard) | intermediate |
| `--api-key` | | API key for selected model | From env |
| `--output` | `-o` | Output file path | Auto-generated |
| `--check-keys` | | Check API key status | |
| `--verbose` | `-v` | Enable verbose logging | |

## Supported Models

| Model | Provider | Required API Key |
|-------|----------|------------------|
| gemini-3-flash-preview | Google | GEMINI_API_KEY |
| gemini-2.5-flash | Google | GEMINI_API_KEY |
| gemini-2.0-pro | Google | GEMINI_API_KEY |
| gpt-4o-mini | OpenAI | OPENAI_API_KEY |
| gpt-4o | OpenAI | OPENAI_API_KEY |
| claude-3-haiku | Anthropic | ANTHROPIC_API_KEY |
| hf-deepseek | Hugging Face | HF_TOKEN |

## Example Output

The tool generates JSON files in a raw list format, which is directly compatible with the Pariksha web app:

```json
[
  {
    "question": "What is the acceleration of a 5kg object when a force of $20 \, \text{N}$ is applied?",
    "options": [
      {"label": 1, "value": "$1 \, \text{m/s}^2$"},
      {"label": 2, "value": "$4 \, \text{m/s}^2$"},
      {"label": 3, "value": "$15 \, \text{m/s}^2$"},
      {"label": 4, "value": "$100 \, \text{m/s}^2$"}
    ],
    "answer_label": 2,
    "topic": "Physics - Newton's Laws",
    "explanation": "Using Newton's second law: F = ma. Therefore, a = F/m = 20N/5kg = 4 m/s²",
    "id": "q-1"
  }
]
```

## Tips for Best Results

1. **Be Specific**: Provide detailed descriptions for better question quality
2. **Use LaTeX**: The models understand LaTeX for mathematical expressions
3. **Check Sources**: The tool searches the web - verify important questions
4. **Iterate**: Generate multiple times and pick the best questions
5. **Review**: Always review generated questions before using in production

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your API key is set correctly
2. **No Questions Generated**: Check your BRAVE_API_KEY for search functionality
3. **JSON Parse Error**: Try a different model or simplify the description
4. **Rate Limiting**: Add delays between requests or use a different model

### Debug Mode

Run with verbose logging:
```bash
python exam_generator.py --verbose [other options]
```

## Contributing

This tool is part of the Pariksha project. Feel free to:
- Report issues
- Suggest improvements
- Add support for new models
- Enhance question generation logic

## License

Same as Pariksha project - see main LICENSE file.

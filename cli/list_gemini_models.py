#!/usr/bin/env python3
"""List available Gemini models"""

import os
import google.generativeai as genai

# Configure with API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY not set")
    exit(1)

genai.configure(api_key=api_key)

# List models
print("Available Gemini models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"- {model.name}: {model.description}")
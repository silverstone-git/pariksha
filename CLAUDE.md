# Pariksha - Complete Codebase Documentation

## Project Overview

Pariksha (meaning "Exam" in Hindi) is a modern, AI-enhanced web-based exam simulator built with React, TypeScript, and Vite. It allows users to create, take, and share practice exams with advanced features including AI-powered exam generation, detailed performance analytics, and community sharing.

## Architecture

### Frontend Stack
- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling with dark mode support
- **KaTeX** for LaTeX rendering of mathematical expressions
- **Lucide React** for icons

### Backend/API Integration
- **Client-side application** - No backend server required
- **Local Storage** for data persistence
- **Third-party APIs** for AI integration (Claude, ChatGPT, Google AI)
- **Brave Search API** for web search functionality (in CLI)

## Key Features

### 1. AI-Powered Exam Generation
- Generates exam prompts for multiple AI platforms (Claude, ChatGPT, Google AI)
- Direct links to launch AI chat platforms with pre-filled prompts
- Comprehensive LaTeX handling for mathematical/scientific content
- Suggestions for alternative AI platforms

### 2. Exam Management
- **Local Exams**: Upload and save personal exam JSON files
- **Community Exams**: Browse and take exams shared by other users
- **Fault-tolerant JSON Parser**: Handles malformed JSON with extra text
- **Search Functionality**: Filter exams by name/title

### 3. Exam Taking Experience
- **Custom Timer**: Configurable exam duration (hours/minutes)
- **Dynamic Content**: Questions and options are shuffled for varied experience
- **LaTeX Support**: Full rendering of mathematical notation
- **Progressive Navigation**: Question-by-question interface
- **Submission Confirmation**: Warns about unattempted questions

### 4. Detailed Results Analysis
- **Score Breakdown**: Correct/incorrect answers with percentages
- **Topic-wise Performance**: Accuracy and time spent per topic
- **SWOT Analysis**: Automated generation of Strengths, Weaknesses, Opportunities, Threats
- **Answer Review**: Detailed question-by-question review with explanations
- **Time Analytics**: Average time per question and total time statistics

### 5. Data Persistence
- **Exam History**: Local storage of all taken exams
- **Import/Export**: Download results as JSON and upload later for review
- **Theme Persistence**: Dark/light mode preferences saved locally

## File Structure

```
pariksha/
├── public/                    # Static assets
│   ├── vite.svg
│   └── react.svg
├── src/                       # Source code
│   ├── components/           # React components
│   │   ├── AIExamGenerator.tsx     # AI exam generation modal
│   │   ├── Button.tsx              # Reusable button component
│   │   ├── Card.tsx                # Reusable card component
│   │   ├── ExamScreen.tsx          # Main exam taking interface
│   │   ├── Latex.tsx               # LaTeX rendering wrapper
│   │   └── ThemeToggle.tsx         # Dark/light mode toggle
│   ├── contexts/             # React contexts
│   │   └── ThemeContext.tsx        # Theme management
│   ├── hooks/                # Custom React hooks
│   │   └── useSystemTheme.ts       # System theme detection
│   ├── types.ts              # TypeScript type definitions
│   ├── utils.ts              # Utility functions
│   ├── App.tsx               # Main application component
│   ├── App.css               # Application styles
│   ├── index.css             # Global styles
│   ├── main.tsx              # Application entry point
│   └── vite-env.d.ts         # Vite environment types
├── cli/                      # Command Line Interface
│   ├── exam_generator.py     # Main CLI tool
│   ├── search.py             # Web search tool with Brave API
│   ├── inference.py          # LLM integration utilities
│   ├── stateful_agent.py     # Smolagents state management
│   ├── requirements.txt      # Python dependencies
│   ├── README.md             # CLI documentation
│   ├── test_exam_generator.py # Test suite
│   ├── example_usage.py      # Usage examples
│   ├── quickstart.sh         # Quick setup script
│   └── OVERVIEW.md           # Technical overview
├── sample_exams/            # Generated exam storage
├── sample_paper.json        # Example exam file
├── index.html               # Main HTML file
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── README.md                # Project documentation
```

## Component Details

### Core Components

#### `App.tsx`
- **Role**: Main application component and state management
- **Key Functions**:
  - Screen state management (home, exam, results)
  - Exam data loading and validation
  - Result calculation and SWOT analysis generation
  - Local storage operations

#### `AIExamGenerator.tsx`
- **Role**: Modal for AI-powered exam generation
- **Features**:
  - Multiple AI platform support (Claude, ChatGPT, Google AI)
  - Pre-filled prompts for each platform
  - LaTeX support for mathematical content
  - Copy-to-clipboard functionality

#### `ExamScreen.tsx`
- **Role**: Main exam taking interface
- **Features**:
  - Timer functionality
  - Question navigation
  - Answer selection and storage
  - Progress tracking
  - Submit confirmation

#### `Latex.tsx`
- **Role**: LaTeX rendering component
- **Features**:
  - Wraps KaTeX for mathematical expressions
  - Handles inline and display math
  - Error boundary for malformed LaTeX

### Utility Functions (`utils.ts`)

#### `calculateScore()`
Calculates exam scores and performance metrics

#### `generateSWOTAnalysis()`
Generates Strengths, Weaknesses, Opportunities, Threats analysis

#### `shuffleArray()`
Randomizes question and option order

#### `parseJSONSafely()`
Fault-tolerant JSON parser that handles malformed JSON

### Type Definitions (`types.ts`)

```typescript
interface Question {
  question: string;
  options: Array<{ label: number; value: string }>;
  answer_label: number;
  topic: string;
  explanation?: string;
  id?: string;
}

interface ExamResult {
  questions: Question[];
  userAnswers: number[];
  score: number;
  timeTaken: number;
  topicPerformance: Record<string, TopicStats>;
  swotAnalysis: SWOTAnalysis;
}

interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}
```

## CLI Section

### Overview
The CLI tool extends Pariksha's capabilities by providing automated exam generation using AI and web search. It uses Hugging Face Smolagents framework for building AI agents that can search the web and generate educational content.

### Key Features
- **Multi-Model Support**: Works with Gemini, GPT-4o, Claude, and Hugging Face models
- **Web Search Integration**: Uses Brave Search API to find educational content
- **Automated Generation**: Creates complete exams with questions, options, and explanations
- **Pariksha Compatible**: Outputs exact JSON format required by the web app

### CLI Components

#### `exam_generator.py`
- **Role**: Main CLI application
- **Key Classes**:
  - `ExamConfig`: Configuration dataclass for exam parameters
  - `ExamGeneratorAgent`: Main agent class that orchestrates generation
- **Features**:
  - Command-line argument parsing
  - Multi-model support with automatic initialization
  - Error handling and validation
  - Progress logging

#### `search.py`
- **Role**: Web search and scraping functionality
- **Key Functions**:
  - `brave_search_tool()`: Main search function with Smolagents @tool decorator
  - `scrape_with_selenium()`: Handles JavaScript-rendered pages
  - `scrape_url_with_scrapy()`: Static content scraping
- **Features**:
  - Brave Search API integration
  - Selenium support for React/SPA sites
  - Concurrent page fetching
  - Detailed content extraction

#### `inference.py`
- **Role**: LLM provider abstraction
- **Key Functions**:
  - `initialize_model()`: Model initialization based on provider
  - `smolquery()`: Agent execution with chat history
  - `query_llm()`: Direct LLM querying with file support
- **Supported Providers**:
  - Google Gemini
  - OpenAI GPT models
  - Hugging Face Inference API

### CLI Usage Examples

#### Basic Generation
```bash
python exam_generator.py \
  --name "Physics Mechanics" \
  --description "High school physics mechanics exam"
```

#### Advanced Configuration
```bash
python exam_generator.py \
  --name "Calculus - Integration" \
  --description "College-level integration techniques" \
  --questions 15 \
  --difficulty hard \
  --model gpt-4o-mini \
  --output custom_exam.json
```

#### Check API Keys
```bash
python exam_generator.py --check-keys
```

### CLI Output Format
The CLI generates JSON files compatible with Pariksha's format:

```json
{
  "metadata": {
    "name": "Exam Name",
    "description": "Exam description",
    "generated_at": "2025-01-02T10:30:00",
    "model_used": "gemini-3-flash-preview",
    "difficulty": "intermediate",
    "total_questions": 10
  },
  "questions": [
    {
      "question": "Question text with $LaTeX$ support",
      "options": [
        {"label": 1, "value": "First option"},
        {"label": 2, "value": "Second option"},
        {"label": 3, "value": "Third option"},
        {"label": 4, "value": "Fourth option"}
      ],
      "answer_label": 2,
      "topic": "Subject - Subtopic",
      "explanation": "Detailed explanation",
      "id": "q-1"
    }
  ]
}
```

## Special Functions & Utilities

### Reusable Functions

#### From `utils.ts`:
- `parseJSONSafely()`: Handles malformed JSON - useful for file uploads
- `shuffleArray()`: Randomizes arrays - useful for randomizing questions/options
- `calculateScore()`: Calculates exam scores - can be extended for other scoring systems
- `generateSWOTAnalysis()`: Creates SWOT analysis - adaptable for other analysis types

#### From CLI:
- `brave_search_tool()`: Web search functionality - reusable for any search needs
- `structure_exam_questions()`: Question formatting - ensures consistent output format
- Model initialization patterns - extensible for new LLM providers

### Extension Points

1. **New Question Types**: Extend the Question interface and add UI components
2. **Additional Analytics**: Build on the SWOT analysis framework
3. **New AI Providers**: Add to MODEL_CONFIGS in CLI
4. **Export Formats**: Extend the save functionality in CLI
5. **Question Validation**: Add to the structure_exam_questions tool

## Development Guidelines

### Adding New Features
1. Check existing components for similar functionality
2. Follow TypeScript interfaces for type safety
3. Use the existing utility functions where applicable
4. Maintain compatibility with the JSON format
5. Add tests for CLI components

### Best Practices
1. Always validate JSON input (use parseJSONSafely)
2. Handle LaTeX with the Latex component
3. Use local storage for persistence
4. Implement proper error boundaries
5. Follow the established component structure

### Testing
- Web app: Manual testing with various exam formats
- CLI: Run `python test_exam_generator.py`
- Always test with malformed JSON
- Verify LaTeX rendering
- Check timer functionality

## Deployment

### Web Application
1. Build: `npm run build`
2. Deploy dist/ folder to static hosting
3. Ensure API keys are set for AI features

### CLI Tool
1. Install: `pip install -r requirements.txt`
2. Set environment variables for API keys
3. Run directly or create aliases for convenience

## Security Considerations

- API keys are client-side for web app (consider proxy for production)
- No backend means no data persistence beyond localStorage
- CLI tool stores API keys in environment variables
- Web search results are not sanitized (implement as needed)

## Future Enhancements

### Web App
- Backend integration for persistent storage
- User accounts and authentication
- Real-time collaboration
- More question types (drag-drop, fill-in-blank)
- Question bank management

### CLI
- Batch exam generation
- Question template system
- Difficulty auto-calibration
- Multi-language support
- Integration with LMS systems
- Export to other formats (CSV, PDF)

## Conclusion

Pariksha is a comprehensive exam simulation platform that combines modern web technologies with AI-powered content generation. The addition of the CLI tool extends its capabilities, making it a complete solution for educational content creation and consumption. The modular architecture and well-documented codebase make it easy to extend and customize for specific needs. 🎓✨

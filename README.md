# LLT Assistant - VSCode Test Generation Plugin

A VSCode extension that automatically generates pytest unit tests for Python functions using AI. Simply describe what you want to test, and let the AI generate comprehensive, production-ready test code.

## Overview

LLT Assistant helps developers write better tests faster by:
- Analyzing your Python functions automatically
- Generating comprehensive pytest test cases
- Supporting both OpenAI and Claude AI models
- Providing an intuitive, dialog-based interface

## Features

### Phase 1 (Complete) - Basic Infrastructure
- ✅ Right-click context menu integration for Python files
- ✅ Function code analysis and extraction
- ✅ API integration with OpenAI and Claude
- ✅ Configuration management for API keys and settings
- ✅ User-friendly dialog interfaces
- ✅ Error handling and retry mechanisms

### Phase 2 (Complete) - Python AST Analysis Engine
- ✅ AST-based code analysis using Python's `ast` module
- ✅ Function signature extraction with type annotations
- ✅ Control flow analysis (branches, exceptions)
- ✅ External function call detection
- ✅ Class context recognition for methods
- ✅ Import statement extraction
- ✅ Docstring and comment extraction
- ✅ Cyclomatic complexity calculation
- ✅ Stage 1 prompt builder for LLM integration
- ✅ Auto-confirmation logic for simple functions

### Phase 3 (Complete) - AI Agent System
- ✅ Two-stage AI agent architecture (Scenario Detection + Test Generation)
- ✅ Intelligent scenario confirmation workflow
- ✅ Automatic pytest code generation with best practices
- ✅ Smart auto-confirmation for simple functions
- ✅ Few-shot learning with examples
- ✅ Input validation and quality assessment

### Phase 4 (Complete) - Test Code Generation
- ✅ Complete pytest test code generation
- ✅ Test file creation and organization
- ✅ Code formatting and validation
- ✅ Dependency checking
- ✅ Conflict detection and resolution
- ✅ Test preview before insertion

### Phase 5 (Complete) - Optimization & Quality Assurance
- ✅ **Supplement Test Scenarios** - Add new tests without regenerating
- ✅ **Multi-Stage Progress Feedback** - Clear progress indicators
- ✅ **Enhanced Test Preview** - Review and edit before insertion
- ✅ **Comprehensive Unit Tests** - Full test coverage for core modules
- ✅ **Integration Tests** - End-to-end workflow testing
- ✅ **Real-World Validation Suite** - Quality assurance with real scenarios
- ✅ **Complete Documentation** - User Guide, FAQ, and examples

## Requirements

- VSCode version 1.105.0 or higher
- Python 3.8 or higher (for code analysis)
- Node.js 18 or higher (for development)
- An API key from either:
  - OpenAI (gpt-4, gpt-3.5-turbo, etc.)
  - Anthropic Claude (claude-3-opus, claude-3-sonnet, etc.)

## Installation

### For Development

1. Clone the repository:
```bash
git clone <repository-url>
cd LLT-Assistant-VScode
```

2. Install dependencies using pnpm:
```bash
pnpm install
```

3. Compile the extension:
```bash
pnpm run compile
```

4. Open in VSCode:
```bash
code .
```

5. Press `F5` to launch the extension in a new Extension Development Host window

### For Users (Once Published)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "LLT Assistant"
4. Click Install

## Configuration

### Step 1: Configure API Provider

Open VSCode Settings (File > Preferences > Settings) and search for "LLT Assistant":

1. **API Provider**: Choose between `openai` or `claude`
   - Default: `openai`

2. **Model Name**: Specify the model to use
   - For OpenAI: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
   - For Claude: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
   - Default: `gpt-4`

3. **Temperature**: Control randomness (0-2)
   - Default: `0.3` (more focused and deterministic)
   - Higher values = more creative, Lower values = more focused

4. **Max Tokens**: Maximum tokens for responses
   - Default: `2000`

### Step 2: Add Your API Key

You can add your API key in two ways:

**Option A: Via Settings (Recommended)**
1. Open Settings > Extensions > LLT Assistant
2. Enter your API key in the "API Key" field
3. The key will be saved securely in your VSCode settings

**Option B: On First Use**
- The extension will prompt you to enter your API key when you first use it
- The key will be saved for future use

### Getting API Keys

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy and save the key

**Claude (Anthropic):**
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy and save the key

## Usage

### Generate Tests for a Python Function

1. Open a Python file in VSCode
2. Place your cursor inside a function or select the function code
3. Right-click to open the context menu
4. Select **"Generate Tests"**
5. Enter a description of what you want to test (e.g., "test with valid and invalid inputs, edge cases")
6. Review proposed scenarios (if prompted) and confirm
7. Tests are automatically generated and inserted into your test file!

### Supplement Existing Tests (NEW in Phase 5!)

1. Open your test file (e.g., `test_module.py`)
2. Right-click anywhere in the file
3. Select **"Supplement Test Scenarios"**
4. Review existing coverage
5. Enter description of new scenarios to add
6. New test methods are added without modifying existing tests!

### 📚 Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Complete guide with examples
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Prompt Design](./docs/PROMPT_DESIGN.md)** - How prompts work
- **[Flow Diagrams](./docs/FLOW_DIAGRAM.md)** - System architecture
- **[Phase 3 Details](./docs/PHASE3_README.md)** - Agent system documentation

### Example

Given this Python function:

```python
def calculate_total(items: list[dict], tax_rate: float = 0.1) -> float:
    """Calculate total price including tax"""
    if not items:
        raise ValueError("Items list cannot be empty")

    subtotal = sum(item['price'] * item['quantity'] for item in items)
    tax = subtotal * tax_rate
    return subtotal + tax
```

The extension will:
1. Extract function information (name, parameters, return type)
2. Analyze the code structure (branches, exceptions, etc.)
3. Prompt you for test description
4. Connect to the AI API
5. Generate comprehensive pytest tests

## Extension Settings

This extension contributes the following settings:

* `llt-assistant.apiProvider`: Choose API provider (`openai` or `claude`)
* `llt-assistant.apiKey`: Your API key for the selected provider
* `llt-assistant.modelName`: AI model to use for generation
* `llt-assistant.temperature`: Temperature for LLM generation (0-2)
* `llt-assistant.maxTokens`: Maximum tokens for LLM response

## Project Structure

```
.
├── src/
│   ├── analysis/         # Phase 2: Python AST analysis engine
│   │   ├── types.ts      # Type definitions for analysis
│   │   ├── pythonAstAnalyzer.ts  # Python subprocess wrapper
│   │   ├── contextBuilder.ts     # Stage 1 prompt builder
│   │   └── index.ts      # Analysis module exports
│   ├── api/              # API client and configuration
│   │   ├── client.ts     # LLM API client (OpenAI/Claude)
│   │   ├── config.ts     # Configuration manager
│   │   ├── errorHandler.ts  # Error handling
│   │   └── index.ts      # API module exports
│   ├── ui/               # User interface components
│   │   ├── dialogs.ts    # Dialog helpers
│   │   └── index.ts      # UI module exports
│   ├── utils/            # Utility functions
│   │   ├── codeAnalysis.ts  # Basic code analyzer (Phase 1)
│   │   └── index.ts      # Utils module exports
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Type definitions
│   ├── extension.ts      # Main extension entry point
│   └── test/             # Test files
│       ├── extension.test.ts     # Extension tests
│       └── analysis.test.ts      # Analysis engine tests
├── python/               # Python analysis scripts
│   └── ast_analyzer.py   # Core AST analysis engine
├── test_fixtures/        # Test case files
│   ├── test_case_1_simple.py
│   ├── test_case_2_branches.py
│   └── test_case_3_class.py
├── dist/                 # Compiled output
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── PHASE2_IMPLEMENTATION.md  # Phase 2 detailed documentation
└── README.md            # This file
```

## Development

### Available Scripts

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Watch mode (auto-recompile on changes)
pnpm run watch

# Run type checking
pnpm run check-types

# Run linter
pnpm run lint

# Run tests
pnpm run test

# Package for production
pnpm run package
```

### Development Workflow

1. Make changes to source files in `src/`
2. Run `pnpm run watch` for automatic compilation
3. Press `F5` in VSCode to launch Extension Development Host
4. Test your changes
5. Run `pnpm run lint` before committing

## Troubleshooting

### Common Issues

**"No active editor found"**
- Make sure you have a Python file open and in focus

**"Could not find a Python function"**
- Place your cursor inside a function definition
- Or select the entire function code including the `def` line

**"API key is required"**
- Add your API key in settings or when prompted
- Make sure the key is valid and has sufficient credits

**"Authentication failed"**
- Check that your API key is correct
- Verify the key hasn't expired
- Ensure you have credits available in your API account

**"Rate limit exceeded"**
- Wait a few moments and try again
- Consider upgrading your API plan for higher limits

## Architecture Overview

### Phase 1: Foundation (Complete)
- Extension scaffold with command registration
- Configuration management
- API client with OpenAI and Claude support
- Error handling and retry logic
- UI components for user interaction
- Basic code analysis utilities

### Phase 2: Python AST Analysis Engine (Complete)
- **AST Parser**: Python's `ast` module for accurate code parsing
- **Signature Extraction**: Parameters, types, decorators, return values
- **Body Analysis**: Branches, exceptions, external calls, complexity
- **Class Context**: Method detection, attributes, base classes
- **Context Builder**: Format analysis results for LLM consumption
- **TypeScript Integration**: Subprocess wrapper for seamless integration

See [PHASE2_IMPLEMENTATION.md](./PHASE2_IMPLEMENTATION.md) for detailed documentation.

### Phase 3: AI Agent Implementation (Coming Soon)
- **Stage 1 Agent**: Scenario identification and confirmation
- **Stage 2 Agent**: Test code generation
- Prompt engineering for optimal results
- Test file management and organization

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

[Your License Here]

## Release Notes

### 0.0.5 (Phase 5) - Optimization & Quality Assurance

**New Features:**
- 🎯 **Supplement Test Scenarios** - Add new tests to existing test files without regeneration
- 📊 **Multi-Stage Progress Feedback** - Clear progress indicators for each generation stage
- 👁️ **Enhanced Test Preview** - Review, edit, and customize tests before insertion
- ⚡ **Improved Performance** - Optimized API calls and token usage

**Quality Assurance:**
- ✅ Comprehensive unit tests for all core modules
- ✅ End-to-end integration tests
- ✅ Real-world validation suite with 8+ test scenarios
- ✅ Quality metrics and evaluation framework

**Documentation:**
- 📖 Complete User Guide with examples
- ❓ FAQ covering 27+ common questions
- 🎨 Best practices and tips
- 🔧 Troubleshooting guide

### 0.0.4 (Phase 4) - Test Code Generation

Complete test generation pipeline:
- Pytest code generation with best practices
- Code formatting and validation
- Syntax checking and error detection
- Dependency checking and installation prompts
- Test file creation and organization
- Conflict detection and resolution
- Multiple insert modes (append, replace, create new)

### 0.0.3 (Phase 3) - AI Agent System

Two-stage AI agent architecture:
- Stage 1: Intelligent scenario identification
- Stage 2: Production-ready test code generation
- Smart auto-confirmation logic
- Few-shot learning with examples
- Input validation and quality assessment
- User confirmation workflow
- Token tracking and cost estimation

### 0.0.2 (Phase 2) - Python AST Analysis

Python AST Analysis Engine:
- AST-based code parsing with Python's `ast` module
- Comprehensive function signature extraction
- Control flow analysis (branches, exceptions)
- External function call detection
- Class context recognition for methods
- Import statement analysis
- Docstring and comment extraction
- Cyclomatic complexity calculation

### 0.0.1 (Phase 1) - Foundation

Initial release with basic infrastructure:
- Right-click menu integration
- API client setup (OpenAI, Claude, DeepSeek, OpenRouter)
- Configuration management
- Basic code analysis utilities
- UI dialog components
- Error handling and retry mechanisms

---

## Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing issues on GitHub
3. Create a new issue with detailed information

**Enjoy automated test generation!** 🚀

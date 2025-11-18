# LLT Assistant - VSCode Extension for Python Testing

A powerful VSCode extension that combines AI-powered pytest test generation with intelligent quality analysis. Write better tests faster and catch quality issues before they become problems.

## Overview

LLT Assistant is a comprehensive testing toolkit that helps developers:

### 🧪 Test Generation
- **Automatically generate pytest unit tests** for Python functions using AI
- **Supplement existing tests** with additional test scenarios
- **Support for multiple LLM providers**: OpenAI, Claude, DeepSeek, OpenRouter
- **Backend API mode**: No API key required (recommended)

### 🔍 Quality Analysis
- **Detect test quality issues** automatically across your test suite
- **Smart fix suggestions** with one-click application
- **Visual feedback** with inline decorations and Activity Bar integration
- **Three analysis modes**: Rule-based, AI-powered, or Hybrid (best of both)

## Features

### ✨ Feature 1: Test Generation

#### Phase 1-5 (Complete) - Comprehensive Test Generation
- ✅ **Right-click context menu** integration for Python files
- ✅ **AST-based code analysis** using Python's `ast` module
- ✅ **Two-stage AI agent architecture** (Scenario Detection + Test Generation)
- ✅ **API integration** with OpenAI, Claude, DeepSeek, and OpenRouter
- ✅ **Backend API mode** - No API key required (recommended)
- ✅ **Complete pytest test generation** with best practices
- ✅ **Supplement existing tests** - Add new test scenarios without regeneration
- ✅ **Multi-stage progress feedback** with clear indicators
- ✅ **Enhanced test preview** - Review and edit before insertion
- ✅ **Smart auto-confirmation** for simple functions
- ✅ **Dependency checking** and conflict resolution
- ✅ **Comprehensive documentation** - User Guide, FAQ, and examples

### 🔍 Feature 2: Quality Analysis

#### Automatic Issue Detection
- ✅ **Smart test scanning** - Finds all `test_*.py` files in workspace
- ✅ **10+ issue types detected**:
  - Duplicate or trivial assertions
  - Missing or inadequate assertions
  - Unused fixtures and variables
  - Test mergeability opportunities
  - Unclear naming and code smells
- ✅ **Three analysis modes**:
  - `rules-only`: Fast rule-based analysis
  - `llm-only`: AI-powered deep analysis
  - `hybrid`: Combined approach (default, best results)

#### Visual Feedback
- ✅ **Activity Bar integration** with custom tree view
  - Issues grouped by file and severity
  - Summary statistics and metrics
  - Click to jump to code location
- ✅ **Inline decorations** in code editor
  - Red wavy underline: Critical errors 🔴
  - Yellow solid underline: Warnings 🟡
  - Blue dotted underline: Info/suggestions 🔵
- ✅ **Hover tooltips** with detailed information
- ✅ **Problems panel** integration

#### Smart Fix Suggestions
- ✅ **One-click fixes** via lightbulb icon 💡
- ✅ **Three fix types**:
  - Remove: Delete problematic code
  - Replace: Replace with suggested code
  - Add: Insert new code
- ✅ **Code preview** before applying
- ✅ **Explanation** for each suggestion

#### Status & Configuration
- ✅ **Status bar integration** with real-time updates
- ✅ **Flexible configuration** for analysis behavior
- ✅ **Severity filtering** - Choose which issues to see
- ✅ **Rule customization** - Disable specific rules

## Requirements

### For Users
- **VSCode**: Version 1.105.0 or higher
- **Python**: 3.8 or higher (for code analysis and test execution)

### For Test Generation (Backend Mode - Recommended)
- No API key required! Just install and use.
- Backend service: `https://llt-assistant.fly.dev`

### For Test Generation (Direct Mode - Optional)
Only if you prefer direct LLM API calls:
- An API key from one of:
  - **OpenAI**: gpt-4, gpt-4-turbo, gpt-3.5-turbo
  - **Anthropic Claude**: claude-3-opus, claude-3-sonnet, claude-3-haiku
  - **DeepSeek**: deepseek-chat, deepseek-coder
  - **OpenRouter**: Various models available

### For Quality Analysis
- Backend service running at `http://localhost:8000` (for local development)
- Or use production backend: `https://llt-assistant.fly.dev`

### For Development
- **Node.js**: 18 or higher
- **pnpm**: Package manager (recommended)

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

### Quick Start (Backend Mode - Recommended)

**No configuration needed!** The extension works out of the box using the LLT Assistant Backend API.

Just install the extension and start generating tests. No API key required.

### Advanced Configuration

Open VSCode Settings (`Ctrl+,` / `Cmd+,`) and search for "LLT Assistant":

#### Test Generation Settings

1. **API Mode** (`llt-assistant.apiMode`)
   - `backend` (default): Use LLT Assistant Backend API - **No API key required**
   - `direct`: Direct LLM API calls - Requires your own API key

2. **Backend URL** (`llt-assistant.backendUrl`)
   - Default: `https://llt-assistant.fly.dev/api/v1`
   - Change only if using a custom backend

3. **Direct Mode Settings** (only if using `direct` mode):
   - **API Provider** (`llt-assistant.apiProvider`): `openai`, `claude`, `deepseek`, or `openrouter`
   - **API Key** (`llt-assistant.apiKey`): Your LLM API key
   - **Model Name** (`llt-assistant.modelName`): e.g., `gpt-4`, `claude-3-opus-20240229`
   - **Temperature** (`llt-assistant.temperature`): 0-2 (default: 0.3)
   - **Max Tokens** (`llt-assistant.maxTokens`): Maximum response length (default: 2000)

#### Quality Analysis Settings

1. **Backend URL** (`llt-assistant.quality.backendUrl`)
   - Default: `http://localhost:8000/api/v1` (for local development)
   - Production: `https://llt-assistant.fly.dev/api/v1`

2. **Analysis Mode** (`llt-assistant.quality.analysisMode`)
   - `hybrid` (default): Rule engine + AI for uncertain cases - **Best results**
   - `rules-only`: Fast rule-based analysis
   - `llm-only`: AI-powered deep analysis

3. **Auto Analyze** (`llt-assistant.quality.autoAnalyze`)
   - `false` (default): Manual analysis only
   - `true`: Auto-analyze when opening test files

4. **Visual Settings**
   - **Enable Inline Decorations** (`llt-assistant.quality.enableInlineDecorations`): Show colored underlines (default: `true`)
   - **Enable Code Actions** (`llt-assistant.quality.enableCodeActions`): Show lightbulb fix suggestions (default: `true`)

5. **Filtering**
   - **Severity Filter** (`llt-assistant.quality.severityFilter`): Array of `["error", "warning", "info"]`
   - **Disabled Rules** (`llt-assistant.quality.disabledRules`): Array of rule IDs to disable, e.g., `["trivial-assertion"]`

6. **LLM Settings**
   - **LLM Temperature** (`llt-assistant.quality.llmTemperature`): 0-1 (default: 0.3)

### Getting API Keys (For Direct Mode Only)

If you choose to use Direct Mode, you'll need an API key:

**OpenAI:**
1. Visit https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy and save the key

**Anthropic Claude:**
1. Visit https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate and copy your key

**DeepSeek:**
1. Visit https://platform.deepseek.com/
2. Create an account and generate an API key

**OpenRouter:**
1. Visit https://openrouter.ai/
2. Sign up and get your API key

## Usage

### 🧪 Test Generation

#### Generate Tests for a Python Function

1. Open a Python file in VSCode
2. Place your cursor inside a function or select the function code
3. Right-click to open the context menu
4. Select **"Generate Tests"**
5. Enter a description of what you want to test (e.g., "test with valid and invalid inputs, edge cases")
6. Review proposed scenarios (if prompted) and confirm
7. Tests are automatically generated and inserted into your test file!

#### Supplement Existing Tests

1. Open your test file (e.g., `test_module.py`)
2. Right-click anywhere in the file
3. Select **"Supplement Test Scenarios"**
4. Review existing coverage
5. Enter description of new scenarios to add
6. New test methods are added without modifying existing tests!

### 🔍 Quality Analysis

#### Run Quality Analysis

**Method 1: Activity Bar (Recommended)**
1. Click the **LLT Quality** icon (🧪) in the left Activity Bar
2. Click the **"Analyze"** button at the top of the panel

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "LLT: Analyze Test Quality"
3. Press Enter

**Method 3: Status Bar**
1. Click the **"LLT Quality"** item in the bottom status bar

#### View and Understand Issues

After analysis completes, you'll see issues in multiple places:

**1. Activity Bar Tree View**
- Shows all issues grouped by file
- Displays severity (🔴 Error, 🟡 Warning, 🔵 Info)
- Click any issue to jump to the code location
- Shows summary statistics

**2. Code Editor**
- **Red wavy underline**: Critical errors that should be fixed
- **Yellow solid underline**: Warnings you should address
- **Blue dotted underline**: Informational suggestions
- Hover over underlined code to see issue details

**3. Problems Panel**
- Opens automatically if issues are found
- Filter by severity or file
- Click to navigate to issues

#### Apply Fix Suggestions

1. Navigate to a line with an issue (underlined)
2. A **lightbulb icon** 💡 appears in the left margin
   - Or press `Ctrl+.` (Windows/Linux) or `Cmd+.` (Mac)
3. Click the lightbulb to see available fixes
4. Select a fix to apply it instantly
5. The issue disappears once fixed!

**Fix Types:**
- **Remove**: Deletes problematic code (e.g., trivial assertions)
- **Replace**: Replaces code with improved version
- **Add**: Inserts missing code (e.g., missing assertions)

#### Clear Analysis Results

Click the **"Clear"** button ($(clear-all)) at the top of the Activity Bar panel to remove all issue markers.

### 📚 Documentation

#### Test Generation
- **[User Guide](./docs/USER_GUIDE.md)** - Complete guide with examples
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Prompt Design](./docs/PROMPT_DESIGN.md)** - How prompts work
- **[Flow Diagrams](./docs/FLOW_DIAGRAM.md)** - System architecture
- **[Phase 3 Details](./docs/PHASE3_README.md)** - Agent system documentation

#### Quality Analysis
- **[Quality Analysis Guide](./docs/QUALITY_ANALYSIS.md)** - Complete quality analysis documentation
  - Feature overview and usage
  - Configuration options
  - Issue types and detection
  - Troubleshooting guide

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

### Test Generation
* `llt-assistant.apiMode`: API mode - `backend` (recommended) or `direct`
* `llt-assistant.backendUrl`: Backend API URL (for backend mode)
* `llt-assistant.apiProvider`: LLM provider - `openai`, `claude`, `deepseek`, or `openrouter` (for direct mode)
* `llt-assistant.apiKey`: Your API key (for direct mode)
* `llt-assistant.modelName`: AI model to use (for direct mode)
* `llt-assistant.temperature`: Temperature for LLM generation 0-2 (for direct mode)
* `llt-assistant.maxTokens`: Maximum tokens for LLM response (for direct mode)

### Quality Analysis
* `llt-assistant.quality.backendUrl`: Backend API URL for quality analysis
* `llt-assistant.quality.analysisMode`: Analysis mode - `rules-only`, `llm-only`, or `hybrid`
* `llt-assistant.quality.autoAnalyze`: Auto-analyze when opening test files
* `llt-assistant.quality.enableInlineDecorations`: Show inline decorations
* `llt-assistant.quality.enableCodeActions`: Show quick fix suggestions
* `llt-assistant.quality.severityFilter`: Array of severity levels to display
* `llt-assistant.quality.disabledRules`: Array of rule IDs to disable
* `llt-assistant.quality.llmTemperature`: Temperature for LLM quality analysis 0-1

## Project Structure

```
.
├── src/
│   ├── agents/           # AI agent system for test generation
│   │   ├── agent-controller.ts      # Direct LLM agent controller
│   │   ├── backend-controller.ts    # Backend API agent controller
│   │   ├── llm-client.ts            # LLM API client wrapper
│   │   ├── prompt-builder.ts        # Prompt templates
│   │   ├── input-validator.ts       # Input validation
│   │   └── types.ts                 # Agent type definitions
│   ├── analysis/         # Python AST analysis engine
│   │   ├── pythonAstAnalyzer.ts     # Python subprocess wrapper
│   │   ├── contextBuilder.ts        # Stage 1 prompt builder
│   │   ├── types.ts                 # Analysis type definitions
│   │   └── index.ts                 # Analysis module exports
│   ├── api/              # API client and configuration
│   │   ├── client.ts                # Direct LLM API client
│   │   ├── backend-client.ts        # Backend API client
│   │   ├── config.ts                # Configuration manager
│   │   ├── errorHandler.ts          # Error handling
│   │   └── index.ts                 # API module exports
│   ├── generation/       # Test code generation
│   │   ├── test-generator.ts        # Test generation controller
│   │   ├── code-generator.ts        # Pytest code generator
│   │   ├── code-inserter.ts         # File insertion logic
│   │   ├── validator.ts             # Code validation
│   │   └── types.ts                 # Generation type definitions
│   ├── quality/          # Quality analysis feature
│   │   ├── activityBar/             # Activity Bar tree view
│   │   │   ├── provider.ts          # Tree data provider
│   │   │   └── types.ts             # Tree view types
│   │   ├── api/                     # Backend API client
│   │   │   ├── client.ts            # Quality API client
│   │   │   └── types.ts             # API type definitions
│   │   ├── commands/                # Quality commands
│   │   │   └── analyze.ts           # Analyze command
│   │   ├── decorations/             # Visual feedback
│   │   │   ├── inline.ts            # Inline decorations
│   │   │   └── suggestions.ts       # Code action provider
│   │   ├── utils/                   # Quality utilities
│   │   │   ├── config.ts            # Quality config manager
│   │   │   └── statusBar.ts         # Status bar manager
│   │   └── index.ts                 # Quality module exports
│   ├── commands/         # Extension commands
│   │   └── supplement-tests.ts      # Supplement tests command
│   ├── ui/               # User interface components
│   │   ├── dialogs.ts               # Dialog helpers
│   │   └── index.ts                 # UI module exports
│   ├── utils/            # Utility functions
│   │   ├── codeAnalysis.ts          # Basic code analyzer
│   │   ├── debugLogger.ts           # Debug logging
│   │   └── index.ts                 # Utils module exports
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts                 # Global type definitions
│   ├── extension.ts      # Main extension entry point
│   └── test/             # Test suites
│       ├── extension.test.ts        # Extension tests
│       ├── analysis.test.ts         # Analysis engine tests
│       ├── phase3-test.ts           # Agent system tests
│       ├── phase5-unit-tests.test.ts        # Unit tests
│       ├── phase5-integration-tests.test.ts # Integration tests
│       └── phase5-validation-suite.test.ts  # Validation suite
├── python/               # Python analysis scripts
│   └── ast_analyzer.py   # Core AST analysis engine
├── resources/            # Extension resources
│   └── icons/
│       └── llt-icon.svg  # Activity Bar icon
├── docs/                 # Documentation
│   ├── USER_GUIDE.md     # User guide
│   ├── FAQ.md            # FAQ
│   ├── QUALITY_ANALYSIS.md  # Quality analysis docs
│   ├── PROMPT_DESIGN.md     # Prompt design
│   ├── FLOW_DIAGRAM.md      # Flow diagrams
│   └── PHASE3_README.md     # Phase 3 details
├── test_fixtures/        # Test case files
├── dist/                 # Compiled output
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── CLAUDE.md             # Project context documentation
└── README.md             # This file
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

### Test Generation Architecture

The test generation feature uses a **two-stage AI agent architecture**:

**Stage 1: Scenario Detection Agent**
- Analyzes function code using Python AST
- Identifies test scenarios based on code structure
- Presents scenarios for user confirmation
- Auto-confirms for simple functions

**Stage 2: Test Generation Agent**
- Generates pytest code based on confirmed scenarios
- Applies best practices and code standards
- Validates syntax and dependencies
- Provides preview before insertion

**API Modes:**
- **Backend Mode (Default)**: Uses LLT Assistant Backend API
  - No API key required
  - Optimized prompts and token usage
  - Built-in rate limiting and error handling
- **Direct Mode (Optional)**: Direct LLM API calls
  - Requires user's own API key
  - Supports OpenAI, Claude, DeepSeek, OpenRouter
  - Full control over model and parameters

### Quality Analysis Architecture

The quality analysis feature provides intelligent test quality checking:

**Analysis Engine:**
- **Rule-based Engine**: Fast pattern matching for common issues
- **LLM Engine**: AI-powered deep analysis for complex cases
- **Hybrid Mode**: Combines both for best results

**Visual Feedback System:**
- **Activity Bar**: Custom tree view with issue overview
- **Inline Decorations**: Color-coded underlines in editor
- **Hover Tooltips**: Detailed issue information
- **Problems Panel**: Standard VSCode integration

**Code Action Provider:**
- Suggests fixes via lightbulb icon
- Three fix types: Remove, Replace, Add
- One-click application with preview

**Backend Integration:**
- RESTful API communication
- Health check and retry logic
- Request/response type safety
- Error handling and user feedback

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

[Your License Here]

## Release Notes

### 0.1.0 (Latest) - Quality Analysis Feature

**Major New Feature: Test Quality Analysis** 🔍

Automatically detect and fix quality issues in your pytest tests!

**Quality Analysis:**
- ✅ **10+ issue types detected**: Trivial assertions, missing assertions, unused fixtures, code smells, and more
- ✅ **Three analysis modes**: Rules-only (fast), LLM-only (deep), Hybrid (best of both)
- ✅ **Activity Bar integration**: Custom tree view with issues grouped by file
- ✅ **Inline decorations**: Color-coded underlines (red/yellow/blue) in code editor
- ✅ **Smart fix suggestions**: One-click fixes via lightbulb icon 💡
- ✅ **Status bar integration**: Real-time analysis status and issue counts
- ✅ **Problems panel**: Standard VSCode diagnostics integration
- ✅ **Configurable**: Filter by severity, disable rules, customize behavior

**Test Generation Improvements:**
- ✅ **Backend API mode**: No API key required (default mode)
- ✅ **Backend service**: Production-ready at `https://llt-assistant.fly.dev`
- ✅ **Improved UX**: Clearer progress indicators and error messages

**Documentation:**
- 📖 [Quality Analysis Guide](./docs/QUALITY_ANALYSIS.md) - Complete documentation
- 📝 Updated README with both features
- 🎯 Configuration examples and troubleshooting

### 0.0.5 - Test Generation Optimization

**Test Generation Features:**
- 🎯 **Supplement Test Scenarios** - Add new tests to existing test files
- 📊 **Multi-Stage Progress Feedback** - Clear progress indicators
- 👁️ **Enhanced Test Preview** - Review and edit before insertion
- ⚡ **Improved Performance** - Optimized API calls

**Quality Assurance:**
- ✅ Comprehensive unit tests for core modules
- ✅ End-to-end integration tests
- ✅ Real-world validation suite

**Documentation:**
- 📖 Complete User Guide with examples
- ❓ FAQ covering 27+ common questions
- 🎨 Best practices and tips

### 0.0.4 - Test Code Generation

- Pytest code generation with best practices
- Code formatting and validation
- Syntax checking and error detection
- Dependency checking
- Test file creation and organization
- Conflict detection and resolution

### 0.0.3 - AI Agent System

- Two-stage AI agent architecture
- Stage 1: Intelligent scenario identification
- Stage 2: Production-ready test code generation
- Smart auto-confirmation logic
- Few-shot learning with examples

### 0.0.2 - Python AST Analysis

- AST-based code parsing
- Comprehensive function signature extraction
- Control flow analysis
- External function call detection
- Class context recognition

### 0.0.1 - Foundation

- Right-click menu integration
- API client setup (OpenAI, Claude, DeepSeek, OpenRouter)
- Configuration management
- UI dialog components

---

## Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing issues on GitHub
3. Create a new issue with detailed information

**Enjoy automated test generation!** 🚀

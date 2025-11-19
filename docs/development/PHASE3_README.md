# Phase 3: Prompt Engineering & Agent System

## Overview

Phase 3 implements a two-stage AI agent system for intelligent test generation:

1. **Stage 1 - Information Gathering Agent**: Analyzes function code and user input to identify comprehensive test scenarios
2. **Stage 2 - Test Generation Agent**: Generates production-ready pytest test code

## Architecture

### Components

```
src/agents/
├── types.ts              # TypeScript interface definitions
├── prompt-builder.ts     # Prompt construction for both stages
├── llm-client.ts         # LLM API wrapper with retry logic
├── input-validator.ts    # User input validation and guidance
├── agent-controller.ts   # Pipeline orchestration
└── index.ts              # Module exports

prompts/
├── stage1_system_prompt.txt    # Stage 1 agent instructions
├── stage2_system_prompt.txt    # Stage 2 agent instructions
└── few_shot_examples.json      # Example inputs/outputs for both stages

docs/
├── PROMPT_DESIGN.md      # Detailed prompt engineering documentation
├── FLOW_DIAGRAM.md       # Visual flowcharts with Mermaid
└── PHASE3_README.md      # This file
```

## Key Features

### Stage 1: Information Gathering

- **Smart Scenario Identification**: Combines code analysis with user intent
- **Auto-Confirmation**: Skips user confirmation for simple functions or detailed descriptions
- **Confidence Scoring**: Rates each scenario as high/medium/low confidence
- **Source Attribution**: Tracks where each scenario came from (code/user/inference)

**Skip Confirmation When:**
- Function is simple (< 10 lines, no branches, no exceptions)
- User description is comprehensive (> 100 chars with specific scenarios)

### Stage 2: Test Generation

- **Production-Ready Code**: Generates runnable pytest tests without placeholders
- **Best Practices**: Follows pytest conventions (naming, AAA pattern, docstrings)
- **Smart Parametrization**: Uses `@pytest.mark.parametrize` for similar tests
- **Fixtures and Mocking**: Generates when needed for complex scenarios

**Output Guarantees:**
- 3-8 test cases
- Complete imports
- Clear docstrings
- Descriptive assertions

### Input Validation

Three quality levels guide users toward better descriptions:

- **Level 1** (< 30 chars): "Test login" → Show suggestions
- **Level 2** (30-100 chars): "Test login with valid/invalid credentials" → Good quality
- **Level 3** (> 100 chars): Detailed scenarios with edge cases → Excellent quality

## Usage

### Basic Usage (From Extension)

```typescript
import { AgentFlowController } from './agents';

const controller = new AgentFlowController(
  apiKey,
  'deepseek',  // or 'openai', 'claude', 'openrouter'
  'deepseek-chat'
);

// Run full pipeline with confirmation handler
const result = await controller.runFullPipeline(
  functionContext,
  userDescription,
  async (stage1Response) => {
    // Show confirmation dialog to user
    return {
      confirmed: true,
      cancelled: false,
      additionalScenarios: "Also test with very large numbers"
    };
  }
);

if (result.success) {
  console.log(`Generated ${result.stage2Response.test_count} tests`);
  console.log(`Test code:\n${result.stage2Response.test_code}`);
}
```

### Testing Stage 1 Only

```typescript
const stage1Response = await controller.executeStage1(
  functionContext,
  "Test addition with positive, negative, and zero values"
);

console.log('Identified scenarios:', stage1Response.identified_scenarios);
console.log('Skip confirmation:', stage1Response.skip_confirmation);
```

### Testing Stage 2 Only

```typescript
const stage2Response = await controller.executeStage2(
  functionContext,
  stage1Response,
  "Additional requirement: test with floating point numbers"
);

console.log('Generated test code:', stage2Response.test_code);
console.log('Test count:', stage2Response.test_count);
```

### Input Validation

```typescript
import { InputValidator } from './agents';

const validator = new InputValidator();

// Validate user input
const validation = validator.validateUserInput(userDescription);
console.log('Quality:', validation.quality);  // 'level1' | 'level2' | 'level3'
console.log('Suggestions:', validation.suggestions);

// Generate contextual guidance
const guidance = validator.generateInputGuidance(functionContext);
console.log('Placeholder:', guidance.placeholder);
console.log('Examples:', guidance.examples);
```

## Configuration

### Stage 1 Configuration

```typescript
const stage1Config = {
  maxIdentifiedScenarios: 5,        // Max high-priority scenarios
  maxSuggestedScenarios: 3,         // Max low-priority scenarios
  autoConfirmSimpleFunctions: true, // Skip confirmation for simple functions
  minDescriptionLengthForAutoConfirm: 100,
  temperature: 0.3,
  maxTokens: 2000
};
```

### Stage 2 Configuration

```typescript
const stage2Config = {
  minTestCount: 3,            // Minimum test cases
  maxTestCount: 8,            // Maximum test cases
  useParametrize: true,       // Use @pytest.mark.parametrize
  generateFixtures: true,     // Generate fixtures when needed
  temperature: 0.2,           // Lower temp for code generation
  maxTokens: 3000
};
```

## Testing

### Unit Tests (No API Required)

```bash
# Test input validation
npm run test -- --grep "InputValidator"

# Test prompt builders
npm run test -- --grep "PromptBuilder"
```

### Integration Tests (Requires API Key)

```bash
# Set API key
export DEEPSEEK_API_KEY="your-api-key"

# Run Phase 3 tests
node test-phase3.js
```

The test script will:
1. Test input validation (no API call)
2. Test prompt building (no API call)
3. Test Stage 1 with real API call
4. Test full pipeline with real API calls

### Manual Testing in VSCode

1. Open a Python file
2. Place cursor in a function
3. Right-click → "Generate Tests"
4. Enter test description
5. Confirm scenarios (if prompted)
6. View generated tests

## Performance

### Token Usage

Target allocation (per pipeline execution):
- Stage 1 input: ~1,500 tokens
- Stage 1 output: ~500 tokens
- Stage 2 input: ~2,000 tokens
- Stage 2 output: ~1,500 tokens
- **Total: ~5,500 tokens** (under 8,000 budget)

### Response Times

Expected times (with DeepSeek):
- Stage 1: < 10 seconds
- Stage 2: < 20 seconds
- **Total pipeline: < 30 seconds**

### Cost Estimates

With DeepSeek (very cost-effective):
- Input: $0.14 per 1M tokens
- Output: $0.28 per 1M tokens
- **Cost per pipeline: ~$0.001-0.002** (0.1-0.2 cents)

## Error Handling

The system handles:

1. **Network Errors**: Automatic retry with exponential backoff (max 3 retries)
2. **Rate Limiting**: Exponential backoff between retries
3. **Invalid JSON**: Extracts JSON from markdown code blocks
4. **Missing Fields**: Validates and provides helpful error messages
5. **API Errors**: User-friendly error messages with suggestions

## Prompt Engineering Techniques

The prompts use advanced techniques:

1. **Role-playing**: Define expert personas (Test Scenario Analyzer, Expert Test Engineer)
2. **Chain-of-thought**: Guide through analysis steps explicitly
3. **Constrained generation**: Strict JSON schema enforcement
4. **Confidence scoring**: Force model to assess certainty
5. **Decision trees**: Clear rules for skip/ask decisions
6. **Language style guidance**: Beginner-friendly, specific, actionable
7. **Explicit constraints**: State limits (max scenarios, test count)
8. **Validation checklists**: Include in prompts to reduce errors

## Known Limitations

1. **No streaming**: Responses are received all at once (could add streaming later)
2. **Single confirmation**: Maximum 1 confirmation dialog (by design)
3. **Token limits**: Very complex functions may exceed token limits
4. **Python only**: Currently only generates pytest tests (could extend to other frameworks)
5. **Unit tests only**: Doesn't generate integration or E2E tests yet

## Future Improvements

### Short-term
- Add streaming responses for better UX
- Cache common patterns to reduce tokens
- Dynamic few-shot examples based on function type

### Long-term
- Learn from user feedback (which scenarios were useful)
- Function type classifier (CRUD, validation, calculation, etc.)
- Support for other test frameworks (unittest, nose)
- Integration test generation
- Multi-file context analysis

## Documentation

- **[PROMPT_DESIGN.md](./PROMPT_DESIGN.md)**: Detailed prompt engineering documentation
- **[FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)**: Visual flowcharts with Mermaid diagrams

## Examples

### Example 1: Simple Function (Auto-confirm)

**Input:**
```python
def add(a: int, b: int) -> int:
    return a + b
```

**User Description:** "Test basic addition"

**Result:**
- Skip confirmation: ✓ Yes (simple function)
- Scenarios identified: 4
- Tests generated: 3 (using parametrize)
- Time: ~15 seconds
- Tokens: ~3,000

### Example 2: Complex Function (With Confirmation)

**Input:**
```python
def process_payment(amount: float, method: str) -> dict:
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if method == "credit_card":
        return {"status": "success", "fee": amount * 0.03}
    elif method == "paypal":
        return {"status": "success", "fee": amount * 0.05}
    else:
        raise ValueError("Invalid payment method")
```

**User Description:** "Test payment processing"

**Result:**
- Skip confirmation: ✗ No (complex function, brief description)
- Confirmation question shown: ✓
- Scenarios identified: 4 identified + 2 suggested
- User confirms: All scenarios
- Tests generated: 5
- Time: ~25 seconds
- Tokens: ~5,500

## Contributing

When modifying prompts or agents:

1. Update prompt files in `prompts/`
2. Add examples to `few_shot_examples.json`
3. Update `PROMPT_DESIGN.md` with rationale
4. Run tests to verify changes
5. Test with multiple LLM providers (DeepSeek, OpenAI, Claude)

## License

Part of LLT-Assistant VSCode Extension

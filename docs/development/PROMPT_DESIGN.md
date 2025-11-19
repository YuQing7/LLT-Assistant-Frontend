# Prompt Design Documentation - Phase 3

## Overview

This document explains the prompt engineering strategy for the two-stage agent system in the LLT Assistant VSCode extension. The system generates pytest test code through a two-stage pipeline:

1. **Stage 1**: Information Gathering Agent - Identifies test scenarios
2. **Stage 2**: Test Generation Agent - Generates pytest code

## Design Philosophy

### Core Principles

1. **Minimize User Friction**: Skip confirmation when possible (simple functions or detailed descriptions)
2. **Maximize Coverage**: Infer missing scenarios from code analysis
3. **Balance Completeness and Usability**: Ask for confirmation at most once
4. **Beginner-Friendly**: Use plain language, avoid jargon
5. **Production-Ready**: Generate runnable code without placeholders

### Quality Levels

We designed the system to transform user input through quality levels:

- **Level 1** (Minimal): <30 chars, e.g., "Test login"
- **Level 2** (Good): 30-100 chars with scenarios, e.g., "Test login with valid/invalid credentials"
- **Level 3** (Excellent): >100 chars with detailed scenarios and edge cases

**Goal**: Accept Level 1 input, guide users toward Level 2, and generate Level 3 quality tests.

## Stage 1: Information Gathering Agent

### Design Goals

1. **Scenario Identification**: Extract explicit and implicit test scenarios
2. **Smart Confirmation**: Skip when function is simple or description is comprehensive
3. **Gap Detection**: Identify missing edge cases and suggest them
4. **User-Friendly Questions**: Ask clear, concise confirmation questions

### System Prompt Structure

The Stage 1 system prompt (`stage1_system_prompt.txt`) contains:

1. **Role Definition**: Test Scenario Analyzer expert
2. **Analysis Process**:
   - Code structure analysis (branches, exceptions, calls)
   - User description integration
   - Scenario inference (edge cases, failure modes)
3. **Decision Logic**: When to skip confirmation vs. ask
4. **Output Schema**: Strict JSON format with all required fields
5. **Language Guidelines**: Beginner-friendly, specific, actionable

### Key Design Decisions

#### Auto-Confirmation Logic

Skip confirmation when:
```
(Function is simple) OR (User description is comprehensive)

Simple function = {
  - Lines of code < 10
  - Cyclomatic complexity = 1
  - No exception handling
}

Comprehensive description = {
  - Length >= 100 characters AND
  - Mentions multiple specific scenarios AND
  - Covers visible branches/edge cases
}
```

#### Scenario Limits

- **Identified scenarios**: 3-5 (high-priority, must-test)
- **Suggested scenarios**: 0-3 (optional, nice-to-have)
- **Total maximum**: 8 scenarios

Rationale: More than 8 scenarios overwhelms both LLM and user.

#### Confidence Levels

- **high**: Clearly evident from code or user description
- **medium**: Reasonably inferred from patterns
- **low**: Speculative but potentially important

### User Prompt Structure

The Stage 1 user prompt includes:

1. **Function Code**: Full source with syntax highlighting
2. **Function Context**: Metadata (name, params, return type, docstring)
3. **Code Analysis**: Branches, exceptions, complexity, external calls
4. **Class Context**: If method, include class info
5. **Relevant Imports**: Non-standard library imports
6. **User Description**: The test description provided
7. **Task Instruction**: Clear directive to analyze and respond

### Few-Shot Examples

We include 4 examples covering:

1. **Simple function**: Auto-confirm, no branches
2. **Complex function with brief description**: Ask for confirmation
3. **Detailed user description**: Auto-confirm despite complexity
4. **Exception handling**: Ask for confirmation on error scenarios

## Stage 2: Test Generation Agent

### Design Goals

1. **Production-Ready Code**: Generate pytest tests that run immediately
2. **Best Practices**: Follow pytest conventions (naming, AAA pattern, assertions)
3. **Appropriate Patterns**: Use parametrize for similar tests, fixtures when needed
4. **Comprehensive Coverage**: Cover all confirmed scenarios
5. **Clear Documentation**: Docstrings for all test functions

### System Prompt Structure

The Stage 2 system prompt (`stage2_system_prompt.txt`) contains:

1. **Role Definition**: Expert Python Test Engineer
2. **Naming Conventions**: pytest standards (`test_should_X_when_Y`)
3. **Test Structure**: AAA pattern (Arrange-Act-Assert)
4. **Code Quality Standards**:
   - Proper imports
   - Type hints where beneficial
   - Descriptive assertion messages
   - No placeholders or TODOs
5. **Advanced Patterns**:
   - `@pytest.mark.parametrize` for similar tests
   - Fixtures for shared setup
   - Mocking for external dependencies
6. **Output Schema**: JSON with test_code, imports, count, summary
7. **Best Practices Checklist**: Verification before output

### Key Design Decisions

#### Test Count Guidelines

- **3-4 tests**: Simple functions, few scenarios
- **5-6 tests**: Moderate complexity
- **7-8 tests**: Complex functions with many paths

Prefer parametrized tests over many separate functions.

#### Parametrization Strategy

Use `@pytest.mark.parametrize` when:
- Testing same behavior with different inputs
- Multiple edge cases for same scenario
- Boundary value testing

Don't use when:
- Different setup/teardown required
- Different assertion logic needed
- Scenarios are conceptually distinct

#### Assertion Best Practices

- Use `pytest.approx()` for floating-point comparisons
- Use `pytest.raises()` for exception testing with `match` parameter
- Include descriptive failure messages
- Test multiple aspects separately when appropriate

### User Prompt Structure

The Stage 2 user prompt includes:

1. **Function Code**: Full source
2. **Function Context**: Metadata
3. **Confirmed Scenarios**: List from Stage 1 with confidence/source
4. **User Additional Notes**: Any extra requirements from confirmation
5. **Available Imports**: Modules already imported in source
6. **Task Instruction**: Generate complete pytest code

### Few-Shot Examples

We include 3 examples demonstrating:

1. **Simple function**: Parametrized tests for basic operations
2. **Complex function**: Mixed parametrized and individual tests with exceptions
3. **Edge case handling**: Multiple edge cases with clear documentation

## Input Validation and Guidance

### Validation Strategy

The `InputValidator` class evaluates user descriptions on:

1. **Character count**: Minimum 10 chars required
2. **Word count**: Contextual analysis
3. **Scenario indicators**: Keywords like "including", "when", "case"
4. **Specific details**: Mentions of "empty", "null", "invalid", etc.
5. **Multiple scenarios**: Commas, lists, multiple clauses

### Quality Assessment Algorithm

```typescript
if (length >= 100 && multipleScenarios && specificDetails) {
  return 'level3'; // Excellent
} else if (length >= 30 && scenarioIndicators) {
  return 'level2'; // Good
} else {
  return 'level1'; // Minimal
}
```

### Contextual Guidance

The validator generates:

1. **Placeholder**: Contextual hint based on function complexity
2. **Prompt**: Guidance text with tips
3. **Examples**: 3 examples tailored to function characteristics

Example for complex function:
```
Placeholder: "Describe test scenarios for process_payment, including different paths and error cases..."
Prompt: "This function has multiple paths - consider mentioning different conditions to test. Include both normal cases and error scenarios."
Examples:
  1. "Test process_payment with valid inputs, invalid inputs, edge cases, and error conditions"
  2. "Cover all branches including happy path, boundary values, and exception handling"
  3. "Test: 1) Normal operation, 2) Invalid parameters, 3) Edge cases, 4) Error conditions"
```

## Response Parsing and Validation

### JSON Extraction

Both stages expect JSON responses. The parser:

1. Attempts direct JSON parsing
2. Falls back to extracting JSON from markdown code blocks
3. Validates all required fields
4. Checks field types and constraints

### Stage 1 Validation

Checks:
- `skip_confirmation`: boolean
- `proceed_to_generation`: boolean
- `identified_scenarios`: array with valid scenario objects
- `suggested_additional_scenarios`: array
- `confirmation_question`: non-empty string

### Stage 2 Validation

Checks:
- `test_code`: non-empty string containing `def test_`
- `imports`: array of strings
- `test_count`: positive number (3-8)
- `coverage_summary`: non-empty string

## Error Handling and Recovery

### Retry Strategy

The `AgentLLMClient` implements exponential backoff:
- Initial delay: 1 second
- Max retries: 3
- Backoff: 2^attempt seconds

### Common Failure Modes

1. **Invalid JSON**: Extract from code blocks, re-validate
2. **Missing fields**: Provide defaults where safe
3. **API rate limits**: Exponential backoff
4. **Network errors**: Retry with backoff

### Graceful Degradation

If Stage 1 fails:
- Fall back to basic scenario inference
- Proceed with conservative scenario list

If Stage 2 fails:
- Retry with modified prompt
- Suggest manual test writing as last resort

## Token Usage Optimization

### Prompt Compression

To stay under 8000 token budget:

1. **Function context**: Limit external calls to first 10
2. **Imports**: Show only non-standard library imports
3. **Few-shot examples**: Optional, excluded by default
4. **Code analysis**: Summarize instead of showing all details

### Token Allocation

Target distribution:
- **Stage 1 input**: ~1500 tokens
- **Stage 1 output**: ~500 tokens
- **Stage 2 input**: ~2000 tokens
- **Stage 2 output**: ~1500 tokens
- **Total**: ~5500 tokens (leaving 2500 buffer)

### Monitoring

The system tracks:
- Tokens per stage
- Total tokens
- Estimated cost
- Execution time

## Temperature Settings

### Stage 1: Temperature 0.3

Rationale: Need consistent, structured analysis but allow some creative inference for edge cases.

### Stage 2: Temperature 0.2

Rationale: Code generation requires high consistency and adherence to syntax rules. Lower temperature reduces hallucination and syntax errors.

## Future Improvements

### Short-term

1. Add few-shot examples dynamically based on function type
2. Cache common patterns to reduce tokens
3. Implement streaming responses for better UX

### Long-term

1. Learn from user feedback (which scenarios were useful)
2. Build function type classifier (CRUD, validation, calculation, etc.)
3. Generate integration tests in addition to unit tests
4. Support test frameworks beyond pytest (unittest, nose)

## References

- Prompt files: `/prompts/stage1_system_prompt.txt`, `/prompts/stage2_system_prompt.txt`
- Few-shot examples: `/prompts/few_shot_examples.json`
- Implementation: `/src/agents/`

## Appendix: Prompt Engineering Techniques Used

1. **Role-playing**: Define clear expert persona for each agent
2. **Few-shot learning**: Provide examples of desired output
3. **Chain-of-thought**: Guide through analysis steps
4. **Constrained generation**: Strict JSON schema enforcement
5. **Confidence scoring**: Force model to assess certainty
6. **Structured output**: Use markdown sections and code blocks
7. **Explicit constraints**: State limits (max scenarios, test count)
8. **Error prevention**: Include validation checklist in prompt
9. **Language style guidance**: Specify tone and vocabulary level
10. **Decision trees**: Provide clear rules for when to skip/ask

# LLT Assistant - User Guide

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Features](#features)
4. [Best Practices](#best-practices)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)

## Installation

### From VSCode Marketplace (Coming Soon)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "LLT Assistant"
4. Click Install

### Manual Installation (Development)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd LLT-Assistant-VScode
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Compile the extension:
   ```bash
   pnpm run compile
   ```

4. Open in VSCode and press F5 to launch

## Quick Start

### 1. Configure API Key

Before using LLT Assistant, you need to configure your API key:

**Option A: Via Settings**
1. Open VSCode Settings (File > Preferences > Settings)
2. Search for "LLT Assistant"
3. Select your API provider (OpenAI, Claude, DeepSeek, or OpenRouter)
4. Enter your API key
5. Choose your model (e.g., gpt-4, claude-3-opus)

**Option B: On First Use**
- The extension will prompt you to enter your API key when you first use it

### 2. Generate Your First Test

1. Open a Python file
2. Place your cursor inside a function
3. Right-click and select **"Generate Tests"**
4. Enter a description of what you want to test
   - Example: "test login with valid credentials, invalid password, and locked account"
5. Review the proposed test scenarios (if prompted)
6. Click "Yes" to proceed
7. Tests will be automatically generated and inserted into your test file!

### 3. Example Workflow

Given this Python function:

```python
def calculate_discount(price: float, discount_percent: float, is_member: bool = False) -> float:
    """Calculate final price after discount"""
    if price < 0:
        raise ValueError("Price cannot be negative")

    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Discount must be between 0 and 100")

    discount = price * (discount_percent / 100)

    if is_member:
        discount *= 1.1  # Extra 10% for members

    return price - discount
```

**Steps:**
1. Place cursor in the function
2. Right-click → "Generate Tests"
3. Enter description: "test with valid discounts, invalid inputs, and member bonus"
4. Review scenarios:
   - ✓ Test with valid price and discount
   - ✓ Test with negative price
   - ✓ Test with invalid discount percentage
   - ✓ Test member bonus discount
5. Generated test file (`test_module.py`):

```python
import pytest
from module import calculate_discount


class TestCalculateDiscount:
    def test_should_calculate_discount_when_valid_input(self):
        # Arrange
        price = 100.0
        discount = 20.0

        # Act
        result = calculate_discount(price, discount)

        # Assert
        assert result == 80.0

    def test_should_raise_error_when_price_is_negative(self):
        # Arrange
        price = -50.0
        discount = 10.0

        # Act & Assert
        with pytest.raises(ValueError, match="Price cannot be negative"):
            calculate_discount(price, discount)

    def test_should_raise_error_when_discount_is_invalid(self):
        # Arrange
        price = 100.0

        # Act & Assert
        with pytest.raises(ValueError, match="Discount must be between 0 and 100"):
            calculate_discount(price, 150.0)

    def test_should_apply_member_bonus_when_is_member_true(self):
        # Arrange
        price = 100.0
        discount = 20.0
        is_member = True

        # Act
        result = calculate_discount(price, discount, is_member)

        # Assert
        expected = 100.0 - (100.0 * 0.20 * 1.1)
        assert result == expected
```

## Features

### 1. Generate Tests

Generate comprehensive pytest tests for any Python function with minimal input.

**How to use:**
- Right-click on a function → "Generate Tests"
- Enter a description (50-200 words)
- Review and confirm scenarios
- Tests are automatically inserted

**Tips for better results:**
- Mention specific scenarios you want to test
- Include edge cases (e.g., "empty input", "null values")
- Specify error conditions
- Mention success and failure cases

### 2. Supplement Test Scenarios

Add new test cases to existing test files without regenerating everything.

**How to use:**
1. Open your test file (e.g., `test_module.py`)
2. Right-click → "Supplement Test Scenarios"
3. Review existing test coverage
4. Enter description of new scenarios to add
5. New test methods are added to your existing tests

**Example:**

Existing test:
```python
def test_should_add_positive_numbers():
    assert add(2, 3) == 5
```

Supplement with: "test with negative numbers and zero"

Generated addition:
```python
def test_should_add_negative_numbers():
    assert add(-2, -3) == -5

def test_should_add_with_zero():
    assert add(5, 0) == 5
    assert add(0, 5) == 5
```

### 3. Smart Scenario Detection

The AI automatically identifies test scenarios based on:
- Code structure (branches, exceptions)
- Your description
- Common testing patterns

**Auto-confirmation:**
Simple functions skip the confirmation dialog for faster workflow.

### 4. Production-Ready Code

Generated tests follow best practices:
- ✅ pytest naming conventions (`test_should_X_when_Y`)
- ✅ AAA pattern (Arrange-Act-Assert)
- ✅ Proper exception testing with `pytest.raises`
- ✅ Complete imports
- ✅ Docstrings and comments
- ✅ No placeholders or TODOs

### 5. Preview Before Insertion

Review generated tests before they're added to your codebase:
- See the complete test code
- Edit if needed
- Choose where to insert
- Copy to clipboard instead

### 6. Multi-Stage Progress Feedback

Clear progress indicators for each stage:
1. Analyzing function code... (10%)
2. Identifying test scenarios... (30%)
3. Generating test code... (60%)
4. Formatting and validating... (80%)
5. Inserting into file... (95%)

## Best Practices

### Writing Good Test Descriptions

**✅ Good Examples:**

```
"test login with correct password, wrong password, and locked account"
```
- Specific scenarios mentioned
- Covers success and failure cases
- Clear and concise

```
"test user creation with valid email, invalid email format, empty name,
and age validation (negative, too large, missing)"
```
- Detailed scenarios
- Mentions edge cases
- Covers data validation

**❌ Bad Examples:**

```
"test the function"
```
- Too vague
- No specific scenarios
- AI has to guess what you want

```
"test everything about this function including all possible inputs and outputs
and every edge case that could ever happen in any situation"
```
- Too verbose
- Not actionable
- Overwhelms the AI

### Tips for Better Results

1. **Be Specific**: Mention exact scenarios you want tested
2. **Include Edge Cases**: null, empty, zero, negative, large values
3. **Mention Error Conditions**: What should raise exceptions?
4. **Specify Data Types**: If testing with specific types matters
5. **Length**: Aim for 50-200 characters
6. **Use Examples**: "test with [specific example]"

### When to Use Supplement vs. Regenerate

**Use Supplement When:**
- You already have good tests
- You need to add specific new scenarios
- You want to preserve existing test structure
- You're adding edge cases you forgot

**Regenerate When:**
- Starting fresh
- Existing tests are inadequate
- Function has significantly changed
- You want a complete rewrite

## Advanced Usage

### Configuring Settings

Open VSCode Settings and search for "LLT Assistant":

| Setting | Description | Default |
|---------|-------------|---------|
| API Provider | OpenAI, Claude, DeepSeek, or OpenRouter | openai |
| Model Name | Specific model to use | gpt-4 |
| Temperature | Randomness (0-2) | 0.3 |
| Max Tokens | Response length limit | 2000 |

### Supported API Providers

#### OpenAI
- Models: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- Get API key: https://platform.openai.com/api-keys
- Recommended for: General use, best quality

#### Anthropic Claude
- Models: claude-3-opus, claude-3-sonnet, claude-3-haiku
- Get API key: https://console.anthropic.com/
- Recommended for: Complex functions, detailed tests

#### DeepSeek
- Models: deepseek-chat, deepseek-coder
- Get API key: https://platform.deepseek.com/
- Recommended for: Cost-effective, high volume

#### OpenRouter
- Access to multiple models
- Get API key: https://openrouter.ai/
- Recommended for: Flexibility, trying different models

### Testing Async Functions

LLT Assistant automatically detects async functions and generates appropriate async tests:

```python
async def fetch_data(url: str) -> dict:
    # ... async code ...
```

Generated test:
```python
import pytest

@pytest.mark.asyncio
async def test_should_fetch_data_when_valid_url():
    result = await fetch_data("https://api.example.com")
    assert result is not None
```

### Testing Class Methods

Right-click on a method inside a class:

```python
class UserManager:
    def create_user(self, name: str) -> dict:
        # ...
```

Generated test:
```python
class TestUserManager:
    def test_should_create_user_when_valid_name(self):
        manager = UserManager()
        result = manager.create_user("John Doe")
        assert result["name"] == "John Doe"
```

### Using Fixtures and Parametrize

The AI automatically uses pytest features when appropriate:

**Parametrize for similar tests:**
```python
@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (5, 6),
    (10, 11)
])
def test_should_increment_number(input, expected):
    assert increment(input) == expected
```

**Fixtures for setup:**
```python
@pytest.fixture
def sample_user():
    return {"name": "Test User", "email": "test@example.com"}

def test_should_validate_user(sample_user):
    assert validate_user(sample_user) is True
```

## Troubleshooting

### Common Issues

#### "No active editor found"
**Solution:** Make sure you have a Python file open and in focus

#### "Could not find a Python function"
**Solution:**
- Place your cursor inside the function definition
- Or select the entire function code including the `def` line

#### "API key is required"
**Solution:**
- Add your API key in Settings
- Ensure the key is valid and not expired
- Check that you have credits available

#### "Authentication failed"
**Solution:**
- Verify your API key is correct
- Check your API account has credits
- Try regenerating your API key

#### "Rate limit exceeded"
**Solution:**
- Wait a few moments before trying again
- Consider upgrading your API plan
- Use a different API provider

#### Generated tests have syntax errors
**Solution:**
- The extension validates syntax before insertion
- You can choose to insert anyway and fix manually
- Try regenerating with a clearer description
- Check if the original function has syntax issues

#### Tests don't match function behavior
**Solution:**
- Provide more detailed description
- Mention specific expected behaviors
- Use "Supplement" to add missing scenarios
- Review and edit the generated code

### Getting Help

1. Check the [FAQ](./FAQ.md) for common questions
2. Review [GitHub Issues](https://github.com/yourusername/LLT-Assistant-VScode/issues)
3. Create a new issue with:
   - Function code
   - Description you provided
   - Generated test code
   - Expected vs. actual behavior

## Performance Tips

- **Simple functions**: ~5-10 seconds
- **Complex functions**: ~20-30 seconds
- **Token usage**: Typically 3,000-6,000 tokens per generation
- **Cost**: ~$0.001-0.005 per generation (varies by provider)

### Optimizing Costs

1. Use **DeepSeek** for cost-effective generation
2. Be **specific** in descriptions to avoid regeneration
3. Use **Supplement** instead of regenerating
4. Choose **smaller models** for simple functions
5. Batch test generation during development

## Keyboard Shortcuts

Currently, there are no default keyboard shortcuts. You can add your own:

1. File > Preferences > Keyboard Shortcuts
2. Search for "LLT Assistant"
3. Click the + icon to add a keybinding

Example keybindings:
- Generate Tests: `Ctrl+Alt+T`
- Supplement Tests: `Ctrl+Alt+S`

## Next Steps

- Read the [FAQ](./FAQ.md) for more information
- Check out [example test cases](../test_fixtures/)
- Explore [Phase 5 features](./PHASE5_README.md)
- Contribute to the project on GitHub

---

**Need more help?** Visit our [GitHub repository](https://github.com/yourusername/LLT-Assistant-VScode) or create an issue.

# Frequently Asked Questions (FAQ)

## Table of Contents

- [General Questions](#general-questions)
- [Installation & Setup](#installation--setup)
- [Usage & Features](#usage--features)
- [API & Costs](#api--costs)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## General Questions

### Q1: What is LLT Assistant?

**A:** LLT Assistant is a VSCode extension that automatically generates pytest unit tests for Python functions using AI. Simply describe what you want to test, and the extension generates comprehensive, production-ready test code.

### Q2: Which AI models are supported?

**A:** LLT Assistant supports multiple AI providers:
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic Claude**: Claude 3 Opus, Sonnet, Haiku
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **OpenRouter**: Access to various models

### Q3: Do I need to write any tests manually?

**A:** No, but you can! LLT Assistant generates complete tests automatically. However, you can:
- Review and edit generated tests
- Use "Supplement" to add specific scenarios
- Customize the generated code to your needs

### Q4: What testing framework is supported?

**A:** Currently, LLT Assistant generates **pytest** tests only. Support for other frameworks (unittest, nose) is planned for future releases.

---

## Installation & Setup

### Q5: How do I get an API key?

**A:** Depending on your chosen provider:

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy and save the key securely

**Anthropic Claude:**
1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new API key

**DeepSeek:**
1. Go to https://platform.deepseek.com/
2. Create an account
3. Navigate to API Keys
4. Create and copy your key

### Q6: Is my API key secure?

**A:** Yes! Your API key is:
- Stored only in your local VSCode settings
- Never uploaded to any server (except the AI provider's API)
- Not shared with anyone
- Can be deleted at any time

**Best practices:**
- Use separate API keys for different projects
- Rotate your keys periodically
- Use API keys with spending limits
- Don't commit API keys to version control

### Q7: Can I use LLT Assistant offline?

**A:** No, LLT Assistant requires an internet connection to communicate with AI API providers. However, we're considering adding support for local LLM models in the future.

---

## Usage & Features

### Q8: The generated tests don't cover all edge cases. What should I do?

**A:** Try these approaches:

1. **Be more specific in your description:**
   - ❌ "test the function"
   - ✅ "test with null input, empty string, special characters, and large numbers"

2. **Use the Supplement feature:**
   - Generate initial tests
   - Review what's missing
   - Right-click → "Supplement Test Scenarios"
   - Describe the missing scenarios

3. **Edit the generated tests:**
   - Click "Preview & Insert"
   - Add additional test cases manually
   - Insert the modified code

### Q9: How do I test functions that depend on databases or external APIs?

**A:** LLT Assistant automatically detects external dependencies and generates appropriate mocks:

```python
# Your function
def fetch_user(user_id: str, db):
    return db.query(f"SELECT * FROM users WHERE id = {user_id}")
```

**In your description, mention mocking:**
```
"test user fetching with mocked database connection, including user found,
user not found, and database connection error"
```

**Generated test:**
```python
from unittest.mock import Mock, MagicMock
import pytest

def test_should_fetch_user_when_exists():
    # Arrange
    mock_db = Mock()
    mock_db.query.return_value = {"id": "123", "name": "John"}

    # Act
    result = fetch_user("123", mock_db)

    # Assert
    assert result["id"] == "123"
    mock_db.query.assert_called_once()
```

### Q10: Can I generate tests for class methods?

**A:** Yes! Just right-click on the method inside the class:

```python
class UserService:
    def create_user(self, name: str) -> dict:
        # ...
```

Right-click on `create_user` → "Generate Tests"

**Generated test:**
```python
class TestUserService:
    def test_should_create_user_when_valid_name(self):
        service = UserService()
        result = service.create_user("John")
        assert result is not None
```

### Q11: Can I generate tests for async functions?

**A:** Yes! LLT Assistant automatically detects `async` functions and generates appropriate async tests:

```python
async def fetch_data(url: str):
    # ...
```

**Generated test:**
```python
import pytest

@pytest.mark.asyncio
async def test_should_fetch_data_when_valid_url():
    result = await fetch_data("https://api.example.com")
    assert result is not None
```

### Q12: What is the "Supplement Test Scenarios" feature?

**A:** This feature allows you to add new test cases to existing test files without regenerating everything.

**Use case:**
- You already have tests for basic scenarios
- You want to add tests for edge cases you forgot
- You don't want to regenerate all existing tests

**How to use:**
1. Open your test file (e.g., `test_module.py`)
2. Right-click → "Supplement Test Scenarios"
3. Review current coverage
4. Describe new scenarios to add
5. New test methods are added to your file

**Example:**
```
Current coverage: valid input, empty input
New scenarios: test with null values, test with special characters
```

New tests are added without touching existing ones!

---

## API & Costs

### Q13: How much does it cost to generate tests?

**A:** Costs vary by provider and model:

| Provider | Model | Cost per 1M tokens (input/output) | Est. per generation |
|----------|-------|-----------------------------------|---------------------|
| OpenAI | GPT-4 | $30 / $60 | $0.02 - $0.05 |
| OpenAI | GPT-3.5 Turbo | $1.50 / $2 | $0.001 - $0.003 |
| Claude | Claude 3 Opus | $15 / $75 | $0.01 - $0.03 |
| Claude | Claude 3 Sonnet | $3 / $15 | $0.002 - $0.005 |
| DeepSeek | DeepSeek Chat | $0.14 / $0.28 | $0.0005 - $0.002 |

**Average usage:** 3,000-6,000 tokens per test generation

**Cost-saving tips:**
- Use DeepSeek for most cases (cheapest)
- Use GPT-3.5 Turbo instead of GPT-4
- Be specific in descriptions to avoid regeneration
- Use "Supplement" instead of full regeneration

### Q14: Can I use a local LLM instead of API?

**A:** Not yet. This feature is planned for future releases. We're considering support for:
- Ollama (local models)
- LM Studio
- LocalAI
- Other local inference servers

### Q15: What happens if I run out of API credits?

**A:** The extension will show an error message indicating insufficient credits. You'll need to:
1. Add credits to your API account
2. Or switch to a different API provider
3. Or use a different API key

---

## Troubleshooting

### Q16: The generated tests have syntax errors. What should I do?

**A:** This can happen occasionally. Try these solutions:

1. **Validation warning:**
   - The extension validates syntax before insertion
   - If errors are found, you'll see a warning
   - You can choose "Insert Anyway" and fix manually

2. **Regenerate with better description:**
   - Click "Cancel"
   - Try again with a more specific description
   - Mention the issue you're seeing

3. **Check original function:**
   - Make sure your function code is syntactically correct
   - Fix any issues in the original function first

4. **Manual fixes:**
   - Insert the code anyway
   - Fix syntax errors manually
   - Run `pytest --collect-only` to verify

### Q17: The tests run but fail. Are they wrong?

**A:** Not necessarily! Consider:

1. **Test correctness:**
   - Review the test logic
   - Does it match the actual function behavior?
   - Are the expected values correct?

2. **Function bugs:**
   - The tests might have found a bug!
   - Review your function implementation
   - Fix the function or update the test

3. **Missing dependencies:**
   - Check if test dependencies are installed
   - Run: `pip install pytest pytest-asyncio` (if testing async)
   - Install any mocking libraries needed

4. **Environment issues:**
   - Check if test environment is set up correctly
   - Verify imports work
   - Check PYTHONPATH

### Q18: "Could not find a Python function" error

**A:** This error occurs when the extension can't identify the function. Try:

1. **Place cursor correctly:**
   - Put your cursor inside the function body
   - Or on the `def` line

2. **Select the function:**
   - Select the entire function code
   - Include the `def` line and full body
   - Right-click on the selection

3. **Check file type:**
   - Ensure the file has `.py` extension
   - VSCode should recognize it as Python
   - Check the language mode in bottom-right corner

### Q19: Tests are not inserted into the correct file

**A:** LLT Assistant follows Python testing conventions:

| Source File | Test File |
|-------------|-----------|
| `module.py` | `test_module.py` |
| `utils/helper.py` | `tests/test_helper.py` or `utils/test_helper.py` |

**If tests go to wrong location:**
1. Manually create the test file first
2. Or move the generated code to the correct file
3. Check your project structure matches conventions

### Q20: "Rate limit exceeded" error

**A:** This means you've made too many API requests. Solutions:

1. **Wait and retry:**
   - Wait 1-5 minutes
   - Try again

2. **Upgrade API plan:**
   - Most providers have tiered rate limits
   - Upgrade to a higher tier

3. **Use different provider:**
   - Switch to another API provider temporarily
   - Different providers have different limits

4. **Batch your requests:**
   - Don't generate tests for all functions at once
   - Do them one at a time with pauses

---

## Advanced Topics

### Q21: Can I customize the generated test code style?

**A:** Currently, tests follow standard pytest conventions. Future versions will support:
- Custom naming conventions
- Code style preferences (PEP8, Black, custom)
- Assertion style preferences
- Comment/docstring preferences

**Workaround for now:**
- Use "Preview & Insert" to review code
- Edit before inserting
- Set up code formatters (Black, autopep8) to auto-format

### Q22: How do I use LLT Assistant in CI/CD pipelines?

**A:** LLT Assistant is an interactive development tool. For CI/CD:

**During development:**
- Generate tests with LLT Assistant
- Commit generated tests to version control
- Review tests in pull requests

**In CI/CD:**
- Run the generated tests like normal pytest tests
- No need to run LLT Assistant in CI

**Example GitHub Actions:**
```yaml
- name: Run tests
  run: |
    pip install pytest
    pytest tests/
```

### Q23: Can I contribute to LLT Assistant?

**A:** Yes! We welcome contributions:

1. **Report issues:** https://github.com/yourusername/LLT-Assistant-VScode/issues
2. **Submit pull requests:** Fork the repo and submit PRs
3. **Improve documentation:** Help others with better docs
4. **Share feedback:** Tell us what works and what doesn't

### Q24: What's the difference between "Generate Tests" and "Supplement Test Scenarios"?

**A:**

| Feature | Generate Tests | Supplement Test Scenarios |
|---------|---------------|---------------------------|
| **Use case** | Create new tests from scratch | Add to existing tests |
| **When to use** | First time generating tests | Adding more scenarios later |
| **Input** | Original function code | Existing tests + function code |
| **Output** | Complete test file | New test methods only |
| **Overwrites** | Creates new file or replaces | Appends to existing file |
| **Cost** | Higher (more tokens) | Lower (fewer tokens) |

### Q25: Can I generate integration tests or only unit tests?

**A:** Currently, LLT Assistant focuses on unit tests. However:

**You can describe integration scenarios:**
```
"test user registration flow including database insertion,
email sending, and session creation"
```

The AI will generate tests with appropriate mocks.

**True integration tests:**
- Not yet supported automatically
- You'll need to adapt generated tests
- Replace mocks with real dependencies

### Q26: Does LLT Assistant learn from my feedback?

**A:** Not yet. Each generation is independent. Future versions may include:
- Learning from user edits
- Remembering project preferences
- Team-wide style consistency

**Current workaround:**
- Document your testing conventions
- Include them in descriptions: "follow our style: use Given-When-Then comments"

### Q27: Can I use LLT Assistant with test frameworks other than pytest?

**A:** Currently, only pytest is supported. However, you can:

1. **Generate pytest tests**
2. **Convert manually to unittest:**
   ```python
   # Generated pytest
   def test_should_return_true():
       assert function() is True

   # Convert to unittest
   import unittest

   class TestMyFunction(unittest.TestCase):
       def test_should_return_true(self):
           self.assertTrue(function())
   ```

3. **Use both frameworks:**
   - Keep pytest tests from LLT Assistant
   - Add unittest tests manually if needed

---

## Still Have Questions?

- Check the [User Guide](./USER_GUIDE.md) for detailed instructions
- Search [existing GitHub issues](https://github.com/yourusername/LLT-Assistant-VScode/issues)
- Create a [new issue](https://github.com/yourusername/LLT-Assistant-VScode/issues/new) with:
  - Your question
  - VSCode version
  - Extension version
  - API provider and model
  - Example code (if applicable)

---

**Last updated:** Phase 5 (January 2025)

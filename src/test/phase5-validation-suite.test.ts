/**
 * Phase 5 Real-World Validation Test Suite
 *
 * This suite tests the plugin with real-world Python functions
 * to evaluate the quality of generated tests.
 */

import * as assert from 'assert';

/**
 * Quality metrics for evaluating generated tests
 */
interface QualityMetrics {
  syntaxValid: boolean;
  runnable: boolean;
  coverageEstimate: number; // 0-100
  assertionsCount: number;
  scenariosCovered: string[];
  issues: string[];
}

/**
 * Validation test case
 */
interface ValidationCase {
  name: string;
  functionCode: string;
  userDescription: string;
  expectedScenarios: string[];
  category: string;
}

/**
 * Validation report
 */
interface ValidationReport {
  totalCases: number;
  passedCases: number;
  averageQuality: Partial<QualityMetrics>;
  failedCases: Array<{ case: ValidationCase; reason: string }>;
}

/**
 * Real-world validation test cases
 */
const VALIDATION_CASES: ValidationCase[] = [
  // Category: CRUD Operations
  {
    name: 'User Creation Function',
    category: 'CRUD',
    functionCode: `
def create_user(name: str, email: str, age: int = None) -> dict:
    """
    Create a new user with validation

    Args:
        name: User's full name
        email: User's email address
        age: User's age (optional)

    Returns:
        Dictionary containing user data

    Raises:
        ValueError: If validation fails
    """
    if not name or len(name.strip()) == 0:
        raise ValueError("Name cannot be empty")

    if "@" not in email or "." not in email:
        raise ValueError("Invalid email format")

    if age is not None and (age < 0 or age > 150):
        raise ValueError("Age must be between 0 and 150")

    return {
        "name": name.strip(),
        "email": email.lower(),
        "age": age,
        "created_at": "2024-01-01T00:00:00Z"
    }
`,
    userDescription: 'test user creation with valid and invalid inputs, including empty name, invalid email, invalid age',
    expectedScenarios: [
      'valid input',
      'empty name',
      'invalid email',
      'invalid age (negative)',
      'invalid age (too large)',
      'missing age (optional parameter)'
    ]
  },

  // Category: Data Processing
  {
    name: 'Calculate Shipping Cost',
    category: 'Business Logic',
    functionCode: `
def calculate_shipping(weight: float, distance: float, is_premium: bool = False) -> float:
    """
    Calculate shipping cost based on weight, distance, and customer tier

    Args:
        weight: Package weight in kg
        distance: Shipping distance in km
        is_premium: Whether customer has premium membership

    Returns:
        Shipping cost in USD

    Raises:
        ValueError: If weight or distance is invalid
    """
    if weight <= 0:
        raise ValueError("Weight must be positive")

    if distance <= 0:
        raise ValueError("Distance must be positive")

    # Base cost calculation
    base_cost = weight * 0.5 + distance * 0.1

    # Weight surcharge for heavy items
    if weight > 20:
        base_cost += (weight - 20) * 0.3

    # Distance surcharge for long distances
    if distance > 100:
        base_cost += (distance - 100) * 0.05

    # Premium discount
    if is_premium:
        base_cost *= 0.8

    return round(base_cost, 2)
`,
    userDescription: 'test shipping calculation for normal weight/distance, heavy packages, long distances, premium customers, and invalid inputs',
    expectedScenarios: [
      'normal weight and distance',
      'heavy package (> 20kg)',
      'long distance (> 100km)',
      'premium customer discount',
      'invalid weight (zero or negative)',
      'invalid distance (zero or negative)',
      'combination of heavy + long + premium'
    ]
  },

  // Category: Math/Algorithm
  {
    name: 'Safe Division',
    category: 'Math',
    functionCode: `
def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers with error handling

    Args:
        numerator: The number to divide
        denominator: The number to divide by
        default: Value to return if division fails

    Returns:
        Result of division or default value
    """
    try:
        if denominator == 0:
            return default
        result = numerator / denominator
        return round(result, 10)  # Avoid floating point errors
    except (TypeError, ValueError):
        return default
`,
    userDescription: 'test division with normal numbers, division by zero, and invalid input types',
    expectedScenarios: [
      'normal division',
      'division by zero',
      'negative numbers',
      'large numbers',
      'decimal numbers',
      'invalid input types'
    ]
  },

  // Category: External Dependencies
  {
    name: 'Fetch User Data (requires mocking)',
    category: 'External Dependencies',
    functionCode: `
def fetch_user_data(user_id: str, db_connection) -> dict:
    """
    Fetch user data from database

    Args:
        user_id: User's unique identifier
        db_connection: Database connection object

    Returns:
        User data dictionary

    Raises:
        ValueError: If user_id is invalid
        RuntimeError: If database query fails
    """
    if not user_id or not user_id.strip():
        raise ValueError("User ID cannot be empty")

    try:
        query = f"SELECT * FROM users WHERE id = '{user_id}'"
        result = db_connection.execute(query)

        if not result:
            raise ValueError(f"User not found: {user_id}")

        return {
            "id": result.id,
            "name": result.name,
            "email": result.email
        }
    except Exception as e:
        raise RuntimeError(f"Database error: {str(e)}")
`,
    userDescription: 'test user data fetching with mocked database, including valid user, user not found, and database errors',
    expectedScenarios: [
      'user exists in database',
      'user not found',
      'empty user_id',
      'database connection error',
      'database query error'
    ]
  },

  // Category: Async Functions
  {
    name: 'Async Email Sending',
    category: 'Async',
    functionCode: `
async def send_email(to: str, subject: str, body: str, retry_count: int = 3) -> bool:
    """
    Send email asynchronously with retry logic

    Args:
        to: Recipient email address
        subject: Email subject
        body: Email body
        retry_count: Number of retries on failure

    Returns:
        True if email sent successfully

    Raises:
        ValueError: If email address is invalid
    """
    import re

    # Validate email
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, to):
        raise ValueError(f"Invalid email address: {to}")

    if not subject or not body:
        raise ValueError("Subject and body cannot be empty")

    # Simulate sending with retries
    for attempt in range(retry_count):
        try:
            # await send_via_smtp(to, subject, body)
            return True
        except Exception:
            if attempt == retry_count - 1:
                return False
            continue

    return False
`,
    userDescription: 'test async email sending with valid email, invalid email, empty subject/body, and retry logic',
    expectedScenarios: [
      'valid email sent successfully',
      'invalid email address',
      'empty subject',
      'empty body',
      'send failure with retry',
      'multiple retries'
    ]
  },

  // Category: Complex Validation
  {
    name: 'Password Validator',
    category: 'Validation',
    functionCode: `
def validate_password(password: str) -> dict:
    """
    Validate password strength

    Args:
        password: Password to validate

    Returns:
        Dictionary with 'valid' boolean and 'errors' list
    """
    errors = []

    if len(password) < 8:
        errors.append("Password must be at least 8 characters")

    if len(password) > 128:
        errors.append("Password must not exceed 128 characters")

    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")

    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one digit")

    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if not any(c in special_chars for c in password):
        errors.append("Password must contain at least one special character")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }
`,
    userDescription: 'test password validation for weak passwords, strong passwords, and edge cases',
    expectedScenarios: [
      'valid strong password',
      'too short',
      'too long',
      'missing uppercase',
      'missing lowercase',
      'missing digit',
      'missing special character',
      'multiple violations'
    ]
  },

  // Category: Data Transformation
  {
    name: 'Parse CSV Row',
    category: 'Data Processing',
    functionCode: `
def parse_csv_row(row: str, delimiter: str = ',') -> list:
    """
    Parse a CSV row handling quoted fields

    Args:
        row: CSV row string
        delimiter: Field delimiter (default: comma)

    Returns:
        List of field values

    Raises:
        ValueError: If row format is invalid
    """
    if not row:
        return []

    fields = []
    current_field = ""
    in_quotes = False

    for i, char in enumerate(row):
        if char == '"':
            in_quotes = not in_quotes
        elif char == delimiter and not in_quotes:
            fields.append(current_field.strip())
            current_field = ""
        else:
            current_field += char

    # Add last field
    fields.append(current_field.strip())

    # Check for unclosed quotes
    if in_quotes:
        raise ValueError("Unclosed quote in CSV row")

    return fields
`,
    userDescription: 'test CSV parsing with quoted fields, different delimiters, empty fields, and invalid formats',
    expectedScenarios: [
      'simple comma-separated values',
      'quoted fields',
      'empty fields',
      'different delimiter',
      'unclosed quotes',
      'empty row'
    ]
  },

  // Category: State Management
  {
    name: 'Shopping Cart Manager',
    category: 'State Management',
    functionCode: `
class ShoppingCart:
    def add_item(self, item_id: str, quantity: int, price: float) -> dict:
        """
        Add item to shopping cart

        Args:
            item_id: Unique item identifier
            quantity: Number of items to add
            price: Price per item

        Returns:
            Updated cart summary

        Raises:
            ValueError: If inputs are invalid
        """
        if not item_id:
            raise ValueError("Item ID is required")

        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        if price < 0:
            raise ValueError("Price cannot be negative")

        # Add to cart (simplified)
        if not hasattr(self, '_items'):
            self._items = {}

        if item_id in self._items:
            self._items[item_id]['quantity'] += quantity
        else:
            self._items[item_id] = {
                'quantity': quantity,
                'price': price
            }

        total = sum(item['quantity'] * item['price'] for item in self._items.values())

        return {
            'item_count': len(self._items),
            'total_quantity': sum(item['quantity'] for item in self._items.values()),
            'total_price': round(total, 2)
        }
`,
    userDescription: 'test adding items to cart, updating quantities, and handling invalid inputs',
    expectedScenarios: [
      'add new item',
      'add to existing item',
      'invalid item_id',
      'invalid quantity (zero or negative)',
      'invalid price (negative)',
      'multiple items in cart'
    ]
  }
];

/**
 * Evaluate test code quality
 */
function evaluateTestQuality(generatedCode: string, functionCode: string): QualityMetrics {
  const metrics: QualityMetrics = {
    syntaxValid: true,
    runnable: false,
    coverageEstimate: 0,
    assertionsCount: 0,
    scenariosCovered: [],
    issues: []
  };

  try {
    // Check basic syntax
    if (!generatedCode.includes('def test_')) {
      metrics.syntaxValid = false;
      metrics.issues.push('No test functions found');
    }

    // Count assertions
    const assertMatches = generatedCode.match(/assert\s+/g) || [];
    metrics.assertionsCount = assertMatches.length;

    if (metrics.assertionsCount === 0) {
      metrics.issues.push('No assertions found');
    }

    // Check for pytest imports
    if (!generatedCode.includes('import pytest') && !generatedCode.includes('from pytest')) {
      if (generatedCode.includes('pytest.')) {
        metrics.issues.push('Uses pytest but missing import');
      }
    }

    // Check for proper exception testing if function has exceptions
    if (functionCode.includes('raise ')) {
      if (!generatedCode.includes('pytest.raises') && !generatedCode.includes('with pytest.raises')) {
        metrics.issues.push('Function raises exceptions but tests do not check them');
      }
    }

    // Estimate coverage based on test count
    const testCount = (generatedCode.match(/def test_/g) || []).length;
    metrics.coverageEstimate = Math.min(testCount * 15, 95); // Rough estimate

    // Extract test scenario names
    const testMethodMatches = generatedCode.matchAll(/def (test_[\w_]+)/g);
    for (const match of testMethodMatches) {
      const methodName = match[1].replace(/^test_/, '').replace(/_/g, ' ');
      metrics.scenariosCovered.push(methodName);
    }

    // Check if runnable (basic checks)
    metrics.runnable = metrics.syntaxValid &&
                       metrics.assertionsCount > 0 &&
                       generatedCode.includes('def test_');

  } catch (error) {
    metrics.syntaxValid = false;
    metrics.issues.push(`Evaluation error: ${error}`);
  }

  return metrics;
}

/**
 * Run validation suite
 */
function runValidationSuite(
  testResults: Array<{ case: ValidationCase; generatedCode: string }>
): ValidationReport {
  const report: ValidationReport = {
    totalCases: testResults.length,
    passedCases: 0,
    averageQuality: {
      assertionsCount: 0,
      coverageEstimate: 0,
      scenariosCovered: []
    },
    failedCases: []
  };

  let totalAssertions = 0;
  let totalCoverage = 0;
  const allScenarios: string[] = [];

  for (const result of testResults) {
    const metrics = evaluateTestQuality(result.generatedCode, result.case.functionCode);

    if (metrics.runnable && metrics.assertionsCount >= result.case.expectedScenarios.length * 0.5) {
      report.passedCases++;
    } else {
      report.failedCases.push({
        case: result.case,
        reason: metrics.issues.join('; ') || 'Quality threshold not met'
      });
    }

    totalAssertions += metrics.assertionsCount;
    totalCoverage += metrics.coverageEstimate;
    allScenarios.push(...metrics.scenariosCovered);
  }

  report.averageQuality = {
    assertionsCount: Math.round(totalAssertions / testResults.length),
    coverageEstimate: Math.round(totalCoverage / testResults.length),
    scenariosCovered: allScenarios
  };

  return report;
}

suite('Phase 5 Real-World Validation Suite', () => {

  test('Validation cases are well-defined', () => {
    assert.ok(VALIDATION_CASES.length >= 5, 'Should have at least 5 validation cases');

    for (const testCase of VALIDATION_CASES) {
      assert.ok(testCase.name, 'Each case should have a name');
      assert.ok(testCase.functionCode, 'Each case should have function code');
      assert.ok(testCase.userDescription, 'Each case should have user description');
      assert.ok(testCase.expectedScenarios.length > 0, 'Each case should have expected scenarios');
      assert.ok(testCase.category, 'Each case should have a category');
    }
  });

  test('Quality evaluation function works correctly', () => {
    const mockGeneratedCode = `
import pytest

def test_should_add_numbers():
    result = add(2, 3)
    assert result == 5

def test_should_handle_negative():
    result = add(-2, -3)
    assert result == -5

def test_should_raise_on_invalid():
    with pytest.raises(ValueError):
        add("invalid", 5)
`;

    const mockFunctionCode = `
def add(a, b):
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise ValueError("Invalid input")
    return a + b
`;

    const metrics = evaluateTestQuality(mockGeneratedCode, mockFunctionCode);

    assert.strictEqual(metrics.syntaxValid, true);
    assert.strictEqual(metrics.runnable, true);
    assert.ok(metrics.assertionsCount >= 3);
    assert.strictEqual(metrics.scenariosCovered.length, 3);
    assert.ok(metrics.issues.length === 0, `Should have no issues, but got: ${metrics.issues.join(', ')}`);
  });

  test('Quality evaluation detects missing assertions', () => {
    const badCode = `
import pytest

def test_something():
    result = my_function()
    # No assertion!
`;

    const metrics = evaluateTestQuality(badCode, 'def my_function(): pass');

    assert.strictEqual(metrics.runnable, false);
    assert.ok(metrics.issues.some(issue => issue.includes('No assertions')));
  });

  test('Quality evaluation detects missing exception tests', () => {
    const codeWithoutExceptionTests = `
import pytest

def test_normal_case():
    result = divide(10, 2)
    assert result == 5
`;

    const functionWithExceptions = `
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
`;

    const metrics = evaluateTestQuality(codeWithoutExceptionTests, functionWithExceptions);

    assert.ok(metrics.issues.some(issue => issue.includes('raises exceptions')));
  });

  // This test would actually run the validation suite with real API calls
  // Skipped in normal test runs, can be run manually for validation
  test.skip('Run full validation suite with API', async function() {
    this.timeout(600000); // 10 minutes for all test cases

    const apiKey = process.env.OPENAI_API_KEY ||
                   process.env.ANTHROPIC_API_KEY ||
                   process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.log('Skipping - no API key configured');
      return;
    }

    console.log('\n========================================');
    console.log('VALIDATION SUITE EXECUTION');
    console.log('========================================\n');

    const { AgentFlowController } = require('../agents');
    const provider = process.env.OPENAI_API_KEY ? 'openai' :
                    process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';
    const controller = new AgentFlowController(apiKey, provider, 'gpt-3.5-turbo');

    const results: Array<{ case: ValidationCase; generatedCode: string }> = [];

    for (const testCase of VALIDATION_CASES) {
      console.log(`\nTesting: ${testCase.name} (${testCase.category})`);
      console.log(`Expected scenarios: ${testCase.expectedScenarios.length}`);

      try {
        // Create mock function context
        const functionContext: any = {
          signature: { name: 'test_function', parameters: [], return_type: 'None' },
          body_analysis: { branches: [], exceptions: [], external_calls: [], complexity: 1 },
          documentation: { docstring: '', inline_comments: [] },
          class_context: null,
          imports: [],
          source_code: testCase.functionCode,
          module_path: 'test_module',
          file_path: '/test.py'
        };

        const result = await controller.runFullPipeline(
          functionContext,
          testCase.userDescription,
          async () => ({ confirmed: true, cancelled: false })
        );

        if (result.success && result.stage2Response) {
          results.push({
            case: testCase,
            generatedCode: result.stage2Response.test_code
          });

          console.log(`✓ Generated ${result.stage2Response.test_count} tests`);
          console.log(`  Tokens: ${result.totalTokens}, Cost: $${result.estimatedCost.toFixed(4)}`);
        } else {
          console.log(`✗ Failed: ${result.error}`);
        }

      } catch (error) {
        console.log(`✗ Error: ${error}`);
      }
    }

    // Generate validation report
    const report = runValidationSuite(results);

    console.log('\n========================================');
    console.log('VALIDATION REPORT');
    console.log('========================================\n');
    console.log(`Total cases: ${report.totalCases}`);
    console.log(`Passed: ${report.passedCases}`);
    console.log(`Failed: ${report.failedCases.length}`);
    console.log(`Success rate: ${((report.passedCases / report.totalCases) * 100).toFixed(1)}%`);
    console.log(`\nAverage Quality:`);
    console.log(`  - Assertions per test: ${report.averageQuality.assertionsCount}`);
    console.log(`  - Coverage estimate: ${report.averageQuality.coverageEstimate}%`);

    if (report.failedCases.length > 0) {
      console.log(`\nFailed cases:`);
      for (const failed of report.failedCases) {
        console.log(`  - ${failed.case.name}: ${failed.reason}`);
      }
    }

    // Assert quality threshold
    assert.ok(
      report.passedCases / report.totalCases >= 0.85,
      'At least 85% of validation cases should pass'
    );
  });
});

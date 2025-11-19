/**
 * Test Data Factories
 *
 * Factory functions for creating test data objects
 */

import { MockTextDocument, Uri } from '../mocks/vscode';
import type {
  AnalyzeQualityResponse,
  QualityIssue,
  AnalysisMetrics,
  IssueSuggestion,
} from '../../quality/api/types';

/**
 * Create a mock quality issue
 */
export function createMockQualityIssue(
  overrides: Partial<QualityIssue> = {}
): QualityIssue {
  return {
    file: 'tests/test_example.py',
    line: 10,
    column: 4,
    severity: 'error',
    type: 'trivial-assertion',
    message: 'This assertion is trivial and always passes',
    detected_by: 'rule_engine',
    suggestion: {
      action: 'remove',
      old_code: 'assert True',
      new_code: null,
      explanation: 'This assertion provides no value',
    },
    ...overrides,
  };
}

/**
 * Create a mock quality suggestion
 */
export function createMockSuggestion(
  overrides: Partial<IssueSuggestion> = {}
): IssueSuggestion {
  return {
    action: 'replace',
    old_code: 'assert x == x',
    new_code: 'assert x == expected_value',
    explanation: 'Make assertion more meaningful',
    ...overrides,
  };
}

/**
 * Create mock quality metrics
 */
export function createMockQualityMetrics(
  overrides: Partial<AnalysisMetrics> = {}
): AnalysisMetrics {
  return {
    total_tests: 45,
    issues_count: 12,
    analysis_time_ms: 1234,
    rules_applied: ['trivial-assertion', 'missing-assertion'],
    severity_breakdown: {
      error: 3,
      warning: 6,
      info: 3,
    },
    ...overrides,
  };
}

/**
 * Create a mock quality analysis response
 */
export function createMockAnalysisResponse(
  overrides: Partial<AnalyzeQualityResponse> = {}
): AnalyzeQualityResponse {
  return {
    analysis_id: '550e8400-e29b-41d4-a716-446655440000',
    issues: [
      createMockQualityIssue(),
      createMockQualityIssue({
        line: 15,
        severity: 'warning',
        type: 'missing-assertion',
        message: 'Test lacks proper assertions',
      }),
    ],
    metrics: createMockQualityMetrics(),
    version_id: 'v1_2024-11-16_abc123',
    ...overrides,
  };
}

/**
 * Create a mock Python test file content
 */
export function createMockPytestFile(testCount: number = 3): string {
  const tests = [];
  for (let i = 1; i <= testCount; i++) {
    tests.push(`
def test_example_${i}():
    """Test example ${i}"""
    result = some_function(${i})
    assert result == expected_value_${i}
`);
  }

  return `"""Test module for example functionality"""

import pytest
from mymodule import some_function

${tests.join('\n')}
`;
}

/**
 * Create a mock Python test file with quality issues
 */
export function createPytestFileWithIssues(): string {
  return `"""Test module with quality issues"""

import pytest

def test_trivial_assertion():
    """Test with trivial assertion"""
    assert True  # Trivial assertion issue

def test_missing_assertion():
    """Test without assertion"""
    result = some_function()
    # Missing assertion issue

def test_unused_fixture(unused_fixture):
    """Test with unused fixture"""
    assert some_function() == 42
    # unused_fixture is declared but not used

@pytest.fixture
def unused_fixture():
    return "not used"

def test_duplicate_assertion():
    """Test with duplicate assertions"""
    result = some_function()
    assert result == 42
    assert result == 42  # Duplicate assertion
`;
}

/**
 * Create a mock text document
 */
export function createMockTextDocument(
  filePath: string = '/test/test_example.py',
  content?: string
): MockTextDocument {
  const finalContent = content ?? createMockPytestFile();
  return new MockTextDocument(Uri.file(filePath), finalContent, 'python');
}

/**
 * Create mock Python function context for test generation
 */
export function createMockFunctionContext(overrides: any = {}): any {
  return {
    signature: {
      name: 'add',
      parameters: [
        { name: 'a', type: 'int', default_value: null },
        { name: 'b', type: 'int', default_value: null },
      ],
      return_type: 'int',
      is_async: false,
      is_method: false,
      decorators: [],
    },
    body_analysis: {
      branches: [],
      loops: [],
      exceptions: [],
      external_calls: [],
      complexity: 1,
    },
    documentation: {
      docstring: 'Add two numbers',
      parameters_doc: {},
      return_doc: null,
      examples: [],
    },
    class_context: null,
    module_context: {
      imports: [],
      global_variables: [],
      module_docstring: null,
    },
    source_code: 'def add(a: int, b: int) -> int:\n    return a + b',
    ...overrides,
  };
}

/**
 * Create mock LLM response for test generation
 */
export function createMockLLMResponse(scenarios: string[] = []): any {
  const defaultScenarios = scenarios.length > 0 ? scenarios : [
    'Test with positive numbers',
    'Test with negative numbers',
    'Test with zero',
  ];

  return {
    scenarios: defaultScenarios,
    reasoning: 'Based on the function signature and analysis',
  };
}

/**
 * Create mock pytest test code
 */
export function createMockPytestCode(functionName: string = 'add'): string {
  return `import pytest
from mymodule import ${functionName}


class Test${functionName.charAt(0).toUpperCase() + functionName.slice(1)}:
    """Test suite for ${functionName} function"""

    def test_positive_numbers(self):
        """Test with positive numbers"""
        result = ${functionName}(2, 3)
        assert result == 5

    def test_negative_numbers(self):
        """Test with negative numbers"""
        result = ${functionName}(-2, -3)
        assert result == -5

    def test_zero(self):
        """Test with zero"""
        result = ${functionName}(0, 0)
        assert result == 0
`;
}

/**
 * Create mock API error response
 */
export function createMockAPIError(
  status: number = 500,
  message: string = 'Internal Server Error'
): any {
  return {
    response: {
      status,
      statusText: message,
      data: {
        error: message,
        details: 'Mock error details',
      },
    },
    message,
    isAxiosError: true,
  };
}

/**
 * Create a batch of mock quality issues
 */
export function createMockIssues(count: number, file: string = 'tests/test_example.py'): QualityIssue[] {
  const issueTypes: Array<QualityIssue['type']> = [
    'trivial-assertion',
    'missing-assertion',
    'unused-fixture',
    'unused-variable',
    'duplicate-assertion',
  ];
  const severities: Array<QualityIssue['severity']> = ['error', 'warning', 'info'];

  return Array.from({ length: count }, (_, i) => {
    const issueType = issueTypes[i % issueTypes.length];
    const severity = severities[i % severities.length];

    return createMockQualityIssue({
      file,
      line: 10 + i * 5,
      severity,
      type: issueType,
      message: `Issue ${i + 1}: ${issueType}`,
    });
  });
}

/**
 * Wait for a specified time (for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a spy that tracks calls
 */
export function createCallTracker<T extends (...args: any[]) => any>() {
  const calls: Array<Parameters<T>> = [];

  function tracker(...args: Parameters<T>): ReturnType<T> {
    calls.push(args);
    return undefined as ReturnType<T>;
  }

  tracker.calls = calls;
  tracker.reset = () => (calls.length = 0);
  tracker.callCount = () => calls.length;

  return tracker;
}

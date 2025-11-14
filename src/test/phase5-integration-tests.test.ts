/**
 * Phase 5 Integration Tests
 *
 * End-to-end tests for the complete test generation workflow
 */

import * as assert from 'assert';
import * as path from 'path';
import { AgentFlowController } from '../agents';
import { TestGenerationController } from '../generation';
import { PythonASTAnalyzer } from '../analysis';

/**
 * Test cases for integration testing
 */
interface IntegrationTestCase {
  name: string;
  functionCode: string;
  userDescription: string;
  expectedScenarioCount: { min: number; max: number };
  expectedTestCount: { min: number; max: number };
  shouldNeedConfirmation: boolean;
}

const INTEGRATION_TEST_CASES: IntegrationTestCase[] = [
  {
    name: 'Simple arithmetic function',
    functionCode: `
def add(a: int, b: int) -> int:
    """Add two numbers together"""
    return a + b
`,
    userDescription: 'test addition with positive and negative numbers',
    expectedScenarioCount: { min: 2, max: 4 },
    expectedTestCount: { min: 2, max: 4 },
    shouldNeedConfirmation: false  // Simple function, should auto-confirm
  },
  {
    name: 'Function with branches and exceptions',
    functionCode: `
def divide(a: float, b: float) -> float:
    """Divide a by b"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    if a < 0 or b < 0:
        raise ValueError("Negative numbers not supported")
    return a / b
`,
    userDescription: 'test division',
    expectedScenarioCount: { min: 3, max: 6 },
    expectedTestCount: { min: 3, max: 5 },
    shouldNeedConfirmation: true  // Complex function with exceptions
  },
  {
    name: 'Function with detailed user description',
    functionCode: `
def process_payment(amount: float, method: str, user_id: str) -> dict:
    """Process a payment"""
    if amount <= 0:
        raise ValueError("Invalid amount")
    if method not in ["card", "paypal", "bank"]:
        raise ValueError("Unsupported payment method")
    return {
        "status": "success",
        "amount": amount,
        "method": method,
        "user_id": user_id
    }
`,
    userDescription: 'test payment processing with valid amount and card method, ' +
                     'test with invalid amount (zero and negative), ' +
                     'test with unsupported payment method, ' +
                     'test with each supported payment method (card, paypal, bank)',
    expectedScenarioCount: { min: 4, max: 8 },
    expectedTestCount: { min: 4, max: 8 },
    shouldNeedConfirmation: false  // Detailed description, should skip confirmation
  },
  {
    name: 'Async function',
    functionCode: `
async def fetch_user_data(user_id: str) -> dict:
    """Fetch user data from database"""
    if not user_id:
        raise ValueError("User ID is required")
    # Simulate database fetch
    return {"id": user_id, "name": "Test User"}
`,
    userDescription: 'test fetching user data with valid ID and empty ID',
    expectedScenarioCount: { min: 2, max: 4 },
    expectedTestCount: { min: 2, max: 4 },
    shouldNeedConfirmation: false
  },
  {
    name: 'Class method',
    functionCode: `
class UserManager:
    def create_user(self, name: str, email: str) -> dict:
        """Create a new user"""
        if not name:
            raise ValueError("Name is required")
        if "@" not in email:
            raise ValueError("Invalid email")
        return {"name": name, "email": email}
`,
    userDescription: 'test user creation with valid and invalid inputs',
    expectedScenarioCount: { min: 3, max: 6 },
    expectedTestCount: { min: 3, max: 6 },
    shouldNeedConfirmation: true
  }
];

suite('Phase 5 Integration Tests', () => {

  // Skip these tests if API key is not available
  const hasApiKey = process.env.OPENAI_API_KEY ||
                    process.env.ANTHROPIC_API_KEY ||
                    process.env.DEEPSEEK_API_KEY;

  if (!hasApiKey) {
    test('Skipping integration tests - No API key configured', () => {
      console.log('Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY to run integration tests');
      assert.ok(true);
    });
    return;
  }

  suite('End-to-End Pipeline Tests', () => {

    test('Should handle simple function without confirmation', async function() {
      this.timeout(60000); // 60 second timeout for API calls

      const testCase = INTEGRATION_TEST_CASES[0]; // Simple arithmetic
      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      const provider = process.env.OPENAI_API_KEY ? 'openai' :
                      process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';

      try {
        const controller = new AgentFlowController(apiKey, provider as any, 'gpt-3.5-turbo');

        // Create minimal function context
        const functionContext: any = {
          signature: {
            name: 'add',
            parameters: [
              { name: 'a', type: 'int', has_default: false },
              { name: 'b', type: 'int', has_default: false }
            ],
            return_type: 'int',
            decorators: [],
            is_async: false,
            is_method: false
          },
          body_analysis: {
            branches: [],
            exceptions: [],
            external_calls: [],
            complexity: 1
          },
          documentation: {
            docstring: 'Add two numbers together',
            inline_comments: []
          },
          class_context: null,
          imports: [],
          source_code: testCase.functionCode,
          module_path: 'test_module',
          file_path: '/test/module.py'
        };

        let confirmationCalled = false;
        const confirmationHandler = async () => {
          confirmationCalled = true;
          return { confirmed: true, cancelled: false };
        };

        const result = await controller.runFullPipeline(
          functionContext,
          testCase.userDescription,
          confirmationHandler
        );

        // Assertions
        assert.strictEqual(result.success, true, 'Pipeline should succeed');
        assert.ok(result.stage1Response, 'Should have Stage 1 response');
        assert.ok(result.stage2Response, 'Should have Stage 2 response');

        // Check if confirmation was needed
        if (testCase.shouldNeedConfirmation) {
          assert.strictEqual(confirmationCalled, true, 'Confirmation should have been called');
        }

        // Check scenario count
        if (result.stage1Response) {
          const totalScenarios = result.stage1Response.identified_scenarios.length +
                                result.stage1Response.suggested_additional_scenarios.length;
          assert.ok(
            totalScenarios >= testCase.expectedScenarioCount.min &&
            totalScenarios <= testCase.expectedScenarioCount.max,
            `Scenario count should be between ${testCase.expectedScenarioCount.min} and ${testCase.expectedScenarioCount.max}, got ${totalScenarios}`
          );
        }

        // Check test count
        if (result.stage2Response) {
          assert.ok(
            result.stage2Response.test_count >= testCase.expectedTestCount.min &&
            result.stage2Response.test_count <= testCase.expectedTestCount.max,
            `Test count should be between ${testCase.expectedTestCount.min} and ${testCase.expectedTestCount.max}, got ${result.stage2Response.test_count}`
          );

          // Check that test code is valid
          assert.ok(result.stage2Response.test_code.includes('def test_'), 'Should contain test methods');
          assert.ok(result.stage2Response.test_code.includes('assert'), 'Should contain assertions');
        }

        // Check token usage
        assert.ok(result.totalTokens > 0, 'Should track token usage');
        assert.ok(result.totalTokens < 10000, 'Token usage should be reasonable (< 10k)');

        console.log(`✓ ${testCase.name} completed successfully`);
        console.log(`  - Tokens used: ${result.totalTokens}`);
        console.log(`  - Cost: $${result.estimatedCost.toFixed(4)}`);
        console.log(`  - Execution time: ${result.executionTime}ms`);

      } catch (error) {
        console.error(`✗ ${testCase.name} failed:`, error);
        throw error;
      }
    });

    test('Should handle complex function with confirmation', async function() {
      this.timeout(60000);

      const testCase = INTEGRATION_TEST_CASES[1]; // Division with exceptions
      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      const provider = process.env.OPENAI_API_KEY ? 'openai' :
                      process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';

      try {
        const controller = new AgentFlowController(apiKey, provider as any, 'gpt-3.5-turbo');

        const functionContext: any = {
          signature: {
            name: 'divide',
            parameters: [
              { name: 'a', type: 'float', has_default: false },
              { name: 'b', type: 'float', has_default: false }
            ],
            return_type: 'float',
            decorators: [],
            is_async: false,
            is_method: false
          },
          body_analysis: {
            branches: [
              { type: 'if', condition: 'b == 0', line_number: 2 },
              { type: 'if', condition: 'a < 0 or b < 0', line_number: 4 }
            ],
            exceptions: [
              { type: 'raise', exception_class: 'ValueError', line_number: 3 },
              { type: 'raise', exception_class: 'ValueError', line_number: 5 }
            ],
            external_calls: [],
            complexity: 3
          },
          documentation: {
            docstring: 'Divide a by b',
            inline_comments: []
          },
          class_context: null,
          imports: [],
          source_code: testCase.functionCode,
          module_path: 'test_module',
          file_path: '/test/module.py'
        };

        let confirmationCalled = false;
        const confirmationHandler = async (stage1Response: any) => {
          confirmationCalled = true;
          // Verify that confirmation question is present
          assert.ok(stage1Response.confirmation_question, 'Should have confirmation question');
          return { confirmed: true, cancelled: false };
        };

        const result = await controller.runFullPipeline(
          functionContext,
          testCase.userDescription,
          confirmationHandler
        );

        assert.strictEqual(result.success, true);

        // Should have generated tests for exception handling
        if (result.stage2Response) {
          assert.ok(
            result.stage2Response.test_code.includes('pytest.raises') ||
            result.stage2Response.test_code.includes('with pytest.raises'),
            'Should include exception testing'
          );
        }

        console.log(`✓ ${testCase.name} completed successfully`);

      } catch (error) {
        console.error(`✗ ${testCase.name} failed:`, error);
        throw error;
      }
    });
  });

  suite('Error Handling Tests', () => {

    test('Should handle API errors gracefully', async function() {
      this.timeout(30000);

      const controller = new AgentFlowController('invalid-api-key', 'openai', 'gpt-3.5-turbo');

      const mockContext: any = {
        signature: { name: 'test', parameters: [], return_type: 'None' },
        body_analysis: { branches: [], exceptions: [], external_calls: [], complexity: 1 },
        documentation: { docstring: '', inline_comments: [] },
        class_context: null,
        imports: [],
        source_code: 'def test(): pass',
        module_path: 'test',
        file_path: '/test.py'
      };

      const result = await controller.runFullPipeline(
        mockContext,
        'test basic functionality',
        async () => ({ confirmed: true, cancelled: false })
      );

      // Should fail but not crash
      assert.strictEqual(result.success, false);
      assert.ok(result.error, 'Should have error message');
    });

    test('Should handle user cancellation', async function() {
      this.timeout(60000);

      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      if (!apiKey) {
        return; // Skip if no API key
      }

      const provider = process.env.OPENAI_API_KEY ? 'openai' :
                      process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';
      const controller = new AgentFlowController(apiKey, provider as any, 'gpt-3.5-turbo');

      const mockContext: any = {
        signature: {
          name: 'complex_function',
          parameters: [{ name: 'x', type: 'int', has_default: false }],
          return_type: 'int'
        },
        body_analysis: {
          branches: [{ type: 'if', condition: 'x > 0', line_number: 2 }],
          exceptions: [],
          external_calls: [],
          complexity: 2
        },
        documentation: { docstring: 'A complex function', inline_comments: [] },
        class_context: null,
        imports: [],
        source_code: 'def complex_function(x: int) -> int:\n    if x > 0:\n        return x\n    return 0',
        module_path: 'test',
        file_path: '/test.py'
      };

      // User cancels the operation
      const result = await controller.runFullPipeline(
        mockContext,
        'test function',
        async () => ({ confirmed: false, cancelled: true })
      );

      // Should not proceed to Stage 2
      assert.ok(!result.stage2Response, 'Should not have Stage 2 response when cancelled');
    });
  });

  suite('Supplement Scenarios Tests', () => {

    test('Should supplement existing tests', async function() {
      this.timeout(60000);

      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      if (!apiKey) {
        return;
      }

      const provider = process.env.OPENAI_API_KEY ? 'openai' :
                      process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';
      const controller = new AgentFlowController(apiKey, provider as any, 'gpt-3.5-turbo');

      const existingTestCode = `
import pytest

def test_should_add_positive_numbers():
    result = add(2, 3)
    assert result == 5

def test_should_add_zero():
    result = add(5, 0)
    assert result == 5
`;

      const existingScenarios = [
        'should add positive numbers',
        'should add zero'
      ];

      const functionCode = `
def add(a: int, b: int) -> int:
    return a + b
`;

      const newScenarioDescription = 'test with negative numbers and large numbers';

      try {
        const result = await controller.supplementTestScenarios(
          existingTestCode,
          existingScenarios,
          functionCode,
          newScenarioDescription
        );

        assert.strictEqual(result.success, true, 'Supplement should succeed');
        assert.ok(result.newTestCode, 'Should have new test code');
        assert.ok(result.newTestCount && result.newTestCount > 0, 'Should have added new tests');
        assert.ok(result.newTestCode!.includes('def test_'), 'Should contain test methods');

        // Should not duplicate existing tests
        assert.ok(
          !result.newTestCode!.includes('test_should_add_positive_numbers'),
          'Should not duplicate existing test names'
        );

        console.log('✓ Supplement scenarios completed successfully');
        console.log(`  - New tests added: ${result.newTestCount}`);
        console.log(`  - Tokens used: ${result.tokensUsed}`);

      } catch (error) {
        console.error('✗ Supplement scenarios failed:', error);
        throw error;
      }
    });
  });

  suite('Performance Tests', () => {

    test('Should complete within reasonable time', async function() {
      this.timeout(90000); // 90 seconds max

      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY || '';
      if (!apiKey) {
        return;
      }

      const provider = process.env.OPENAI_API_KEY ? 'openai' :
                      process.env.ANTHROPIC_API_KEY ? 'claude' : 'deepseek';
      const controller = new AgentFlowController(apiKey, provider as any, 'gpt-3.5-turbo');

      const mockContext: any = {
        signature: {
          name: 'simple_function',
          parameters: [{ name: 'x', type: 'int', has_default: false }],
          return_type: 'int'
        },
        body_analysis: { branches: [], exceptions: [], external_calls: [], complexity: 1 },
        documentation: { docstring: 'Simple function', inline_comments: [] },
        class_context: null,
        imports: [],
        source_code: 'def simple_function(x: int) -> int:\n    return x * 2',
        module_path: 'test',
        file_path: '/test.py'
      };

      const startTime = Date.now();

      const result = await controller.runFullPipeline(
        mockContext,
        'test with positive and negative numbers',
        async () => ({ confirmed: true, cancelled: false })
      );

      const executionTime = Date.now() - startTime;

      assert.strictEqual(result.success, true);
      assert.ok(executionTime < 60000, `Execution time should be < 60s, got ${executionTime}ms`);

      console.log(`✓ Performance test passed`);
      console.log(`  - Execution time: ${executionTime}ms`);
      console.log(`  - Tokens used: ${result.totalTokens}`);
    });
  });
});

/**
 * Simple Node.js test script for Phase 3
 * Run with: node test-phase3.js
 */

const path = require('path');

// Import compiled modules
const { AgentFlowController } = require('./dist/extension.js');
const { InputValidator } = require('./dist/extension.js');

/**
 * Mock function context for testing
 */
const mockFunctionContext = {
  signature: {
    name: 'add',
    parameters: [
      { name: 'a', type: 'int', default_value: null, kind: 'positional' },
      { name: 'b', type: 'int', default_value: null, kind: 'positional' }
    ],
    return_type: 'int',
    is_async: false,
    is_method: false,
    decorators: []
  },
  source_code: `def add(a: int, b: int) -> int:
    """Add two integers and return the sum."""
    return a + b`,
  body_analysis: {
    branches: [],
    exceptions: [],
    external_calls: [],
    complexity: 1
  },
  class_context: null,
  imports: [],
  documentation: {
    docstring: 'Add two integers and return the sum.',
    inline_comments: []
  },
  file_path: '/test/calculator.py',
  module_path: 'calculator',
  line_range: [1, 3]
};

/**
 * Test input validation
 */
function testInputValidation() {
  console.log('=== Testing Input Validation ===\n');

  const validator = new InputValidator();

  const testCases = [
    'Test',  // Too short
    'Test basic addition',  // Level 1
    'Test addition with positive, negative, and zero values',  // Level 2
    'Test addition function including: positive integer addition, negative integer addition, addition with zero, large numbers, and boundary values at integer limits',  // Level 3
  ];

  testCases.forEach((input, i) => {
    console.log(`Test case ${i + 1}: "${input}"`);
    const result = validator.validateUserInput(input);
    console.log(`  Valid: ${result.isValid}`);
    console.log(`  Quality: ${result.quality}`);
    console.log(`  Character count: ${result.characterCount}`);
    console.log(`  Word count: ${result.wordCount}`);
    if (result.suggestions) {
      console.log(`  Suggestions:`);
      result.suggestions.forEach(s => console.log(`    - ${s}`));
    }
    console.log();
  });

  // Test guidance generation
  console.log('Testing input guidance generation:');
  const guidance = validator.generateInputGuidance(mockFunctionContext);
  console.log('  Placeholder:', guidance.placeholder);
  console.log('  Prompt:', guidance.prompt);
  console.log('  Examples:');
  guidance.examples.forEach(ex => console.log(`    - ${ex}`));
}

/**
 * Test prompt builders
 */
async function testPromptBuilders() {
  console.log('\n=== Testing Prompt Builders ===\n');

  const { Stage1PromptBuilder, Stage2PromptBuilder } = require('./dist/extension.js');

  try {
    // Test Stage 1 builder
    console.log('Testing Stage1PromptBuilder...');
    const stage1Builder = new Stage1PromptBuilder();
    const stage1Prompt = stage1Builder.buildPrompt(
      mockFunctionContext,
      'Test addition with various inputs'
    );

    console.log('✓ Stage 1 prompt built successfully');
    console.log(`  System prompt length: ${stage1Prompt.system.length} chars`);
    console.log(`  User prompt length: ${stage1Prompt.user.length} chars`);

    // Test Stage 2 builder
    console.log('\nTesting Stage2PromptBuilder...');
    const stage2Builder = new Stage2PromptBuilder();
    const mockScenarios = [
      {
        scenario: 'Add two positive integers',
        confidence: 'high',
        source: 'code_analysis'
      },
      {
        scenario: 'Add with zero values',
        confidence: 'medium',
        source: 'inference'
      }
    ];
    const stage2Prompt = stage2Builder.buildPrompt(
      mockFunctionContext,
      mockScenarios
    );

    console.log('✓ Stage 2 prompt built successfully');
    console.log(`  System prompt length: ${stage2Prompt.system.length} chars`);
    console.log(`  User prompt length: ${stage2Prompt.user.length} chars`);

    return true;
  } catch (error) {
    console.error('✗ Error testing prompt builders:', error.message);
    return false;
  }
}

/**
 * Test Stage 1 with DeepSeek API
 */
async function testStage1WithAPI() {
  console.log('\n=== Testing Stage 1 with DeepSeek API ===\n');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('⚠️  DEEPSEEK_API_KEY not set, skipping API test');
    return null;
  }

  try {
    const controller = new AgentFlowController(
      apiKey,
      'deepseek',
      'deepseek-chat'
    );

    const userDescription = 'Test basic addition with different number types';
    console.log('User description:', userDescription);
    console.log('\nCalling Stage 1 agent...\n');

    const stage1Response = await controller.executeStage1(
      mockFunctionContext,
      userDescription
    );

    console.log('✓ Stage 1 Response received:');
    console.log('  Skip confirmation:', stage1Response.skip_confirmation);
    console.log('  Proceed to generation:', stage1Response.proceed_to_generation);
    console.log('\n  Identified scenarios:');
    stage1Response.identified_scenarios.forEach((scenario, i) => {
      console.log(`    ${i + 1}. ${scenario.scenario}`);
      console.log(`       (${scenario.confidence}, ${scenario.source})`);
    });

    if (stage1Response.suggested_additional_scenarios.length > 0) {
      console.log('\n  Suggested additional scenarios:');
      stage1Response.suggested_additional_scenarios.forEach((scenario, i) => {
        console.log(`    ${i + 1}. ${scenario.scenario}`);
      });
    }

    const tokenUsage = controller.getTokenUsage();
    console.log(`\n  Token usage: ${tokenUsage.totalTokens} tokens`);
    console.log(`  Estimated cost: $${tokenUsage.estimatedCost.toFixed(4)}`);

    return stage1Response;
  } catch (error) {
    console.error('✗ Error in Stage 1:', error.message);
    return null;
  }
}

/**
 * Test full pipeline
 */
async function testFullPipeline() {
  console.log('\n=== Testing Full Pipeline ===\n');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('⚠️  DEEPSEEK_API_KEY not set, skipping pipeline test');
    return;
  }

  try {
    const controller = new AgentFlowController(
      apiKey,
      'deepseek',
      'deepseek-chat'
    );

    const userDescription = 'Test addition with positive, negative, and zero values';
    console.log('User description:', userDescription);
    console.log('\nRunning full pipeline...\n');

    const result = await controller.runPipelineWithoutConfirmation(
      mockFunctionContext,
      userDescription
    );

    if (result.success) {
      console.log('✓ Pipeline completed successfully!');
      console.log(`\n  Execution time: ${result.executionTime}ms`);
      console.log(`  Total tokens: ${result.totalTokens}`);
      console.log(`  Estimated cost: $${result.estimatedCost.toFixed(4)}`);

      if (result.stage2Response) {
        console.log(`\n  Generated ${result.stage2Response.test_count} test cases`);
        console.log(`\n  Test code preview (first 500 chars):`);
        console.log('  ' + '-'.repeat(60));
        console.log('  ' + result.stage2Response.test_code.substring(0, 500).split('\n').join('\n  '));
        if (result.stage2Response.test_code.length > 500) {
          console.log('  ... (truncated)');
        }
        console.log('  ' + '-'.repeat(60));
      }
    } else {
      console.error('✗ Pipeline failed:', result.error);
    }
  } catch (error) {
    console.error('✗ Error in pipeline:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('Phase 3 Agent System Test');
  console.log('='.repeat(70));
  console.log();

  try {
    // Test 1: Input validation (no API)
    testInputValidation();
    console.log('\n' + '='.repeat(70));

    // Test 2: Prompt builders (no API)
    const promptsOk = await testPromptBuilders();
    if (!promptsOk) {
      console.error('\n❌ Prompt builder tests failed');
      process.exit(1);
    }
    console.log('\n' + '='.repeat(70));

    // Check if we can test with API
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('\n⚠️  DEEPSEEK_API_KEY not set.');
      console.log('Set the environment variable to test API integration.');
      console.log('\n✅ Basic tests completed successfully!');
      return;
    }

    // Test 3: Stage 1 with API
    const stage1Response = await testStage1WithAPI();
    if (!stage1Response) {
      console.error('\n❌ Stage 1 API test failed');
      process.exit(1);
    }
    console.log('\n' + '='.repeat(70));

    // Wait to avoid rate limiting
    console.log('\nWaiting 3 seconds to avoid rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Full pipeline
    await testFullPipeline();

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
main();

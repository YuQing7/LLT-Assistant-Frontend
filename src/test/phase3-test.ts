/**
 * Phase 3 Test Script
 *
 * Tests the agent system with DeepSeek API using a simple test function
 */

import { AgentFlowController } from '../agents/agent-controller';
import { FunctionContext } from '../analysis/types';

/**
 * Mock function context for testing
 */
const mockFunctionContext: FunctionContext = {
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
 * Test Stage 1 with DeepSeek
 */
async function testStage1() {
  console.log('=== Testing Stage 1: Information Gathering ===\n');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const controller = new AgentFlowController(
    apiKey,
    'deepseek',
    'deepseek-chat'
  );

  const userDescription = 'Test basic addition with different number types';

  try {
    console.log('User description:', userDescription);
    console.log('\nCalling Stage 1 agent...\n');

    const stage1Response = await controller.executeStage1(
      mockFunctionContext,
      userDescription
    );

    console.log('Stage 1 Response:');
    console.log('- Skip confirmation:', stage1Response.skip_confirmation);
    console.log('- Proceed to generation:', stage1Response.proceed_to_generation);
    console.log('\nIdentified scenarios:');
    stage1Response.identified_scenarios.forEach((scenario, i) => {
      console.log(`  ${i + 1}. ${scenario.scenario}`);
      console.log(`     Confidence: ${scenario.confidence}, Source: ${scenario.source}`);
    });

    if (stage1Response.suggested_additional_scenarios.length > 0) {
      console.log('\nSuggested additional scenarios:');
      stage1Response.suggested_additional_scenarios.forEach((scenario, i) => {
        console.log(`  ${i + 1}. ${scenario.scenario}`);
        console.log(`     Confidence: ${scenario.confidence}, Reason: ${scenario.reason}`);
      });
    }

    if (stage1Response.reason) {
      console.log('\nReason for skipping confirmation:', stage1Response.reason);
    }

    if (!stage1Response.skip_confirmation) {
      console.log('\nConfirmation question:', stage1Response.confirmation_question);
    }

    const tokenUsage = controller.getTokenUsage();
    console.log(`\nToken usage: ${tokenUsage.totalTokens} tokens`);
    console.log(`Estimated cost: $${tokenUsage.estimatedCost.toFixed(4)}`);

    return stage1Response;
  } catch (error) {
    console.error('Error in Stage 1:', error);
    throw error;
  }
}

/**
 * Test Stage 2 with DeepSeek
 */
async function testStage2(stage1Response: any) {
  console.log('\n\n=== Testing Stage 2: Test Generation ===\n');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const controller = new AgentFlowController(
    apiKey,
    'deepseek',
    'deepseek-chat'
  );

  try {
    console.log('Calling Stage 2 agent...\n');

    const stage2Response = await controller.executeStage2(
      mockFunctionContext,
      stage1Response
    );

    console.log('Stage 2 Response:');
    console.log('- Test count:', stage2Response.test_count);
    console.log('- Coverage summary:', stage2Response.coverage_summary);

    if (stage2Response.notes) {
      console.log('- Notes:', stage2Response.notes);
    }

    console.log('\nImports:');
    stage2Response.imports.forEach(imp => {
      console.log(`  ${imp}`);
    });

    console.log('\nGenerated test code:');
    console.log('---');
    console.log(stage2Response.test_code);
    console.log('---');

    const tokenUsage = controller.getTokenUsage();
    console.log(`\nTotal token usage: ${tokenUsage.totalTokens} tokens`);
    console.log(`Estimated cost: $${tokenUsage.estimatedCost.toFixed(4)}`);

    return stage2Response;
  } catch (error) {
    console.error('Error in Stage 2:', error);
    throw error;
  }
}

/**
 * Test full pipeline
 */
async function testFullPipeline() {
  console.log('=== Testing Full Pipeline ===\n');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const controller = new AgentFlowController(
    apiKey,
    'deepseek',
    'deepseek-chat'
  );

  const userDescription = 'Test addition with positive, negative, and zero values';

  try {
    console.log('User description:', userDescription);
    console.log('\nRunning full pipeline...\n');

    const result = await controller.runPipelineWithoutConfirmation(
      mockFunctionContext,
      userDescription
    );

    if (result.success) {
      console.log('✓ Pipeline completed successfully!');
      console.log(`\nExecution time: ${result.executionTime}ms`);
      console.log(`Total tokens: ${result.totalTokens}`);
      console.log(`Estimated cost: $${result.estimatedCost.toFixed(4)}`);

      if (result.stage2Response) {
        console.log(`\nGenerated ${result.stage2Response.test_count} test cases`);
      }
    } else {
      console.error('✗ Pipeline failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Error in full pipeline:', error);
    throw error;
  }
}

/**
 * Test input validation
 */
function testInputValidation() {
  console.log('=== Testing Input Validation ===\n');

  const { InputValidator } = require('../agents/input-validator');
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
      result.suggestions.forEach((s: string) => console.log(`    - ${s}`));
    }
    console.log();
  });

  // Test guidance generation
  console.log('Testing input guidance generation:');
  const guidance = validator.generateInputGuidance(mockFunctionContext);
  console.log('  Placeholder:', guidance.placeholder);
  console.log('  Prompt:', guidance.prompt);
  console.log('  Examples:');
  guidance.examples.forEach((ex: string) => console.log(`    - ${ex}`));
}

/**
 * Main test runner
 */
async function main() {
  console.log('Phase 3 Agent System Test\n');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test input validation (no API call)
    testInputValidation();
    console.log('\n' + '='.repeat(60) + '\n');

    // Check if API key is available
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('⚠️  DEEPSEEK_API_KEY not found. Skipping API tests.');
      console.log('Set DEEPSEEK_API_KEY environment variable to run API tests.');
      return;
    }

    // Test Stage 1
    const stage1Response = await testStage1();
    console.log('\n' + '='.repeat(60) + '\n');

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Stage 2
    await testStage2(stage1Response);
    console.log('\n' + '='.repeat(60) + '\n');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test full pipeline
    await testFullPipeline();

    console.log('\n\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

export { testStage1, testStage2, testFullPipeline, testInputValidation };

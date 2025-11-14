/**
 * Prompt Builder for Agent System
 *
 * This module provides utilities for building prompts for Stage 1 and Stage 2 agents
 * including system prompts, user prompts, and few-shot examples.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FunctionContext } from '../analysis/types';
import {
  PromptBuildOptions,
  BuiltPrompt,
  Stage1Example,
  Stage2Example,
  IdentifiedScenario
} from './types';

/**
 * Load text content from file
 */
function loadTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load file ${filePath}: ${error}`);
  }
}

/**
 * Load JSON content from file
 */
function loadJsonFile<T>(filePath: string): T {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to load JSON file ${filePath}: ${error}`);
  }
}

/**
 * Format function context for prompt display
 */
function formatFunctionContext(context: FunctionContext): string {
  const parts: string[] = [];

  // Function code
  parts.push('## Function Code:');
  parts.push('```python');
  parts.push(context.source_code);
  parts.push('```');
  parts.push('');

  // Function metadata
  parts.push('## Function Context:');
  parts.push(`- Function name: ${context.signature.name}`);

  const params = context.signature.parameters.map(p => {
    let paramStr = p.name;
    if (p.type) {
      paramStr += `: ${p.type}`;
    }
    if (p.default_value) {
      paramStr += ` = ${p.default_value}`;
    }
    return paramStr;
  }).join(', ');
  parts.push(`- Parameters: ${params || 'none'}`);
  parts.push(`- Return type: ${context.signature.return_type || 'None'}`);

  if (context.documentation.docstring) {
    parts.push(`- Docstring: ${context.documentation.docstring}`);
  }

  parts.push(`- Module path: ${context.module_path}`);

  if (context.signature.is_async) {
    parts.push('- Async function: Yes');
  }

  if (context.signature.decorators.length > 0) {
    parts.push(`- Decorators: ${context.signature.decorators.join(', ')}`);
  }

  parts.push('');

  // Code analysis
  parts.push('## Code Analysis:');

  const branchCount = context.body_analysis.branches.length;
  const branchDesc = branchCount > 0
    ? context.body_analysis.branches.map(b => `${b.type}(${b.condition}) at line ${b.line_number}`).join('; ')
    : 'none';
  parts.push(`- Branches: ${branchCount} branch(es) - ${branchDesc}`);

  const exceptionCount = context.body_analysis.exceptions.length;
  const exceptionDesc = exceptionCount > 0
    ? context.body_analysis.exceptions.map(e => `${e.type}(${e.exception_class || 'unknown'}) at line ${e.line_number}`).join('; ')
    : 'none';
  parts.push(`- Exceptions: ${exceptionCount} exception(s) - ${exceptionDesc}`);

  const callCount = context.body_analysis.external_calls.length;
  const callDesc = callCount > 0
    ? context.body_analysis.external_calls.slice(0, 10).map(c => c.function_name).join(', ')
    : 'none';
  parts.push(`- External calls: ${callDesc}`);

  parts.push(`- Cyclomatic complexity: ${context.body_analysis.complexity}`);
  parts.push('');

  // Class context (if applicable)
  if (context.class_context) {
    parts.push('## Class Context:');
    parts.push(`- Class: ${context.class_context.class_name}`);

    if (context.class_context.base_classes.length > 0) {
      parts.push(`- Base classes: ${context.class_context.base_classes.join(', ')}`);
    }

    if (context.class_context.other_methods.length > 0) {
      parts.push(`- Other methods: ${context.class_context.other_methods.join(', ')}`);
    }

    if (context.class_context.is_dataclass) {
      parts.push('- Type: Dataclass');
    }

    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Format few-shot examples for Stage 1
 */
function formatStage1Examples(examples: Stage1Example[], count?: number): string {
  const selectedExamples = count ? examples.slice(0, count) : examples;

  const parts: string[] = [];
  parts.push('## Examples:\n');

  selectedExamples.forEach((example, index) => {
    parts.push(`### Example ${index + 1}${example.description ? ` - ${example.description}` : ''}:\n`);
    parts.push('**Function Code:**');
    parts.push('```python');
    parts.push(example.function_code);
    parts.push('```\n');
    parts.push(`**User Description:** "${example.user_description}"\n`);
    parts.push('**Expected Output:**');
    parts.push('```json');
    parts.push(JSON.stringify(example.expected_output, null, 2));
    parts.push('```\n');
  });

  return parts.join('\n');
}

/**
 * Format few-shot examples for Stage 2
 */
function formatStage2Examples(examples: Stage2Example[], count?: number): string {
  const selectedExamples = count ? examples.slice(0, count) : examples;

  const parts: string[] = [];
  parts.push('## Examples:\n');

  selectedExamples.forEach((example, index) => {
    parts.push(`### Example ${index + 1}${example.description ? ` - ${example.description}` : ''}:\n`);
    parts.push('**Function Code:**');
    parts.push('```python');
    parts.push(example.function_code);
    parts.push('```\n');
    parts.push('**Confirmed Scenarios:**');
    example.confirmed_scenarios.forEach((scenario, i) => {
      parts.push(`${i + 1}. ${scenario.scenario} (confidence: ${scenario.confidence}, source: ${scenario.source})`);
    });
    parts.push('\n**Expected Test Code:**');
    parts.push('```python');
    parts.push(example.expected_test_code);
    parts.push('```\n');
  });

  return parts.join('\n');
}

/**
 * Prompt Builder for Stage 1 Agent
 *
 * Builds prompts for the Information Gathering Agent that identifies test scenarios
 */
export class Stage1PromptBuilder {
  private systemPrompt: string;
  private examples: Stage1Example[];

  constructor(promptsDir?: string) {
    const baseDir = promptsDir || path.join(__dirname, '../../prompts');

    // Load system prompt
    this.systemPrompt = loadTextFile(path.join(baseDir, 'stage1_system_prompt.txt'));

    // Load examples
    const allExamples = loadJsonFile<{ stage1_examples: Stage1Example[] }>(
      path.join(baseDir, 'few_shot_examples.json')
    );
    this.examples = allExamples.stage1_examples;
  }

  /**
   * Build user prompt for Stage 1 analysis
   */
  buildUserPrompt(
    context: FunctionContext,
    userDescription: string,
    options?: PromptBuildOptions
  ): string {
    const parts: string[] = [];

    // Add few-shot examples if requested
    if (options?.includeExamples) {
      parts.push(formatStage1Examples(this.examples, options.exampleCount));
      parts.push('---\n');
      parts.push('Now, analyze the following function:\n');
    }

    // Add function context
    parts.push(formatFunctionContext(context));

    // Add user description
    parts.push('## User\'s Description:');
    parts.push(`"${userDescription}"`);
    parts.push('');

    // Add additional context if provided
    if (options?.additionalContext) {
      parts.push('## Additional Context:');
      parts.push(options.additionalContext);
      parts.push('');
    }

    // Add task instruction
    parts.push('## Task:');
    parts.push('Analyze the function code and user description above. Identify all necessary test scenarios and determine whether user confirmation is needed. Respond with a JSON object following the schema defined in the system prompt.');

    return parts.join('\n');
  }

  /**
   * Build complete prompt (system + user)
   */
  buildPrompt(
    context: FunctionContext,
    userDescription: string,
    options?: PromptBuildOptions
  ): BuiltPrompt {
    return {
      system: this.systemPrompt,
      user: this.buildUserPrompt(context, userDescription, options)
    };
  }

  /**
   * Get system prompt only
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * Get examples
   */
  getExamples(): Stage1Example[] {
    return this.examples;
  }
}

/**
 * Prompt Builder for Stage 2 Agent
 *
 * Builds prompts for the Test Generation Agent that creates pytest code
 */
export class Stage2PromptBuilder {
  private systemPrompt: string;
  private examples: Stage2Example[];

  constructor(promptsDir?: string) {
    const baseDir = promptsDir || path.join(__dirname, '../../prompts');

    // Load system prompt
    this.systemPrompt = loadTextFile(path.join(baseDir, 'stage2_system_prompt.txt'));

    // Load examples
    const allExamples = loadJsonFile<{ stage2_examples: Stage2Example[] }>(
      path.join(baseDir, 'few_shot_examples.json')
    );
    this.examples = allExamples.stage2_examples;
  }

  /**
   * Build user prompt for Stage 2 test generation
   */
  buildUserPrompt(
    context: FunctionContext,
    confirmedScenarios: IdentifiedScenario[],
    userAdditionalNotes?: string,
    options?: PromptBuildOptions
  ): string {
    const parts: string[] = [];

    // Add few-shot examples if requested
    if (options?.includeExamples) {
      parts.push(formatStage2Examples(this.examples, options.exampleCount));
      parts.push('---\n');
      parts.push('Now, generate tests for the following function:\n');
    }

    // Add function context
    parts.push(formatFunctionContext(context));

    // Add confirmed scenarios
    parts.push('## Confirmed Test Scenarios:');
    confirmedScenarios.forEach((scenario, index) => {
      parts.push(`${index + 1}. ${scenario.scenario}`);
      parts.push(`   - Confidence: ${scenario.confidence}`);
      parts.push(`   - Source: ${scenario.source}`);
      if (scenario.reason) {
        parts.push(`   - Reason: ${scenario.reason}`);
      }
    });
    parts.push('');

    // Add user's additional notes if provided
    if (userAdditionalNotes) {
      parts.push('## Additional User Requirements:');
      parts.push(userAdditionalNotes);
      parts.push('');
    }

    // Add additional context if provided
    if (options?.additionalContext) {
      parts.push('## Additional Context:');
      parts.push(options.additionalContext);
      parts.push('');
    }

    // Add imports information
    if (context.imports.length > 0) {
      parts.push('## Available Imports:');
      context.imports.forEach(imp => {
        if (imp.imported_names.includes('*')) {
          parts.push(`- import ${imp.module}${imp.alias ? ` as ${imp.alias}` : ''}`);
        } else {
          parts.push(`- from ${imp.module} import ${imp.imported_names.join(', ')}`);
        }
      });
      parts.push('');
    }

    // Add task instruction
    parts.push('## Task:');
    parts.push('Generate complete pytest test code for the function above, covering all confirmed scenarios. Follow the output format specified in the system prompt and ensure the code is ready to run without modifications.');

    return parts.join('\n');
  }

  /**
   * Build complete prompt (system + user)
   */
  buildPrompt(
    context: FunctionContext,
    confirmedScenarios: IdentifiedScenario[],
    userAdditionalNotes?: string,
    options?: PromptBuildOptions
  ): BuiltPrompt {
    return {
      system: this.systemPrompt,
      user: this.buildUserPrompt(context, confirmedScenarios, userAdditionalNotes, options)
    };
  }

  /**
   * Get system prompt only
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * Get examples
   */
  getExamples(): Stage2Example[] {
    return this.examples;
  }
}

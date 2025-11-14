/**
 * Type definitions for Phase 3 - Prompt Engineering & Agent System
 *
 * This module defines the interfaces and types used by the two-stage agent system:
 * - Stage 1: Information Gathering Agent (scenario identification)
 * - Stage 2: Test Generation Agent (pytest code generation)
 */

import { FunctionContext } from '../analysis/types';

/**
 * Confidence level for identified test scenarios
 */
export type ScenarioConfidence = 'high' | 'medium' | 'low';

/**
 * Source of the identified test scenario
 */
export type ScenarioSource = 'code_analysis' | 'user_description' | 'inference';

/**
 * A single test scenario identified by Stage 1 agent
 */
export interface IdentifiedScenario {
  /** Description of the test scenario */
  scenario: string;

  /** Confidence level in this scenario */
  confidence: ScenarioConfidence;

  /** How this scenario was identified */
  source: ScenarioSource;

  /** Optional: Explanation for why this scenario is suggested */
  reason?: string;
}

/**
 * Response structure from Stage 1 Agent
 *
 * Stage 1 analyzes the function code and user description to identify
 * all necessary test scenarios. It may skip confirmation for simple functions
 * or when user description is sufficiently detailed.
 */
export interface Stage1Response {
  /** Whether to skip user confirmation and proceed directly to generation */
  skip_confirmation: boolean;

  /** Whether to proceed with test generation */
  proceed_to_generation: boolean;

  /** List of identified test scenarios with high confidence */
  identified_scenarios: IdentifiedScenario[];

  /** Additional scenarios suggested with lower confidence */
  suggested_additional_scenarios: IdentifiedScenario[];

  /** The question to present to the user for confirmation */
  confirmation_question: string;

  /** Optional: Reason for skipping confirmation (if skip_confirmation is true) */
  reason?: string;
}

/**
 * Response structure from Stage 2 Agent
 *
 * Stage 2 generates complete pytest test code based on confirmed scenarios
 */
export interface Stage2Response {
  /** Complete pytest test code ready to run */
  test_code: string;

  /** List of import statements needed */
  imports: string[];

  /** Number of test cases generated */
  test_count: number;

  /** Brief summary of what scenarios are covered */
  coverage_summary: string;

  /** Optional: Additional notes or warnings */
  notes?: string;
}

/**
 * Input quality level for user descriptions
 */
export type InputQualityLevel = 'level1' | 'level2' | 'level3';

/**
 * Result of input validation
 */
export interface InputValidationResult {
  /** Whether the input is valid (minimum requirements met) */
  isValid: boolean;

  /** Quality level of the input */
  quality: InputQualityLevel;

  /** Optional suggestions for improving the input */
  suggestions?: string[];

  /** Character count of the input */
  characterCount: number;

  /** Word count of the input */
  wordCount: number;
}

/**
 * Guidance for user input
 */
export interface InputGuidance {
  /** Placeholder text for input field */
  placeholder: string;

  /** Prompt text to guide user */
  prompt: string;

  /** Examples of good descriptions */
  examples: string[];
}

/**
 * Options for LLM API calls in agent context
 */
export interface AgentLLMOptions {
  /** Temperature for generation (0-2, default: 0.3 for Stage 1, 0.2 for Stage 2) */
  temperature?: number;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Response format (json_object for Stage 1, text for Stage 2) */
  responseFormat?: 'text' | 'json_object';

  /** Whether to use streaming (not implemented yet) */
  stream?: boolean;
}

/**
 * Configuration for Stage 1 Agent
 */
export interface Stage1Config {
  /** Maximum number of high-priority scenarios to identify */
  maxIdentifiedScenarios: number;

  /** Maximum number of additional suggested scenarios */
  maxSuggestedScenarios: number;

  /** Whether to skip confirmation for simple functions */
  autoConfirmSimpleFunctions: boolean;

  /** Minimum user description length to skip confirmation */
  minDescriptionLengthForAutoConfirm: number;

  /** Temperature for LLM calls */
  temperature: number;

  /** Max tokens for response */
  maxTokens: number;
}

/**
 * Configuration for Stage 2 Agent
 */
export interface Stage2Config {
  /** Minimum number of test cases to generate */
  minTestCount: number;

  /** Maximum number of test cases to generate */
  maxTestCount: number;

  /** Whether to use pytest parametrize when appropriate */
  useParametrize: boolean;

  /** Whether to generate fixtures when needed */
  generateFixtures: boolean;

  /** Temperature for LLM calls */
  temperature: number;

  /** Max tokens for response */
  maxTokens: number;
}

/**
 * Options for building prompts
 */
export interface PromptBuildOptions {
  /** Whether to include few-shot examples */
  includeExamples?: boolean;

  /** Number of examples to include (default: all) */
  exampleCount?: number;

  /** Additional context to append to the prompt */
  additionalContext?: string;
}

/**
 * Built prompt result
 */
export interface BuiltPrompt {
  /** System message for the LLM */
  system: string;

  /** User message for the LLM */
  user: string;
}

/**
 * A single few-shot example for Stage 1
 */
export interface Stage1Example {
  /** Function code to analyze */
  function_code: string;

  /** User's test description */
  user_description: string;

  /** Expected Stage 1 output */
  expected_output: Stage1Response;

  /** Optional: Name/description of this example */
  description?: string;
}

/**
 * A single few-shot example for Stage 2
 */
export interface Stage2Example {
  /** Function code to test */
  function_code: string;

  /** Confirmed scenarios from Stage 1 */
  confirmed_scenarios: IdentifiedScenario[];

  /** Expected test code output */
  expected_test_code: string;

  /** Optional: Name/description of this example */
  description?: string;
}

/**
 * User confirmation result from the confirmation dialog
 */
export interface UserConfirmationResult {
  /** Whether user confirmed to proceed */
  confirmed: boolean;

  /** Additional scenarios or notes provided by user */
  additionalScenarios?: string;

  /** Whether user cancelled the operation */
  cancelled: boolean;
}

/**
 * Complete pipeline execution result
 */
export interface PipelineExecutionResult {
  /** Whether execution was successful */
  success: boolean;

  /** Stage 1 response */
  stage1Response?: Stage1Response;

  /** Stage 2 response (if reached) */
  stage2Response?: Stage2Response;

  /** User confirmation result (if confirmation was shown) */
  userConfirmation?: UserConfirmationResult;

  /** Total tokens used across all stages */
  totalTokens: number;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Error message if failed */
  error?: string;

  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Token usage tracking for the pipeline
 */
export interface PipelineTokenUsage {
  /** Tokens used in Stage 1 */
  stage1Tokens: number;

  /** Tokens used in Stage 2 */
  stage2Tokens: number;

  /** Total tokens across both stages */
  totalTokens: number;

  /** Estimated cost in USD */
  estimatedCost: number;
}

/**
 * Agent Flow Controller
 *
 * Orchestrates the two-stage test generation pipeline:
 * - Stage 1: Information Gathering (scenario identification)
 * - Stage 2: Test Generation (pytest code generation)
 */

import { FunctionContext } from '../analysis/types';
import { ApiProvider } from '../types';
import {
  Stage1Response,
  Stage2Response,
  UserConfirmationResult,
  PipelineExecutionResult,
  PipelineTokenUsage,
  Stage1Config,
  Stage2Config
} from './types';
import { Stage1PromptBuilder, Stage2PromptBuilder } from './prompt-builder';
import { AgentLLMClient } from './llm-client';
import { InputValidator } from './input-validator';

/**
 * Default configuration for Stage 1 Agent
 */
const DEFAULT_STAGE1_CONFIG: Stage1Config = {
  maxIdentifiedScenarios: 5,
  maxSuggestedScenarios: 3,
  autoConfirmSimpleFunctions: true,
  minDescriptionLengthForAutoConfirm: 100,
  temperature: 0.3,
  maxTokens: 2000
};

/**
 * Default configuration for Stage 2 Agent
 */
const DEFAULT_STAGE2_CONFIG: Stage2Config = {
  minTestCount: 3,
  maxTestCount: 8,
  useParametrize: true,
  generateFixtures: true,
  temperature: 0.2,
  maxTokens: 3000
};

/**
 * Agent Flow Controller
 *
 * Manages the complete test generation pipeline from user input to final test code.
 * Handles both stages, user confirmation, and error recovery.
 */
export class AgentFlowController {
  private stage1Builder: Stage1PromptBuilder;
  private stage2Builder: Stage2PromptBuilder;
  private llmClient: AgentLLMClient;
  private inputValidator: InputValidator;
  private stage1Config: Stage1Config;
  private stage2Config: Stage2Config;

  constructor(
    apiKey: string,
    provider: ApiProvider,
    modelName: string,
    stage1Config?: Partial<Stage1Config>,
    stage2Config?: Partial<Stage2Config>,
    promptsDir?: string
  ) {
    this.stage1Builder = new Stage1PromptBuilder(promptsDir);
    this.stage2Builder = new Stage2PromptBuilder(promptsDir);
    this.llmClient = new AgentLLMClient(apiKey, provider, modelName);
    this.inputValidator = new InputValidator();
    this.stage1Config = { ...DEFAULT_STAGE1_CONFIG, ...stage1Config };
    this.stage2Config = { ...DEFAULT_STAGE2_CONFIG, ...stage2Config };
  }

  /**
   * Execute Stage 1: Information Gathering
   *
   * Analyzes function code and user description to identify test scenarios.
   *
   * @param context - Function context from code analysis
   * @param userDescription - User's test description
   * @returns Stage 1 response with identified scenarios
   */
  async executeStage1(
    context: FunctionContext,
    userDescription: string
  ): Promise<Stage1Response> {
    // Validate user input
    const validation = this.inputValidator.validateUserInput(userDescription);
    if (!validation.isValid) {
      throw new Error(`Invalid user input: ${validation.suggestions?.join(', ')}`);
    }

    // Build prompt
    const prompt = this.stage1Builder.buildPrompt(context, userDescription, {
      includeExamples: false // Set to true to include few-shot examples
    });

    // Call Stage 1 agent
    const response = await this.llmClient.callStage1(
      prompt.system,
      prompt.user,
      {
        temperature: this.stage1Config.temperature,
        maxTokens: this.stage1Config.maxTokens,
        responseFormat: 'json_object'
      }
    );

    return response;
  }

  /**
   * Execute Stage 2: Test Generation
   *
   * Generates pytest test code based on confirmed scenarios.
   *
   * @param context - Function context from code analysis
   * @param stage1Response - Response from Stage 1 with scenarios
   * @param userAdditionalNotes - Optional additional requirements from user
   * @returns Stage 2 response with test code
   */
  async executeStage2(
    context: FunctionContext,
    stage1Response: Stage1Response,
    userAdditionalNotes?: string
  ): Promise<Stage2Response> {
    // Combine identified and suggested scenarios
    const allScenarios = [
      ...stage1Response.identified_scenarios,
      ...stage1Response.suggested_additional_scenarios
    ];

    // Build prompt
    const prompt = this.stage2Builder.buildPrompt(
      context,
      allScenarios,
      userAdditionalNotes,
      {
        includeExamples: false // Set to true to include few-shot examples
      }
    );

    // Call Stage 2 agent
    const response = await this.llmClient.callStage2(
      prompt.system,
      prompt.user,
      {
        temperature: this.stage2Config.temperature,
        maxTokens: this.stage2Config.maxTokens,
        responseFormat: 'json_object'
      }
    );

    // Validate test count
    if (response.test_count < this.stage2Config.minTestCount) {
      console.warn(`Warning: Generated only ${response.test_count} tests, minimum is ${this.stage2Config.minTestCount}`);
    }

    if (response.test_count > this.stage2Config.maxTestCount) {
      console.warn(`Warning: Generated ${response.test_count} tests, maximum is ${this.stage2Config.maxTestCount}`);
    }

    return response;
  }

  /**
   * Run complete pipeline: Stage 1 → User Confirmation → Stage 2
   *
   * This is the main entry point for the full test generation flow.
   *
   * @param context - Function context from code analysis
   * @param userDescription - User's test description
   * @param confirmationHandler - Callback to handle user confirmation (if needed)
   * @returns Complete pipeline execution result
   */
  async runFullPipeline(
    context: FunctionContext,
    userDescription: string,
    confirmationHandler: (stage1Response: Stage1Response) => Promise<UserConfirmationResult>
  ): Promise<PipelineExecutionResult> {
    const startTime = Date.now();

    // Reset token usage
    this.llmClient.resetTokenUsage();

    try {
      // Stage 1: Identify scenarios
      const stage1Response = await this.executeStage1(context, userDescription);
      const tokensAfterStage1 = this.llmClient.getTokenUsage();

      let userConfirmation: UserConfirmationResult | undefined;
      let finalStage1Response = stage1Response;

      // Handle user confirmation if needed
      if (!stage1Response.skip_confirmation) {
        userConfirmation = await confirmationHandler(stage1Response);

        if (userConfirmation.cancelled) {
          return {
            success: false,
            stage1Response,
            userConfirmation,
            totalTokens: tokensAfterStage1.totalTokens,
            estimatedCost: tokensAfterStage1.totalCost,
            error: 'User cancelled',
            executionTime: Date.now() - startTime
          };
        }

        if (!userConfirmation.confirmed) {
          return {
            success: false,
            stage1Response,
            userConfirmation,
            totalTokens: tokensAfterStage1.totalTokens,
            estimatedCost: tokensAfterStage1.totalCost,
            error: 'User did not confirm',
            executionTime: Date.now() - startTime
          };
        }

        // If user provided additional scenarios, we might want to re-run Stage 1
        // For now, we'll just pass them to Stage 2
      }

      // Stage 2: Generate tests
      const stage2Response = await this.executeStage2(
        context,
        finalStage1Response,
        userConfirmation?.additionalScenarios
      );

      const tokensAfterStage2 = this.llmClient.getTokenUsage();

      return {
        success: true,
        stage1Response: finalStage1Response,
        stage2Response,
        userConfirmation,
        totalTokens: tokensAfterStage2.totalTokens,
        estimatedCost: tokensAfterStage2.totalCost,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      const tokenUsage = this.llmClient.getTokenUsage();

      return {
        success: false,
        totalTokens: tokenUsage.totalTokens,
        estimatedCost: tokenUsage.totalCost,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Run simplified pipeline without user confirmation
   *
   * Useful for auto-confirmation scenarios or when testing.
   *
   * @param context - Function context from code analysis
   * @param userDescription - User's test description
   * @returns Complete pipeline execution result
   */
  async runPipelineWithoutConfirmation(
    context: FunctionContext,
    userDescription: string
  ): Promise<PipelineExecutionResult> {
    // Use a confirmation handler that always confirms
    return this.runFullPipeline(context, userDescription, async (stage1Response) => ({
      confirmed: true,
      cancelled: false
    }));
  }

  /**
   * Get token usage for the current session
   */
  getTokenUsage(): PipelineTokenUsage {
    const usage = this.llmClient.getTokenUsage();
    return {
      stage1Tokens: 0, // We don't track stage-specific tokens separately yet
      stage2Tokens: 0,
      totalTokens: usage.totalTokens,
      estimatedCost: usage.totalCost
    };
  }

  /**
   * Validate user input before running pipeline
   *
   * @param userDescription - User's test description
   * @returns Validation result
   */
  validateInput(userDescription: string) {
    return this.inputValidator.validateUserInput(userDescription);
  }

  /**
   * Generate input guidance for user
   *
   * @param context - Function context
   * @returns Input guidance
   */
  generateInputGuidance(context: FunctionContext) {
    return this.inputValidator.generateInputGuidance(context);
  }

  /**
   * Check if function is simple enough for auto-confirmation
   *
   * @param context - Function context
   * @returns true if function is simple (< 10 lines, no branches)
   */
  shouldAutoConfirmSimpleFunction(context: FunctionContext): boolean {
    if (!this.stage1Config.autoConfirmSimpleFunctions) {
      return false;
    }

    const { body_analysis, source_code } = context;

    // Count lines of actual code
    const codeLines = source_code
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 &&
               !trimmed.startsWith('#') &&
               !trimmed.startsWith('"""') &&
               !trimmed.startsWith("'''");
      }).length;

    return (
      codeLines < 10 &&
      body_analysis.complexity === 1 &&
      body_analysis.exceptions.length === 0
    );
  }

  /**
   * Get Stage 1 configuration
   */
  getStage1Config(): Stage1Config {
    return { ...this.stage1Config };
  }

  /**
   * Get Stage 2 configuration
   */
  getStage2Config(): Stage2Config {
    return { ...this.stage2Config };
  }

  /**
   * Update Stage 1 configuration
   */
  updateStage1Config(config: Partial<Stage1Config>) {
    this.stage1Config = { ...this.stage1Config, ...config };
  }

  /**
   * Update Stage 2 configuration
   */
  updateStage2Config(config: Partial<Stage2Config>) {
    this.stage2Config = { ...this.stage2Config, ...config };
  }
}

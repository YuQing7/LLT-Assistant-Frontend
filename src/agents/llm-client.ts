/**
 * LLM Client for Agent System
 *
 * Provides a simplified interface for agents to call LLM APIs with retry logic,
 * error handling, and response parsing.
 */

import { LLMApiClient } from '../api/client';
import { ChatMessage, ApiProvider, LLMResponse } from '../types';
import { AgentLLMOptions, Stage1Response, Stage2Response } from './types';
import { writeDebugSnapshot } from '../utils/debugLogger';

/**
 * LLM Client for Agents
 *
 * Wraps the base LLMApiClient to provide agent-specific functionality
 * including JSON parsing, retry logic, and response validation.
 */
export class AgentLLMClient {
  private apiClient: LLMApiClient;

  constructor(
    apiKey: string,
    provider: ApiProvider,
    modelName: string
  ) {
    this.apiClient = new LLMApiClient(apiKey, provider, modelName);
  }

  /**
   * Call LLM with system and user prompts
   *
   * @param systemPrompt - System message defining agent behavior
   * @param userPrompt - User message with task and context
   * @param options - Optional parameters for the API call
   * @returns LLM response content
   */
  async callLLM(
    systemPrompt: string,
    userPrompt: string,
    options?: AgentLLMOptions
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const llmOptions = {
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 2000,
      responseFormat: options?.responseFormat
    };

    const response = await this.apiClient.callLLM(messages, llmOptions);
    return response.content;
  }

  /**
   * Call LLM with automatic retry on transient failures
   *
   * @param systemPrompt - System message
   * @param userPrompt - User message
   * @param options - Optional parameters
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns LLM response content
   */
  async callWithRetry(
    systemPrompt: string,
    userPrompt: string,
    options?: AgentLLMOptions,
    maxRetries: number = 3
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const llmOptions = {
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 2000,
      responseFormat: options?.responseFormat
    };

    // Use the base client's retry mechanism
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.apiClient.callLLM(messages, llmOptions);
        return response.content;
      } catch (error) {
        lastError = error;

        // If it's the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Call Stage 1 agent and parse JSON response
   *
   * @param systemPrompt - Stage 1 system prompt
   * @param userPrompt - Stage 1 user prompt with function context
   * @param options - Optional parameters
   * @returns Parsed Stage1Response
   */
  async callStage1(
    systemPrompt: string,
    userPrompt: string,
    options?: AgentLLMOptions
  ): Promise<Stage1Response> {
    return this.callStage1Internal(systemPrompt, userPrompt, options, true);
  }

  private async callStage1Internal(
    systemPrompt: string,
    userPrompt: string,
    options: AgentLLMOptions | undefined,
    allowParseRetry: boolean
  ): Promise<Stage1Response> {
    // Force JSON response format for Stage 1
    const stage1Options: AgentLLMOptions = {
      ...options,
      responseFormat: 'json_object',
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 2000000
    };

    writeDebugSnapshot('stage1', 'request', {
      attempt: 'primary',
      systemPrompt,
      userPrompt,
      options: stage1Options
    });

    const responseContent = await this.callWithRetry(
      systemPrompt,
      userPrompt,
      stage1Options
    );

    console.log('[LLT Assistant] Stage1 raw response:', responseContent);
    writeDebugSnapshot('stage1', 'response', {
      attempt: 'primary',
      responseContent
    });

    // Parse JSON response
    try {
      const parsed = this.parseStage1Response(responseContent);
      this.validateStage1Response(parsed);
      writeDebugSnapshot('stage1', 'parsed', {
        attempt: 'primary',
        parsed
      });
      return parsed;
    } catch (error) {
      const snippet = responseContent ? responseContent.slice(0, 200) : '<empty response>';
      console.error('[LLT Assistant] Stage1 parse failure. Raw response snippet:', snippet);
      writeDebugSnapshot('stage1', 'error', {
        attempt: 'primary',
        error: error instanceof Error ? error.message : String(error),
        responseSnippet: snippet
      });

      if (allowParseRetry) {
        console.warn('[LLT Assistant] Retrying Stage1 request due to invalid JSON response');
        const retryPrompt = `${userPrompt}\n\nIMPORTANT: Your previous response was not valid JSON. Respond again with complete, well-formed JSON that strictly follows the required schema. Do not include any explanatory text.`;

        writeDebugSnapshot('stage1', 'request', {
          attempt: 'retry',
          systemPrompt,
          userPrompt: retryPrompt,
          options: stage1Options
        });

        const retryContent = await this.callWithRetry(
          systemPrompt,
          retryPrompt,
          stage1Options
        );

        console.log('[LLT Assistant] Stage1 raw response (retry):', retryContent);
        writeDebugSnapshot('stage1', 'response', {
          attempt: 'retry',
          responseContent: retryContent
        });

        try {
          const parsedRetry = this.parseStage1Response(retryContent);
          this.validateStage1Response(parsedRetry);
          writeDebugSnapshot('stage1', 'parsed', {
            attempt: 'retry',
            parsed: parsedRetry
          });
          return parsedRetry;
        } catch (retryError) {
          const retrySnippet = retryContent ? retryContent.slice(0, 200) : '<empty response>';
          console.error('[LLT Assistant] Stage1 retry parse failure. Raw response snippet:', retrySnippet);
          writeDebugSnapshot('stage1', 'error', {
            attempt: 'retry',
            error: retryError instanceof Error ? retryError.message : String(retryError),
            responseSnippet: retrySnippet
          });
          throw new Error(
            `Failed to parse Stage 1 response after retry. First error: ${error instanceof Error ? error.message : String(error)} | Second error: ${retryError instanceof Error ? retryError.message : String(retryError)} | Last snippet: ${retrySnippet}`
          );
        }
      }

      throw new Error(`Failed to parse Stage 1 response: ${error instanceof Error ? error.message : String(error)} | Raw snippet: ${snippet}`);
    }
  }

  /**
   * Call Stage 2 agent and parse JSON response
   *
   * @param systemPrompt - Stage 2 system prompt
   * @param userPrompt - Stage 2 user prompt with scenarios
   * @param options - Optional parameters
   * @returns Parsed Stage2Response
   */
  async callStage2(
    systemPrompt: string,
    userPrompt: string,
    options?: AgentLLMOptions
  ): Promise<Stage2Response> {
    // Force JSON response format for Stage 2
    const stage2Options: AgentLLMOptions = {
      ...options,
      responseFormat: 'json_object',
      temperature: options?.temperature ?? 0.2, // Lower temperature for code generation
      maxTokens: options?.maxTokens ?? 3000 // More tokens for test code
    };

    writeDebugSnapshot('stage2', 'request', {
      systemPrompt,
      userPrompt,
      options: stage2Options
    });

    const responseContent = await this.callWithRetry(
      systemPrompt,
      userPrompt,
      stage2Options
    );

    console.log('[LLT Assistant] Stage2 raw response:', responseContent);
    writeDebugSnapshot('stage2', 'response', {
      responseContent
    });

    // Parse JSON response
    try {
      const parsed = this.parseStage2Response(responseContent);
      this.validateStage2Response(parsed);
      writeDebugSnapshot('stage2', 'parsed', {
        parsed
      });
      return parsed;
    } catch (error) {
      const snippet = responseContent ? responseContent.slice(0, 200) : '<empty response>';
      console.error('[LLT Assistant] Stage2 parse failure. Raw response snippet:', snippet);
      writeDebugSnapshot('stage2', 'error', {
        error: error instanceof Error ? error.message : String(error),
        responseSnippet: snippet
      });
      throw new Error(`Failed to parse Stage 2 response: ${error instanceof Error ? error.message : String(error)} | Raw snippet: ${snippet}`);
    }
  }

  /**
   * Get cumulative token usage
   */
  getTokenUsage() {
    return this.apiClient.getTokenUsage();
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage() {
    this.apiClient.resetTokenUsage();
  }

  /**
   * Parse Stage 1 response from JSON string
   * @private
   */
  private parseStage1Response(content: string): Stage1Response {
    // Try to extract JSON from markdown code blocks if present
    const jsonString = extractJsonPayload(content);
    const parsed = parseJson(jsonString);

    return {
      skip_confirmation: parsed.skip_confirmation ?? false,
      proceed_to_generation: parsed.proceed_to_generation ?? true,
      identified_scenarios: parsed.identified_scenarios || [],
      suggested_additional_scenarios: parsed.suggested_additional_scenarios || [],
      confirmation_question: parsed.confirmation_question || '',
      reason: parsed.reason
    };
  }

  /**
   * Parse Stage 2 response from JSON string
   * @private
   */
  private parseStage2Response(content: string): Stage2Response {
    // Try to extract JSON from markdown code blocks if present
    const jsonString = extractJsonPayload(content);
    const parsed = parseJson(jsonString);

    return {
      test_code: parsed.test_code || '',
      imports: parsed.imports || [],
      test_count: parsed.test_count || 0,
      coverage_summary: parsed.coverage_summary || '',
      notes: parsed.notes
    };
  }

  /**
   * Validate Stage 1 response structure
   * @private
   */
  private validateStage1Response(response: Stage1Response): void {
    if (typeof response.skip_confirmation !== 'boolean') {
      throw new Error('Invalid Stage1Response: skip_confirmation must be boolean');
    }

    if (typeof response.proceed_to_generation !== 'boolean') {
      throw new Error('Invalid Stage1Response: proceed_to_generation must be boolean');
    }

    if (!Array.isArray(response.identified_scenarios)) {
      throw new Error('Invalid Stage1Response: identified_scenarios must be array');
    }

    if (!Array.isArray(response.suggested_additional_scenarios)) {
      throw new Error('Invalid Stage1Response: suggested_additional_scenarios must be array');
    }

    if (typeof response.confirmation_question !== 'string') {
      throw new Error('Invalid Stage1Response: confirmation_question must be string');
    }

    // Validate scenario structures
    for (const scenario of response.identified_scenarios) {
      if (!scenario.scenario || !scenario.confidence || !scenario.source) {
        throw new Error('Invalid scenario structure in identified_scenarios');
      }
    }
  }

  /**
   * Validate Stage 2 response structure
   * @private
   */
  private validateStage2Response(response: Stage2Response): void {
    if (typeof response.test_code !== 'string' || response.test_code.length === 0) {
      throw new Error('Invalid Stage2Response: test_code must be non-empty string');
    }

    if (!Array.isArray(response.imports)) {
      throw new Error('Invalid Stage2Response: imports must be array');
    }

    if (typeof response.test_count !== 'number' || response.test_count < 1) {
      throw new Error('Invalid Stage2Response: test_count must be positive number');
    }

    if (typeof response.coverage_summary !== 'string') {
      throw new Error('Invalid Stage2Response: coverage_summary must be string');
    }

    // Check if test_code looks like Python code
    if (!response.test_code.includes('def test_')) {
      throw new Error('Invalid Stage2Response: test_code does not appear to contain test functions');
    }
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Extract JSON payload from an LLM response, handling code fences and extra text.
 */
function extractJsonPayload(content: string): string {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    throw new Error('LLM response was empty');
  }

  const codeFenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeFenceMatch) {
    const candidate = codeFenceMatch[1].trim();
    if (candidate) {
      return candidate;
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Unable to locate JSON payload in LLM response');
}

/**
 * Safely parse JSON and surface a helpful error message on failure.
 */
function parseJson(jsonString: string): any {
  const candidate = jsonString.trim();
  if (!candidate) {
    throw new Error('JSON payload was empty');
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.error('[LLT Assistant] Failed to parse JSON payload:', candidate);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Parse Stage 1 response (standalone function for backwards compatibility)
 */
export function parseStage1Response(llmOutput: string): Stage1Response {
  const client = new AgentLLMClient('dummy', 'openai', 'dummy');
  return (client as any).parseStage1Response(llmOutput);
}

/**
 * Parse Stage 2 response (standalone function for backwards compatibility)
 */
export function parseStage2Response(llmOutput: string): Stage2Response {
  const client = new AgentLLMClient('dummy', 'openai', 'dummy');
  return (client as any).parseStage2Response(llmOutput);
}

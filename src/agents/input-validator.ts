/**
 * Input Validator for User Test Descriptions
 *
 * Validates and provides guidance for user input to ensure quality test descriptions.
 * Helps guide users to provide "Level 2" quality descriptions for better test generation.
 */

import { FunctionContext } from '../analysis/types';
import {
  InputValidationResult,
  InputGuidance,
  InputQualityLevel
} from './types';

/**
 * Input Validator
 *
 * Validates user test descriptions and provides guidance to improve input quality.
 * Quality levels:
 * - Level 1 (<30 chars, minimal): "Test login"
 * - Level 2 (30-100 chars, good): "Test login with valid credentials, invalid password, and missing user"
 * - Level 3 (>100 chars, excellent): Detailed description with specific scenarios and edge cases
 */
export class InputValidator {
  // Quality thresholds
  private static readonly MIN_LENGTH = 10;
  private static readonly LEVEL2_MIN_LENGTH = 30;
  private static readonly LEVEL3_MIN_LENGTH = 100;

  /**
   * Validate user input and determine quality level
   *
   * @param input - User's test description
   * @returns Validation result with quality assessment
   */
  validateUserInput(input: string): InputValidationResult {
    const trimmedInput = input.trim();
    const characterCount = trimmedInput.length;
    const wordCount = this.countWords(trimmedInput);

    // Check minimum requirements
    if (characterCount < InputValidator.MIN_LENGTH) {
      return {
        isValid: false,
        quality: 'level1',
        characterCount,
        wordCount,
        suggestions: [
          'Description is too short',
          'Please provide at least a brief description of what you want to test',
          `Minimum ${InputValidator.MIN_LENGTH} characters required`
        ]
      };
    }

    // Determine quality level
    const quality = this.determineQualityLevel(trimmedInput, characterCount, wordCount);

    // Generate suggestions based on quality
    const suggestions = this.generateSuggestions(quality, trimmedInput);

    return {
      isValid: true,
      quality,
      characterCount,
      wordCount,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Generate guidance for user input based on function context
   *
   * @param context - Function context from code analysis
   * @returns Input guidance with placeholder, prompt, and examples
   */
  generateInputGuidance(context: FunctionContext): InputGuidance {
    const functionName = context.signature.name;
    const hasMultipleBranches = context.body_analysis.branches.length > 1;
    const hasExceptions = context.body_analysis.exceptions.length > 0;
    const complexity = context.body_analysis.complexity;

    // Generate contextual placeholder
    const placeholder = this.generatePlaceholder(functionName, hasMultipleBranches, hasExceptions);

    // Generate prompt text
    const prompt = this.generatePromptText(complexity, hasMultipleBranches, hasExceptions);

    // Generate examples based on function characteristics
    const examples = this.generateExamples(functionName, hasMultipleBranches, hasExceptions);

    return {
      placeholder,
      prompt,
      examples
    };
  }

  /**
   * Determine quality level of user input
   * @private
   */
  private determineQualityLevel(
    input: string,
    characterCount: number,
    wordCount: number
  ): InputQualityLevel {
    // Level 3: Excellent - detailed description with multiple specific scenarios
    if (characterCount >= InputValidator.LEVEL3_MIN_LENGTH) {
      const hasMultipleScenarios = this.detectMultipleScenarios(input);
      const hasSpecificDetails = this.detectSpecificDetails(input);

      if (hasMultipleScenarios && hasSpecificDetails) {
        return 'level3';
      }
    }

    // Level 2: Good - clear description with main scenarios
    if (characterCount >= InputValidator.LEVEL2_MIN_LENGTH) {
      const hasScenarioIndicators = this.detectScenarioIndicators(input);

      if (hasScenarioIndicators || wordCount >= 8) {
        return 'level2';
      }
    }

    // Level 1: Minimal - brief, vague description
    return 'level1';
  }

  /**
   * Detect if input mentions multiple test scenarios
   * @private
   */
  private detectMultipleScenarios(input: string): boolean {
    const lowerInput = input.toLowerCase();

    // Count scenario separators
    const separators = [',', ';', '\n', ' and ', ' or '];
    let separatorCount = 0;
    for (const sep of separators) {
      separatorCount += (lowerInput.match(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    }

    // Count numbered lists (1., 2., etc.)
    const numberedList = lowerInput.match(/\d+\./g);
    if (numberedList && numberedList.length >= 2) {
      return true;
    }

    // Count scenario keywords
    const scenarioKeywords = ['test', 'case', 'scenario', 'when', 'if', 'should'];
    let keywordCount = 0;
    for (const keyword of scenarioKeywords) {
      const matches = lowerInput.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      keywordCount += matches ? matches.length : 0;
    }

    return separatorCount >= 2 || keywordCount >= 3;
  }

  /**
   * Detect if input contains specific details (not just generic terms)
   * @private
   */
  private detectSpecificDetails(input: string): boolean {
    const lowerInput = input.toLowerCase();

    // Check for specific conditions or values
    const specificKeywords = [
      'empty', 'null', 'none', 'zero', 'negative', 'positive',
      'invalid', 'valid', 'missing', 'duplicate', 'error',
      'success', 'fail', 'exception', 'boundary', 'edge case'
    ];

    let detailCount = 0;
    for (const keyword of specificKeywords) {
      if (lowerInput.includes(keyword)) {
        detailCount++;
      }
    }

    return detailCount >= 2;
  }

  /**
   * Detect scenario indicators in input
   * @private
   */
  private detectScenarioIndicators(input: string): boolean {
    const lowerInput = input.toLowerCase();

    const indicators = [
      'including', 'such as', 'like', 'with', 'when', 'if',
      'case', 'scenario', 'example', 'both', 'either'
    ];

    for (const indicator of indicators) {
      if (lowerInput.includes(indicator)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate suggestions to improve input quality
   * @private
   */
  private generateSuggestions(quality: InputQualityLevel, input: string): string[] {
    const suggestions: string[] = [];

    if (quality === 'level1') {
      suggestions.push('Consider adding specific test scenarios you want to cover');
      suggestions.push('Mention edge cases, error conditions, or different input types');
      suggestions.push('Example: "Test login with valid credentials, invalid password, and missing user"');
    } else if (quality === 'level2') {
      // Level 2 is good, but can be improved
      if (!this.detectSpecificDetails(input)) {
        suggestions.push('Consider mentioning specific edge cases (e.g., empty inputs, null values, boundary conditions)');
      }
    }
    // Level 3 needs no suggestions - it's excellent

    return suggestions;
  }

  /**
   * Generate contextual placeholder text
   * @private
   */
  private generatePlaceholder(
    functionName: string,
    hasMultipleBranches: boolean,
    hasExceptions: boolean
  ): string {
    if (hasMultipleBranches && hasExceptions) {
      return `Describe test scenarios for ${functionName}, including different paths and error cases...`;
    } else if (hasMultipleBranches) {
      return `Describe test scenarios for ${functionName}, including different conditional paths...`;
    } else if (hasExceptions) {
      return `Describe test scenarios for ${functionName}, including normal and error cases...`;
    } else {
      return `Describe what you want to test for ${functionName}...`;
    }
  }

  /**
   * Generate contextual prompt text
   * @private
   */
  private generatePromptText(
    complexity: number,
    hasMultipleBranches: boolean,
    hasExceptions: boolean
  ): string {
    const parts: string[] = ['Describe the test scenarios you want to generate.'];

    if (complexity > 5 || hasMultipleBranches) {
      parts.push('This function has multiple paths - consider mentioning different conditions to test.');
    }

    if (hasExceptions) {
      parts.push('Include both normal cases and error scenarios.');
    }

    parts.push('Tip: More detailed descriptions (30+ characters) help generate better tests!');

    return parts.join(' ');
  }

  /**
   * Generate contextual examples
   * @private
   */
  private generateExamples(
    functionName: string,
    hasMultipleBranches: boolean,
    hasExceptions: boolean
  ): string[] {
    const examples: string[] = [];

    if (hasMultipleBranches && hasExceptions) {
      examples.push(
        `Test ${functionName} with valid inputs, invalid inputs, edge cases, and error conditions`,
        `Cover all branches in ${functionName} including happy path, boundary values, and exception handling`,
        `Test ${functionName}: 1) Normal operation, 2) Invalid parameters, 3) Edge cases (empty, null), 4) Error conditions`
      );
    } else if (hasMultipleBranches) {
      examples.push(
        `Test ${functionName} with different input combinations to cover all branches`,
        `Cover all conditional paths in ${functionName} including edge cases`,
        `Test ${functionName} with valid values, boundary values, and different conditions`
      );
    } else if (hasExceptions) {
      examples.push(
        `Test ${functionName} with valid inputs and verify error handling for invalid inputs`,
        `Cover normal operation and exception cases for ${functionName}`,
        `Test ${functionName}: successful execution and error scenarios`
      );
    } else {
      examples.push(
        `Test ${functionName} with typical inputs and edge cases`,
        `Verify ${functionName} behavior with different input values`,
        `Test ${functionName} with normal and boundary values`
      );
    }

    return examples;
  }

  /**
   * Count words in text
   * @private
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if input quality is sufficient for auto-confirmation
   *
   * Returns true if the user description is detailed enough that Stage 1
   * agent is likely to skip confirmation
   *
   * @param input - User's test description
   * @returns true if quality is Level 3
   */
  isHighQuality(input: string): boolean {
    const validation = this.validateUserInput(input);
    return validation.quality === 'level3';
  }

  /**
   * Get minimum recommended length for good quality input
   */
  static getRecommendedMinLength(): number {
    return InputValidator.LEVEL2_MIN_LENGTH;
  }
}

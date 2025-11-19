/**
 * Supplement Test Scenarios Command
 *
 * This module implements the functionality to add new test cases to existing test suites
 * without regenerating all tests.
 *
 * NOTE: This feature has been deprecated in favor of backend-only test generation.
 */

import * as vscode from 'vscode';
import { UIDialogs } from '../ui';

/**
 * Execute the supplement tests command
 *
 * This command is deprecated and will show an error message to users.
 */
export async function executeSupplementTestsCommand(): Promise<void> {
  try {
    // Note: Supplement tests feature is deprecated
    // The extension now uses backend API for all test generation
    await UIDialogs.showError(
      'The Supplement Tests feature has been deprecated. Please use the "Generate Tests" command instead.',
      ['OK']
    );
  } catch (error) {
    console.error('Error in supplement tests command:', error);
    await UIDialogs.showError(
      `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      ['OK']
    );
  }
}

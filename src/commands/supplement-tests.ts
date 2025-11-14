/**
 * Supplement Test Scenarios Command
 *
 * This module implements the functionality to add new test cases to existing test suites
 * without regenerating all tests.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationManager } from '../api';
import { UIDialogs } from '../ui';
import { AgentFlowController } from '../agents';

/**
 * Extract scenarios from existing test code
 * Parses test method names and docstrings to identify covered scenarios
 */
function extractExistingScenarios(testCode: string): string[] {
  const scenarios: string[] = [];

  // Extract from test method names (e.g., test_should_return_true_when_valid -> "should return true when valid")
  const methodMatches = testCode.matchAll(/def (test_[\w_]+)/g);
  for (const match of methodMatches) {
    const methodName = match[1];
    // Convert snake_case to readable text
    const scenario = methodName
      .replace(/^test_/, '')
      .replace(/_/g, ' ');
    scenarios.push(scenario);
  }

  // Also extract from docstrings if available
  const docstringMatches = testCode.matchAll(/"""([^"]+)"""/g);
  for (const match of docstringMatches) {
    const docstring = match[1].trim();
    if (docstring.length > 0 && docstring.length < 200) {
      scenarios.push(docstring);
    }
  }

  return scenarios;
}

/**
 * Find the source file for a test file
 * Assumes test files follow the pattern test_<module>.py or <module>_test.py
 */
function findSourceFile(testFilePath: string): string | undefined {
  const testFileName = path.basename(testFilePath);
  const testDir = path.dirname(testFilePath);

  // Try to find source file
  let sourceFileName: string | undefined;

  if (testFileName.startsWith('test_')) {
    // test_module.py -> module.py
    sourceFileName = testFileName.replace(/^test_/, '');
  } else if (testFileName.endsWith('_test.py')) {
    // module_test.py -> module.py
    sourceFileName = testFileName.replace(/_test\.py$/, '.py');
  }

  if (!sourceFileName) {
    return undefined;
  }

  // Look for source file in common locations
  const possiblePaths = [
    // Same directory as test file (rare but possible)
    path.join(testDir, sourceFileName),
    // One level up (tests/ directory structure)
    path.join(testDir, '..', sourceFileName),
    // In src/ directory
    path.join(testDir, '..', 'src', sourceFileName),
    // In app/ directory
    path.join(testDir, '..', 'app', sourceFileName),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  return undefined;
}

/**
 * Extract function code from source file
 * Tries to find the function being tested based on test class/method names
 */
function extractFunctionFromSource(sourceFilePath: string, testCode: string): string | undefined {
  try {
    const sourceCode = fs.readFileSync(sourceFilePath, 'utf-8');

    // Try to infer function name from test code
    // Look for patterns like TestClassName or test_function_name
    const classMatch = testCode.match(/class (Test\w+)/);
    if (classMatch) {
      const className = classMatch[1].replace(/^Test/, '').toLowerCase();
      // Look for function with similar name
      const funcRegex = new RegExp(`def\\s+(${className}|\\w*${className}\\w*)\\s*\\(`, 'i');
      const funcMatch = sourceCode.match(funcRegex);
      if (funcMatch) {
        // Extract the full function
        const funcStart = funcMatch.index!;
        const lines = sourceCode.slice(funcStart).split('\n');
        const funcLines = [lines[0]];

        // Get function body (simple approach - until next def or class at same indentation)
        const baseIndent = lines[0].match(/^\s*/)?.[0].length || 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const indent = line.match(/^\s*/)?.[0].length || 0;

          if (line.trim().length === 0) {
            funcLines.push(line);
            continue;
          }

          if (indent <= baseIndent && (line.trim().startsWith('def ') || line.trim().startsWith('class '))) {
            break;
          }

          funcLines.push(line);
        }

        return funcLines.join('\n');
      }
    }

    // If no function found, return the first function in the file
    const firstFuncMatch = sourceCode.match(/def\s+\w+\s*\([^)]*\).*?(?=\ndef\s+|\nclass\s+|$)/s);
    return firstFuncMatch?.[0];
  } catch (error) {
    console.error('Error extracting function from source:', error);
    return undefined;
  }
}

/**
 * Insert new test methods into existing test code
 */
function insertNewTestMethods(existingTestCode: string, newTestMethods: string): string {
  // Find the last test method or the end of the class
  const classMatch = existingTestCode.match(/class\s+\w+.*?:/);

  if (classMatch) {
    // Find the indentation of existing test methods
    const methodMatch = existingTestCode.match(/^(\s+)def test_/m);
    const indent = methodMatch ? methodMatch[1] : '    ';

    // Indent the new test methods
    const indentedNewMethods = newTestMethods
      .split('\n')
      .map(line => line.trim() ? indent + line : line)
      .join('\n');

    // Find the last method in the class
    const lastMethodMatch = existingTestCode.lastIndexOf('def test_');
    if (lastMethodMatch !== -1) {
      // Find the end of this method
      const afterLastMethod = existingTestCode.slice(lastMethodMatch);
      const nextDefOrClassMatch = afterLastMethod.match(/\n(?=\ndef\s+|class\s+)/);

      if (nextDefOrClassMatch) {
        const insertPosition = lastMethodMatch + nextDefOrClassMatch.index! + 1;
        return (
          existingTestCode.slice(0, insertPosition) +
          '\n' +
          indentedNewMethods +
          '\n' +
          existingTestCode.slice(insertPosition)
        );
      }
    }

    // If we can't find a good position, append before the last line
    const lines = existingTestCode.split('\n');
    lines.splice(lines.length - 1, 0, '', indentedNewMethods);
    return lines.join('\n');
  }

  // If no class found, just append
  return existingTestCode + '\n\n' + newTestMethods;
}

/**
 * Register and execute the supplement tests command
 */
export async function executeSupplementTestsCommand(): Promise<void> {
  try {
    // Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await UIDialogs.showError('No active editor found. Please open a test file.');
      return;
    }

    // Check if it's a Python test file
    if (editor.document.languageId !== 'python') {
      await UIDialogs.showError('This command only works with Python test files.');
      return;
    }

    const testFilePath = editor.document.uri.fsPath;
    const testFileName = path.basename(testFilePath);

    if (!testFileName.includes('test')) {
      await UIDialogs.showError(
        'This command should be used on test files. The file name should contain "test".',
        ['OK']
      );
      return;
    }

    // Read existing test code
    const existingTestCode = editor.document.getText();

    // Extract existing scenarios
    const existingScenarios = extractExistingScenarios(existingTestCode);

    if (existingScenarios.length === 0) {
      await UIDialogs.showWarning(
        'Could not identify existing test scenarios. Please ensure the file contains test methods.',
        ['OK']
      );
      return;
    }

    // Show existing scenarios to user
    const scenarioList = existingScenarios.slice(0, 10).join('\n• ');
    const moreText = existingScenarios.length > 10 ? `\n... and ${existingScenarios.length - 10} more` : '';

    // Get user's description of new scenarios
    const newScenarioDescription = await vscode.window.showInputBox({
      prompt: `Current test covers:\n• ${scenarioList}${moreText}\n\nDescribe additional scenarios to test:`,
      placeHolder: 'e.g., test with null input, test with concurrent access, test timeout behavior',
      ignoreFocusOut: true,
      validateInput: (text: string) => {
        const trimmed = text.trim();
        if (trimmed.length < 10) {
          return 'Please provide a more detailed description (at least 10 characters)';
        }
        if (trimmed.length > 300) {
          return 'Description is too long (maximum 300 characters)';
        }
        return null;
      }
    });

    if (!newScenarioDescription) {
      // User cancelled
      return;
    }

    // Try to find source file and function
    const sourceFilePath = findSourceFile(testFilePath);
    let functionCode: string | undefined;

    if (sourceFilePath) {
      functionCode = extractFunctionFromSource(sourceFilePath, existingTestCode);
    }

    if (!functionCode) {
      // Ask user to provide function code
      const userInput = await vscode.window.showInputBox({
        prompt: 'Could not auto-detect function code. Please paste the function being tested (or press ESC to skip):',
        placeHolder: 'def my_function(...):\n    ...',
        ignoreFocusOut: true,
        value: '# Paste function code here'
      });

      if (userInput && userInput.trim() !== '# Paste function code here') {
        functionCode = userInput;
      } else {
        // Use a placeholder
        functionCode = '# Function code not provided\n# Generating tests based on description only';
      }
    }

    // Initialize configuration manager
    const configManager = new ConfigurationManager();

    // Validate configuration
    const validation = configManager.validateConfiguration();
    if (!validation.valid) {
      await UIDialogs.showError(
        `Configuration error:\n${validation.errors.join('\n')}`,
        ['Open Settings']
      );
      return;
    }

    // Get API key (will prompt if not set)
    let apiKey: string;
    try {
      apiKey = await configManager.getApiKey();
    } catch (error) {
      // User cancelled API key input
      return;
    }

    // Initialize agent controller
    const provider = configManager.getApiProvider();
    const modelName = configManager.getModelName();
    const agentController = new AgentFlowController(apiKey, provider, modelName);

    // Execute with progress indicator
    await UIDialogs.withProgress('Generating additional test scenarios...', async () => {
      try {
        // Call supplement API
        const result = await agentController.supplementTestScenarios(
          existingTestCode,
          existingScenarios,
          functionCode!,
          newScenarioDescription
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate supplemental tests');
        }

        if (!result.newTestCode) {
          throw new Error('No new test code generated');
        }

        // Show preview of new test methods
        const previewAction = await vscode.window.showInformationMessage(
          `Generated ${result.newTestCount} new test method(s).\n\n${result.coverageSummary}\n\nTokens used: ${result.tokensUsed}\nCost: $${result.estimatedCost.toFixed(4)}`,
          { modal: true },
          'Preview & Insert',
          'Insert Directly',
          'Cancel'
        );

        if (previewAction === 'Cancel' || !previewAction) {
          return;
        }

        if (previewAction === 'Preview & Insert') {
          // Show preview in new document
          const previewDoc = await vscode.workspace.openTextDocument({
            content: result.newTestCode,
            language: 'python'
          });
          await vscode.window.showTextDocument(previewDoc, vscode.ViewColumn.Beside);

          const confirmAction = await vscode.window.showInformationMessage(
            'Review the new test methods. Click "Insert" to add them to your test file.',
            'Insert',
            'Cancel'
          );

          if (confirmAction !== 'Insert') {
            return;
          }
        }

        // Insert new test methods into the test file
        const updatedTestCode = insertNewTestMethods(existingTestCode, result.newTestCode!);

        // Update the document
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(existingTestCode.length)
        );
        edit.replace(editor.document.uri, fullRange, updatedTestCode);
        await vscode.workspace.applyEdit(edit);

        // Save the document
        await editor.document.save();

        // Show success message
        await UIDialogs.showSuccess(
          `✓ Successfully added ${result.newTestCount} new test method(s)!\n\nFile: ${testFilePath}`,
          ['OK']
        );
      } catch (error) {
        throw error;
      }
    });
  } catch (error) {
    console.error('Error in supplementTests command:', error);
    await UIDialogs.showError(
      `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
      ['OK']
    );
  }
}

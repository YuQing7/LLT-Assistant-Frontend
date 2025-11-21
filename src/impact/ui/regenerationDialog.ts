/**
 * Regeneration Dialog
 * Handles user decision dialog and test regeneration flow
 *
 * NOTE: This module needs to be refactored to use the new async API workflow.
 * The old two-stage pipeline (BackendAgentController, PythonASTAnalyzer) has been removed.
 * For now, regeneration triggers the generateTests command with regenerate mode.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AffectedTest, RegenerationResult, ChangeDetectionResult } from '../models/types';
import { TestGenerationController } from '../../generation';
import { ConfigurationManager } from '../../api';

/**
 * User decision result
 */
export interface UserDecision {
	confirmed: boolean;
	cancelled: boolean;
}

/**
 * Regeneration Dialog Manager
 */
export class RegenerationDialogManager {
	private testGenerator: TestGenerationController;

	constructor() {
		this.testGenerator = new TestGenerationController();
	}

	/**
	 * Show decision dialog to user
	 */
	async showDecisionDialog(
		affectedTests: AffectedTest[],
		changeContext: ChangeDetectionResult
	): Promise<UserDecision> {
		// Build message
		const functions = changeContext.change_summary.functions_changed
			.map(f => `  • ${f.file_path} → ${f.function_name}`)
			.join('\n');

		const tests = affectedTests
			.slice(0, 10) // Limit to first 10 tests
			.map(t => `  • ${t.file_path} → ${t.test_name} [${t.impact_level.toUpperCase()}]`)
			.join('\n');

		const moreTests = affectedTests.length > 10 ? `\n  ... and ${affectedTests.length - 10} more` : '';

		const message =
			`Did the functionality of these functions change, or is it just refactoring?\n\n` +
			`Changed functions:\n${functions}\n\n` +
			`Affected tests:\n${tests}${moreTests}\n\n` +
			`⚠️  Selecting "Yes" will regenerate these tests using the test generation feature.`;

		// Show modal dialog
		const action = await vscode.window.showInformationMessage(
			message,
			{ modal: true },
			'Yes, functionality changed',
			'No, just refactoring',
			'Cancel'
		);

		if (action === 'Yes, functionality changed') {
			return { confirmed: true, cancelled: false };
		} else if (action === 'No, just refactoring') {
			return { confirmed: false, cancelled: false };
		} else {
			return { confirmed: false, cancelled: true };
		}
	}

	/**
	 * Regenerate affected tests
	 *
	 * NOTE: This method has been updated to use the new async workflow.
	 * It now triggers the generateTests command with mode='regenerate' for each test.
	 */
	async regenerateTests(
		affectedTests: AffectedTest[],
		changeContext: ChangeDetectionResult
	): Promise<void> {
		try {
			// Get workspace root
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
			if (!workspaceRoot) {
				vscode.window.showErrorMessage('No workspace folder open');
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Regenerating tests...',
					cancellable: false
				},
				async (progress) => {
					const results: RegenerationResult[] = [];

					// Process each affected test
					for (let i = 0; i < affectedTests.length; i++) {
						const test = affectedTests[i];

						progress.report({
							message: `Generating test ${i + 1}/${affectedTests.length}: ${test.test_name}`,
							increment: (100 / affectedTests.length)
						});

						try {
							// Find the source file for this test
							const sourceFile = this.findSourceFile(test, changeContext);
							if (!sourceFile) {
								console.error(`Cannot find source file for test ${test.test_name}`);
								continue;
							}

							const fullSourcePath = path.join(workspaceRoot, sourceFile);
							const functionName = this.extractFunctionName(test, changeContext);

							// Open the source file and position cursor
							const doc = await vscode.workspace.openTextDocument(fullSourcePath);
							const editor = await vscode.window.showTextDocument(doc);

							// Execute generateTests command with regenerate mode
							await vscode.commands.executeCommand('llt-assistant.generateTests', {
								mode: 'regenerate',
								targetFunction: functionName
							});

							// TODO: Capture the result and add to results array
							// For now, the command handles its own diff preview and file writing
						} catch (error) {
							console.error(`Error generating test for ${test.test_name}:`, error);
							// Continue with other tests
						}
					}

					// Show summary
					if (results.length > 0) {
						await this.showDiffPreview(results);
					} else {
						vscode.window.showInformationMessage(
							`Regeneration complete for ${affectedTests.length} tests. ` +
							`Please review and accept each generated test in the diff preview.`
						);
					}
				}
			);
		} catch (error) {
			console.error('Error regenerating tests:', error);
			vscode.window.showErrorMessage(
				`Failed to regenerate tests: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	/**
	 * Find source file and function for a test
	 * Returns the most likely matching function change for this specific test
	 */
	private findMatchingFunctionChange(
		test: AffectedTest,
		changeContext: ChangeDetectionResult
	): { filePath: string; functionName: string } | null {
		const functions = changeContext.change_summary.functions_changed;

		if (functions.length === 0) {
			return null;
		}

		// Step 1: Infer expected function name from test name
		// test_add -> add
		// test_calculate_sum -> calculate_sum
		const inferredFunctionName = test.test_name.replace(/^test_/, '');

		// Step 2: Try to match test file to source file
		// test_calculator.py -> calculator.py or src/calculator.py
		const testFileName = test.file_path.split('/').pop() || '';
		const expectedSourceFileName = testFileName.replace(/^test_/, '');

		// Step 3: Find best matching function change
		// Priority 1: Match both file name AND function name
		for (const func of functions) {
			const sourceFileName = func.file_path.split('/').pop() || '';
			if (sourceFileName === expectedSourceFileName && func.function_name === inferredFunctionName) {
				return {
					filePath: func.file_path,
					functionName: func.function_name
				};
			}
		}

		// Priority 2: Match only function name (file might be in different location)
		for (const func of functions) {
			if (func.function_name === inferredFunctionName) {
				return {
					filePath: func.file_path,
					functionName: func.function_name
				};
			}
		}

		// Priority 3: Match only file name (function name might be different)
		for (const func of functions) {
			const sourceFileName = func.file_path.split('/').pop() || '';
			if (sourceFileName === expectedSourceFileName) {
				return {
					filePath: func.file_path,
					functionName: func.function_name
				};
			}
		}

		// Fallback: Use the first function change and log a warning
		console.warn(
			`[Impact Analysis] Could not find matching function for test ${test.test_name}. ` +
			`Using fallback: ${functions[0].file_path}::${functions[0].function_name}`
		);
		return {
			filePath: functions[0].file_path,
			functionName: functions[0].function_name
		};
	}

	/**
	 * Find source file for a test
	 */
	private findSourceFile(test: AffectedTest, changeContext: ChangeDetectionResult): string | null {
		const match = this.findMatchingFunctionChange(test, changeContext);
		return match?.filePath || null;
	}

	/**
	 * Extract function name from test
	 */
	private extractFunctionName(test: AffectedTest, changeContext: ChangeDetectionResult): string {
		const match = this.findMatchingFunctionChange(test, changeContext);
		if (match) {
			return match.functionName;
		}

		// Last resort fallback: infer from test name
		const inferredName = test.test_name.replace(/^test_/, '');
		console.warn(
			`[Impact Analysis] Could not match test ${test.test_name} to any changed function. ` +
			`Using inferred name: ${inferredName}`
		);
		return inferredName;
	}

	/**
	 * Get test code from file
	 */
	private async getTestCode(testFilePath: string, testName: string): Promise<string> {
		try {
			const document = await vscode.workspace.openTextDocument(testFilePath);
			const content = document.getText();

			// Extract test function
			const lines = content.split('\n');
			let inTest = false;
			let testCode = '';
			let baseIndent = 0;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				// Check if this is the test definition
				if (line.match(new RegExp(`^\\s*def\\s+${testName}\\s*\\(`))) {
					inTest = true;
					baseIndent = line.search(/\S/);
					testCode += line + '\n';
					continue;
				}

				// If we're in the test, collect lines
				if (inTest) {
					// Empty lines: include if they appear within the function
					if (line.trim() === '') {
						testCode += line + '\n';
						continue;
					}

					const currentIndent = line.search(/\S/);

					// Line with content at deeper indentation
					if (currentIndent > baseIndent) {
						testCode += line + '\n';
					} else {
						// Test ended (found line at same or less indentation)
						break;
					}
				}
			}

			return testCode || `def ${testName}():\n    # Test code not found\n    pass`;
		} catch (error) {
			console.error(`Error reading test code from ${testFilePath}:`, error);
			return `def ${testName}():\n    # Error reading test\n    pass`;
		}
	}

	/**
	 * Show diff preview with checkboxes
	 */
	private async showDiffPreview(results: RegenerationResult[]): Promise<void> {
		// Create quick pick items
		const items = results.map((result, index) => ({
			label: result.test.test_name,
			description: `${result.test.file_path} [${result.test.impact_level.toUpperCase()}]`,
			detail: result.test.reason,
			picked: true,
			index
		}));

		// Show multi-select quick pick
		const selected = await vscode.window.showQuickPick(items, {
			canPickMany: true,
			placeHolder: 'Select tests to regenerate (deselect to skip)',
			title: `Test Regeneration Preview (${results.length} tests generated)`
		});

		if (!selected || selected.length === 0) {
			vscode.window.showInformationMessage('Test regeneration cancelled');
			return;
		}

		// Apply selected changes
		let successCount = 0;
		let failCount = 0;

		for (const item of selected) {
			const result = results[item.index];

			try {
				// Show diff editor
				const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
				if (!workspaceRoot) {
					continue;
				}

				const testFilePath = path.join(workspaceRoot, result.test.file_path);

				// Read current test file
				const document = await vscode.workspace.openTextDocument(testFilePath);
				const currentContent = document.getText();

				// Replace test function
				const updatedContent = this.replaceTestFunction(
					currentContent,
					result.test.test_name,
					result.newCode
				);

				// Write back to file
				const edit = new vscode.WorkspaceEdit();
				edit.replace(
					document.uri,
					new vscode.Range(0, 0, document.lineCount, 0),
					updatedContent
				);

				const applied = await vscode.workspace.applyEdit(edit);

				if (applied) {
					successCount++;
				} else {
					failCount++;
				}
			} catch (error) {
				console.error(`Error applying test ${result.test.test_name}:`, error);
				failCount++;
			}
		}

		// Show summary
		if (successCount > 0) {
			vscode.window.showInformationMessage(
				`✅ ${successCount} test(s) regenerated successfully` +
				(failCount > 0 ? `, ${failCount} failed` : '')
			);
		} else {
			vscode.window.showWarningMessage('No tests were regenerated');
		}
	}

	/**
	 * Replace test function in content
	 */
	private replaceTestFunction(content: string, testName: string, newCode: string): string {
		const lines = content.split('\n');
		const result: string[] = [];
		let inTest = false;
		let baseIndent = 0;
		let replaced = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check if this is the test definition
			if (line.match(new RegExp(`^\\s*def\\s+${testName}\\s*\\(`))) {
				inTest = true;
				baseIndent = line.search(/\S/);

				// Add new test code
				result.push(newCode);
				replaced = true;
				continue;
			}

			// If we're in the test, skip old lines
			if (inTest) {
				// Empty lines within test: skip
				if (line.trim() === '') {
					continue;
				}

				const currentIndent = line.search(/\S/);

				// Line with content at deeper indentation: skip
				if (currentIndent > baseIndent) {
					// Skip old test lines
					continue;
				} else {
					// Test ended (found line at same or less indentation)
					inTest = false;
					result.push(line);
				}
			} else {
				result.push(line);
			}
		}

		// If test was not found, append it at the end
		if (!replaced) {
			result.push('\n\n' + newCode);
		}

		return result.join('\n');
	}
}

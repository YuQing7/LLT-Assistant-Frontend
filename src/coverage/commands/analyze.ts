/**
 * Coverage Analysis Commands
 * Handles user commands for coverage optimization
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CoverageXmlParser, findCoverageFile } from '../parser';
import { CoverageTreeDataProvider } from '../activityBar';
import { CoverageBackendClient } from '../api';
import { UncoveredFunction, PartiallyCoveredFunction } from '../api/types';
import { CoverageConfig } from '../utils/config';

export class CoverageCommands {
	private parser: CoverageXmlParser;
	private treeProvider: CoverageTreeDataProvider;
	private backendClient: CoverageBackendClient;
	private statusBarItem: vscode.StatusBarItem;

	constructor(
		treeProvider: CoverageTreeDataProvider,
		backendClient: CoverageBackendClient
	) {
		this.parser = new CoverageXmlParser({
			minComplexity: CoverageConfig.getMinFunctionComplexity(),
			includeTrivialFunctions: false,
			focusOnBranches: true
		});
		this.treeProvider = treeProvider;
		this.backendClient = backendClient;

		// Create status bar item
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100
		);
		this.statusBarItem.command = 'llt-assistant.analyzeCoverage';
	}

	/**
	 * Analyze coverage command
	 */
	async analyzeCoverage(): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder open');
			return;
		}

		const workspaceRoot = workspaceFolder.uri.fsPath;

		// Show progress
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Analyzing Coverage',
				cancellable: false
			},
			async progress => {
				try {
					progress.report({ message: 'Finding coverage.xml...' });

					// Find coverage file
					const coverageFilePath = await findCoverageFile(workspaceRoot);
					if (!coverageFilePath) {
						vscode.window.showWarningMessage(
							'Coverage file not found. Please run: pytest --cov --cov-report=xml',
							'Show Instructions'
						).then(selection => {
							if (selection === 'Show Instructions') {
								this.showCoverageInstructions();
							}
						});
						return;
					}

					progress.report({ message: 'Parsing coverage report...' });

					// Parse coverage file
					const coverageReport = await this.parser.parse(coverageFilePath);

					// Update tree view
					this.treeProvider.updateCoverageReport(coverageReport);

					// Update status bar
					const lineCoverage = (coverageReport.overallStats.lineCoverage * 100).toFixed(1);
					this.statusBarItem.text = `$(graph) Coverage: ${lineCoverage}%`;
					this.statusBarItem.show();

					// Show success message
					const totalIssues = coverageReport.files.reduce(
						(sum, f) => sum + f.uncoveredFunctions.length + f.partiallyCoveredFunctions.length,
						0
					);

					vscode.window.showInformationMessage(
						`Coverage analysis complete: ${lineCoverage}% line coverage, ${totalIssues} improvement opportunities found`
					);
				} catch (error: any) {
					vscode.window.showErrorMessage(
						`Failed to analyze coverage: ${error.message || error}`
					);
					console.error('[LLT Coverage] Analysis error:', error);
				}
			}
		);
	}

	/**
	 * Refresh coverage view
	 */
	async refreshCoverage(): Promise<void> {
		await this.analyzeCoverage();
	}

	/**
	 * Clear coverage data
	 */
	clearCoverage(): void {
		this.treeProvider.clear();
		this.statusBarItem.hide();
		vscode.window.showInformationMessage('Coverage data cleared');
	}

	/**
	 * Generate test for a specific uncovered function
	 */
	async generateCoverageTest(filePath: string, func: UncoveredFunction): Promise<void> {
		// Check if backend is healthy
		const isHealthy = await this.backendClient.healthCheck();
		if (!isHealthy) {
			vscode.window.showErrorMessage(
				'Cannot connect to LLT backend. Please check your connection.'
			);
			return;
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Generating test for ${func.name}`,
				cancellable: false
			},
			async progress => {
				try {
					progress.report({ message: 'Reading source code...' });

					// Read the function code
					const sourceCode = await this.readFunctionCode(filePath, func.startLine, func.endLine);

					progress.report({ message: 'Calling LLM backend...' });

					// Call backend to generate test
					const response = await this.backendClient.generateCoverageTest({
						filePath,
						functionName: func.name,
						functionCode: sourceCode,
						context: {
							imports: await this.extractImports(filePath)
						}
					});

					progress.report({ message: 'Inserting generated test...' });

					// Show generated test in inline preview
					await this.showInlinePreview(filePath, response.generatedTests, func.name);

					vscode.window.showInformationMessage(
						`Test generated for ${func.name}. Press Tab to accept or Esc to reject.`
					);
				} catch (error: any) {
					vscode.window.showErrorMessage(
						`Failed to generate test: ${error.message || error}`
					);
					console.error('[LLT Coverage] Test generation error:', error);
				}
			}
		);
	}

	/**
	 * Batch generate tests for all uncovered functions in a file
	 */
	async batchGenerateTests(filePath: string): Promise<void> {
		vscode.window.showInformationMessage('Batch test generation - Coming soon!');
		// TODO: Implement batch generation
	}

	/**
	 * Show coverage improvement report
	 */
	async showImprovementReport(): Promise<void> {
		vscode.window.showInformationMessage('Coverage improvement report - Coming soon!');
		// TODO: Implement improvement report
	}

	/**
	 * Go to a specific line in a file
	 */
	async goToLine(filePath: string, line: number): Promise<void> {
		const document = await vscode.workspace.openTextDocument(filePath);
		const editor = await vscode.window.showTextDocument(document);

		const position = new vscode.Position(line - 1, 0);
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(
			new vscode.Range(position, position),
			vscode.TextEditorRevealType.InCenter
		);
	}

	/**
	 * Read function code from file
	 */
	private async readFunctionCode(
		filePath: string,
		startLine: number,
		endLine: number
	): Promise<string> {
		const content = await fs.promises.readFile(filePath, 'utf-8');
		const lines = content.split('\n');
		return lines.slice(startLine - 1, endLine).join('\n');
	}

	/**
	 * Extract imports from a Python file
	 */
	private async extractImports(filePath: string): Promise<string> {
		const content = await fs.promises.readFile(filePath, 'utf-8');
		const lines = content.split('\n');

		const imports = lines
			.filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '))
			.join('\n');

		return imports;
	}

	/**
	 * Show inline preview for generated test
	 */
	private async showInlinePreview(
		filePath: string,
		generatedTest: string,
		functionName: string
	): Promise<void> {
		// Find the corresponding test file
		const testFilePath = this.getTestFilePath(filePath);

		// Open the test file
		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Find insert position (end of file)
		const lastLine = document.lineCount;
		const position = new vscode.Position(lastLine, 0);

		// Insert the generated test
		await editor.edit(editBuilder => {
			editBuilder.insert(position, '\n\n' + generatedTest);
		});

		// Move cursor to the inserted test
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(
			new vscode.Range(position, position),
			vscode.TextEditorRevealType.InCenter
		);
	}

	/**
	 * Get test file path for a given source file
	 */
	private getTestFilePath(filePath: string): string {
		const dir = path.dirname(filePath);
		const filename = path.basename(filePath);

		// Try common test file locations
		const testDir = path.join(dir, '..', 'tests');
		const testFilename = filename.startsWith('test_') ? filename : `test_${filename}`;

		// Check if tests directory exists
		if (fs.existsSync(testDir)) {
			return path.join(testDir, testFilename);
		}

		// Fallback: put test file in same directory
		return path.join(dir, testFilename);
	}

	/**
	 * Show instructions for generating coverage report
	 */
	private showCoverageInstructions(): void {
		const panel = vscode.window.createWebviewPanel(
			'coverageInstructions',
			'Coverage Setup Instructions',
			vscode.ViewColumn.One,
			{}
		);

		panel.webview.html = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { padding: 20px; font-family: var(--vscode-font-family); }
					h1 { color: var(--vscode-foreground); }
					code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; }
					pre { background: var(--vscode-textCodeBlock-background); padding: 10px; }
				</style>
			</head>
			<body>
				<h1>🎯 Coverage Analysis Setup</h1>
				<p>To use the coverage optimization feature, you need to generate a coverage report first.</p>

				<h2>Step 1: Install pytest-cov</h2>
				<pre><code>pip install pytest-cov</code></pre>

				<h2>Step 2: Run pytest with coverage</h2>
				<pre><code>pytest --cov=. --cov-report=xml</code></pre>

				<p>This will generate a <code>coverage.xml</code> file in your workspace root.</p>

				<h2>Step 3: Analyze Coverage</h2>
				<p>Once the coverage.xml file is generated, click the "Analyze Coverage" button in the LLT Coverage view.</p>
			</body>
			</html>
		`;
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.statusBarItem.dispose();
	}
}

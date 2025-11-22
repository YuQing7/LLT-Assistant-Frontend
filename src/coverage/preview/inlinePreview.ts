/**
 * Inline Preview for Generated Tests
 * Provides ghost text preview with Accept/Edit/Reject functionality
 */

import * as vscode from 'vscode';

export class InlinePreviewManager {
	private currentPreview: InlinePreview | null = null;
	private decorationType: vscode.TextEditorDecorationType;

	constructor() {
		// Create decoration type for ghost text
		this.decorationType = vscode.window.createTextEditorDecorationType({
			after: {
				color: new vscode.ThemeColor('editorGhostText.foreground'),
				fontStyle: 'italic'
			},
			isWholeLine: false
		});
	}

	/**
	 * Show inline preview for generated test code
	 */
	async showPreview(
		editor: vscode.TextEditor,
		position: vscode.Position,
		generatedCode: string,
		metadata?: {
			functionName?: string;
			explanation?: string;
			scenarioDescription?: string;
			expectedCoverageImpact?: string;
		}
	): Promise<void> {
		// Clear any existing preview
		this.clearPreview();

		// Create new preview
		this.currentPreview = new InlinePreview(
			editor,
			position,
			generatedCode,
			this.decorationType,
			metadata
		);

		// Show the preview
		await this.currentPreview.show();

		// Show information message
		vscode.window.showInformationMessage(
			'Test generated! Press Tab to accept, Ctrl+Enter to view diff, or Esc to reject.',
			'Accept',
			'View Diff',
			'Reject'
		).then(selection => {
			if (selection === 'Accept') {
				this.acceptPreview();
			} else if (selection === 'View Diff') {
				this.showDiff();
			} else if (selection === 'Reject') {
				this.rejectPreview();
			}
		});
	}

	/**
	 * Show diff view for current preview
	 */
	async showDiff(): Promise<void> {
		if (this.currentPreview) {
			await this.currentPreview.showDiff();
		}
	}

	/**
	 * Accept the current preview
	 */
	async acceptPreview(): Promise<void> {
		if (this.currentPreview) {
			await this.currentPreview.accept();
			this.currentPreview = null;
			vscode.window.showInformationMessage('Test added successfully!');
		}
	}

	/**
	 * Edit the current preview
	 */
	async editPreview(): Promise<void> {
		if (this.currentPreview) {
			await this.currentPreview.edit();
			this.currentPreview = null;
		}
	}

	/**
	 * Reject the current preview
	 */
	async rejectPreview(): Promise<void> {
		if (this.currentPreview) {
			await this.currentPreview.reject();
			this.currentPreview = null;
			vscode.window.showInformationMessage('Test generation rejected');
		}
	}

	/**
	 * Clear the current preview
	 */
	clearPreview(): void {
		if (this.currentPreview) {
			this.currentPreview.clear();
			this.currentPreview = null;
		}
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this.clearPreview();
		this.decorationType.dispose();
	}
}

/**
 * Individual inline preview instance
 */
class InlinePreview {
	private editor: vscode.TextEditor;
	private position: vscode.Position;
	private generatedCode: string;
	private decorationType: vscode.TextEditorDecorationType;
	private metadata?: {
		functionName?: string;
		explanation?: string;
		scenarioDescription?: string;
		expectedCoverageImpact?: string;
	};
	private disposables: vscode.Disposable[] = [];
	private keyboardDisposable?: vscode.Disposable;

	constructor(
		editor: vscode.TextEditor,
		position: vscode.Position,
		generatedCode: string,
		decorationType: vscode.TextEditorDecorationType,
		metadata?: {
			functionName?: string;
			explanation?: string;
			scenarioDescription?: string;
			expectedCoverageImpact?: string;
		}
	) {
		this.editor = editor;
		this.position = position;
		this.generatedCode = generatedCode;
		this.decorationType = decorationType;
		this.metadata = metadata;
	}

	/**
	 * Show the preview
	 */
	async show(): Promise<void> {
		// Show as ghost text decoration
		const lines = this.generatedCode.split('\n');
		const decorations: vscode.DecorationOptions[] = [];

		lines.forEach((line, index) => {
			const linePosition = new vscode.Position(
				this.position.line + index,
				index === 0 ? this.position.character : 0
			);
			const range = new vscode.Range(linePosition, linePosition);

			// Create tooltip with metadata
			const tooltip = this.createTooltip();

			decorations.push({
				range,
				renderOptions: {
					after: {
						contentText: line,
						color: new vscode.ThemeColor('editorGhostText.foreground'),
						fontStyle: 'italic'
					}
				},
				hoverMessage: tooltip
			});
		});

		this.editor.setDecorations(this.decorationType, decorations);

		// Register keyboard shortcuts
		this.registerKeyboardShortcuts();

		// Register commands for this preview
		this.registerCommands();
	}

	/**
	 * Create tooltip with metadata information
	 */
	private createTooltip(): vscode.MarkdownString {
		const tooltip = new vscode.MarkdownString();
		tooltip.appendMarkdown('**Generated Test Code**\n\n');

		if (this.metadata?.scenarioDescription) {
			tooltip.appendMarkdown(`**Scenario:** ${this.metadata.scenarioDescription}\n\n`);
		}

		if (this.metadata?.expectedCoverageImpact) {
			tooltip.appendMarkdown(`**Coverage Impact:** ${this.metadata.expectedCoverageImpact}\n\n`);
		}

		if (this.metadata?.explanation) {
			tooltip.appendMarkdown(`**Explanation:** ${this.metadata.explanation}\n\n`);
		}

		tooltip.appendMarkdown('---\n\n');
		tooltip.appendMarkdown('Press **Tab** to accept, **Ctrl+Enter** to view diff, or **Esc** to reject.');

		return tooltip;
	}

	/**
	 * Register keyboard shortcuts for Tab, Esc, and Ctrl+Enter
	 */
	private registerKeyboardShortcuts(): void {
		// Listen for keyboard events in the editor
		const disposable = vscode.commands.registerCommand('type', async (args) => {
			// This is a workaround - VSCode doesn't provide direct keyboard event listeners
			// We'll rely on the command-based approach instead
		});

		// Register specific keybindings through commands
		// Note: These need to be registered in package.json keybindings section
		// For now, we'll handle them through the command registration
		this.keyboardDisposable = disposable;
		this.disposables.push(disposable);
	}

	/**
	 * Accept the preview and insert code
	 */
	async accept(): Promise<void> {
		await this.editor.edit(editBuilder => {
			// Insert the generated code
			editBuilder.insert(this.position, '\n\n' + this.generatedCode);
		});

		// Format the document
		await vscode.commands.executeCommand('editor.action.formatDocument');

		this.clear();
	}

	/**
	 * Show diff view comparing current file with generated code
	 */
	async showDiff(): Promise<void> {
		const currentContent = this.editor.document.getText();
		const newContent = currentContent + '\n\n' + this.generatedCode;

		// Create temporary URI for the new content
		const tempUri = vscode.Uri.parse(
			`${this.editor.document.uri.toString()}.generated`
		);

		// Write generated content to temp file
		const tempDoc = await vscode.workspace.openTextDocument(tempUri);
		await vscode.window.showTextDocument(tempDoc, {
			viewColumn: vscode.ViewColumn.Beside,
			preview: false
		});

		await vscode.window.activeTextEditor?.edit(editBuilder => {
			editBuilder.insert(new vscode.Position(0, 0), newContent);
		});

		// Open diff view
		await vscode.commands.executeCommand(
			'vscode.diff',
			this.editor.document.uri,
			tempUri,
			'Current ↔ Generated Test'
		);

		// Don't clear preview - user might want to accept after viewing diff
	}

	/**
	 * Edit the preview - open in diff editor (legacy method, redirects to showDiff)
	 */
	async edit(): Promise<void> {
		await this.showDiff();
	}

	/**
	 * Reject the preview
	 */
	async reject(): Promise<void> {
		this.clear();
	}

	/**
	 * Clear the preview
	 */
	clear(): void {
		// Clear decorations
		this.editor.setDecorations(this.decorationType, []);

		// Dispose all disposables
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];

		if (this.keyboardDisposable) {
			this.keyboardDisposable.dispose();
			this.keyboardDisposable = undefined;
		}
	}

	/**
	 * Register commands for this preview
	 */
	private registerCommands(): void {
		// Register keyboard shortcuts
		const acceptCommand = vscode.commands.registerCommand(
			'llt-assistant.acceptInlinePreview',
			() => this.accept()
		);

		const rejectCommand = vscode.commands.registerCommand(
			'llt-assistant.rejectInlinePreview',
			() => this.reject()
		);

		const editCommand = vscode.commands.registerCommand(
			'llt-assistant.editInlinePreview',
			() => this.edit()
		);

		this.disposables.push(acceptCommand, rejectCommand, editCommand);
	}

	/**
	 * Show hover message with preview info
	 */
	private showHoverMessage(): void {
		// This would ideally use a CodeLens or Hover provider
		// For simplicity, we're showing an information message
	}
}

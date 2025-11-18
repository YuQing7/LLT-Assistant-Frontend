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
			'Test generated! Press Tab to accept, Ctrl+E to edit, or Esc to reject.',
			'Accept',
			'Edit',
			'Reject'
		).then(selection => {
			if (selection === 'Accept') {
				this.acceptPreview();
			} else if (selection === 'Edit') {
				this.editPreview();
			} else if (selection === 'Reject') {
				this.rejectPreview();
			}
		});
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
	};
	private disposables: vscode.Disposable[] = [];

	constructor(
		editor: vscode.TextEditor,
		position: vscode.Position,
		generatedCode: string,
		decorationType: vscode.TextEditorDecorationType,
		metadata?: { functionName?: string; explanation?: string }
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
		// For now, we'll use a simple approach: show as a virtual text decoration
		// In a real implementation, this would use VSCode's inline completion API

		// Create a code lens to show accept/reject actions
		const range = new vscode.Range(this.position, this.position);

		// Register commands for this preview
		this.registerCommands();

		// Show hover message
		this.showHoverMessage();
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
	 * Edit the preview - open in diff editor
	 */
	async edit(): Promise<void> {
		// Create a temporary document with the generated code
		const tempUri = vscode.Uri.parse(
			`untitled:${this.metadata?.functionName || 'generated'}_test.py`
		);

		const tempDoc = await vscode.workspace.openTextDocument(tempUri);
		const tempEditor = await vscode.window.showTextDocument(tempDoc, {
			viewColumn: vscode.ViewColumn.Beside,
			preview: false
		});

		// Insert the generated code into the temp document
		await tempEditor.edit(editBuilder => {
			editBuilder.insert(new vscode.Position(0, 0), this.generatedCode);
		});

		// Show information
		vscode.window.showInformationMessage(
			'Edit the test code, then copy it to your test file when ready.'
		);

		this.clear();
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

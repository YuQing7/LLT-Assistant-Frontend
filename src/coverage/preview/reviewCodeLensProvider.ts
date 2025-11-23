/**
 * CodeLens Provider for Review Actions
 * Displays Accept/Discard buttons above inserted code
 */

import * as vscode from 'vscode';

/**
 * Pending edit state for tracking inserted code
 */
export interface PendingEdit {
	id: string;
	uri: vscode.Uri;
	range: vscode.Range;
}

/**
 * CodeLens Provider for review actions
 */
export class ReviewCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	private currentEdit: PendingEdit | null = null;

	/**
	 * Set the current pending edit
	 */
	setPendingEdit(edit: PendingEdit | null): void {
		this.currentEdit = edit;
		this.refresh();
	}

	/**
	 * Get the current pending edit
	 */
	getPendingEdit(): PendingEdit | null {
		return this.currentEdit;
	}

	/**
	 * Refresh CodeLens
	 */
	refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}

	/**
	 * Provide CodeLens for a document
	 */
	provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		if (!this.currentEdit || document.uri.toString() !== this.currentEdit.uri.toString()) {
			return [];
		}

		const range = this.currentEdit.range;

		// Create Accept button
		const acceptCommand: vscode.Command = {
			title: '$(check) Accept',
			command: 'llt-assistant.acceptInlinePreview',
			tooltip: 'Accept the inserted code'
		};

		// Create Discard button
		const discardCommand: vscode.Command = {
			title: '$(trash) Discard',
			command: 'llt-assistant.rejectInlinePreview',
			tooltip: 'Discard the inserted code'
		};

		// Place buttons on the line above the inserted code
		const lensLine = Math.max(0, range.start.line - 1);
		const lensRange = new vscode.Range(lensLine, 0, lensLine, 0);

		return [
			new vscode.CodeLens(lensRange, acceptCommand),
			new vscode.CodeLens(lensRange, discardCommand)
		];
	}

	/**
	 * Resolve CodeLens (optional, for dynamic content)
	 */
	resolveCodeLens(
		codeLens: vscode.CodeLens,
		token: vscode.CancellationToken
	): vscode.CodeLens | Thenable<vscode.CodeLens> {
		return codeLens;
	}
}


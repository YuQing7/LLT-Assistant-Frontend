/**
 * CodeLens Provider for Coverage Test Generation
 * Displays Yes/No buttons above uncovered code blocks
 */

import * as vscode from 'vscode';

export interface CoverageRequest {
	uri: vscode.Uri;
	range: vscode.Range;
	filePath: string;
	func: any;
}

/**
 * CodeLens Provider for coverage test generation
 */
export class CoverageCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	private activeRequests: CoverageRequest[] = [];

	/**
	 * Add a new coverage request
	 */
	public addRequest(request: CoverageRequest): void {
		this.activeRequests.push(request);
		this.refresh();
	}

	/**
	 * Remove a coverage request
	 */
	public removeRequest(uri: vscode.Uri, range: vscode.Range): void {
		this.activeRequests = this.activeRequests.filter(
			req => !(req.uri.toString() === uri.toString() && req.range.isEqual(range))
		);
		this.refresh();
	}

	/**
	 * Clear all requests
	 */
	public clear(): void {
		this.activeRequests = [];
		this.refresh();
	}

	/**
	 * Refresh CodeLens display
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}

	/**
	 * Provide CodeLens for a document
	 */
	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const lenses: vscode.CodeLens[] = [];

		// Find active requests for this document
		for (const req of this.activeRequests) {
			if (req.uri.toString() === document.uri.toString()) {
				// Create Yes button with more prominent styling
				// Using larger icons, emojis, and uppercase text for better visibility
				const yesLens = new vscode.CodeLens(req.range, {
					title: '⚡ $(zap) ▶ GENERATE TEST ▶',
					tooltip: 'Click to generate tests for this uncovered code',
					command: 'llt-assistant.coverageCodeLens.yes',
					arguments: [req.filePath, req.func, req.uri, req.range]
				});

				// Create No button with more prominent styling
				const noLens = new vscode.CodeLens(req.range, {
					title: '✕ $(close) ✕ CANCEL ✕',
					tooltip: 'Ignore this suggestion',
					command: 'llt-assistant.coverageCodeLens.no',
					arguments: [req.uri, req.range]
				});

				lenses.push(yesLens);
				lenses.push(noLens);
			}
		}

		return lenses;
	}
}


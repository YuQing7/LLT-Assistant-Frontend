/**
 * Backend Configuration Manager
 * Provides unified backend URL configuration across all LLT features
 *
 * All features (Test Generation, Quality Analysis, Coverage Optimization, Impact Analysis)
 * read from the same configuration: llt-assistant.backendUrl
 */

import * as vscode from 'vscode';

export class BackendConfigManager {
	private static readonly CONFIG_SECTION = 'llt-assistant';
	private static readonly CONFIG_KEY = 'backendUrl';
	private static readonly DEFAULT_URL = 'http://localhost:8886';

	/**
	 * Get unified backend URL for all LLT features
	 *
	 * @returns Backend URL from configuration or default
	 *
	 * @example
	 * const url = BackendConfigManager.getBackendUrl();
	 * // Returns value from llt-assistant.backendUrl setting
	 */
	static getBackendUrl(): string {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		const url = config.get<string>(this.CONFIG_KEY, this.DEFAULT_URL);
		console.log(`[LLT Config] Backend URL: ${url}`);
		return url;
	}

	/**
	 * Watch for backend URL configuration changes
	 *
	 * @param callback - Callback function called when backend URL changes
	 * @returns Disposable to stop watching
	 *
	 * @example
	 * const disposable = BackendConfigManager.onConfigChange((newUrl) => {
	 *     client.updateUrl(newUrl);
	 * });
	 */
	static onConfigChange(callback: (newUrl: string) => void): vscode.Disposable {
		return vscode.workspace.onDidChangeConfiguration(event => {
			const configKey = `${this.CONFIG_SECTION}.${this.CONFIG_KEY}`;
			if (event.affectsConfiguration(configKey)) {
				const newUrl = this.getBackendUrl();
				console.log(`[LLT Config] Backend URL changed: ${newUrl}`);
				callback(newUrl);
			}
		});
	}
}

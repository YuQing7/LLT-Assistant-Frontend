/**
 * Configuration utilities for coverage feature
 */

import * as vscode from 'vscode';
import { BackendConfigManager } from '../../utils/backendConfig';

export class CoverageConfig {
	private static readonly CONFIG_SECTION = 'llt-assistant.coverage';

	/**
	 * Get coverage file path from configuration
	 */
	static getCoverageFilePath(): string {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		return config.get('coverageFilePath', 'coverage.xml');
	}

	/**
	 * Get minimum function complexity threshold
	 */
	static getMinFunctionComplexity(): number {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		return config.get('minFunctionComplexity', 2);
	}

	/**
	 * Check if auto-refresh is enabled
	 */
	static isAutoRefreshEnabled(): boolean {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		return config.get('autoRefresh', false);
	}

	/**
	 * Get prioritization strategy
	 */
	static getPrioritizationStrategy(): 'complexity' | 'uncovered' | 'branch' {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		return config.get('prioritize', 'complexity');
	}

	/**
	 * Check if inline preview is enabled
	 */
	static isInlinePreviewEnabled(): boolean {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
		return config.get('enableInlinePreview', true);
	}

	/**
	 * Get backend URL from unified configuration
	 */
	static getBackendUrl(): string {
		return BackendConfigManager.getBackendUrl();
	}
}

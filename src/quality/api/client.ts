/**
 * Backend API Client for LLT Quality Analysis
 *
 * ✨ Refactored to use BaseBackendClient
 */

import { BaseBackendClient } from '../../api/baseBackendClient';
import {
	AnalyzeQualityRequest,
	AnalyzeQualityResponse,
	BackendError
} from './types';
import { QUALITY_DEFAULTS } from '../utils/constants';

/**
 * Quality Backend Client
 *
 * Inherits from BaseBackendClient for standardized error handling,
 * health checks, and request management.
 */
export class QualityBackendClient extends BaseBackendClient {
	constructor() {
		// Initialize base client with feature-specific settings
		super({
			featureName: 'Quality',
			timeout: 30000, // 30 seconds
			enableRequestId: true
		});
	}

	/**
	 * Analyze test files for quality issues
	 *
	 * POST /quality/analyze
	 */
	async analyzeQuality(request: AnalyzeQualityRequest): Promise<AnalyzeQualityResponse> {
		// Log full request payload
		console.log('[LLT Quality API] ====================================================================');
		console.log('[LLT Quality API] Request Payload:');
		console.log('[LLT Quality API] -------------------------------------------------------------------');
		console.log(`[LLT Quality API] Files count: ${request.files.length}`);
		console.log(`[LLT Quality API] Mode: ${request.mode}`);
		console.log(`[LLT Quality API] Config:`, JSON.stringify(request.config, null, 2));
		console.log('[LLT Quality API] File details:');
		request.files.forEach((file, index) => {
			console.log(`[LLT Quality API]   [${index}] path: "${file.path}", content length: ${file.content.length} chars`);
		});
		console.log('[LLT Quality API] ====================================================================');

		try {
			// Use BaseBackendClient's executeWithRetry for standardized retry logic
			const response = await this.executeWithRetry(
				async () => {
					const res = await this.client.post<AnalyzeQualityResponse>(
						'/quality/analyze',
						request
					);
					return res.data;
				},
				QUALITY_DEFAULTS.RETRY_MAX_ATTEMPTS,
				QUALITY_DEFAULTS.RETRY_BASE_DELAY_MS
			);

			// Log full response
			console.log('[LLT Quality API] ====================================================================');
			console.log('[LLT Quality API] Response Data:');
			console.log('[LLT Quality API] -------------------------------------------------------------------');
			console.log(`[LLT Quality API] Analysis ID: ${response.analysis_id}`);
			console.log(`[LLT Quality API] Issues found: ${response.issues.length}`);
			console.log(`[LLT Quality API] Summary:`, JSON.stringify(response.summary, null, 2));

			// Detailed issue logging with validation
			if (response.issues.length > 0) {
				console.log('[LLT Quality API] -------------------------------------------------------------------');
				console.log('[LLT Quality API] Detailed Issues:');

				response.issues.forEach((issue, index) => {
					console.log(`[LLT Quality API]   Issue #${index + 1}:`);
					console.log(`[LLT Quality API]     file_path: "${issue.file_path}" ✅`);
					console.log(`[LLT Quality API]     line: ${issue.line}`);
					console.log(`[LLT Quality API]     column: ${issue.column}`);
					console.log(`[LLT Quality API]     severity: ${issue.severity}`);
					console.log(`[LLT Quality API]     code: ${issue.code} ✅`);
					console.log(`[LLT Quality API]     message: ${issue.message}`);
					console.log(`[LLT Quality API]     detected_by: ${issue.detected_by}`);
					if (issue.suggestion) {
						console.log(`[LLT Quality API]     suggestion.action: ${issue.suggestion.action || 'N/A'}`);
						console.log(`[LLT Quality API]     suggestion.explanation: ${issue.suggestion.explanation || 'N/A'}`);
						console.log(`[LLT Quality API]     suggestion.new_code: ${issue.suggestion.new_code ? issue.suggestion.new_code.substring(0, 50) + '...' : 'N/A'}`);
					}
					console.log(`[LLT Quality API]     ---`);
				});
			}
			console.log('[LLT Quality API] ====================================================================');

			return response;
		} catch (error: any) {
			console.error('[LLT Quality API] ❌ API call failed:', error);
			// Convert BaseBackendClient errors to Quality BackendError format
			throw this.convertToQualityError(error);
		}
	}

	/**
	 * Convert BaseBackendClient errors to Quality BackendError format
	 * Maintains backward compatibility with existing error handling
	 */
	private convertToQualityError(error: any): BackendError {
		// If it's already a BackendError from BaseBackendClient
		if (error.name === 'BackendError') {
			return {
				type: error.type,
				message: error.message,
				detail: error.detail,
				statusCode: error.statusCode
			};
		}

		// Unknown error
		return {
			type: 'unknown',
			message: error.message || 'Unknown error',
			detail: error.detail || String(error),
			statusCode: error.statusCode
		};
	}
}

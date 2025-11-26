/**
 * Backend API Client for LLT Quality Analysis
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as vscode from 'vscode';
import {
	AnalyzeQualityRequest,
	AnalyzeQualityResponse,
	BackendError,
	HealthCheckResponse
} from './types';
import { QUALITY_DEFAULTS } from '../utils/constants';
import { BackendConfigManager } from '../../utils/backendConfig';

export class QualityBackendClient {
	private client: AxiosInstance;
	private baseUrl: string;

	constructor() {
		this.baseUrl = BackendConfigManager.getBackendUrl();
		this.client = axios.create({
			baseURL: this.baseUrl,
			timeout: 30000, // 30 seconds
			headers: {
				'Content-Type': 'application/json'
			}
		});

		this.setupInterceptors();
	}

	/**
	 * Get backend URL from unified configuration
	 * @deprecated - Now uses BackendConfigManager directly in constructor
	 */
	private getBackendUrl(): string {
		return BackendConfigManager.getBackendUrl();
	}

	/**
	 * Setup request/response interceptors for logging and error handling
	 */
	private setupInterceptors(): void {
		// Request interceptor
		this.client.interceptors.request.use(
			(config) => {
				console.log(`[LLT Quality API] ${config.method?.toUpperCase()} ${config.url}`);
				return config;
			},
			(error) => {
				return Promise.reject(error);
			}
		);

		// Response interceptor
		this.client.interceptors.response.use(
			(response) => {
				console.log(
					`[LLT Quality API] Response: ${response.status} ${response.statusText}`
				);
				return response;
			},
			(error) => {
				return Promise.reject(this.handleApiError(error));
			}
		);
	}

	/**
	 * Analyze test files for quality issues
	 *
	 * POST /quality/analyze
	 */
	async analyzeQuality(request: AnalyzeQualityRequest): Promise<AnalyzeQualityResponse> {
		const maxRetries = QUALITY_DEFAULTS.RETRY_MAX_ATTEMPTS;
		let lastError: any;

		// Log full request payload
		console.log('[LLT Quality API] ====================================================================');
		console.log('[LLT Quality API] Request Payload:');
		console.log('[LLT Quality API] -------------------------------------------------------------------');
		console.log(`[LLT Quality API] Files count: ${request.files.length}`);
		console.log(`[LLT Quality API] Mode: ${request.mode}`);
		console.log(`[LLT Quality API] Config:`, JSON.stringify(request.config, null, 2));
		console.log('[LLT Quality API] Sample file paths:');
		request.files.slice(0, 3).forEach(file => console.log(`[LLT Quality API]   - ${file.path}`));
		if (request.files.length > 3) {
			console.log(`[LLT Quality API]   ... and ${request.files.length - 3} more files`);
		}
		console.log('[LLT Quality API] ====================================================================');

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const response = await this.client.post<AnalyzeQualityResponse>(
					'/quality/analyze',
					request
				);

				// Log full response
				console.log('[LLT Quality API] ====================================================================');
				console.log('[LLT Quality API] Response Data:');
				console.log('[LLT Quality API] -------------------------------------------------------------------');
				console.log(`[LLT Quality API] Status: ${response.status} ${response.statusText}`);
				console.log(`[LLT Quality API] Analysis ID: ${response.data.analysis_id}`);
				console.log(`[LLT Quality API] Issues found: ${response.data.issues.length}`);
				console.log(`[LLT Quality API] Summary:`, JSON.stringify(response.data.summary, null, 2));
				if (response.data.issues.length > 0) {
					console.log('[LLT Quality API] Sample issues:');
					response.data.issues.slice(0, 2).forEach(issue => {
						console.log(`[LLT Quality API]   - ${issue.severity.toUpperCase()}: ${issue.file}:${issue.line} - ${issue.message}`);
					});
					if (response.data.issues.length > 2) {
						console.log(`[LLT Quality API]   ... and ${response.data.issues.length - 2} more issues`);
					}
				}
				console.log('[LLT Quality API] ====================================================================');

				return response.data;
			} catch (error) {
				lastError = error;

				// Log error details before retry
				console.error('[LLT Quality API] Request failed:');
				console.error(`[LLT Quality API] Error type: ${error?.constructor?.name}`);
				if (axios.isAxiosError(error) && error.response) {
					console.error('[LLT Quality API] Response error details:');
					console.error(`[LLT Quality API] Status: ${error.response.status}`);
					console.error(`[LLT Quality API] Data:`, JSON.stringify(error.response.data, null, 2));
					console.error(`[LLT Quality API] Headers:`, JSON.stringify(error.response.headers, null, 2));
				} else {
					console.error(`[LLT Quality API] Error:`, error);
				}

				// Check if error is retryable (network errors, timeouts, 5xx errors)
				if (!this.isRetryableError(error)) {
					throw this.handleApiError(error);
				}

				// Don't retry on last attempt
				if (attempt === maxRetries - 1) {
					break;
				}

				// Exponential backoff: 1s, 2s, 4s
				const delayMs = Math.pow(2, attempt) * QUALITY_DEFAULTS.RETRY_BASE_DELAY_MS;
				console.log(`[LLT Quality API] Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
				await this.delay(delayMs);
			}
		}

		throw this.handleApiError(lastError);
	}

	/**
	 * Health check endpoint
	 *
	 * GET /health
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.get<HealthCheckResponse>('/health');
			return response.status === 200;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Handle API errors and convert to user-friendly messages
	 */
	private handleApiError(error: any): BackendError {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;

			// Network error (backend not reachable)
			if (!axiosError.response) {
				return {
					type: 'network',
					message: 'Cannot connect to LLT backend',
					detail: `Please check if backend is running at ${this.baseUrl}`,
					statusCode: 0
				};
			}

			// HTTP error responses
			const status = axiosError.response.status;
			const data: any = axiosError.response.data;

			if (status === 400) {
				return {
					type: 'validation',
					message: 'Invalid request',
					detail: data?.detail || 'Request validation failed',
					statusCode: 400
				};
			}

			if (status === 422) {
				return {
					type: 'validation',
					message: 'Request validation error',
					detail: this.formatValidationErrors(data?.detail),
					statusCode: 422
				};
			}

			if (status >= 500) {
				return {
					type: 'server',
					message: 'Backend server error',
					detail: data?.detail || 'Internal server error',
					statusCode: status
				};
			}

			// Generic HTTP error
			return {
				type: 'http',
				message: `HTTP ${status} error`,
				detail: data?.detail || axiosError.message,
				statusCode: status
			};
		}

		// Timeout error
		if (error.code === 'ECONNABORTED') {
			return {
				type: 'timeout',
				message: 'Request timeout',
				detail: 'Backend took too long to respond (>30s)',
				statusCode: 0
			};
		}

		// Unknown error
		return {
			type: 'unknown',
			message: 'Unknown error',
			detail: error.message || String(error),
			statusCode: 0
		};
	}

	/**
	 * Format FastAPI validation errors into readable message
	 */
	private formatValidationErrors(errors: any[]): string {
		if (!errors || !Array.isArray(errors)) {
			return 'Unknown validation error';
		}

		if (errors.length === 0) {
			return 'Validation failed with no details';
		}

		return errors
			.map(err => {
				// Ensure err.loc is array before calling join
				const field = Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
				const message = err.msg || 'invalid value';
				return `${field}: ${message}`;
			})
			.join('; ');
	}

	/**
	 * Update backend URL from configuration
	 * Call this when configuration changes
	 */
	public updateBackendUrl(): void {
		const newUrl = this.getBackendUrl();
		if (newUrl !== this.baseUrl) {
			this.baseUrl = newUrl;
			this.client.defaults.baseURL = newUrl;
			console.log(`[LLT Quality API] Backend URL updated to: ${newUrl}`);
		}
	}

	/**
	 * Check if an error is retryable
	 */
	private isRetryableError(error: any): boolean {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;

			// Network errors (no response)
			if (!axiosError.response) {
				return true;
			}

			// Server errors (5xx)
			if (axiosError.response.status >= 500) {
				return true;
			}

			// Rate limiting (429)
			if (axiosError.response.status === 429) {
				return true;
			}
		}

		// Timeout errors
		if (error.code === 'ECONNABORTED') {
			return true;
		}

		return false;
	}

	/**
	 * Delay helper for retry backoff
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

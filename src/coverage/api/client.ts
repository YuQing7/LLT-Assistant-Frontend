/**
 * Backend API Client for Coverage Test Generation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as vscode from 'vscode';
import {
	GenerateCoverageTestRequest,
	GenerateCoverageTestResponse,
	BatchGenerateCoverageTestRequest,
	BatchGenerateCoverageTestResponse,
	CoverageBackendError
} from './types';

const DEFAULTS = {
	BACKEND_URL: 'https://llt-assistant.fly.dev/api/v1',
	TIMEOUT_MS: 60000, // 60 seconds for test generation (longer than quality analysis)
	RETRY_MAX_ATTEMPTS: 3,
	RETRY_BASE_DELAY_MS: 2000 // 2 seconds
};

export class CoverageBackendClient {
	private client: AxiosInstance;
	private baseUrl: string;

	constructor() {
		this.baseUrl = this.getBackendUrl();
		this.client = axios.create({
			baseURL: this.baseUrl,
			timeout: DEFAULTS.TIMEOUT_MS,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		this.setupInterceptors();
	}

	/**
	 * Get backend URL from VSCode configuration
	 */
	private getBackendUrl(): string {
		const config = vscode.workspace.getConfiguration('llt-assistant');
		return config.get('backendUrl', DEFAULTS.BACKEND_URL);
	}

	/**
	 * Setup request/response interceptors for logging and error handling
	 */
	private setupInterceptors(): void {
		// Request interceptor
		this.client.interceptors.request.use(
			(config) => {
				console.log(`[LLT Coverage API] ${config.method?.toUpperCase()} ${config.url}`);
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
					`[LLT Coverage API] Response: ${response.status} ${response.statusText}`
				);
				return response;
			},
			(error) => {
				return Promise.reject(this.handleApiError(error));
			}
		);
	}

	/**
	 * Generate tests for a specific uncovered function
	 *
	 * POST /workflows/generate-coverage-test
	 */
	async generateCoverageTest(
		request: GenerateCoverageTestRequest
	): Promise<GenerateCoverageTestResponse> {
		const maxRetries = DEFAULTS.RETRY_MAX_ATTEMPTS;
		let lastError: any;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const response = await this.client.post<GenerateCoverageTestResponse>(
					'/workflows/generate-coverage-test',
					request
				);

				return response.data;
			} catch (error) {
				lastError = error;

				// Check if error is retryable
				if (!this.isRetryableError(error)) {
					throw error;
				}

				// Don't retry on last attempt
				if (attempt === maxRetries - 1) {
					break;
				}

				// Exponential backoff: 2s, 4s, 8s
				const delayMs = Math.pow(2, attempt) * DEFAULTS.RETRY_BASE_DELAY_MS;
				console.log(
					`[LLT Coverage API] Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`
				);
				await this.delay(delayMs);
			}
		}

		throw lastError;
	}

	/**
	 * Batch generate tests for multiple functions
	 *
	 * POST /workflows/batch-generate-coverage-tests
	 */
	async batchGenerateCoverageTests(
		request: BatchGenerateCoverageTestRequest
	): Promise<BatchGenerateCoverageTestResponse> {
		const maxRetries = DEFAULTS.RETRY_MAX_ATTEMPTS;
		let lastError: any;

		// Use longer timeout for batch operations
		const originalTimeout = this.client.defaults.timeout;
		this.client.defaults.timeout = 120000; // 2 minutes

		try {
			for (let attempt = 0; attempt < maxRetries; attempt++) {
				try {
					const response = await this.client.post<BatchGenerateCoverageTestResponse>(
						'/workflows/batch-generate-coverage-tests',
						request
					);

					return response.data;
				} catch (error) {
					lastError = error;

					if (!this.isRetryableError(error)) {
						throw error;
					}

					if (attempt === maxRetries - 1) {
						break;
					}

					const delayMs = Math.pow(2, attempt) * DEFAULTS.RETRY_BASE_DELAY_MS;
					console.log(
						`[LLT Coverage API] Batch retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`
					);
					await this.delay(delayMs);
				}
			}

			throw lastError;
		} finally {
			// Restore original timeout
			this.client.defaults.timeout = originalTimeout;
		}
	}

	/**
	 * Health check endpoint
	 *
	 * GET /health
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.get('/health');
			return response.status === 200;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Handle API errors and convert to user-friendly messages
	 */
	private handleApiError(error: any): CoverageBackendError {
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
				type: 'unknown',
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
				detail: 'Backend took too long to respond',
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
	 * Format validation errors into readable message
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
				const field = Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
				const message = err.msg || 'invalid value';
				return `${field}: ${message}`;
			})
			.join('; ');
	}

	/**
	 * Update backend URL from configuration
	 */
	public updateBackendUrl(): void {
		const newUrl = this.getBackendUrl();
		if (newUrl !== this.baseUrl) {
			this.baseUrl = newUrl;
			this.client.defaults.baseURL = newUrl;
			console.log(`[LLT Coverage API] Backend URL updated to: ${newUrl}`);
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

/**
 * Backend API Client for Feature 1 - Test Generation
 *
 * Communicates with the LLT Assistant Backend API.
 * Implements the async workflow: POST /workflows/generate-tests + polling
 */

import axios, { AxiosError } from 'axios';
import {
  GenerateTestsRequest,
  AsyncJobResponse,
  TaskStatusResponse,
  GenerateTestsResult
} from '../generation/types';

/**
 * Error thrown when task polling fails
 */
export class TaskPollingError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'TaskPollingError';
  }
}

/**
 * Error thrown when task times out
 */
export class TaskTimeoutError extends Error {
  constructor(
    public readonly taskId: string,
    message: string
  ) {
    super(message);
    this.name = 'TaskTimeoutError';
  }
}

/**
 * Polling options
 */
export interface PollingOptions {
  /** Polling interval in milliseconds (default: 1500ms) */
  intervalMs?: number;
  /** Maximum timeout in milliseconds (default: 60000ms = 60s) */
  timeoutMs?: number;
}

/**
 * Backend API Client for Test Generation
 */
export class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Default to production server, can be overridden with config
    this.baseUrl = baseUrl || 'http://localhost:8886/api/v1';
  }

  /**
   * Trigger async test generation
   *
   * Calls POST /workflows/generate-tests
   *
   * @param request - Test generation request payload
   * @returns AsyncJobResponse with task_id for polling
   */
  async generateTestsAsync(request: GenerateTestsRequest): Promise<AsyncJobResponse> {
    try {
      // Log the full request payload
      console.log('[Test Generation] Request Payload:', JSON.stringify(request, null, 2));

      const response = await axios.post<AsyncJobResponse>(
        `${this.baseUrl}/workflows/generate-tests`,
        request,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the initial response object
      console.log('[Test Generation] Initial Response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      const formattedError = this.handleAxiosError(error);
      console.error('[Test Generation] Error Object:', formattedError);
      throw formattedError;
    }
  }

  /**
   * Poll async task status
   *
   * Calls GET /tasks/{task_id}
   *
   * @param taskId - Task identifier from generateTestsAsync
   * @returns TaskStatusResponse with current status and result (if completed)
   */
  async pollTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await axios.get<TaskStatusResponse>(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      const formattedError = this.handleAxiosError(error, taskId);
      console.error('[Backend API] Poll task status error:', formattedError);
      throw formattedError;
    }
  }

  /**
   * Poll task status until completion with exponential backoff
   *
   * @param taskId - Task ID to poll
   * @param onProgress - Optional callback for progress updates
   * @param options - Polling options (intervalMs, timeoutMs)
   * @returns Final task result when completed
   * @throws {TaskTimeoutError} If task exceeds timeout
   * @throws {TaskPollingError} If task fails
   */
  async pollTaskUntilComplete(
    taskId: string,
    onProgress?: (status: TaskStatusResponse) => void,
    options?: PollingOptions
  ): Promise<GenerateTestsResult> {
    const startTime = Date.now();
    const intervalMs = options?.intervalMs || 1500;
    const timeoutMs = options?.timeoutMs || 60000;
    let pollInterval = intervalMs;

    // Log polling start
    console.log(`[Test Generation] Starting polling for task ${taskId}`);

    while (true) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        throw new TaskTimeoutError(taskId, `Task ${taskId} timed out after ${elapsed}ms`);
      }

      // Poll status
      const status = await this.pollTaskStatus(taskId);

      // Log status transition
      console.log(`[Test Generation] Task ${taskId} status: ${status.status}`);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(status);
      }

      // Check if task is complete
      if (status.status === 'completed') {
        if (!status.result) {
          throw new TaskPollingError(
            'Task completed but no result returned',
            taskId
          );
        }
        return status.result;
      }

      // Check if task failed
      if (status.status === 'failed') {
        const errorMessage = status.error?.message || 'Unknown error';
        throw new TaskPollingError(
          `Task failed: ${errorMessage}`,
          taskId
        );
      }

      // Wait before next poll with exponential backoff
      await this.delay(pollInterval);
      pollInterval = Math.min(pollInterval * 1.5, 5000);
    }
  }

  /**
   * Delay helper for polling
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom base URL for the backend API
   *
   * @param url - Custom backend URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get current base URL
   *
   * @returns Current backend base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  private handleAxiosError(error: unknown, taskId?: string): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const messageBody = this.formatResponseBody(error);
        if (error.response.status === 404 && taskId) {
          return new Error(`Task ${taskId} not found`);
        }

        return new Error(
          `Backend API error: ${error.response.status} ${error.response.statusText}. ${messageBody}`
        );
      }

      if (error.request) {
        return new Error('Backend API request failed: No response received');
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Backend API request failed: ${message}`);
  }

  private formatResponseBody(error: AxiosError): string {
    const data = error.response?.data;
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    try {
      return JSON.stringify(data);
    } catch {
      return '';
    }
  }
}

import * as vscode from 'vscode';

/**
 * Manages plugin configuration for backend API
 */
export class ConfigurationManager {
  private readonly configSection = 'llt-assistant';

  /**
   * Get the configured backend URL
   * @returns Backend API URL
   */
  public getBackendUrl(): string {
    const config = vscode.workspace.getConfiguration(this.configSection);
    return config.get<string>('backendUrl', 'https://llt-assistant.fly.dev/api/v1');
  }

  /**
   * Validate current configuration
   * @returns Object with validation result
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const backendUrl = this.getBackendUrl();
    const errors: string[] = [];

    if (!backendUrl || backendUrl.trim() === '') {
      errors.push('Backend URL not configured');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

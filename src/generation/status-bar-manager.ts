/**
 * Status Bar Manager for Test Generation
 *
 * Displays real-time status updates during async test generation.
 */

import * as vscode from 'vscode';

/**
 * Status Bar Manager for Test Generation
 *
 * Shows spinner and status messages during test generation workflow.
 */
export class TestGenerationStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private isActive: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
  }

  /**
   * Show "Generating tests..." with spinner
   */
  public showGenerating(): void {
    this.isActive = true;
    this.statusBarItem.text = '$(loading~spin) LLT: Generating tests...';
    this.statusBarItem.tooltip = 'Test generation in progress';
    this.statusBarItem.show();
  }

  /**
   * Show "Waiting for backend..." with spinner
   */
  public showPending(): void {
    if (!this.isActive) {return;}

    this.statusBarItem.text = '$(loading~spin) LLT: Waiting for backend...';
    this.statusBarItem.tooltip = 'Task queued, waiting for processing';
  }

  /**
   * Show "Processing..." with spinner
   */
  public showProcessing(): void {
    if (!this.isActive) {return;}

    this.statusBarItem.text = '$(loading~spin) LLT: Processing...';
    this.statusBarItem.tooltip = 'Backend is generating tests';
  }

  /**
   * Show completion message briefly then hide
   *
   * @param testCount - Number of tests generated
   */
  public showCompleted(testCount: number): void {
    if (!this.isActive) {return;}

    this.statusBarItem.text = `$(check) LLT: ${testCount} tests generated`;
    this.statusBarItem.tooltip = 'Test generation completed';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hide();
    }, 5000);
  }

  /**
   * Show error message briefly then hide
   *
   * @param message - Error message to display
   */
  public showError(message: string): void {
    if (!this.isActive) {return;}

    this.statusBarItem.text = `$(error) LLT: ${message}`;
    this.statusBarItem.tooltip = 'Test generation failed';

    // Auto-hide after 8 seconds
    setTimeout(() => {
      this.hide();
    }, 8000);
  }

  /**
   * Hide status bar and reset state
   */
  public hide(): void {
    this.isActive = false;
    this.statusBarItem.hide();
  }

  /**
   * Dispose of status bar resources
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

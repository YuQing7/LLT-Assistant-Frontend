/**
 * CodeLens Provider for Test Generation
 *
 * Displays "Generate Tests" above Python function definitions.
 */

import * as vscode from 'vscode';

/**
 * CodeLens provider for Python functions
 *
 * Shows inline "Generate Tests" action above function definitions
 */
export class TestGenerationCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /**
   * Provide CodeLens items for Python functions
   *
   * @param document - The document to scan
   * @param token - Cancellation token
   * @returns Array of CodeLens items
   */
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Only process Python files
    if (document.languageId !== 'python') {
      return codeLenses;
    }

    const text = document.getText();
    const lines = text.split('\n');

    // Regex to match function definitions
    // Matches: def function_name(...):
    // Also handles @decorators, async def, class methods
    const functionRegex = /^\s*(async\s+)?def\s+(\w+)\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = functionRegex.exec(line);

      if (match) {
        const functionName = match[2];

        // Skip private functions (starting with _) and dunder methods (__init__, etc.)
        if (functionName.startsWith('_')) {
          continue;
        }

        // Create a range for the CodeLens (position it at the start of the function line)
        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, line.length)
        );

        // Create CodeLens with "Generate Tests" command
        const codeLens = new vscode.CodeLens(range, {
          title: 'Generate Tests',
          tooltip: 'Generate unit tests for this function',
          command: 'llt-assistant.generateTests',
          arguments: [
            {
              uri: document.uri,
              line: i,
              functionName: functionName
            }
          ]
        });

        codeLenses.push(codeLens);
      }
    }

    return codeLenses;
  }

  /**
   * Refresh CodeLens display
   *
   * Call this when settings change or when you want to force a refresh
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}

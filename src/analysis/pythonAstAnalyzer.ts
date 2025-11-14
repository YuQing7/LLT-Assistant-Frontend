/**
 * TypeScript wrapper for Python AST analyzer
 *
 * Provides functions to call the Python AST analysis script and parse results
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { FunctionContext, AnalyzerError } from './types';

/**
 * Result type for AST analysis
 */
export type AnalysisResult =
  | { success: true; data: FunctionContext }
  | { success: false; error: string };

/**
 * Python AST Analyzer wrapper class
 */
export class PythonASTAnalyzer {
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = resolvePythonScriptPath();
  }

  /**
   * Parse a Python file and extract AST information
   *
   * @param filePath - Absolute path to the Python file
   * @returns Promise resolving to the parsed AST
   */
  public async parsePythonFile(filePath: string): Promise<any> {
    // For now, this returns the full file AST via the function context
    // We'll implement a separate method if needed
    throw new Error('parsePythonFile not yet implemented - use buildFunctionContext instead');
  }

  /**
   * Locate a function node in the AST
   *
   * @param filePath - Path to Python file
   * @param functionName - Name of the function
   * @param lineNumber - Optional line number for disambiguation
   * @returns Promise resolving to function node data
   */
  public async locateFunctionNode(
    filePath: string,
    functionName: string,
    lineNumber?: number
  ): Promise<any> {
    // This is handled internally by the Python script
    // We'll return the function context instead
    return this.buildFunctionContext(filePath, functionName, lineNumber);
  }

  /**
   * Build complete function context for a Python function
   *
   * This is the main entry point for AST analysis
   *
   * @param filePath - Absolute path to the Python file
   * @param functionName - Name of the function to analyze
   * @param lineNumber - Optional line number for disambiguation
   * @returns Promise resolving to FunctionContext or error
   */
  public async buildFunctionContext(
    filePath: string,
    functionName: string,
    lineNumber?: number
  ): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      const args = [this.pythonScriptPath, filePath, functionName];
      if (lineNumber !== undefined) {
        args.push(lineNumber.toString());
      }

      const pythonProcess = spawn('python3', args);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          // Try to parse error from stdout first
          try {
            const errorData = JSON.parse(stdout) as AnalyzerError;
            resolve({
              success: false,
              error: errorData.error || stderr || 'Unknown error occurred'
            });
          } catch {
            resolve({
              success: false,
              error: stderr || stdout || `Python script exited with code ${code}`
            });
          }
          return;
        }

        try {
          const data = JSON.parse(stdout) as FunctionContext | AnalyzerError;

          // Check if it's an error response
          if ('error' in data) {
            resolve({
              success: false,
              error: data.error
            });
            return;
          }

          resolve({
            success: true,
            data: data as FunctionContext
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to parse JSON output: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start Python process: ${error.message}`
        });
      });
    });
  }

  /**
   * Extract function signature from analysis result
   *
   * @param context - Function context from analysis
   * @returns Function signature object
   */
  public extractFunctionSignature(context: FunctionContext) {
    return context.signature;
  }

  /**
   * Analyze function body from analysis result
   *
   * @param context - Function context from analysis
   * @returns Function body analysis
   */
  public analyzeFunctionBody(context: FunctionContext) {
    return context.body_analysis;
  }

  /**
   * Extract class context from analysis result
   *
   * @param context - Function context from analysis
   * @returns Class context or null
   */
  public extractClassContext(context: FunctionContext) {
    return context.class_context;
  }

  /**
   * Extract imports from analysis result
   *
   * @param context - Function context from analysis
   * @returns List of imports
   */
  public extractImports(context: FunctionContext) {
    return context.imports;
  }

  /**
   * Extract documentation from analysis result
   *
   * @param context - Function context from analysis
   * @returns Documentation info
   */
  public extractDocumentation(context: FunctionContext) {
    return context.documentation;
  }

  /**
   * Check if Python 3 is available
   *
   * @returns Promise resolving to true if Python 3 is available
   */
  public async checkPythonAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', ['--version']);

      pythonProcess.on('close', (code) => {
        resolve(code === 0);
      });

      pythonProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}

/**
 * Resolve the on-disk location of the Python analyzer script.
 */
function resolvePythonScriptPath(): string {
  const candidates = [
    path.resolve(__dirname, '../python/ast_analyzer.py'),
    path.resolve(__dirname, '../../python/ast_analyzer.py'),
    path.resolve(__dirname, '../../../python/ast_analyzer.py'),
    path.resolve(process.cwd(), 'python/ast_analyzer.py')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate python/ast_analyzer.py. Checked: ${candidates.join(', ')}`);
}

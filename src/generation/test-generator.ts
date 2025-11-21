/**
 * Test Generation Controller
 *
 * Main orchestrator for Phase 4 - Test Code Generation
 * Coordinates parsing, validation, formatting, and insertion of test code.
 *
 * NOTE: This controller is used by the legacy two-stage workflow and by
 * Feature 3 (Impact Analysis). The new async workflow in extension.ts
 * writes files directly without using this controller.
 */

import * as vscode from 'vscode';
import { FunctionContext } from '../analysis/types';
import {
  TestGenerationResult,
  GenerationPipelineOptions,
  InsertMode,
  UserAction,
  ParsedTestCode,
  ValidationResult,
  DependencyCheck
} from './types';

/**
 * Response from Stage 2 (code generation)
 * NOTE: This interface is kept for backward compatibility with Feature 3.
 * The new async workflow uses GenerateTestsResult instead.
 */
export interface Stage2Response {
  test_code: string;
  imports: string[];
  test_count: number;
  coverage_summary: string;
  notes?: string;
}

import {
  parseGeneratedTests,
  generateImports,
  formatTestCode,
  generateTestFileTemplate
} from './code-generator';
import {
  validatePythonSyntax,
  checkTestDependencies,
  validatePytestConventions,
  formatValidationErrors
} from './validator';
import {
  resolveTestFilePath,
  detectTestConflicts,
  insertTestCode,
  showTestPreview,
  openAndHighlightTestFile
} from './code-inserter';

/**
 * Default options for test generation pipeline
 */
const DEFAULT_OPTIONS: GenerationPipelineOptions = {
  showPreview: true,
  validateSyntax: true,
  checkDependencies: false,  // Disabled to reduce external dependencies and avoid false positives
  formatCode: false,  // Disabled to reduce external dependencies
  formatOptions: {
    formatter: 'none',
    lineLength: 88,
    skipOnError: true
  },
  insertMode: InsertMode.APPEND,
  autoResolveConflicts: false
};

/**
 * Test Generation Controller
 *
 * Manages the complete flow from LLM-generated test code to inserted test file.
 */
export class TestGenerationController {
  private options: GenerationPipelineOptions;

  constructor(options: Partial<GenerationPipelineOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate and insert test code (main entry point)
   *
   * Complete pipeline:
   * 1. Parse LLM response
   * 2. Generate imports
   * 3. Create complete test file
   * 4. Validate syntax (optional)
   * 5. Resolve conflicts
   * 6. Show preview (optional)
   * 7. Insert code
   * 8. Open file and highlight
   *
   * Note: Code formatting and dependency checking have been disabled
   * to reduce external dependencies and improve user experience.
   *
   * @param stage2Response - Response from Stage 2 Agent
   * @param functionContext - Context of the function being tested
   * @param originalFilePath - Path to the source file
   * @returns Test generation result
   */
  async generateAndInsertTests(
    stage2Response: Stage2Response,
    functionContext: FunctionContext,
    originalFilePath: string
  ): Promise<TestGenerationResult> {
    const warnings: string[] = [];

    try {
      // Step 1: Parse LLM response
      const parsedCode = parseGeneratedTests(stage2Response.test_code);

      // Step 2: Generate imports
      const imports = generateImports(functionContext, parsedCode);

      // Step 3: Create complete test code with imports
      let completeTestCode = generateTestFileTemplate(
        originalFilePath,
        imports,
        parsedCode.testCode,
        {
          includeHeader: true,
          addTodoComments: false
        }
      );

      // Step 4: Format code (if enabled)
      if (this.options.formatCode) {
        const formatResult = await formatTestCode(completeTestCode, this.options.formatOptions);

        if (formatResult.success) {
          completeTestCode = formatResult.formattedCode;
          if (formatResult.warning) {
            warnings.push(`Formatting: ${formatResult.warning}`);
          }
        } else {
          warnings.push(`Formatting failed: ${formatResult.error || 'Unknown error'}`);
        }
      }

      // Step 5: Validate syntax (if enabled)
      let validation: ValidationResult = { isValid: true, errors: [], warnings: [] };

      if (this.options.validateSyntax) {
        validation = await validatePythonSyntax(completeTestCode);

        // Also check pytest conventions
        const conventionWarnings = validatePytestConventions(completeTestCode);
        if (conventionWarnings.length > 0) {
          validation.warnings = [...(validation.warnings || []), ...conventionWarnings];
        }

        if (!validation.isValid) {
          const errorMsg = formatValidationErrors(validation.errors);
          const action = await vscode.window.showErrorMessage(
            `Generated test code has syntax errors:\n${errorMsg}\n\nWould you like to insert it anyway?`,
            'Insert Anyway',
            'Cancel'
          );

          if (action !== 'Insert Anyway') {
            return {
              success: false,
              testFilePath: '',
              testCode: completeTestCode,
              parsedCode,
              validation,
              dependencyCheck: { allAvailable: true, missingModules: [], installCommand: '' },
              warnings,
              error: 'Syntax validation failed and user cancelled'
            };
          }

          warnings.push('Code inserted despite syntax errors');
        }
      }

      // Step 6: Check dependencies (if enabled)
      const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      let dependencyCheck: DependencyCheck = { allAvailable: true, missingModules: [], installCommand: '' };

      if (this.options.checkDependencies) {
        dependencyCheck = await checkTestDependencies(completeTestCode, projectRoot);

        if (!dependencyCheck.allAvailable) {
          const action = await vscode.window.showWarningMessage(
            `Missing dependencies: ${dependencyCheck.missingModules.join(', ')}\n\nInstall command: ${dependencyCheck.installCommand}`,
            'Copy Install Command',
            'Continue Anyway',
            'Cancel'
          );

          if (action === 'Copy Install Command') {
            await vscode.env.clipboard.writeText(dependencyCheck.installCommand);
            await vscode.window.showInformationMessage('Install command copied to clipboard!');
          } else if (action === 'Cancel') {
            return {
              success: false,
              testFilePath: '',
              testCode: completeTestCode,
              parsedCode,
              validation,
              dependencyCheck,
              warnings,
              error: 'User cancelled due to missing dependencies'
            };
          }

          warnings.push(`Missing dependencies: ${dependencyCheck.missingModules.join(', ')}`);
        }
      }

      // Step 7: Resolve test file path
      const testFileInfo = await resolveTestFilePath(originalFilePath);

      // Step 8: Check for conflicts
      if (testFileInfo.hasExistingTests && testFileInfo.existingContent) {
        const conflicts = detectTestConflicts(testFileInfo.existingContent, parsedCode);

        if (conflicts.hasConflict) {
          const message = `Conflict detected: ${conflicts.conflictingNames.join(', ')} already exists.\n${conflicts.suggestion}`;

          if (!this.options.autoResolveConflicts) {
            const action = await vscode.window.showWarningMessage(
              message,
              'Replace',
              'Append Anyway',
              'Cancel'
            );

            if (action === 'Replace') {
              this.options.insertMode = InsertMode.REPLACE_CLASS;
            } else if (action === 'Append Anyway') {
              this.options.insertMode = InsertMode.APPEND;
            } else {
              return {
                success: false,
                testFilePath: testFileInfo.testFilePath,
                testCode: completeTestCode,
                parsedCode,
                validation,
                dependencyCheck,
                warnings,
                error: 'User cancelled due to naming conflicts'
              };
            }
          }

          warnings.push(message);
        }
      }

      // Step 9: Show preview (if enabled)
      if (this.options.showPreview) {
        const userAction = await showTestPreview(completeTestCode, testFileInfo);

        if (userAction === UserAction.CANCEL) {
          return {
            success: false,
            testFilePath: testFileInfo.testFilePath,
            testCode: completeTestCode,
            parsedCode,
            validation,
            dependencyCheck,
            warnings,
            error: 'User cancelled after preview'
          };
        }

        if (userAction === UserAction.MODIFY_THEN_INSERT) {
          // Open editable document
          const doc = await vscode.workspace.openTextDocument({
            content: completeTestCode,
            language: 'python'
          });

          await vscode.window.showTextDocument(doc);

          const confirmed = await vscode.window.showInformationMessage(
            'Edit the test code as needed, then click "Insert" to save it to the test file.',
            'Insert',
            'Cancel'
          );

          if (confirmed !== 'Insert') {
            return {
              success: false,
              testFilePath: testFileInfo.testFilePath,
              testCode: completeTestCode,
              parsedCode,
              validation,
              dependencyCheck,
              warnings,
              error: 'User cancelled after editing'
            };
          }

          // Get edited content
          completeTestCode = doc.getText();
        }
      }

      // Step 10: Insert code
      const insertMode = testFileInfo.exists
        ? this.options.insertMode!
        : InsertMode.CREATE_NEW_FILE;

      const insertResult = await insertTestCode(
        testFileInfo,
        completeTestCode,
        insertMode
      );

      if (!insertResult.success) {
        return {
          success: false,
          testFilePath: testFileInfo.testFilePath,
          testCode: completeTestCode,
          parsedCode,
          validation,
          dependencyCheck,
          insertResult,
          warnings,
          error: insertResult.error || 'Failed to insert test code'
        };
      }

      // Step 11: Open file and highlight inserted code
      await openAndHighlightTestFile(insertResult.filePath, insertResult.insertedLines);

      // Success!
      return {
        success: true,
        testFilePath: insertResult.filePath,
        testCode: completeTestCode,
        parsedCode,
        validation,
        dependencyCheck,
        insertResult,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        testFilePath: '',
        testCode: '',
        parsedCode: {
          testCode: '',
          imports: [],
          testClassName: '',
          testMethods: [],
          hasFixtures: false,
          hasParametrize: false
        },
        validation: { isValid: false, errors: [], warnings: [] },
        dependencyCheck: { allAvailable: true, missingModules: [], installCommand: '' },
        warnings,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update pipeline options
   *
   * @param options - Partial options to update
   */
  updateOptions(options: Partial<GenerationPipelineOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current pipeline options
   *
   * @returns Current options
   */
  getOptions(): GenerationPipelineOptions {
    return { ...this.options };
  }
}

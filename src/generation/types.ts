/**
 * Type definitions for Phase 4 - Test Code Generation
 *
 * This module defines interfaces and types for:
 * - Parsing LLM-generated test code
 * - Code insertion and file operations
 * - Validation and error handling
 */

import { FunctionContext } from '../analysis/types';

/**
 * A single test method extracted from generated code
 */
export interface TestMethod {
  /** Name of the test method */
  name: string;

  /** Complete code of the test method */
  code: string;

  /** Number of lines in the test method */
  lineCount: number;

  /** Optional: Decorators on the method (e.g., @pytest.mark.parametrize) */
  decorators?: string[];
}

/**
 * Parsed test code structure from LLM response
 */
export interface ParsedTestCode {
  /** Pure Python code (markdown stripped) */
  testCode: string;

  /** List of extracted import statements */
  imports: string[];

  /** Test class name (if using class-based tests) */
  testClassName: string;

  /** List of test methods */
  testMethods: TestMethod[];

  /** Whether the code uses pytest fixtures */
  hasFixtures: boolean;

  /** Whether the code uses parametrize decorator */
  hasParametrize: boolean;

  /** Optional: Module-level fixtures detected */
  moduleLevelFixtures?: string[];
}

/**
 * Context information for generating imports
 */
export interface ImportContext {
  /** Module path of the source file (e.g., "src.services.user_service") */
  modulePath: string;

  /** Name of the function being tested */
  functionName: string;

  /** External dependencies used in the function */
  dependencies: string[];

  /** Original import statements from source file */
  originalImports: string[];

  /** Whether the function is a class method */
  isMethod: boolean;

  /** Class name if it's a method */
  className?: string;
}

/**
 * Information about a test file
 */
export interface TestFileInfo {
  /** Absolute path to the test file */
  testFilePath: string;

  /** Whether the test file already exists */
  exists: boolean;

  /** Whether the file has existing test code */
  hasExistingTests: boolean;

  /** Existing file content (if file exists) */
  existingContent?: string;

  /** Detected project test directory pattern */
  testDirPattern?: 'tests/' | 'test/' | 'src/tests/' | 'same_dir';
}

/**
 * Test name conflict information
 */
export interface ConflictInfo {
  /** Whether there are naming conflicts */
  hasConflict: boolean;

  /** List of conflicting class or method names */
  conflictingNames: string[];

  /** Suggested resolution (e.g., rename to test_login_v2) */
  suggestion: string;

  /** Type of conflict */
  conflictType?: 'class' | 'method' | 'both';
}

/**
 * Mode for inserting test code
 */
export enum InsertMode {
  /** Append to the end of the file */
  APPEND = 'append',

  /** Replace existing test class with same name */
  REPLACE_CLASS = 'replace_class',

  /** Create a new file */
  CREATE_NEW_FILE = 'create_new_file'
}

/**
 * Result of code insertion operation
 */
export interface InsertResult {
  /** Whether insertion was successful */
  success: boolean;

  /** Path to the test file */
  filePath: string;

  /** Range of inserted code [startLine, endLine] */
  insertedLines: [number, number];

  /** Human-readable message about the operation */
  message: string;

  /** Error message if failed */
  error?: string;
}

/**
 * User action from preview dialog
 */
export enum UserAction {
  /** Confirm and insert the code */
  CONFIRM_INSERT = 'confirm_insert',

  /** Edit the code before inserting */
  MODIFY_THEN_INSERT = 'modify_then_insert',

  /** Cancel the operation */
  CANCEL = 'cancel'
}

/**
 * Syntax error information
 */
export interface SyntaxError {
  /** Line number where error occurs */
  line: number;

  /** Column number (if available) */
  column?: number;

  /** Error message */
  message: string;

  /** Severity level */
  severity: 'error' | 'warning';

  /** Code snippet showing the error context */
  context?: string;
}

/**
 * Python syntax validation result
 */
export interface ValidationResult {
  /** Whether the code has valid Python syntax */
  isValid: boolean;

  /** List of syntax errors found */
  errors: SyntaxError[];

  /** Warnings (non-blocking issues) */
  warnings?: SyntaxError[];
}

/**
 * Dependency check result
 */
export interface DependencyCheck {
  /** Whether all dependencies are available */
  allAvailable: boolean;

  /** List of missing Python modules */
  missingModules: string[];

  /** Suggested pip install command */
  installCommand: string;

  /** Optional: Detected requirements.txt path */
  requirementsPath?: string;
}

/**
 * Code formatting options
 */
export interface FormatOptions {
  /** Line length limit (default: 88 for black, 79 for PEP 8) */
  lineLength?: number;

  /** Formatter to use */
  formatter?: 'black' | 'autopep8' | 'none';

  /** Whether to skip formatting on error */
  skipOnError?: boolean;
}

/**
 * Code formatting result
 */
export interface FormatResult {
  /** Whether formatting was successful */
  success: boolean;

  /** Formatted code */
  formattedCode: string;

  /** Original code (if formatting failed) */
  originalCode?: string;

  /** Error message if formatting failed */
  error?: string;

  /** Warning message (formatting succeeded but has warnings) */
  warning?: string;
}

/**
 * Options for generating test file template
 */
export interface TemplateOptions {
  /** Whether to include file header comment */
  includeHeader?: boolean;

  /** Custom header comment */
  customHeader?: string;

  /** Whether to add TODO comments for manual review */
  addTodoComments?: boolean;
}

/**
 * Complete test generation result for Phase 4
 */
export interface TestGenerationResult {
  /** Whether generation was successful */
  success: boolean;

  /** Path to the generated/updated test file */
  testFilePath: string;

  /** Generated test code */
  testCode: string;

  /** Parsing result */
  parsedCode: ParsedTestCode;

  /** Validation result */
  validation: ValidationResult;

  /** Dependency check result */
  dependencyCheck: DependencyCheck;

  /** Insert result */
  insertResult?: InsertResult;

  /** Any warnings or notes for the user */
  warnings: string[];

  /** Error message if failed */
  error?: string;
}

/**
 * Options for the complete code generation pipeline
 */
export interface GenerationPipelineOptions {
  /** Whether to show preview before inserting */
  showPreview?: boolean;

  /** Whether to validate syntax before inserting */
  validateSyntax?: boolean;

  /** Whether to check dependencies */
  checkDependencies?: boolean;

  /** Whether to format code before inserting */
  formatCode?: boolean;

  /** Format options */
  formatOptions?: FormatOptions;

  /** Insert mode preference */
  insertMode?: InsertMode;

  /** Whether to automatically resolve conflicts */
  autoResolveConflicts?: boolean;
}

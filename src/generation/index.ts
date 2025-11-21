/**
 * Test Code Generation Module
 *
 * Exports all functionality for parsing, validating, formatting,
 * inserting generated test code, and CodeLens integration.
 */

// Main controller
export { TestGenerationController } from './test-generator';

// CodeLens provider
export { TestGenerationCodeLensProvider } from './codelens-provider';

// Status bar manager
export { TestGenerationStatusBar } from './status-bar-manager';

// Code generation utilities
export {
  parseGeneratedTests,
  generateImports,
  formatTestCode,
  generateTestFileTemplate
} from './code-generator';

// Validation utilities
export {
  validatePythonSyntax,
  checkTestDependencies,
  validatePytestConventions,
  formatValidationErrors
} from './validator';

// Code insertion utilities
export {
  resolveTestFilePath,
  detectTestConflicts,
  insertTestCode,
  showTestPreview,
  openAndHighlightTestFile
} from './code-inserter';

// Type exports
export * from './types';

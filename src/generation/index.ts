/**
 * Phase 4 - Test Code Generation Module
 *
 * Exports all functionality for parsing, validating, formatting,
 * and inserting generated test code.
 */

// Main controller
export { TestGenerationController } from './test-generator';

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

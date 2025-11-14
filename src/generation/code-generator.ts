/**
 * Code Generator Module
 *
 * Handles parsing of LLM-generated test code, import generation,
 * and test file template creation.
 */

import * as path from 'path';
import {
  ParsedTestCode,
  TestMethod,
  ImportContext,
  FormatOptions,
  FormatResult,
  TemplateOptions
} from './types';
import { FunctionContext } from '../analysis/types';

/**
 * Parse generated test code from LLM response
 *
 * Extracts Python code from markdown blocks, identifies test classes,
 * methods, imports, and pytest features.
 *
 * @param llmResponse - Raw response from LLM (may contain markdown)
 * @returns Parsed test code structure
 */
export function parseGeneratedTests(llmResponse: string): ParsedTestCode {
  // Extract Python code from markdown code blocks
  let testCode = extractPythonCode(llmResponse);

  // Parse imports
  const imports = extractImports(testCode);

  // Remove imports from test code body for separate handling
  const codeWithoutImports = removeImports(testCode);

  // Extract test class name
  const testClassName = extractTestClassName(codeWithoutImports);

  // Extract test methods
  const testMethods = extractTestMethods(codeWithoutImports);

  // Detect pytest features
  const hasFixtures = detectFixtures(testCode);
  const hasParametrize = detectParametrize(testCode);
  const moduleLevelFixtures = extractModuleLevelFixtures(testCode);

  return {
    testCode: testCode,
    imports,
    testClassName,
    testMethods,
    hasFixtures,
    hasParametrize,
    moduleLevelFixtures
  };
}

/**
 * Extract Python code from markdown code blocks
 *
 * @param response - LLM response that may contain ```python ... ``` blocks
 * @returns Pure Python code
 */
function extractPythonCode(response: string): string {
  // Match code blocks: ```python ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:python)?\s*\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    // Extract all code blocks and concatenate
    return matches.map(match => match[1].trim()).join('\n\n');
  }

  // No code blocks found, return as-is (assume it's already pure code)
  return response.trim();
}

/**
 * Extract import statements from code
 *
 * @param code - Python code
 * @returns Array of import statements
 */
function extractImports(code: string): string[] {
  const imports: string[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match import statements
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      imports.push(trimmed);
    }
  }

  return imports;
}

/**
 * Remove import statements from code
 *
 * @param code - Python code
 * @returns Code without import statements
 */
function removeImports(code: string): string {
  const lines = code.split('\n');
  const nonImportLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('import ') && !trimmed.startsWith('from ');
  });

  return nonImportLines.join('\n');
}

/**
 * Extract test class name from code
 *
 * @param code - Python test code
 * @returns Test class name or empty string if not found
 */
function extractTestClassName(code: string): string {
  // Match class definition: class TestXxx:
  const classRegex = /class\s+(Test\w+)\s*[:\(]/;
  const match = code.match(classRegex);

  return match ? match[1] : '';
}

/**
 * Extract test methods from code
 *
 * @param code - Python test code
 * @returns Array of test methods
 */
function extractTestMethods(code: string): TestMethod[] {
  const methods: TestMethod[] = [];
  const lines = code.split('\n');

  let currentMethod: TestMethod | null = null;
  let methodLines: string[] = [];
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match test method definition: def test_xxx(...):
    if (trimmed.startsWith('def test_')) {
      // Save previous method if exists
      if (currentMethod) {
        currentMethod.code = methodLines.join('\n');
        currentMethod.lineCount = methodLines.length;
        methods.push(currentMethod);
      }

      // Start new method
      const methodNameMatch = trimmed.match(/def\s+(test_\w+)\s*\(/);
      const methodName = methodNameMatch ? methodNameMatch[1] : 'unknown';

      // Check for decorators
      const decorators: string[] = [];
      let j = i - 1;
      while (j >= 0 && lines[j].trim().startsWith('@')) {
        decorators.unshift(lines[j].trim());
        j--;
      }

      currentMethod = {
        name: methodName,
        code: '',
        lineCount: 0,
        decorators: decorators.length > 0 ? decorators : undefined
      };

      methodLines = [line];
      baseIndent = line.length - line.trimLeft().length;
    } else if (currentMethod) {
      // Continue collecting method lines
      const lineIndent = line.length - line.trimLeft().length;

      // Check if we're still in the method (indented or empty line)
      if (trimmed === '' || lineIndent > baseIndent) {
        methodLines.push(line);
      } else if (lineIndent <= baseIndent && trimmed !== '') {
        // Method ended
        currentMethod.code = methodLines.join('\n');
        currentMethod.lineCount = methodLines.length;
        methods.push(currentMethod);
        currentMethod = null;
        methodLines = [];
      }
    }
  }

  // Save last method if exists
  if (currentMethod) {
    currentMethod.code = methodLines.join('\n');
    currentMethod.lineCount = methodLines.length;
    methods.push(currentMethod);
  }

  return methods;
}

/**
 * Detect if code uses pytest fixtures
 *
 * @param code - Python test code
 * @returns True if fixtures are detected
 */
function detectFixtures(code: string): boolean {
  return code.includes('@pytest.fixture') || code.includes('@fixture');
}

/**
 * Detect if code uses pytest parametrize
 *
 * @param code - Python test code
 * @returns True if parametrize is detected
 */
function detectParametrize(code: string): boolean {
  return code.includes('@pytest.mark.parametrize');
}

/**
 * Extract module-level fixtures from code
 *
 * @param code - Python test code
 * @returns Array of fixture names
 */
function extractModuleLevelFixtures(code: string): string[] {
  const fixtures: string[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('@pytest.fixture')) {
      // Next line should be the function definition
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const match = nextLine.match(/def\s+(\w+)\s*\(/);
        if (match) {
          fixtures.push(match[1]);
        }
      }
    }
  }

  return fixtures;
}

/**
 * Generate smart imports for test code
 *
 * Combines imports from:
 * - pytest and its features
 * - The function being tested
 * - Dependencies used in the test
 *
 * @param functionContext - Context of the function being tested
 * @param parsedTests - Parsed test code
 * @returns Array of import statements (deduplicated and sorted)
 */
export function generateImports(
  functionContext: FunctionContext,
  parsedTests: ParsedTestCode
): string[] {
  const imports = new Set<string>();

  // 1. Add pytest import
  imports.add('import pytest');

  // 2. Add pytest features if used
  if (parsedTests.hasFixtures) {
    // fixtures are part of pytest, no additional import needed
  }

  if (parsedTests.hasParametrize) {
    // parametrize is part of pytest.mark, no additional import needed
  }

  // 3. Import the function being tested
  const { module_path, signature } = functionContext;

  if (signature.is_method && functionContext.class_context) {
    // Import the class if it's a method
    const className = functionContext.class_context.class_name;
    imports.add(`from ${module_path} import ${className}`);
  } else {
    // Import the function
    imports.add(`from ${module_path} import ${signature.name}`);
  }

  // 4. Add imports from original test code (user might have added custom ones)
  for (const imp of parsedTests.imports) {
    imports.add(imp);
  }

  // 5. Sort imports (standard library, third-party, local)
  const sortedImports = sortImports(Array.from(imports));

  return sortedImports;
}

/**
 * Sort imports following Python conventions
 *
 * Order: standard library → third-party → local modules
 *
 * @param imports - Array of import statements
 * @returns Sorted array of imports
 */
function sortImports(imports: string[]): string[] {
  const stdLib: string[] = [];
  const thirdParty: string[] = [];
  const local: string[] = [];

  const standardLibs = [
    'os', 'sys', 'json', 'typing', 're', 'datetime', 'collections',
    'itertools', 'functools', 'pathlib', 'unittest', 'logging'
  ];

  for (const imp of imports) {
    const module = extractModuleName(imp);

    if (standardLibs.includes(module)) {
      stdLib.push(imp);
    } else if (module === 'pytest' || module.startsWith('pytest.')) {
      thirdParty.push(imp);
    } else if (module.startsWith('.') || module.includes('.')) {
      local.push(imp);
    } else {
      thirdParty.push(imp);
    }
  }

  // Sort each group alphabetically
  stdLib.sort();
  thirdParty.sort();
  local.sort();

  // Combine with blank lines between groups
  const result: string[] = [];

  if (stdLib.length > 0) {
    result.push(...stdLib);
  }

  if (thirdParty.length > 0) {
    if (result.length > 0) {
      result.push(''); // blank line
    }
    result.push(...thirdParty);
  }

  if (local.length > 0) {
    if (result.length > 0) {
      result.push(''); // blank line
    }
    result.push(...local);
  }

  return result;
}

/**
 * Extract module name from import statement
 *
 * @param importStatement - Import statement (e.g., "import os" or "from x import y")
 * @returns Module name
 */
function extractModuleName(importStatement: string): string {
  if (importStatement.startsWith('import ')) {
    return importStatement.substring(7).split(' ')[0].split('.')[0];
  } else if (importStatement.startsWith('from ')) {
    return importStatement.substring(5).split(' ')[0].split('.')[0];
  }
  return '';
}

/**
 * Format test code using Python formatter
 *
 * NOTE: Code formatting has been disabled to reduce external dependencies.
 * This function now simply returns the code as-is without formatting.
 *
 * @param code - Python test code to format
 * @param options - Formatting options (ignored)
 * @returns Formatted code result
 */
export async function formatTestCode(
  code: string,
  options: FormatOptions = {}
): Promise<FormatResult> {
  // Code formatting disabled - return original code without modification
  return {
    success: true,
    formattedCode: code,
    originalCode: code
  };
}

/**
 * Generate complete test file template
 *
 * Combines file header, imports, and test code into a complete file
 *
 * @param originalFilePath - Path to the source file being tested
 * @param imports - Array of import statements
 * @param testCode - Formatted test code
 * @param options - Template options
 * @returns Complete test file content
 */
export function generateTestFileTemplate(
  originalFilePath: string,
  imports: string[],
  testCode: string,
  options: TemplateOptions = {}
): string {
  const {
    includeHeader = true,
    customHeader,
    addTodoComments = false
  } = options;

  const parts: string[] = [];

  // 1. File header
  if (includeHeader) {
    if (customHeader) {
      parts.push(customHeader);
    } else {
      const relativePath = originalFilePath.replace(process.cwd(), '').replace(/^\//, '');
      parts.push(`"""Tests for ${relativePath}"""`);
    }
    parts.push('');
  }

  // 2. Imports
  parts.push(...imports);
  parts.push('');
  parts.push('');

  // 3. Test code
  parts.push(testCode);

  // 4. Optional TODO comments
  if (addTodoComments) {
    parts.push('');
    parts.push('');
    parts.push('# TODO: Review and customize these tests as needed');
    parts.push('# TODO: Add more edge cases if necessary');
    parts.push('# TODO: Verify mock behavior and assertions');
  }

  return parts.join('\n') + '\n';
}

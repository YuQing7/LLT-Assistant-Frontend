/**
 * Code Inserter Module
 *
 * Handles test file operations including:
 * - Resolving test file paths
 * - Detecting naming conflicts
 * - Inserting test code into files
 * - Showing preview to users
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import {
  TestFileInfo,
  ConflictInfo,
  InsertMode,
  InsertResult,
  UserAction,
  ParsedTestCode
} from './types';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

/**
 * Resolve test file path for a given source file
 *
 * Detects project test directory structure and determines where
 * the test file should be created.
 *
 * @param originalFilePath - Absolute path to source file
 * @returns Test file information
 */
export async function resolveTestFilePath(originalFilePath: string): Promise<TestFileInfo> {
  const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
  const relativePath = path.relative(projectRoot, originalFilePath);

  // Detect test directory pattern
  const testDirPattern = detectTestDirPattern(projectRoot);

  let testFilePath: string;
  let testFileName: string;

  // Generate test file name
  const baseName = path.basename(originalFilePath, '.py');
  if (baseName.startsWith('test_')) {
    testFileName = baseName + '.py';
  } else if (baseName.endsWith('_test')) {
    testFileName = baseName + '.py';
  } else {
    testFileName = `test_${baseName}.py`;
  }

  // Determine test file path based on pattern
  switch (testDirPattern) {
    case 'tests/':
      testFilePath = path.join(projectRoot, 'tests', testFileName);
      break;

    case 'test/':
      testFilePath = path.join(projectRoot, 'test', testFileName);
      break;

    case 'src/tests/':
      testFilePath = path.join(projectRoot, 'src', 'tests', testFileName);
      break;

    case 'same_dir':
    default:
      // Place test file in same directory as source
      testFilePath = path.join(path.dirname(originalFilePath), testFileName);
      break;
  }

  // Check if file exists
  const exists = fs.existsSync(testFilePath);
  let existingContent: string | undefined;
  let hasExistingTests = false;

  if (exists) {
    existingContent = await readFileAsync(testFilePath, 'utf-8');
    hasExistingTests = existingContent.trim().length > 0;
  }

  return {
    testFilePath,
    exists,
    hasExistingTests,
    existingContent,
    testDirPattern
  };
}

/**
 * Detect project's test directory pattern
 *
 * @param projectRoot - Project root directory
 * @returns Detected test directory pattern
 */
function detectTestDirPattern(projectRoot: string): TestFileInfo['testDirPattern'] {
  // Check for common test directory patterns
  if (fs.existsSync(path.join(projectRoot, 'tests'))) {
    return 'tests/';
  }

  if (fs.existsSync(path.join(projectRoot, 'test'))) {
    return 'test/';
  }

  if (fs.existsSync(path.join(projectRoot, 'src', 'tests'))) {
    return 'src/tests/';
  }

  // Default: same directory as source
  return 'same_dir';
}

/**
 * Detect naming conflicts in existing test file
 *
 * Checks if test class names or method names conflict with existing code
 *
 * @param existingContent - Content of existing test file
 * @param newTestCode - New test code to insert
 * @returns Conflict information
 */
export function detectTestConflicts(
  existingContent: string,
  newTestCode: ParsedTestCode
): ConflictInfo {
  if (!existingContent || existingContent.trim().length === 0) {
    return {
      hasConflict: false,
      conflictingNames: [],
      suggestion: ''
    };
  }

  const conflictingNames: string[] = [];
  let conflictType: 'class' | 'method' | 'both' | undefined;

  // Check for class name conflicts
  if (newTestCode.testClassName) {
    const classRegex = new RegExp(`class\\s+${newTestCode.testClassName}\\s*[:\\(]`);
    if (classRegex.test(existingContent)) {
      conflictingNames.push(newTestCode.testClassName);
      conflictType = 'class';
    }
  }

  // Check for method name conflicts
  for (const method of newTestCode.testMethods) {
    const methodRegex = new RegExp(`def\\s+${method.name}\\s*\\(`);
    if (methodRegex.test(existingContent)) {
      conflictingNames.push(method.name);
      conflictType = conflictType === 'class' ? 'both' : 'method';
    }
  }

  if (conflictingNames.length === 0) {
    return {
      hasConflict: false,
      conflictingNames: [],
      suggestion: ''
    };
  }

  // Generate suggestion
  let suggestion = '';
  if (conflictType === 'class' || conflictType === 'both') {
    const baseName = newTestCode.testClassName.replace(/V\d+$/, '');
    const version = extractVersionNumber(existingContent, baseName);
    suggestion = `Consider renaming to ${baseName}V${version + 1}`;
  } else {
    suggestion = 'Consider renaming conflicting methods or replacing the existing tests';
  }

  return {
    hasConflict: true,
    conflictingNames,
    suggestion,
    conflictType
  };
}

/**
 * Extract version number from class names
 *
 * @param content - File content
 * @param baseName - Base class name
 * @returns Highest version number found
 */
function extractVersionNumber(content: string, baseName: string): number {
  const regex = new RegExp(`class\\s+${baseName}V(\\d+)`, 'g');
  let maxVersion = 1;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const version = parseInt(match[1], 10);
    if (version >= maxVersion) {
      maxVersion = version;
    }
  }

  return maxVersion;
}

/**
 * Insert test code into file
 *
 * Handles creating new files, appending to existing files,
 * or replacing existing test classes.
 *
 * @param testFileInfo - Test file information
 * @param testCode - Complete test code to insert
 * @param insertMode - How to insert the code
 * @returns Insert result
 */
export async function insertTestCode(
  testFileInfo: TestFileInfo,
  testCode: string,
  insertMode: InsertMode
): Promise<InsertResult> {
  try {
    const { testFilePath, exists, existingContent } = testFileInfo;

    // Ensure directory exists
    const testDir = path.dirname(testFilePath);
    if (!fs.existsSync(testDir)) {
      await mkdirAsync(testDir, { recursive: true });
    }

    let finalContent: string;
    let insertedLines: [number, number];

    switch (insertMode) {
      case InsertMode.CREATE_NEW_FILE:
        // Simply write the new content
        finalContent = testCode;
        await writeFileAsync(testFilePath, finalContent, 'utf-8');
        insertedLines = [1, testCode.split('\n').length];
        break;

      case InsertMode.APPEND:
        // Append to existing file
        if (!exists || !existingContent) {
          finalContent = testCode;
        } else {
          const startLine = existingContent.split('\n').length + 1;
          finalContent = existingContent.trimEnd() + '\n\n\n' + testCode;
          insertedLines = [startLine, finalContent.split('\n').length];
        }
        await writeFileAsync(testFilePath, finalContent, 'utf-8');
        insertedLines = insertedLines! || [1, testCode.split('\n').length];
        break;

      case InsertMode.REPLACE_CLASS:
        // Replace existing test class
        if (!exists || !existingContent) {
          // No existing file, just create new
          finalContent = testCode;
          await writeFileAsync(testFilePath, finalContent, 'utf-8');
          insertedLines = [1, testCode.split('\n').length];
        } else {
          // Find and replace the class
          const result = replaceTestClass(existingContent, testCode);
          finalContent = result.content;
          insertedLines = result.insertedLines;
          await writeFileAsync(testFilePath, finalContent, 'utf-8');
        }
        break;

      default:
        throw new Error(`Unknown insert mode: ${insertMode}`);
    }

    return {
      success: true,
      filePath: testFilePath,
      insertedLines: insertedLines!,
      message: `Successfully ${insertMode === InsertMode.CREATE_NEW_FILE ? 'created' : 'updated'} test file`
    };
  } catch (error) {
    return {
      success: false,
      filePath: testFileInfo.testFilePath,
      insertedLines: [0, 0],
      message: 'Failed to insert test code',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Replace an existing test class in code
 *
 * @param existingContent - Existing file content
 * @param newTestCode - New test code
 * @returns Updated content and line range
 */
function replaceTestClass(
  existingContent: string,
  newTestCode: string
): { content: string; insertedLines: [number, number] } {
  // Extract class name from new test code
  const classMatch = newTestCode.match(/class\s+(Test\w+)\s*[:\(]/);
  if (!classMatch) {
    // No class found, just append
    return {
      content: existingContent.trimEnd() + '\n\n\n' + newTestCode,
      insertedLines: [existingContent.split('\n').length + 1, (existingContent + newTestCode).split('\n').length]
    };
  }

  const className = classMatch[1];
  const lines = existingContent.split('\n');

  // Find the class definition
  let classStartLine = -1;
  let classEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.match(new RegExp(`class\\s+${className}\\s*[:\\(]`))) {
      classStartLine = i;

      // Find the end of the class (next class or end of file)
      const baseIndent = line.length - line.trimLeft().length;

      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        const nextIndent = nextLine.length - nextLine.trimLeft().length;

        // Check if we've reached the next class or unindented code
        if (nextTrimmed !== '' && nextIndent <= baseIndent && !nextTrimmed.startsWith('#')) {
          classEndLine = j - 1;
          break;
        }
      }

      if (classEndLine === -1) {
        // Class extends to end of file
        classEndLine = lines.length - 1;
      }

      break;
    }
  }

  if (classStartLine === -1) {
    // Class not found, append
    return {
      content: existingContent.trimEnd() + '\n\n\n' + newTestCode,
      insertedLines: [existingContent.split('\n').length + 1, (existingContent + newTestCode).split('\n').length]
    };
  }

  // Replace the class
  const before = lines.slice(0, classStartLine).join('\n');
  const after = lines.slice(classEndLine + 1).join('\n');

  const content = before + '\n\n' + newTestCode + '\n\n' + after;
  const startLine = classStartLine + 1;
  const endLine = startLine + newTestCode.split('\n').length;

  return {
    content,
    insertedLines: [startLine, endLine]
  };
}

/**
 * Show preview of test code to user
 *
 * Opens a diff view comparing new test code with existing content
 *
 * @param testCode - Generated test code
 * @param testFileInfo - Test file information
 * @returns User action decision
 */
export async function showTestPreview(
  testCode: string,
  testFileInfo: TestFileInfo
): Promise<UserAction> {
  const { testFilePath, exists, existingContent } = testFileInfo;

  // Create a temporary file for the new content
  const tempUri = vscode.Uri.parse(`untitled:${testFilePath}`);

  // Open diff editor if file exists, otherwise just show the new content
  if (exists && existingContent) {
    const existingUri = vscode.Uri.file(testFilePath);

    // Create document for new content
    const newDoc = await vscode.workspace.openTextDocument({
      content: testCode,
      language: 'python'
    });

    // Show diff
    await vscode.commands.executeCommand(
      'vscode.diff',
      existingUri,
      newDoc.uri,
      `Test Preview: ${path.basename(testFilePath)}`
    );
  } else {
    // Just show the new content
    const newDoc = await vscode.workspace.openTextDocument({
      content: testCode,
      language: 'python'
    });

    await vscode.window.showTextDocument(newDoc, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside
    });
  }

  // Ask user for action
  const action = await vscode.window.showInformationMessage(
    'Review the generated test code. What would you like to do?',
    { modal: true },
    'Insert',
    'Edit',
    'Cancel'
  );

  switch (action) {
    case 'Insert':
      return UserAction.CONFIRM_INSERT;
    case 'Edit':
      return UserAction.MODIFY_THEN_INSERT;
    case 'Cancel':
    default:
      return UserAction.CANCEL;
  }
}

/**
 * Open test file in editor and highlight inserted code
 *
 * @param filePath - Path to test file
 * @param lineRange - Range of inserted lines [start, end]
 */
export async function openAndHighlightTestFile(
  filePath: string,
  lineRange: [number, number]
): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);

  // Highlight the inserted code
  const startLine = Math.max(0, lineRange[0] - 1);
  const endLine = Math.min(doc.lineCount - 1, lineRange[1] - 1);

  const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);

  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

  // Optionally, add a decoration to make it more visible
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(100, 200, 100, 0.2)',
    isWholeLine: true
  });

  editor.setDecorations(decorationType, [range]);

  // Remove decoration after 3 seconds
  setTimeout(() => {
    decorationType.dispose();
  }, 3000);
}

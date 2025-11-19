/**
 * Test Setup - Register VSCode Module Mock
 *
 * This file must be loaded before any tests run to ensure that
 * all imports of 'vscode' resolve to our mock implementation.
 */

import Module from 'module';
import * as path from 'path';
import * as fs from 'fs';

// Import our VSCode mocks
import * as vscodeMock from './mocks/vscode';

// Get the original require function
const originalRequire = Module.prototype.require;

// Override Module.prototype.require to intercept 'vscode' imports
Module.prototype.require = function (this: NodeModule, id: string) {
  if (id === 'vscode') {
    // Return our mock instead of trying to load the real vscode module
    return vscodeMock;
  }

  // For all other modules, use the original require
  return originalRequire.apply(this, arguments as any);
} as any;

// Also register the mock in require.cache to handle static imports
const vscodeMockPath = path.resolve(__dirname, 'mocks', 'vscode.ts');
if (fs.existsSync(vscodeMockPath)) {
  require.cache['vscode'] = {
    id: 'vscode',
    filename: 'vscode',
    loaded: true,
    exports: vscodeMock,
  } as any;
}

console.log('[Test Setup] VSCode module mock registered successfully');

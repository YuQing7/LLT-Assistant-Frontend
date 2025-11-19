/**
 * VSCode Extension Test Configuration
 *
 * This file configures the @vscode/test-cli tool for running integration tests
 */

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  tests: [
    {
      // Extension integration tests
      files: 'out/test/integration/**/*.test.js',
      version: '1.85.0',
      workspaceFolder: './test-workspace',
      mocha: {
        ui: 'tdd',
        timeout: 20000,
        color: true,
      },
    },
  ],
});

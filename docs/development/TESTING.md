# Testing Guide for LLT Assistant

This document provides comprehensive information about testing the LLT Assistant VSCode extension.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [CI/CD](#cicd)
- [Test Coverage](#test-coverage)
- [Debugging Tests](#debugging-tests)
- [Best Practices](#best-practices)

## Overview

The LLT Assistant test suite includes:

- **Unit Tests**: Fast, isolated tests for individual modules using mocked dependencies
- **Integration Tests**: Tests that run in the actual VSCode environment
- **Property-Based Tests**: Tests that verify properties hold for any input using fast-check
- **Coverage Reports**: Code coverage analysis with nyc

### Test Stack

- **Test Runner**: Mocha
- **Assertions**: Chai
- **Mocking/Stubbing**: Sinon
- **VSCode Integration**: @vscode/test-electron
- **Property-Based Testing**: fast-check
- **Coverage**: nyc (Istanbul)
- **TypeScript Support**: ts-node

## Test Structure

```
src/test/
├── unit/                       # Unit tests (fast, mocked)
│   ├── quality/               # Quality analysis module tests
│   │   ├── api-client.test.ts
│   │   └── tree-provider.test.ts
│   ├── agents/                # Agent system tests
│   │   └── llm-client.test.ts
│   ├── api/                   # API client tests
│   ├── generation/            # Test generation tests
│   │   └── test-generator.test.ts
│   └── utils/                 # Utility function tests
├── integration/               # Integration tests (VSCode required)
│   └── extension-integration.test.ts
├── property/                  # Property-based tests
│   └── pytest-parser.property.test.ts
├── mocks/                     # Mock implementations
│   └── vscode.ts              # VSCode API mocks
├── helpers/                   # Test utilities
│   └── factories.ts           # Test data factories
└── fixtures/                  # Test fixtures
    └── pytest-samples/        # Sample Python test files
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Ensure Python 3.8+ is installed (for AST analysis tests)

### All Tests

Run all test suites:
```bash
pnpm test
```

This runs unit tests and integration tests sequentially.

### Unit Tests

Run only unit tests (fast, no VSCode required):
```bash
pnpm run test:unit
```

Watch mode for development:
```bash
pnpm run test:unit:watch
```

### Integration Tests

Run integration tests (requires VSCode):
```bash
pnpm run test:integration
```

**Note**: Integration tests will:
- Download VSCode if not already present
- Launch VSCode in headless mode
- Run tests in the actual extension environment

### Property-Based Tests

Run property-based tests:
```bash
pnpm run test:property
```

### All Test Suites

Run all tests including property-based:
```bash
pnpm run test:all
```

### Test Coverage

Generate coverage report:
```bash
pnpm run test:coverage
```

Coverage reports are generated in:
- **HTML**: `coverage/index.html` (open in browser)
- **Text**: Displayed in terminal
- **LCOV**: `coverage/lcov.info` (for CI tools)

View HTML coverage report:
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Writing Tests

### Unit Tests

Unit tests should be fast, isolated, and use mocked dependencies.

#### Example: Testing a simple function

```typescript
import { expect } from 'chai';
import * as sinon from 'sinon';
import { MyModule } from '../../../src/my-module';
import { resetAllMocks } from '../mocks/vscode';

suite('MyModule', () => {
  setup(() => {
    resetAllMocks();
  });

  teardown(() => {
    sinon.restore();
  });

  test('should return correct value', () => {
    const result = MyModule.myFunction(42);
    expect(result).to.equal(84);
  });

  test('should handle errors gracefully', () => {
    expect(() => MyModule.myFunction(-1)).to.throw();
  });
});
```

#### Using Test Factories

Create test data easily with factories:

```typescript
import { createMockAnalysisResponse, createMockIssues } from '../helpers/factories';

test('should process analysis response', () => {
  const mockResponse = createMockAnalysisResponse({
    issues: createMockIssues(5, 'tests/test_example.py'),
  });

  const result = processAnalysis(mockResponse);
  expect(result.issueCount).to.equal(5);
});
```

#### Mocking VSCode APIs

Use the VSCode mocks for unit tests:

```typescript
import { mockWindow, mockWorkspace, resetAllMocks } from '../mocks/vscode';

suite('My Extension', () => {
  setup(() => {
    resetAllMocks();
  });

  test('should show info message', async () => {
    mockWindow.showInformationMessage.resolves('OK');

    await myFunction();

    expect(mockWindow.showInformationMessage.calledOnce).to.be.true;
    expect(mockWindow.showInformationMessage.firstCall.args[0]).to.include('Success');
  });

  test('should read configuration', () => {
    mockWorkspace.getConfiguration.returns({
      get: sinon.stub().withArgs('backendUrl').returns('http://localhost:8000'),
    });

    const config = loadConfig();
    expect(config.backendUrl).to.equal('http://localhost:8000');
  });
});
```

### Integration Tests

Integration tests run in the actual VSCode environment.

#### Example: Testing a command

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {
  test('should register command', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('llt-assistant.analyzeQuality'));
  });

  test('should execute command', async () => {
    // Create a test document
    const doc = await vscode.workspace.openTextDocument({
      language: 'python',
      content: 'def test_example():\n    assert True',
    });

    await vscode.window.showTextDocument(doc);

    // Execute command (this would call the actual backend)
    await vscode.commands.executeCommand('llt-assistant.analyzeQuality');

    // Verify results
    assert.ok(true);
  });
});
```

### Property-Based Tests

Property-based tests verify that certain properties hold for any input.

#### Example: Testing parser properties

```typescript
import { expect } from 'chai';
import * as fc from 'fast-check';

suite('Property Tests', () => {
  test('parser should never crash on valid input', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          try {
            const result = parseInput(input);
            expect(result).to.exist;
            return true;
          } catch (e) {
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('formatting should be idempotent', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (input) => {
          const formatted1 = format(input);
          const formatted2 = format(formatted1);
          expect(formatted1).to.equal(formatted2);
          return true;
        }
      )
    );
  });
});
```

## CI/CD

### GitHub Actions

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

#### CI Pipeline

1. **Unit Tests**: Run on Ubuntu, Windows, macOS with Node 18 & 20
2. **Coverage**: Generate coverage report (Ubuntu only)
3. **Integration Tests**: Run with VSCode on all platforms
4. **Build**: Verify extension builds correctly

### Platform-Specific Notes

#### Linux
- Uses Xvfb for headless VSCode
- Requires X11 dependencies

#### Windows
- No special requirements
- Runs natively

#### macOS
- No special requirements
- Runs natively

### Coverage Thresholds

The following coverage thresholds are enforced:

- **Branches**: 70%
- **Lines**: 75%
- **Functions**: 70%
- **Statements**: 75%

Tests will fail if coverage drops below these thresholds.

## Test Coverage

### Viewing Coverage

After running `pnpm run test:coverage`:

1. Open `coverage/index.html` in your browser
2. Navigate through files to see line-by-line coverage
3. Identify uncovered code paths

### Improving Coverage

1. **Identify gaps**: Look for red (uncovered) lines in coverage report
2. **Write tests**: Add tests for uncovered code paths
3. **Verify**: Run coverage again to see improvement

### Coverage Exclusions

The following are excluded from coverage:
- Test files (`*.test.ts`, `*.spec.ts`)
- Test utilities (`src/test/**`)
- Build output (`dist/`, `out/`)
- Type definitions (`*.d.ts`)

## Debugging Tests

### VSCode Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Unit Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
      "args": [
        "--require",
        "ts-node/register",
        "--config",
        ".mocharc.json",
        "--timeout",
        "999999"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Integration Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/integration"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"]
    }
  ]
}
```

### Debugging Tips

1. **Set breakpoints**: Click left margin in VSCode
2. **Use debugger**: Press F5 to start debugging
3. **Inspect variables**: Hover over variables to see values
4. **Step through**: Use F10 (step over), F11 (step into)

### Debug Specific Test

Run a single test file:
```bash
pnpm run test:unit -- src/test/unit/quality/api-client.test.ts
```

Run tests matching a pattern:
```bash
pnpm run test:unit -- --grep "API client"
```

## Best Practices

### Test Organization

1. **One suite per module**: Each module should have its own test file
2. **Group related tests**: Use nested `suite()` blocks
3. **Clear test names**: Use descriptive names that explain what's being tested
4. **Setup and teardown**: Use `setup()` and `teardown()` hooks

### Test Quality

1. **Test one thing**: Each test should verify one behavior
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Use factories**: Don't repeat test data creation
4. **Mock external dependencies**: Keep tests isolated
5. **Test edge cases**: Don't just test the happy path

### Performance

1. **Keep unit tests fast**: Aim for <1ms per test
2. **Minimize I/O**: Mock file system and network calls
3. **Parallel execution**: Tests should be independent
4. **Use integration tests sparingly**: They're slow

### Example: Well-Structured Test

```typescript
suite('QualityBackendClient', () => {
  let client: QualityBackendClient;
  let axiosStub: sinon.SinonStub;

  setup(() => {
    // Arrange: Set up mocks and test instance
    resetAllMocks();
    axiosStub = sinon.stub(axios, 'create').returns(mockAxiosInstance);
    client = new QualityBackendClient();
  });

  teardown(() => {
    // Cleanup
    sinon.restore();
  });

  suite('analyzeQuality', () => {
    test('should send correct request format', async () => {
      // Arrange
      const mockResponse = createMockAnalysisResponse();
      axiosStub.resolves({ data: mockResponse });

      // Act
      const result = await client.analyzeQuality(mockRequest);

      // Assert
      expect(axiosStub.calledOnce).to.be.true;
      expect(result).to.deep.equal(mockResponse);
    });

    test('should handle network errors', async () => {
      // Arrange
      axiosStub.rejects(new Error('Network error'));

      // Act & Assert
      await expect(client.analyzeQuality(mockRequest)).to.be.rejected;
    });
  });
});
```

## Troubleshooting

### Common Issues

#### "Cannot find module 'vscode'"

**Solution**: Make sure you're running unit tests with mocked VSCode:
```typescript
import { mockWindow } from '../mocks/vscode';
```

#### Integration tests fail with "Display not found"

**Solution** (Linux): Make sure Xvfb is running:
```bash
Xvfb :99 -screen 0 1024x768x24 &
export DISPLAY=:99
```

#### Tests time out

**Solution**: Increase timeout in test:
```typescript
test('slow test', async function() {
  this.timeout(10000); // 10 seconds
  // ...
});
```

#### Coverage not generated

**Solution**: Make sure you're running the coverage command:
```bash
pnpm run test:coverage
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Achieve 75%+ coverage** for new code
3. **Add integration tests** for user-facing features
4. **Document test patterns** if introducing new approaches

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Sinon Mocking Library](https://sinonjs.org/)
- [VSCode Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [fast-check Documentation](https://fast-check.dev/)
- [Istanbul/nyc Coverage](https://istanbul.js.org/)

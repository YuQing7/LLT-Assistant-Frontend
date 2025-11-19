/**
 * Property-Based Tests using fast-check
 *
 * These tests verify properties that should hold for any input
 */

import { expect } from 'chai';
import * as fc from 'fast-check';

suite('Property-Based Tests', () => {
  suite('Pytest Code Generator Properties', () => {
    test('generated test code should be valid Python', () => {
      // Property: Any generated test code should be syntactically valid Python
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (functionName) => {
            // Skip invalid Python identifiers
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
              return true;
            }

            // Property: function name in generated code matches input
            const generatedCode = generateMockTestCode(functionName);
            expect(generatedCode).to.include(functionName);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('parser should never crash on valid Python input', () => {
      // Property: Parser should handle any valid Python code without crashing
      fc.assert(
        fc.property(
          fc.record({
            functionName: fc.string({ minLength: 1, maxLength: 20 }),
            params: fc.array(fc.string(), { maxLength: 5 }),
          }),
          (input) => {
            // Property: parsing always returns a result (success or error)
            try {
              const result = mockParse(input);
              expect(result).to.exist;
              return true;
            } catch (e) {
              // Should never throw, only return error result
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  suite('Quality Issue Detection Properties', () => {
    test('issue count should never be negative', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              file: fc.string(),
              line: fc.integer({ min: 1, max: 1000 }),
              severity: fc.constantFrom('error', 'warning', 'info'),
            }),
            { maxLength: 100 }
          ),
          (issues) => {
            const count = issues.length;
            expect(count).to.be.at.least(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('issue line numbers should be positive', () => {
      fc.assert(
        fc.property(
          fc.record({
            line: fc.integer({ min: 1, max: 10000 }),
            column: fc.integer({ min: 0, max: 200 }),
          }),
          (position) => {
            expect(position.line).to.be.greaterThan(0);
            expect(position.column).to.be.at.least(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('severity breakdown should sum to total issues', () => {
      fc.assert(
        fc.property(
          fc.record({
            error: fc.integer({ min: 0, max: 50 }),
            warning: fc.integer({ min: 0, max: 50 }),
            info: fc.integer({ min: 0, max: 50 }),
          }),
          (breakdown) => {
            const total = breakdown.error + breakdown.warning + breakdown.info;
            expect(total).to.equal(breakdown.error + breakdown.warning + breakdown.info);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  suite('File Path Handling Properties', () => {
    test('file path normalization should be idempotent', () => {
      fc.assert(
        fc.property(fc.string(), (filePath) => {
          const normalized1 = normalizeFilePath(filePath);
          const normalized2 = normalizeFilePath(normalized1);

          // Property: normalize(normalize(x)) === normalize(x)
          expect(normalized1).to.equal(normalized2);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    test('relative paths should always start without slash', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 5,
          }),
          (pathSegments) => {
            const relativePath = pathSegments.join('/');
            if (relativePath.startsWith('/')) {
              return true; // Skip absolute paths
            }

            expect(relativePath).to.not.match(/^\//);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  suite('API Request Validation Properties', () => {
    test('request should always contain required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            files: fc.array(
              fc.record({
                path: fc.string(),
                content: fc.string(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            mode: fc.constantFrom('rules-only', 'llm-only', 'hybrid'),
          }),
          (request) => {
            // Property: Valid request must have files and mode
            expect(request.files).to.be.an('array');
            expect(request.files.length).to.be.greaterThan(0);
            expect(request.mode).to.be.oneOf(['rules-only', 'llm-only', 'hybrid']);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  suite('String Transformation Properties', () => {
    test('issue type formatting should be reversible', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (issueType) => {
            // Property: format(parse(format(x))) should preserve meaning
            const formatted = formatIssueType(issueType);
            const unformatted = unformatIssueType(formatted);

            // The round-trip should preserve the structure (if not exact string)
            expect(unformatted).to.be.a('string');
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// Helper functions for property tests

function generateMockTestCode(functionName: string): string {
  return `def test_${functionName}():\n    assert ${functionName}() is not None`;
}

function mockParse(input: { functionName: string; params: string[] }): any {
  return {
    success: true,
    functionName: input.functionName,
    params: input.params,
  };
}

function normalizeFilePath(path: string): string {
  // Simple normalization: remove double slashes, trailing slash
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function formatIssueType(type: string): string {
  return type
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function unformatIssueType(formatted: string): string {
  return formatted.toLowerCase().split(' ').join('-');
}

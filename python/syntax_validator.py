#!/usr/bin/env python3
"""
Python Syntax Validator

Validates Python code syntax using AST parsing and returns detailed error information.
"""

import ast
import sys
import json
from typing import Dict, List, Any


def validate_syntax(code: str) -> Dict[str, Any]:
    """
    Validate Python code syntax.

    Args:
        code: Python code string to validate

    Returns:
        Dictionary with validation results:
        {
            "is_valid": bool,
            "errors": [{"line": int, "column": int, "message": str, "severity": str}],
            "warnings": [...]
        }
    """
    errors = []
    warnings = []

    if not code or not code.strip():
        return {
            "is_valid": False,
            "errors": [{
                "line": 0,
                "column": 0,
                "message": "Code is empty",
                "severity": "error"
            }],
            "warnings": []
        }

    try:
        # Try to parse the code with ast.parse()
        tree = ast.parse(code)

        # Additional validation: check for common issues
        warnings.extend(_check_common_issues(code, tree))

        return {
            "is_valid": True,
            "errors": [],
            "warnings": warnings
        }

    except SyntaxError as e:
        # Syntax error found
        error_info = {
            "line": e.lineno or 0,
            "column": e.offset or 0,
            "message": str(e.msg),
            "severity": "error"
        }

        # Add context if available
        if e.text:
            error_info["context"] = e.text.rstrip()

        errors.append(error_info)

        return {
            "is_valid": False,
            "errors": errors,
            "warnings": warnings
        }

    except Exception as e:
        # Other parsing errors
        errors.append({
            "line": 0,
            "column": 0,
            "message": f"Parsing error: {str(e)}",
            "severity": "error"
        })

        return {
            "is_valid": False,
            "errors": errors,
            "warnings": warnings
        }


def _check_common_issues(code: str, tree: ast.AST) -> List[Dict[str, Any]]:
    """
    Check for common issues that are not syntax errors but might be problematic.

    Args:
        code: Original code string
        tree: Parsed AST tree

    Returns:
        List of warning dictionaries
    """
    warnings = []

    # Check for mixed tabs and spaces
    lines = code.split('\n')
    for i, line in enumerate(lines, 1):
        if '\t' in line and '    ' in line:
            warnings.append({
                "line": i,
                "column": 0,
                "message": "Mixed tabs and spaces in indentation",
                "severity": "warning"
            })

    # Check for trailing whitespace
    for i, line in enumerate(lines, 1):
        if line.rstrip() != line and line.strip():
            warnings.append({
                "line": i,
                "column": len(line.rstrip()),
                "message": "Trailing whitespace",
                "severity": "warning"
            })

    # Check for missing test methods in test classes
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            if node.name.startswith('Test'):
                # This is a test class
                test_methods = [
                    m for m in node.body
                    if isinstance(m, ast.FunctionDef) and m.name.startswith('test_')
                ]
                if not test_methods:
                    warnings.append({
                        "line": node.lineno,
                        "column": node.col_offset,
                        "message": f"Test class '{node.name}' has no test methods (methods should start with 'test_')",
                        "severity": "warning"
                    })

    return warnings


def main():
    """
    Main entry point for command-line usage.

    Expected input: JSON object with 'code' field
    Output: JSON object with validation results
    """
    if len(sys.argv) > 1:
        # Code provided as command-line argument
        code = sys.argv[1]
    else:
        # Read from stdin
        try:
            input_data = json.loads(sys.stdin.read())
            code = input_data.get('code', '')
        except json.JSONDecodeError:
            # Fallback: treat entire stdin as code
            sys.stdin.seek(0)
            code = sys.stdin.read()

    result = validate_syntax(code)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()

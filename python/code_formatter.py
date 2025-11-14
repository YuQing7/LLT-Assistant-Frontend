#!/usr/bin/env python3
"""
Python Code Formatter

Formats Python code using black or autopep8, with graceful fallback.
"""

import sys
import json
from typing import Dict, Any, Optional


def format_code(
    code: str,
    formatter: str = 'black',
    line_length: int = 88,
    skip_on_error: bool = True
) -> Dict[str, Any]:
    """
    Format Python code using the specified formatter.

    Args:
        code: Python code to format
        formatter: 'black' or 'autopep8'
        line_length: Maximum line length (default: 88 for black, 79 for autopep8)
        skip_on_error: If True, return original code on formatting error

    Returns:
        Dictionary with formatting results:
        {
            "success": bool,
            "formatted_code": str,
            "original_code": str (if formatting failed),
            "error": str (if error occurred),
            "warning": str (if warning)
        }
    """
    if not code or not code.strip():
        return {
            "success": False,
            "formatted_code": code,
            "error": "Code is empty"
        }

    # Adjust line length defaults
    if formatter == 'autopep8' and line_length == 88:
        line_length = 79

    try:
        if formatter == 'black':
            formatted = _format_with_black(code, line_length)
        elif formatter == 'autopep8':
            formatted = _format_with_autopep8(code, line_length)
        else:
            return {
                "success": False,
                "formatted_code": code,
                "error": f"Unknown formatter: {formatter}"
            }

        return {
            "success": True,
            "formatted_code": formatted,
            "original_code": code
        }

    except ImportError as e:
        # Formatter not installed
        if skip_on_error:
            return {
                "success": True,
                "formatted_code": code,
                "warning": f"Formatter '{formatter}' not installed. Code returned unformatted. Error: {str(e)}"
            }
        else:
            return {
                "success": False,
                "formatted_code": code,
                "error": f"Formatter '{formatter}' not installed: {str(e)}"
            }

    except Exception as e:
        # Formatting error
        if skip_on_error:
            return {
                "success": True,
                "formatted_code": code,
                "warning": f"Formatting failed: {str(e)}. Original code returned."
            }
        else:
            return {
                "success": False,
                "formatted_code": code,
                "original_code": code,
                "error": f"Formatting failed: {str(e)}"
            }


def _format_with_black(code: str, line_length: int) -> str:
    """
    Format code using black.

    Args:
        code: Code to format
        line_length: Maximum line length

    Returns:
        Formatted code

    Raises:
        ImportError: If black is not installed
        Exception: If formatting fails
    """
    try:
        import black
        from black import Mode
    except ImportError:
        raise ImportError("black is not installed. Install it with: pip install black")

    try:
        # Use black's format_str function
        mode = Mode(line_length=line_length)
        formatted = black.format_str(code, mode=mode)
        return formatted
    except Exception as e:
        raise Exception(f"Black formatting failed: {str(e)}")


def _format_with_autopep8(code: str, line_length: int) -> str:
    """
    Format code using autopep8.

    Args:
        code: Code to format
        line_length: Maximum line length

    Returns:
        Formatted code

    Raises:
        ImportError: If autopep8 is not installed
        Exception: If formatting fails
    """
    try:
        import autopep8
    except ImportError:
        raise ImportError("autopep8 is not installed. Install it with: pip install autopep8")

    try:
        # Use autopep8's fix_code function
        formatted = autopep8.fix_code(
            code,
            options={
                'max_line_length': line_length,
                'aggressive': 1
            }
        )
        return formatted
    except Exception as e:
        raise Exception(f"autopep8 formatting failed: {str(e)}")


def main():
    """
    Main entry point for command-line usage.

    Expected input: JSON object with fields:
    - code: str (required)
    - formatter: str (optional, default: 'black')
    - line_length: int (optional, default: 88)
    - skip_on_error: bool (optional, default: true)

    Output: JSON object with formatting results
    """
    try:
        if len(sys.argv) > 1:
            # Simple mode: code provided as argument
            code = sys.argv[1]
            formatter = sys.argv[2] if len(sys.argv) > 2 else 'black'
            line_length = int(sys.argv[3]) if len(sys.argv) > 3 else 88
            skip_on_error = True
        else:
            # JSON mode: read from stdin
            input_data = json.loads(sys.stdin.read())
            code = input_data.get('code', '')
            formatter = input_data.get('formatter', 'black')
            line_length = input_data.get('line_length', 88)
            skip_on_error = input_data.get('skip_on_error', True)

        result = format_code(code, formatter, line_length, skip_on_error)
        print(json.dumps(result, indent=2))

    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "formatted_code": "",
            "error": f"Invalid JSON input: {str(e)}"
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "formatted_code": "",
            "error": f"Unexpected error: {str(e)}"
        }))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Python AST Analyzer for Code Analysis Engine

This module provides comprehensive AST-based analysis of Python functions,
including signature extraction, body analysis, class context, and more.
"""

import ast
import json
import sys
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict


@dataclass
class Parameter:
    """Represents a function parameter"""
    name: str
    type: Optional[str]
    default_value: Optional[str]
    kind: str  # 'positional', 'keyword', 'var_positional', 'var_keyword'


@dataclass
class FunctionSignature:
    """Function signature information"""
    name: str
    parameters: List[Dict[str, Any]]
    return_type: Optional[str]
    is_async: bool
    is_method: bool
    decorators: List[str]


@dataclass
class BranchInfo:
    """Information about a conditional branch"""
    type: str  # 'if', 'elif', 'else', 'match'
    condition: str
    line_number: int


@dataclass
class ExceptionInfo:
    """Information about exception handling"""
    type: str  # 'raise', 'try-except'
    exception_class: Optional[str]
    line_number: int
    context: str


@dataclass
class CallInfo:
    """Information about function/method calls"""
    function_name: str
    module: Optional[str]
    line_number: int
    is_builtin: bool


@dataclass
class FunctionBodyAnalysis:
    """Analysis of function body logic"""
    branches: List[Dict[str, Any]]
    exceptions: List[Dict[str, Any]]
    external_calls: List[Dict[str, Any]]
    complexity: int


@dataclass
class ClassContext:
    """Context information for class methods"""
    class_name: str
    base_classes: List[str]
    class_attributes: List[str]
    other_methods: List[str]
    is_dataclass: bool


@dataclass
class ImportInfo:
    """Import statement information"""
    module: str
    imported_names: List[str]
    alias: Optional[str]
    line_number: int


@dataclass
class Comment:
    """Inline comment information"""
    text: str
    line_number: int
    is_block_comment: bool


@dataclass
class DocumentationInfo:
    """Documentation and comments"""
    docstring: Optional[str]
    inline_comments: List[Dict[str, Any]]


@dataclass
class FunctionContext:
    """Complete function context for LLM analysis"""
    signature: Dict[str, Any]
    source_code: str
    body_analysis: Dict[str, Any]
    class_context: Optional[Dict[str, Any]]
    imports: List[Dict[str, Any]]
    documentation: Dict[str, Any]
    file_path: str
    module_path: str
    line_range: Tuple[int, int]


class PythonASTAnalyzer:
    """Main analyzer class for Python code"""

    BUILTIN_FUNCTIONS = {
        'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict',
        'set', 'tuple', 'bool', 'type', 'isinstance', 'hasattr', 'getattr',
        'setattr', 'delattr', 'all', 'any', 'sum', 'min', 'max', 'sorted',
        'enumerate', 'zip', 'map', 'filter', 'open', 'input', 'eval', 'exec'
    }

    def __init__(self, file_path: str):
        """Initialize analyzer with a Python file"""
        self.file_path = file_path
        with open(file_path, 'r', encoding='utf-8') as f:
            self.source_code = f.read()
        self.source_lines = self.source_code.split('\n')
        self.tree = ast.parse(self.source_code)

    def locate_function_node(
        self,
        function_name: str,
        line_number: Optional[int] = None
    ) -> Optional[ast.FunctionDef]:
        """
        Locate a function node in the AST

        Args:
            function_name: Name of the function to find
            line_number: Optional line number for disambiguation

        Returns:
            FunctionDef node or None if not found
        """
        candidates = []

        for node in ast.walk(self.tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if node.name == function_name:
                    candidates.append(node)

        if not candidates:
            return None

        if line_number is not None:
            # Find the function that contains or starts at the line number
            for candidate in candidates:
                if candidate.lineno == line_number:
                    return candidate
                # Check if line_number is within the function
                if hasattr(candidate, 'end_lineno'):
                    if candidate.lineno <= line_number <= candidate.end_lineno:
                        return candidate

        # Return the first candidate if no line number specified
        return candidates[0]

    def extract_function_signature(
        self,
        func_node: ast.FunctionDef
    ) -> FunctionSignature:
        """Extract function signature information"""
        parameters = []

        # Extract parameters
        args = func_node.args

        # Regular positional/keyword arguments
        for i, arg in enumerate(args.args):
            param_type = self._get_annotation(arg.annotation)
            default_value = None

            # Check if this arg has a default value
            default_offset = len(args.args) - len(args.defaults)
            if i >= default_offset:
                default_idx = i - default_offset
                default_value = ast.unparse(args.defaults[default_idx])

            kind = 'positional'
            if i >= len(args.args) - len(args.kw_defaults):
                kind = 'keyword'

            parameters.append({
                'name': arg.arg,
                'type': param_type,
                'default_value': default_value,
                'kind': kind
            })

        # *args
        if args.vararg:
            parameters.append({
                'name': args.vararg.arg,
                'type': self._get_annotation(args.vararg.annotation),
                'default_value': None,
                'kind': 'var_positional'
            })

        # **kwargs
        if args.kwarg:
            parameters.append({
                'name': args.kwarg.arg,
                'type': self._get_annotation(args.kwarg.annotation),
                'default_value': None,
                'kind': 'var_keyword'
            })

        # Extract return type
        return_type = self._get_annotation(func_node.returns)

        # Check if it's async
        is_async = isinstance(func_node, ast.AsyncFunctionDef)

        # Extract decorators
        decorators = [ast.unparse(dec) for dec in func_node.decorator_list]

        # Check if it's a method (has 'self' or 'cls' as first param)
        is_method = False
        if parameters and parameters[0]['name'] in ('self', 'cls'):
            is_method = True
            # Remove self/cls from parameters for cleaner output
            parameters = parameters[1:]

        return FunctionSignature(
            name=func_node.name,
            parameters=parameters,
            return_type=return_type,
            is_async=is_async,
            is_method=is_method,
            decorators=decorators
        )

    def analyze_function_body(
        self,
        func_node: ast.FunctionDef
    ) -> FunctionBodyAnalysis:
        """Analyze function body for branches, exceptions, and calls"""
        branches = []
        exceptions = []
        external_calls = []
        complexity = 1  # Base complexity

        # Walk through all nodes in function body
        match_node_type = getattr(ast, 'Match', None)

        for node in ast.walk(func_node):
            # Detect branches
            if isinstance(node, ast.If):
                condition = ast.unparse(node.test)
                branches.append({
                    'type': 'if',
                    'condition': condition,
                    'line_number': node.lineno
                })
                complexity += 1

            elif match_node_type and isinstance(node, match_node_type):
                branches.append({
                    'type': 'match',
                    'condition': ast.unparse(node.subject),
                    'line_number': node.lineno
                })
                complexity += len(node.cases)

            # Detect exceptions
            elif isinstance(node, ast.Raise):
                exc_class = None
                context = ""

                if node.exc:
                    exc_class = self._get_exception_name(node.exc)
                    context = ast.unparse(node.exc)

                exceptions.append({
                    'type': 'raise',
                    'exception_class': exc_class,
                    'line_number': node.lineno,
                    'context': context
                })

            elif isinstance(node, ast.Try):
                for handler in node.handlers:
                    exc_class = None
                    if handler.type:
                        exc_class = ast.unparse(handler.type)

                    exceptions.append({
                        'type': 'try-except',
                        'exception_class': exc_class,
                        'line_number': handler.lineno,
                        'context': f"except {exc_class}" if exc_class else "except"
                    })
                    complexity += 1

            # Detect function calls
            elif isinstance(node, ast.Call):
                call_info = self._extract_call_info(node)
                if call_info:
                    external_calls.append(call_info)

        return FunctionBodyAnalysis(
            branches=[asdict(b) if hasattr(b, '__dict__') else b for b in branches],
            exceptions=[asdict(e) if hasattr(e, '__dict__') else e for e in exceptions],
            external_calls=[asdict(c) if hasattr(c, '__dict__') else c for c in external_calls],
            complexity=complexity
        )

    def extract_class_context(
        self,
        func_node: ast.FunctionDef
    ) -> Optional[ClassContext]:
        """Extract class context if function is a method"""
        # Find the parent class node
        parent_class = None

        for node in ast.walk(self.tree):
            if isinstance(node, ast.ClassDef):
                # Check if func_node is in this class's body
                for item in node.body:
                    if item == func_node or (hasattr(item, 'lineno') and
                                            hasattr(func_node, 'lineno') and
                                            item.lineno == func_node.lineno):
                        parent_class = node
                        break

        if not parent_class:
            return None

        # Extract base classes
        base_classes = [ast.unparse(base) for base in parent_class.bases]

        # Extract class attributes (from __init__ and class-level)
        class_attributes = []
        for node in ast.walk(parent_class):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Attribute):
                        if isinstance(target.value, ast.Name) and target.value.id == 'self':
                            class_attributes.append(target.attr)
                    elif isinstance(target, ast.Name):
                        class_attributes.append(target.id)

        # Extract other method names
        other_methods = []
        for item in parent_class.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if item.name != func_node.name:
                    other_methods.append(item.name)

        # Check if it's a dataclass
        is_dataclass = any(
            ast.unparse(dec).startswith('dataclass')
            for dec in parent_class.decorator_list
        )

        return ClassContext(
            class_name=parent_class.name,
            base_classes=base_classes,
            class_attributes=list(set(class_attributes)),
            other_methods=other_methods,
            is_dataclass=is_dataclass
        )

    def extract_imports(self) -> List[ImportInfo]:
        """Extract all import statements from the file"""
        imports = []

        for node in ast.walk(self.tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(ImportInfo(
                        module=alias.name,
                        imported_names=['*'],
                        alias=alias.asname,
                        line_number=node.lineno
                    ))

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                imported_names = [alias.name for alias in node.names]

                # Check for aliases
                alias_name = None
                if len(node.names) == 1 and node.names[0].asname:
                    alias_name = node.names[0].asname

                imports.append(ImportInfo(
                    module=module,
                    imported_names=imported_names,
                    alias=alias_name,
                    line_number=node.lineno
                ))

        return imports

    def extract_documentation(
        self,
        func_node: ast.FunctionDef
    ) -> DocumentationInfo:
        """Extract docstring and comments from function"""
        # Extract docstring
        docstring = ast.get_docstring(func_node)

        # Extract inline comments (basic implementation)
        inline_comments = []

        if hasattr(func_node, 'lineno') and hasattr(func_node, 'end_lineno'):
            for i in range(func_node.lineno - 1, func_node.end_lineno):
                line = self.source_lines[i]
                if '#' in line:
                    comment_pos = line.find('#')
                    comment_text = line[comment_pos + 1:].strip()
                    if comment_text:
                        inline_comments.append({
                            'text': comment_text,
                            'line_number': i + 1,
                            'is_block_comment': False
                        })

        return DocumentationInfo(
            docstring=docstring,
            inline_comments=inline_comments
        )

    def get_function_source_code(self, func_node: ast.FunctionDef) -> str:
        """Extract the source code of a function"""
        if hasattr(func_node, 'lineno') and hasattr(func_node, 'end_lineno'):
            start = func_node.lineno - 1
            end = func_node.end_lineno
            return '\n'.join(self.source_lines[start:end])
        return ast.unparse(func_node)

    def build_function_context(
        self,
        function_name: str,
        line_number: Optional[int] = None
    ) -> Optional[FunctionContext]:
        """Build complete function context for LLM analysis"""
        # Locate function node
        func_node = self.locate_function_node(function_name, line_number)
        if not func_node:
            return None

        # Extract all information
        signature = self.extract_function_signature(func_node)
        source_code = self.get_function_source_code(func_node)
        body_analysis = self.analyze_function_body(func_node)
        class_context = self.extract_class_context(func_node)
        imports = self.extract_imports()
        documentation = self.extract_documentation(func_node)

        # Get module path
        module_path = self.file_path.replace('.py', '').replace('/', '.').replace('\\', '.')
        if module_path.startswith('.'):
            module_path = module_path[1:]

        # Get line range
        line_range = (
            func_node.lineno,
            func_node.end_lineno if hasattr(func_node, 'end_lineno') else func_node.lineno
        )

        return FunctionContext(
            signature=asdict(signature),
            source_code=source_code,
            body_analysis=asdict(body_analysis),
            class_context=asdict(class_context) if class_context else None,
            imports=[asdict(imp) for imp in imports],
            documentation=asdict(documentation),
            file_path=self.file_path,
            module_path=module_path,
            line_range=line_range
        )

    # Helper methods

    def _get_annotation(self, annotation) -> Optional[str]:
        """Convert annotation node to string"""
        if annotation is None:
            return None
        return ast.unparse(annotation)

    def _get_exception_name(self, exc_node) -> Optional[str]:
        """Extract exception class name from raise statement"""
        if isinstance(exc_node, ast.Name):
            return exc_node.id
        elif isinstance(exc_node, ast.Call):
            if isinstance(exc_node.func, ast.Name):
                return exc_node.func.id
        return None

    def _extract_call_info(self, call_node: ast.Call) -> Optional[Dict[str, Any]]:
        """Extract information about a function call"""
        function_name = None
        module = None

        if isinstance(call_node.func, ast.Name):
            function_name = call_node.func.id
        elif isinstance(call_node.func, ast.Attribute):
            function_name = call_node.func.attr
            if isinstance(call_node.func.value, ast.Name):
                module = call_node.func.value.id
        else:
            return None

        is_builtin = function_name in self.BUILTIN_FUNCTIONS

        return {
            'function_name': function_name,
            'module': module,
            'line_number': call_node.lineno,
            'is_builtin': is_builtin
        }


def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python ast_analyzer.py <file_path> <function_name> [line_number]'
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    function_name = sys.argv[2]
    line_number = int(sys.argv[3]) if len(sys.argv) > 3 else None

    try:
        analyzer = PythonASTAnalyzer(file_path)
        context = analyzer.build_function_context(function_name, line_number)

        if context:
            print(json.dumps(asdict(context), indent=2))
        else:
            print(json.dumps({
                'error': f'Function "{function_name}" not found in {file_path}'
            }))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'type': type(e).__name__
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

import * as vscode from 'vscode';
import { SymbolInfo } from '../services/ContextState';

/**
 * Extract all symbols from a Python document using VSCode LSP
 */
export async function extractSymbolsFromDocument(document: vscode.TextDocument): Promise<SymbolInfo[]> {
  try {
    // Use the VSCode LSP API to get document symbols
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      document.uri
    );

    if (!symbols || symbols.length === 0) {
      return [];
    }

    const extractedSymbols: SymbolInfo[] = [];
    
    // Recursively extract symbols from DocumentSymbol tree
    for (const symbol of symbols) {
      await extractSymbolsRecursive(symbol, extractedSymbols, document);
    }

    return extractedSymbols;
  } catch (error) {
    console.error('Error extracting symbols:', error);
    return [];
  }
}

/**
 * Recursively walk the symbol tree and extract function/class symbols
 */
async function extractSymbolsRecursive(
  symbol: vscode.DocumentSymbol,
  extractedSymbols: SymbolInfo[],
  document: vscode.TextDocument
): Promise<void> {
  const kind = getSymbolKind(symbol.kind);
  
  if (kind) {
    // Create function signature from details
    const signature = createSignature(symbol, document);
    
    // Extract function calls from the body
    const calls = await extractCallsFromRange(document, symbol.range);
    
    const symbolInfo: SymbolInfo = {
      name: symbol.name,
      kind,
      signature,
      line_start: symbol.range.start.line,
      line_end: symbol.range.end.line,
      calls,
      detail: symbol.detail || ''
    };
    
    extractedSymbols.push(symbolInfo);
  }
  
  // Recursively process children
  for (const child of symbol.children) {
    await extractSymbolsRecursive(child, extractedSymbols, document);
  }
}

/**
 * Convert VSCode symbol kind to our format
 */
function getSymbolKind(kind: vscode.SymbolKind): 'function' | 'class' | 'method' | null {
  switch (kind) {
    case vscode.SymbolKind.Function:
      return 'function';
    case vscode.SymbolKind.Class:
      return 'class';
    case vscode.SymbolKind.Method:
      return 'method';
    default:
      return null; // Skip other types
  }
}

/**
 * Create function signature from DocumentSymbol detail
 */
function createSignature(symbol: vscode.DocumentSymbol, document: vscode.TextDocument): string {
  // If symbol already has a signature-like detail, use it
  if (symbol.detail && (symbol.detail.includes('(') || symbol.detail.includes('->'))) {
    return symbol.detail;
  }
  
  // Otherwise, try to extract from the source
  try {
    const firstLine = document.lineAt(symbol.range.start.line).text.trim();
    
    // Look for function/class definition
    const match = firstLine.match(/(async\s+)?def\s+\w+\s*\([^)]*\)\s*(?:->\s*[^:]+)?:/);
    if (match) {
      const parts = firstLine.split(':');
      return parts[0] + ':'; // Return everything before the colon
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Simple extraction of function calls from code
 * This is a basic implementation - in a production system you'd use AST parsing
 */
async function extractCallsFromRange(document: vscode.TextDocument, range: vscode.Range): Promise<string[]> {
  const calls: string[] = [];
  const callPattern = /\b(\w+)\s*\(/g; // Match function_name(
  
  try {
    // Extract text from the range
    const startLine = range.start.line;
    const endLine = range.end.line;
    
    for (let lineNum = startLine; lineNum <= endLine && lineNum < document.lineCount; lineNum++) {
      const line = document.lineAt(lineNum).text;
      
      // Skip comments and docstrings
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || 
          trimmed.startsWith('"""') || 
          trimmed.startsWith("'''")) {
        continue;
      }
      
      // Find all function calls in the line
      let match;
      while ((match = callPattern.exec(line)) !== null) {
        const funcName = match[1];
        
        // Skip Python keywords and built-ins we don't want to track
        if (shouldSkipFunction(funcName)) {
          continue;
        }
        
        // Avoid duplicates
        if (!calls.includes(funcName)) {
          calls.push(funcName);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting calls:', error);
  }
  
  return calls;
}

/**
 * Determine if we should skip tracking this function call
 */
function shouldSkipFunction(name: string): boolean {
  // Skip Python keywords
  const pythonKeywords = ['if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from'];
  if (pythonKeywords.includes(name)) {
    return true;
  }
  
  // Skip common built-ins that aren't relevant for testing
  const skipBuiltins = ['print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'list', 'dict', 'set', 'int', 'str', 'float', 'bool'];
  if (skipBuiltins.includes(name)) {
    return true;
  }
  
  // Skip obvious method calls on self/cls
  if (name === 'self' || name === 'cls') {
    return true;
  }
  
  return false;
}

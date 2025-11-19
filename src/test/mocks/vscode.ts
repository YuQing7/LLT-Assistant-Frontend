/**
 * VSCode API Mocks for Unit Testing
 *
 * This module provides mock implementations of VSCode API objects
 * to enable unit testing without requiring the full VSCode environment.
 */

import { EventEmitter as NodeEventEmitter } from 'events';
import * as sinon from 'sinon';

/**
 * Mock Uri class
 */
export class Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;

  constructor(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    const url = new URL(value);
    return new Uri(
      url.protocol.replace(':', ''),
      url.hostname,
      url.pathname,
      url.search.replace('?', ''),
      url.hash.replace('#', '')
    );
  }

  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment
    );
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

/**
 * Mock Range class
 */
export class Range {
  start: Position;
  end: Position;

  constructor(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number
  ) {
    this.start = new Position(startLine, startCharacter);
    this.end = new Position(endLine, endCharacter);
  }

  isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Position) {
      return (
        positionOrRange.line >= this.start.line &&
        positionOrRange.line <= this.end.line
      );
    }
    return (
      this.contains(positionOrRange.start) &&
      this.contains(positionOrRange.end)
    );
  }
}

/**
 * Mock Position class
 */
export class Position {
  line: number;
  character: number;

  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other: Position): boolean {
    return (
      this.line < other.line ||
      (this.line === other.line && this.character < other.character)
    );
  }

  isAfter(other: Position): boolean {
    return !this.isBefore(other) && !this.isEqual(other);
  }
}

/**
 * Mock DiagnosticSeverity enum
 */
export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

/**
 * Mock Diagnostic class
 */
export class Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string | number;

  constructor(
    range: Range,
    message: string,
    severity: DiagnosticSeverity = DiagnosticSeverity.Error
  ) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

/**
 * Mock TextDocument
 */
export class MockTextDocument {
  uri: Uri;
  fileName: string;
  languageId: string;
  version: number;
  private _content: string;
  private _lines: string[];

  constructor(uri: Uri, content: string, languageId = 'python') {
    this.uri = uri;
    this.fileName = uri.fsPath;
    this.languageId = languageId;
    this.version = 1;
    this._content = content;
    this._lines = content.split('\n');
  }

  get lineCount(): number {
    return this._lines.length;
  }

  getText(range?: Range): string {
    if (!range) {
      return this._content;
    }
    const startOffset = this.offsetAt(range.start);
    const endOffset = this.offsetAt(range.end);
    return this._content.substring(startOffset, endOffset);
  }

  lineAt(position: number | Position): { text: string; range: Range } {
    const line =
      typeof position === 'number' ? position : position.line;
    const text = this._lines[line] || '';
    return {
      text,
      range: new Range(line, 0, line, text.length),
    };
  }

  offsetAt(position: Position): number {
    let offset = 0;
    for (let i = 0; i < position.line; i++) {
      offset += this._lines[i].length + 1; // +1 for newline
    }
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): Position {
    let currentOffset = 0;
    for (let line = 0; line < this._lines.length; line++) {
      const lineLength = this._lines[line].length + 1;
      if (currentOffset + lineLength > offset) {
        return new Position(line, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new Position(this._lines.length - 1, this._lines[this._lines.length - 1].length);
  }
}

/**
 * Mock TextEditor
 */
export class MockTextEditor {
  document: MockTextDocument;
  selection: { start: Position; end: Position };
  selections: { start: Position; end: Position }[];

  constructor(document: MockTextDocument) {
    this.document = document;
    this.selection = { start: new Position(0, 0), end: new Position(0, 0) };
    this.selections = [this.selection];
  }

  async edit(callback: (editBuilder: any) => void): Promise<boolean> {
    const editBuilder = {
      replace: sinon.stub(),
      insert: sinon.stub(),
      delete: sinon.stub(),
    };
    callback(editBuilder);
    return true;
  }
}

/**
 * Mock window namespace
 */
export const mockWindow = {
  showInformationMessage: sinon.stub().resolves(undefined),
  showWarningMessage: sinon.stub().resolves(undefined),
  showErrorMessage: sinon.stub().resolves(undefined),
  showQuickPick: sinon.stub().resolves(undefined),
  showInputBox: sinon.stub().resolves(undefined),
  createOutputChannel: sinon.stub().returns({
    appendLine: sinon.stub(),
    append: sinon.stub(),
    clear: sinon.stub(),
    show: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
  }),
  createStatusBarItem: sinon.stub().returns({
    text: '',
    tooltip: '',
    show: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
  }),
  createTreeView: sinon.stub().returns({
    reveal: sinon.stub(),
    dispose: sinon.stub(),
  }),
  activeTextEditor: undefined as MockTextEditor | undefined,
  visibleTextEditors: [] as MockTextEditor[],
  onDidChangeActiveTextEditor: new NodeEventEmitter().on.bind(new NodeEventEmitter()),
};

/**
 * Mock workspace namespace
 */
export const mockWorkspace = {
  getConfiguration: sinon.stub().returns({
    get: sinon.stub(),
    has: sinon.stub(),
    inspect: sinon.stub(),
    update: sinon.stub().resolves(),
  }),
  workspaceFolders: [] as any[],
  onDidChangeConfiguration: new NodeEventEmitter().on.bind(new NodeEventEmitter()),
  onDidSaveTextDocument: new NodeEventEmitter().on.bind(new NodeEventEmitter()),
  onDidOpenTextDocument: new NodeEventEmitter().on.bind(new NodeEventEmitter()),
  onDidCloseTextDocument: new NodeEventEmitter().on.bind(new NodeEventEmitter()),
  findFiles: sinon.stub().resolves([]),
  fs: {
    readFile: sinon.stub().resolves(Buffer.from('')),
    writeFile: sinon.stub().resolves(),
  },
  openTextDocument: sinon.stub().resolves(new MockTextDocument(Uri.file('/test.py'), '')),
};

/**
 * Mock languages namespace
 */
export const mockLanguages = {
  createDiagnosticCollection: sinon.stub().returns({
    set: sinon.stub(),
    delete: sinon.stub(),
    clear: sinon.stub(),
    forEach: sinon.stub(),
    get: sinon.stub(),
    has: sinon.stub(),
    dispose: sinon.stub(),
  }),
  registerCodeActionsProvider: sinon.stub().returns({ dispose: sinon.stub() }),
  registerHoverProvider: sinon.stub().returns({ dispose: sinon.stub() }),
};

/**
 * Mock commands namespace
 */
export const mockCommands = {
  registerCommand: sinon.stub().returns({ dispose: sinon.stub() }),
  executeCommand: sinon.stub().resolves(),
};

/**
 * Mock TreeItem
 */
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  label?: string;
  resourceUri?: Uri;
  iconPath?: any;
  command?: any;
  contextValue?: string;
  tooltip?: string;
  collapsibleState?: TreeItemCollapsibleState;

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

/**
 * Mock CodeAction
 */
export enum CodeActionKind {
  QuickFix = 'quickfix',
  Refactor = 'refactor',
  RefactorExtract = 'refactor.extract',
  RefactorInline = 'refactor.inline',
  RefactorRewrite = 'refactor.rewrite',
  Source = 'source',
  SourceOrganizeImports = 'source.organizeImports',
  SourceFixAll = 'source.fixAll',
}

export class CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  edit?: any;
  command?: any;

  constructor(title: string, kind?: CodeActionKind) {
    this.title = title;
    this.kind = kind;
  }
}

/**
 * Mock MarkdownString
 */
export class MarkdownString {
  value: string;
  isTrusted?: boolean;

  constructor(value: string = '', isTrustedOrOptions?: boolean | { supportThemeIcons?: boolean; isTrusted?: boolean }) {
    this.value = value;
    if (typeof isTrustedOrOptions === 'boolean') {
      this.isTrusted = isTrustedOrOptions;
    } else if (isTrustedOrOptions) {
      this.isTrusted = isTrustedOrOptions.isTrusted;
    }
  }

  appendText(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }

  appendCodeblock(value: string, language: string = ''): MarkdownString {
    this.value += `\`\`\`${language}\n${value}\n\`\`\`\n`;
    return this;
  }
}

/**
 * Mock ThemeColor
 */
export class ThemeColor {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

/**
 * Mock ThemeIcon
 */
export class ThemeIcon {
  id: string;
  color?: ThemeColor;

  constructor(id: string, color?: ThemeColor) {
    this.id = id;
    this.color = color;
  }

  static File = new ThemeIcon('file');
  static Folder = new ThemeIcon('folder');
}

/**
 * Mock VSCode EventEmitter
 * VSCode uses a different EventEmitter API than Node.js
 */
export class EventEmitter<T = any> {
  private listeners: Array<(e: T) => any> = [];

  get event() {
    return (listener: (e: T) => any, thisArgs?: any, disposables?: any[]): { dispose: () => void } => {
      this.listeners.push(listener);
      const dispose = () => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      };
      if (disposables) {
        disposables.push({ dispose });
      }
      return { dispose };
    };
  }

  fire(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

/**
 * Reset all mocks - call this in beforeEach
 */
export function resetAllMocks(): void {
  sinon.restore();
  mockWindow.showInformationMessage.reset();
  mockWindow.showWarningMessage.reset();
  mockWindow.showErrorMessage.reset();
  mockWindow.showQuickPick.reset();
  mockWindow.showInputBox.reset();
  mockWindow.createOutputChannel.reset();
  mockWindow.createStatusBarItem.reset();
  mockWindow.createTreeView.reset();
  mockWorkspace.getConfiguration.reset();
  mockWorkspace.findFiles.reset();
  mockWorkspace.openTextDocument.reset();
  mockLanguages.createDiagnosticCollection.reset();
  mockLanguages.registerCodeActionsProvider.reset();
  mockLanguages.registerHoverProvider.reset();
  mockCommands.registerCommand.reset();
  mockCommands.executeCommand.reset();
}

// Export namespace objects for `import * as vscode` pattern
export const window = mockWindow;
export const workspace = mockWorkspace;
export const languages = mockLanguages;
export const commands = mockCommands;

// Export as default for module replacement
export default {
  Uri,
  Range,
  Position,
  Diagnostic,
  DiagnosticSeverity,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  EventEmitter,
  TreeItem,
  TreeItemCollapsibleState,
  CodeAction,
  CodeActionKind,
  window: mockWindow,
  workspace: mockWorkspace,
  languages: mockLanguages,
  commands: mockCommands,
};

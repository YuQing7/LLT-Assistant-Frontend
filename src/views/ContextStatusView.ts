import * as vscode from 'vscode';
import { ContextState } from '../services/ContextState';

type ViewStatus = 
  | 'initializing'
  | 'waitingForLSP'
  | 'lspNotReady'
  | 'indexing'
  | 'indexed'
  | 'outdated'
  | 'notIndexed'
  | 'backendDown';

/**
 * Tree item for displaying context status
 */
class StatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconPath?: vscode.ThemeIcon | string,
    public readonly description?: string,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = this.description;
  }
}

/**
 * Tree data provider for LLT Context view
 */
export class ContextStatusView implements vscode.TreeDataProvider<StatusItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StatusItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  private status: ViewStatus = 'initializing';
  private currentProgress: { processed: number; total: number } | null = null;
  private indexingStartTime: number | null = null;

  constructor(private contextState: ContextState) {}

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Set the view's current status and refresh it
   */
  public setStatus(status: ViewStatus): void {
    this.status = status;
    if (status !== 'indexing') {
      this.currentProgress = null;
      this.indexingStartTime = null;
    }
    this.refresh();
  }

  /**
   * Set indexing progress
   */
  setIndexingProgress(processed: number, total: number): void {
    this.status = 'indexing';
    if (this.indexingStartTime === null) {
      this.indexingStartTime = Date.now();
    }
    this.currentProgress = { processed, total };
    this.refresh();
  }

  /**
   * Clear indexing progress and reset status based on cache state
   */
  clearIndexingProgress(): void {
    this.currentProgress = null;
    this.indexingStartTime = null;
    if (!this.contextState.isIndexed()) {
      this.status = 'notIndexed';
    } else if (!this.contextState.isValid()) {
      this.status = 'outdated';
    } else {
      this.status = 'indexed';
    }
    this.refresh();
  }

  getTreeItem(element: StatusItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StatusItem): Thenable<StatusItem[]> {
    if (!element) {
      return Promise.resolve(this.getRootItems());
    }
    return Promise.resolve([]);
  }

  private getRootItems(): StatusItem[] {
    switch (this.status) {
      case 'waitingForLSP':
        return [
          new StatusItem(
            'Waiting for LSP...',
            vscode.TreeItemCollapsibleState.None,
            new vscode.ThemeIcon('sync~spin'),
            'Language Server Protocol is starting up.',
            'waitingForLSP'
          )
        ];

      case 'lspNotReady':
        return [
          new StatusItem(
            'LSP Not Ready',
            vscode.TreeItemCollapsibleState.None,
            new vscode.ThemeIcon('warning'),
            'Could not detect the Python Language Server. Click to retry.',
            'lspNotReady'
          ),
          new StatusItem(
            '$(sync) [Retry Index]',
            vscode.TreeItemCollapsibleState.None,
            '',
            'Click to attempt indexing again',
            'retryIndex'
          )
        ];
      
      case 'backendDown':
        return [
            new StatusItem(
                'Backend Unavailable',
                vscode.TreeItemCollapsibleState.None,
                new vscode.ThemeIcon('error'),
                'Cannot connect to the LLT backend service.',
                'backendDown'
            )
        ];

      case 'indexing':
        if (this.currentProgress) {
          const { processed, total } = this.currentProgress;
          const percentage = total > 0 ? Math.floor((processed / total) * 100) : 0;
          const estimatedTime = this.calculateEstimatedTime(processed, total);
          return [
            new StatusItem(
              `Indexing... (${percentage}%)`,
              vscode.TreeItemCollapsibleState.None,
              new vscode.ThemeIcon('sync~spin'),
              `${processed}/${total} files • ${estimatedTime}`,
              'indexing'
            )
          ];
        }
        break;

      case 'notIndexed':
        return [
          new StatusItem(
            'Not Indexed',
            vscode.TreeItemCollapsibleState.None,
            new vscode.ThemeIcon('circle-outline'),
            'The project has not been indexed yet. Some features may be unavailable.',
            'notIndexed'
          )
        ];

      case 'outdated':
        return [
          new StatusItem(
            'Cache Outdated',
            vscode.TreeItemCollapsibleState.None,
            new vscode.ThemeIcon('warning'),
            'Project structure may have changed. Re-indexing is recommended.',
            'outdated'
          )
        ];

      case 'indexed':
        const cache = this.contextState.getCache();
        if (cache) {
          return [
            new StatusItem(
              'Status: Indexed',
              vscode.TreeItemCollapsibleState.None,
              new vscode.ThemeIcon('check'),
              'Project context is up-to-date.',
              'status'
            ),
            new StatusItem(
              `Files: ${this.formatNumber(cache.statistics.totalFiles)}`,
              vscode.TreeItemCollapsibleState.None,
              new vscode.ThemeIcon('file-code'),
              'Total number of indexed files.',
              'files'
            ),
            new StatusItem(
              `Symbols: ${this.formatNumber(cache.statistics.totalSymbols)}`,
              vscode.TreeItemCollapsibleState.None,
              new vscode.ThemeIcon('symbol-class'),
              'Total number of extracted symbols (classes, functions).',
              'symbols'
            ),
            new StatusItem(
              `Last Updated: ${this.formatTime(cache.lastIndexedAt)}`,
              vscode.TreeItemCollapsibleState.None,
              new vscode.ThemeIcon('clock'),
              `Last indexed on ${cache.lastIndexedAt.toLocaleString()}`,
              'lastUpdated'
            )
          ];
        }
        break;
    }
    
    // Default/initializing state
    return [
      new StatusItem(
        'Initializing...',
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('sync~spin'),
        'The LLT Assistant is starting up.',
        'initializing'
      )
    ];
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) { return 'Just now'; }
    if (diffMins < 60) { return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`; }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) { return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`; }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  private calculateEstimatedTime(processed: number, total: number): string {
    if (!this.indexingStartTime || processed === 0) {
      return 'Estimating...';
    }
    const elapsedMs = Date.now() - this.indexingStartTime;
    const rate = processed / elapsedMs; // items per millisecond
    const remainingItems = total - processed;
    const remainingMs = remainingItems / rate;
    const remainingSeconds = Math.round(remainingMs / 1000);

    if (remainingSeconds < 60) {
      return `${remainingSeconds}s remaining`;
    }
    return `${Math.ceil(remainingSeconds / 60)}m remaining`;
  }
}

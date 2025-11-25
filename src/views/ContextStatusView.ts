import * as vscode from 'vscode';
import { ContextState } from '../services/ContextState';

/**
 * Tree item for displaying context status
 */
class StatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconPath?: vscode.ThemeIcon,
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
  
  private indexingInProgress = false;
  private currentProgress: { processed: number; total: number } | null = null;

  constructor(private contextState: ContextState) {}

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Set indexing progress
   */
  setIndexingProgress(processed: number, total: number): void {
    this.indexingInProgress = true;
    this.currentProgress = { processed, total };
    this.refresh();
  }

  /**
   * Clear indexing progress
   */
  clearIndexingProgress(): void {
    this.indexingInProgress = false;
    this.currentProgress = null;
    this.refresh();
  }

  /**
   * Get tree item for rendering
   */
  getTreeItem(element: StatusItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of tree item
   */
  getChildren(element?: StatusItem): Thenable<StatusItem[]> {
    if (!element) {
      // Root level
      return Promise.resolve(this.getRootItems());
    }
    
    // No children for status items
    return Promise.resolve([]);
  }

  /**
   * Get root level items
   */
  private getRootItems(): StatusItem[] {
    // Check if indexing is in progress
    if (this.indexingInProgress && this.currentProgress) {
      const { processed, total } = this.currentProgress;
      const percentage = Math.floor((processed / total) * 100);
      const estimatedTime = this.calculateEstimatedTime(processed, total);
      
      return [
        new StatusItem(
          '$(sync~spin) Indexing...',
          vscode.TreeItemCollapsibleState.None,
          undefined,
          `${processed}/${total} (${percentage}%) • ${estimatedTime}`,
          'indexing'
        )
      ];
    }

    // Get cache state
    const cache = this.contextState.getCache();

    // Not indexed
    if (!cache || !this.contextState.isIndexed()) {
      return [
        new StatusItem(
          '$(circle-outline) Not indexed',
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon('circle-outline'),
          'Click "Re-index Project"',
          'notIndexed'
        )
      ];
    }

    // Check if cache is valid
    if (!this.contextState.isValid()) {
      return [
        new StatusItem(
          '$(warning) Cache outdated',
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon('warning'),
          'Re-index recommended',
          'outdated'
        )
      ];
    }

    // Show indexed status
    const statusIcon = new vscode.ThemeIcon('check');
    const filesIcon = new vscode.ThemeIcon('file');
    const symbolsIcon = new vscode.ThemeIcon('symbol-method');
    const clockIcon = new vscode.ThemeIcon('clock');

    const items = [
      new StatusItem(
        'Status',
        vscode.TreeItemCollapsibleState.None,
        statusIcon,
        'Indexed',
        'status'
      ),
      new StatusItem(
        'Files',
        vscode.TreeItemCollapsibleState.None,
        filesIcon,
        this.formatNumber(cache.statistics.totalFiles),
        'files'
      ),
      new StatusItem(
        'Symbols',
        vscode.TreeItemCollapsibleState.None,
        symbolsIcon,
        this.formatNumber(cache.statistics.totalSymbols),
        'symbols'
      ),
      new StatusItem(
        'Last Updated',
        vscode.TreeItemCollapsibleState.None,
        clockIcon,
        this.formatTime(cache.lastIndexedAt),
        'lastUpdated'
      )
    ];

    return items;
  }

  /**
   * Format number with commas
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Format time as relative string
   */
  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTime(processed: number, total: number): string {
    const remaining = total - processed;
    const rate = processed / (Date.now() - this.getStartTime()); // files per ms
    
    if (rate <= 0) {
      return 'Est: Calculating...';
    }
    
    const remainingMs = remaining / rate;
    const seconds = Math.floor(remainingMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s remaining`;
    } else {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m remaining`;
    }
  }

  /**
   * Get start time for indexing (approximate)
   */
  private getStartTime(): number {
    // This is approximate - in a real implementation, you'd track this more precisely
    return Date.now() - 10000; // Assume started 10 seconds ago
  }
}

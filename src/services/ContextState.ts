import * as vscode from 'vscode';

/**
 * Cached symbol information for a single file
 */
export interface SymbolInfo {
  name: string;
  kind: 'function' | 'class' | 'method';
  signature?: string;
  line_start: number;
  line_end: number;
  calls: string[];
  detail?: string;
}

/**
 * Serialized version stored in Memento
 */
interface SerializedCache {
  projectId: string;
  workspacePath: string;
  lastIndexedAt: string; // ISO timestamp
  version: number;
  backendVersion: number;
  fileSymbols: Record<string, SymbolInfo[]>;
  statistics: {
    totalFiles: number;
    totalSymbols: number;
  };
}

/**
 * Internal cache structure with full functionality
 */
interface ProjectCache {
  projectId: string;
  workspacePath: string;
  lastIndexedAt: Date;
  version: number; // Schema version for migrations
  backendVersion: number; // Backend's optimistic lock version
  fileSymbols: Map<string, SymbolInfo[]>; // filePath -> symbols
  statistics: {
    totalFiles: number;
    totalSymbols: number;
  };
}

/**
 * Current schema version - increment when changing cache structure
 */
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Maximum cache age in milliseconds (30 days)
 */
const MAX_CACHE_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * Centralized state management for project context
 * Handles cache persistence, validation, and migrations
 */
export class ContextState {
  private readonly CACHE_KEY = 'llt.projectCache';
  private cache: ProjectCache | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Load cache from VSCode workspace state
   */
  async load(): Promise<ProjectCache | null> {
    try {
      const data = this.context.workspaceState.get<SerializedCache>(this.CACHE_KEY);
      
      if (!data) {
        return null;
      }

      // Validate basic structure
      if (!data.projectId || !data.workspacePath || !data.lastIndexedAt) {
        console.warn('[LLT ContextState] Corrupted cache structure, resetting');
        await this.clear();
        return null;
      }

      // Deserialize from Object back to Map
      const fileSymbols = new Map<string, SymbolInfo[]>();
      if (data.fileSymbols) {
        for (const [path, symbols] of Object.entries(data.fileSymbols)) {
          fileSymbols.set(path, symbols);
        }
      }

      // Check schema version and migrate if needed
      const migrated = await this.migrateIfNeeded(data);
      
      this.cache = {
        projectId: migrated.projectId,
        workspacePath: migrated.workspacePath,
        lastIndexedAt: new Date(migrated.lastIndexedAt),
        version: migrated.version,
        backendVersion: migrated.backendVersion,
        fileSymbols,
        statistics: migrated.statistics || {
          totalFiles: 0,
          totalSymbols: 0
        }
      };

      console.log(`[LLT ContextState] Cache loaded: ${migrated.statistics.totalFiles} files, ${migrated.statistics.totalSymbols} symbols`);
      return this.cache;
    } catch (error) {
      console.error('[LLT ContextState] Error loading cache:', error);
      await this.clear();
      return null;
    }
  }

  /**
   * Save cache to VSCode workspace state
   */
  async save(): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      // Serialize Map to Object
      const fileSymbols: Record<string, SymbolInfo[]> = {};
      for (const [path, symbols] of this.cache.fileSymbols.entries()) {
        fileSymbols[path] = symbols;
      }

      const data: SerializedCache = {
        projectId: this.cache.projectId,
        workspacePath: this.cache.workspacePath,
        lastIndexedAt: this.cache.lastIndexedAt.toISOString(),
        version: this.cache.version,
        backendVersion: this.cache.backendVersion,
        fileSymbols,
        statistics: this.cache.statistics
      };

      await this.context.workspaceState.update(this.CACHE_KEY, data);
      console.log('[LLT ContextState] Cache saved to workspace state');
    } catch (error) {
      console.error('[LLT ContextState] Error saving cache:', error);
      throw error;
    }
  }

  /**
   * Check if cache is valid and can be used
   */
  isValid(): boolean {
    if (!this.cache) {
      console.log('[LLT ContextState] Cache invalid: empty cache');
      return false;
    }

    // Check 1: Schema version
    if (this.cache.version !== CURRENT_SCHEMA_VERSION) {
      console.log('[LLT ContextState] Cache invalid: schema version mismatch');
      return false;
    }

    // Check 2: Workspace path (handle case when no workspace is open)
    const currentWorkspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (currentWorkspacePath && this.cache.workspacePath !== currentWorkspacePath) {
      console.log('[LLT ContextState] Cache invalid: workspace path changed');
      return false;
    }

    // Check 3: Age (optional, can be disabled)
    const age = Date.now() - this.cache.lastIndexedAt.getTime();
    if (age > MAX_CACHE_AGE) {
      console.log('[LLT ContextState] Cache invalid: too old (>30 days)');
      return false;
    }

    console.log('[LLT ContextState] Cache is valid');
    return true;
  }

  /**
   * Get all symbols for a specific file
   */
  getSymbols(filePath: string): SymbolInfo[] | undefined {
    return this.cache?.fileSymbols.get(filePath);
  }

  /**
   * Set symbols for a specific file and update statistics
   */
  setSymbols(filePath: string, symbols: SymbolInfo[]): void {
    if (!this.cache) {
      throw new Error('Cache not initialized');
    }

    // Remove old stats if updating existing file
    const oldSymbols = this.cache.fileSymbols.get(filePath);
    if (oldSymbols) {
      this.cache.statistics.totalSymbols -= oldSymbols.length;
      this.cache.statistics.totalFiles -= 1;
    }

    // Set new symbols
    this.cache.fileSymbols.set(filePath, symbols);
    this.cache.statistics.totalSymbols += symbols.length;
    this.cache.statistics.totalFiles += 1;
  }

  /**
   * Remove a file and update statistics
   */
  removeFile(filePath: string): void {
    if (!this.cache) {
      return;
    }

    const symbols = this.cache.fileSymbols.get(filePath);
    if (symbols) {
      this.cache.fileSymbols.delete(filePath);
      this.cache.statistics.totalFiles -= 1;
      this.cache.statistics.totalSymbols -= symbols.length;
    }
  }

  /**
   * Check if project has been indexed
   */
  isIndexed(): boolean {
    return this.cache !== null && this.cache.statistics.totalFiles > 0;
  }

  /**
   * Get current cache version
   */
  getVersion(): number {
    if (!this.cache) {
      throw new Error('Cache not initialized');
    }
    return this.cache.backendVersion;
  }

  /**
   * Set backend version (for optimistic locking)
   */
  setVersion(version: number): void {
    if (!this.cache) {
      throw new Error('Cache not initialized');
    }
    this.cache.backendVersion = version;
  }

  /**
   * Get project ID
   */
  getProjectId(): string | undefined {
    return this.cache?.projectId;
  }

  /**
   * Set project ID
   */
  setProjectId(projectId: string): void {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    
    if (!this.cache) {
      this.cache = {
        projectId,
        workspacePath,
        lastIndexedAt: new Date(),
        version: CURRENT_SCHEMA_VERSION,
        backendVersion: 0,
        fileSymbols: new Map(),
        statistics: { totalFiles: 0, totalSymbols: 0 }
      };
    } else {
      this.cache.projectId = projectId;
      this.cache.workspacePath = workspacePath;
      this.cache.lastIndexedAt = new Date();
    }
  }

  /**
   * Get the entire cache
   */
  getCache(): ProjectCache | null {
    return this.cache;
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    console.log('[LLT ContextState] Clearing cache');
    this.cache = null;
    await this.context.workspaceState.update(this.CACHE_KEY, undefined);
  }

  /**
   * Update last indexed timestamp
   */
  updateLastIndexedAt(): void {
    if (this.cache) {
      this.cache.lastIndexedAt = new Date();
    }
  }

  /**
   * Migrate old cache versions to current version
   */
  private async migrateIfNeeded(data: any): Promise<SerializedCache> {
    if (data.version === CURRENT_SCHEMA_VERSION) {
      return data;
    }

    console.log(`[LLT ContextState] Migrating cache from v${data.version} to v${CURRENT_SCHEMA_VERSION}`);
    
    // In Phase 1, we only have version 1, so no migrations needed yet
    // This is a placeholder for future phases
    
    const migrated = {
      ...data,
      version: CURRENT_SCHEMA_VERSION,
      backendVersion: data.backendVersion || 0,
      fileSymbols: data.fileSymbols || {},
      statistics: data.statistics || { totalFiles: 0, totalSymbols: 0 }
    } as SerializedCache;

    // Save migrated cache immediately
    await this.context.workspaceState.update(this.CACHE_KEY, migrated);
    console.log('[LLT ContextState] Migration complete');
    
    return migrated;
  }

  /**
   * Recalculate statistics from file symbols
   */
  async recalculateStatistics(): Promise<void> {
    if (!this.cache) {
      return;
    }

    let totalFiles = 0;
    let totalSymbols = 0;

    for (const symbols of this.cache.fileSymbols.values()) {
      totalFiles += 1;
      totalSymbols += symbols.length;
    }

    this.cache.statistics = {
      totalFiles,
      totalSymbols
    };

    console.log(`[LLT ContextState] Statistics recalculated: ${totalFiles} files, ${totalSymbols} symbols`);
  }
}
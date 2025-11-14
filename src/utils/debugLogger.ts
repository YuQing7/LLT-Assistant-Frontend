/**
 * Debug logger utility for capturing LLM exchanges.
 *
 * When the environment variable `LLT_ASSISTANT_DEBUG_LOGS` is set to a truthy value,
 * this module writes structured JSON snapshots of prompts, responses, and parsing
 * results to the `llt-debug` directory in the current working directory.
 */

import * as fs from 'fs';
import * as path from 'path';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type DebugSnapshotType = 'request' | 'response' | 'parsed' | 'error';

const DEBUG_ENV_VAR = 'LLT_ASSISTANT_DEBUG_LOGS';
const DEFAULT_DEBUG_DIR = 'llt-debug';

/**
 * Write a debug snapshot to disk when debug logging is enabled.
 *
 * @param stage - Identifier for the pipeline stage (e.g., "stage1", "stage2")
 * @param type - Snapshot type (request, response, parsed, error)
 * @param data - Arbitrary debug payload that will be serialized to JSON
 * @returns Absolute file path if a file was written; otherwise undefined
 */
export function writeDebugSnapshot(
  stage: string,
  type: DebugSnapshotType,
  data: Record<string, unknown>
): string | undefined {
  if (!process.env[DEBUG_ENV_VAR]) {
    return undefined;
  }

  try {
    const targetDir = resolveDebugDir();
    fs.mkdirSync(targetDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${stage}-${type}.json`;
    const filePath = path.join(targetDir, filename);

    const payload = {
      stage,
      type,
      timestamp,
      data: sanitizeForJson(data)
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return filePath;
  } catch (error) {
    console.warn('[LLT Assistant] Failed to write debug snapshot:', error);
    return undefined;
  }
}

function resolveDebugDir(): string {
  const customDir = process.env.LLT_ASSISTANT_DEBUG_DIR;
  if (customDir && customDir.trim().length > 0) {
    return path.isAbsolute(customDir)
      ? customDir
      : path.resolve(process.cwd(), customDir);
  }

  return path.resolve(process.cwd(), DEFAULT_DEBUG_DIR);
}

function sanitizeForJson(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack || null
    };
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForJson(item)) as JsonValue;
  }

  if (typeof value === 'object') {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeForJson(val);
    }
    return result;
  }

  return String(value) as JsonValue;
}

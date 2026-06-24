/**
 * @file Durable persistence for long-lived OAuth refresh tokens
 * @module server/token-store
 *
 * @remarks
 * The OAuth provider keeps short-lived state (pending authorizations,
 * authorization codes) in memory only, but the long-lived refresh tokens
 * — which wrap the Spotify refresh token — must survive process restarts
 * (e.g. Coolify redeploys). This module persists the `refreshTokens` map to
 * a JSON file on disk.
 *
 * Design:
 * - Path comes from `AUTH_STORE_PATH` (default `./data/auth-store.json`).
 * - Loaded synchronously on startup; robust to a missing/corrupt file
 *   (falls back to an empty store).
 * - Written on every change (small data, infrequent writes). Writes are
 *   atomic (temp file + rename) so a crash mid-write cannot corrupt the
 *   store.
 * - Dependency-light: Node `fs` only. No SQLite/Redis.
 *
 * SECURITY: the JSON file contains Spotify refresh tokens (long-lived
 * secrets). The directory holding it should be a private, persistent volume
 * with restricted permissions.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname } from 'path';

export interface PersistedRefreshTokenData {
  userId: string;
  clientId: string;
  spotifyTokens: { accessToken: string; refreshToken: string };
  expiresAt: number;
}

interface PersistedShape {
  version: 1;
  refreshTokens: Record<string, PersistedRefreshTokenData>;
}

const DEFAULT_PATH = './data/auth-store.json';

export class TokenStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || process.env.AUTH_STORE_PATH || DEFAULT_PATH;
  }

  /**
   * Loads the persisted refresh-token map from disk.
   *
   * @remarks
   * Returns an empty Map if the file is missing, unreadable, or corrupt so
   * the server always starts cleanly. Expired tokens are pruned on load.
   *
   * @returns Map keyed by MCP refresh token id
   */
  load(): Map<string, PersistedRefreshTokenData> {
    const result = new Map<string, PersistedRefreshTokenData>();
    try {
      if (!existsSync(this.filePath)) {
        return result;
      }
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedShape>;
      const entries = parsed?.refreshTokens;
      if (!entries || typeof entries !== 'object') {
        return result;
      }
      const now = Date.now();
      for (const [id, data] of Object.entries(entries)) {
        // Skip anything malformed or already expired.
        if (
          data &&
          typeof data.userId === 'string' &&
          typeof data.clientId === 'string' &&
          data.spotifyTokens &&
          typeof data.spotifyTokens.accessToken === 'string' &&
          typeof data.spotifyTokens.refreshToken === 'string' &&
          typeof data.expiresAt === 'number' &&
          data.expiresAt > now
        ) {
          result.set(id, data);
        }
      }
      console.log(`🔐 Loaded ${result.size} refresh token(s) from ${this.filePath}`);
    } catch (error) {
      console.error(
        `⚠️ Failed to load auth store from ${this.filePath}; starting empty:`,
        error instanceof Error ? error.message : String(error),
      );
    }
    return result;
  }

  /**
   * Persists the refresh-token map to disk atomically.
   *
   * @param refreshTokens - Current in-memory refresh-token map
   */
  save(refreshTokens: Map<string, PersistedRefreshTokenData>): void {
    try {
      const dir = dirname(this.filePath);
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const shape: PersistedShape = {
        version: 1,
        refreshTokens: Object.fromEntries(refreshTokens),
      };
      // Atomic write: write to a temp file then rename over the target.
      const tmpPath = `${this.filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(shape, null, 2), { encoding: 'utf8', mode: 0o600 });
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      console.error(
        `⚠️ Failed to persist auth store to ${this.filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

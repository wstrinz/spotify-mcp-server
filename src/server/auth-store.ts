/**
 * @file Simple auth store for session management
 * @module server/auth-store
 * 
 * @remarks
 * This module provides a simple store for auth info that can be accessed
 * by handlers that need authentication context.
 */

import type { SpotifyAuthInfo } from '../types.js';

// Simple in-memory store for auth info
const authMap = new Map<string, SpotifyAuthInfo>();

// Current auth info for the active session (simplified approach)
let currentAuthInfo: SpotifyAuthInfo | null = null;

/**
 * Store auth info for a session
 */
export function setAuth(sessionId: string, authInfo: SpotifyAuthInfo): void {
  authMap.set(sessionId, authInfo);
  currentAuthInfo = authInfo; // Set as current for tools to access
}

/**
 * Get auth info for a session
 */
export function getAuth(sessionId: string): SpotifyAuthInfo | undefined {
  return authMap.get(sessionId);
}

/**
 * Get current auth info (simplified access for tools)
 */
export function getCurrentAuth(): SpotifyAuthInfo | null {
  return currentAuthInfo;
}

/**
 * Update current auth info (for token refreshes)
 */
export function updateCurrentAuth(newAuthInfo: SpotifyAuthInfo): void {
  currentAuthInfo = newAuthInfo;
  // Also update in the map if there's a session
  for (const [sessionId, _] of authMap) {
    authMap.set(sessionId, newAuthInfo);
    break; // Update the first (current) session
  }
}

/**
 * Remove auth info for a session
 */
export function removeAuth(sessionId: string): void {
  authMap.delete(sessionId);
  // If this was the current auth, clear it
  if (currentAuthInfo && authMap.size === 0) {
    currentAuthInfo = null;
  }
}

/**
 * Clear all auth info
 */
export function clearAuth(): void {
  authMap.clear();
  currentAuthInfo = null;
}

// Export as a module
export const authStore = {
  setAuth,
  getAuth,
  getCurrentAuth,
  updateCurrentAuth,
  removeAuth,
  clear: clearAuth,
};
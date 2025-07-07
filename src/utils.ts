import { SpotifyApi } from '@spotify/web-api-ts-sdk';

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function loadSpotifyConfig(): SpotifyConfig {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Spotify configuration missing. Please provide environment variables: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URL'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, '0')}`;
}

/**
 * Handle Spotify request with authenticated user tokens from OAuth
 */
export async function handleAuthenticatedSpotifyRequest<T>(
  spotifyAccessToken: string,
  spotifyRefreshToken: string | undefined,
  action: (spotifyApi: SpotifyApi) => Promise<T>,
): Promise<T> {
  const config = loadSpotifyConfig();
  const startTime = Date.now();
  
  // Extract request info for logging
  const actionString = action.toString();
  let requestInfo = 'Unknown';
  
  // Parse common Spotify API patterns
  if (actionString.includes('getCurrentlyPlayingTrack')) {
    requestInfo = 'GET /me/player/currently-playing';
  } else if (actionString.includes('skipToNext')) {
    requestInfo = 'POST /me/player/next';
  } else if (actionString.includes('skipToPrevious')) {
    requestInfo = 'POST /me/player/previous';
  } else if (actionString.includes('startResumePlayback')) {
    requestInfo = 'PUT /me/player/play';
  } else if (actionString.includes('pausePlayback')) {
    requestInfo = 'PUT /me/player/pause';
  } else if (actionString.includes('addItemToPlaybackQueue')) {
    requestInfo = 'POST /me/player/queue';
  } else if (actionString.includes('createPlaylist')) {
    requestInfo = 'POST /users/{user_id}/playlists';
  } else if (actionString.includes('addItemsToPlaylist')) {
    requestInfo = 'POST /playlists/{playlist_id}/tracks';
  } else if (actionString.includes('updatePlaylistItems')) {
    requestInfo = 'PUT /playlists/{playlist_id}/tracks';
  } else if (actionString.includes('playlists.playlists')) {
    requestInfo = 'GET /me/playlists';
  } else if (actionString.includes('getPlaylistItems')) {
    requestInfo = 'GET /playlists/{playlist_id}/tracks';
  } else if (actionString.includes('getRecentlyPlayedTracks')) {
    requestInfo = 'GET /me/player/recently-played';
  } else if (actionString.includes('savedTracks')) {
    requestInfo = 'GET /me/tracks';
  } else if (actionString.includes('.search(')) {
    requestInfo = 'GET /search';
  }
  
  try {
    const accessTokenObject = {
      access_token: spotifyAccessToken,
      token_type: 'Bearer' as const,
      expires_in: 3600,
      refresh_token: spotifyRefreshToken || '',
    };

    const spotifyApi = SpotifyApi.withAccessToken(config.clientId, accessTokenObject);
    const result = await action(spotifyApi);
    const duration = Date.now() - startTime;
    console.log(`✅ Spotify API ${requestInfo} completed | ${duration}ms`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Skip JSON parsing errors as these are actually successful operations
    if (
      errorMessage.includes('Unexpected token') ||
      errorMessage.includes('Unexpected non-whitespace character') ||
      errorMessage.includes('Exponent part is missing a number in JSON')
    ) {
      return undefined as T;
    }

    // Check if it's a token expiration error and we have a refresh token
    if (
      spotifyRefreshToken &&
      (errorMessage.includes('Bad or expired token') ||
       errorMessage.includes('The access token expired') ||
       errorMessage.includes('401'))
    ) {
      console.log('OAuth access token expired, attempting to refresh...');
      try {
        const newTokens = await refreshOAuthSpotifyToken(spotifyRefreshToken, config);
        
        // Update the auth store with new tokens
        const { getCurrentAuth, updateCurrentAuth } = await import('./server/auth-store.js');
        const currentAuth = getCurrentAuth();
        if (currentAuth) {
          updateCurrentAuth({
            ...currentAuth,
            spotifyAccessToken: newTokens.access_token,
            spotifyRefreshToken: newTokens.refresh_token || currentAuth.spotifyRefreshToken,
          });
          console.log(`✅ OAuth tokens refreshed for ${requestInfo} | auth store updated`);
        }
        
        // Retry the original request with fresh token
        const newAccessTokenObject = {
          access_token: newTokens.access_token,
          token_type: 'Bearer' as const,
          expires_in: 3600,
          refresh_token: newTokens.refresh_token || spotifyRefreshToken,
        };
        
        const newSpotifyApi = SpotifyApi.withAccessToken(config.clientId, newAccessTokenObject);
        return await action(newSpotifyApi);
      } catch (refreshError) {
        throw new Error(
          `OAuth token refresh failed: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}. Please re-authenticate.`,
        );
      }
    }

    // Rethrow other errors
    const duration = Date.now() - startTime;
    console.log(`❌ Spotify API ${requestInfo} failed | ${duration}ms | Error: ${errorMessage}`);
    throw error;
  }
}

/**
 * Refresh OAuth Spotify tokens
 */
async function refreshOAuthSpotifyToken(
  refreshToken: string,
  config: SpotifyConfig,
): Promise<{ access_token: string; refresh_token?: string }> {
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to refresh OAuth token: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // May or may not be rotated
  };
}
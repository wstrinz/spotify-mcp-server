import { z } from 'zod';
import type { SpotifyHandlerExtra, tool } from './types.js';
import { handleSpotifyRequest, handleAuthenticatedSpotifyRequest } from './utils.js';
import { getCurrentAuth } from './server/auth-store.js';

const playMusic: tool<{
  uri: z.ZodOptional<z.ZodString>;
  type: z.ZodOptional<z.ZodEnum<['track', 'album', 'artist', 'playlist']>>;
  id: z.ZodOptional<z.ZodString>;
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'playMusic',
  description: 'Start playing a Spotify track, album, artist, or playlist',
  schema: {
    uri: z
      .string()
      .optional()
      .describe('The Spotify URI to play (overrides type and id)'),
    type: z
      .enum(['track', 'album', 'artist', 'playlist'])
      .optional()
      .describe('The type of item to play'),
    id: z.string().optional().describe('The Spotify ID of the item to play'),
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to play on'),
  },
  handler: async (args, extra: SpotifyHandlerExtra) => {
    const { uri, type, id, deviceId } = args;

    if (!(uri || (type && id))) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Must provide either a URI or both a type and ID',
            isError: true,
          },
        ],
      };
    }

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    let spotifyUri = uri;
    if (!spotifyUri && type && id) {
      spotifyUri = `spotify:${type}:${id}`;
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        const device = deviceId || '';

        if (!spotifyUri) {
          await spotifyApi.player.startResumePlayback(device);
          return;
        }

        if (type === 'track') {
          await spotifyApi.player.startResumePlayback(device, undefined, [
            spotifyUri,
          ]);
        } else {
          await spotifyApi.player.startResumePlayback(device, spotifyUri);
        }
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: `Started playing ${type || 'music'} ${id ? `(ID: ${id})` : ''}`,
        },
      ],
    };
  },
};

const pausePlayback: tool<{
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'pausePlayback',
  description: 'Pause Spotify playback on the active device',
  schema: {
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to pause playback on'),
  },
  handler: async (args, extra: SpotifyHandlerExtra) => {
    const { deviceId } = args;

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        await spotifyApi.player.pausePlayback(deviceId || '');
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: 'Playback paused',
        },
      ],
    };
  },
};

const skipToNext: tool<{
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'skipToNext',
  description: 'Skip to the next track in the current Spotify playback queue',
  schema: {
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to skip on'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { deviceId } = args;

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        await spotifyApi.player.skipToNext(deviceId || '');
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: 'Skipped to next track',
        },
      ],
    };
  },
};

const skipToPrevious: tool<{
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'skipToPrevious',
  description:
    'Skip to the previous track in the current Spotify playback queue',
  schema: {
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to skip on'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { deviceId } = args;

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        await spotifyApi.player.skipToPrevious(deviceId || '');
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: 'Skipped to previous track',
        },
      ],
    };
  },
};

const createPlaylist: tool<{
  name: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
  public: z.ZodOptional<z.ZodBoolean>;
}> = {
  name: 'createPlaylist',
  description: 'Create a new playlist on Spotify',
  schema: {
    name: z.string().describe('The name of the playlist'),
    description: z
      .string()
      .optional()
      .describe('The description of the playlist'),
    public: z
      .boolean()
      .optional()
      .describe('Whether the playlist should be public'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { name, description, public: isPublic = false } = args;

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    const result = await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        const me = await spotifyApi.currentUser.profile();

        return await spotifyApi.playlists.createPlaylist(me.id, {
          name,
          description,
          public: isPublic,
        });
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created playlist "${name}"\nPlaylist ID: ${result.id}`,
        },
      ],
    };
  },
};

const addTracksToPlaylist: tool<{
  playlistId: z.ZodString;
  trackIds: z.ZodArray<z.ZodString>;
  position: z.ZodOptional<z.ZodNumber>;
}> = {
  name: 'addTracksToPlaylist',
  description: 'Add tracks to a Spotify playlist',
  schema: {
    playlistId: z.string().describe('The Spotify ID of the playlist'),
    trackIds: z.array(z.string()).describe('Array of Spotify track IDs to add'),
    position: z
      .number()
      .nonnegative()
      .optional()
      .describe('Position to insert the tracks (0-based index)'),
  },
  handler: async (args, extra: SpotifyHandlerExtra) => {
    const { playlistId, trackIds, position } = args;

    if (trackIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No track IDs provided',
          },
        ],
      };
    }

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    try {
      const trackUris = trackIds.map((id) => `spotify:track:${id}`);

      await handleAuthenticatedSpotifyRequest(
        authInfo.spotifyAccessToken,
        authInfo.spotifyRefreshToken,
        async (spotifyApi) => {
          await spotifyApi.playlists.addItemsToPlaylist(
            playlistId,
            trackUris,
            position,
          );
        },
      );

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added ${trackIds.length} track${
              trackIds.length === 1 ? '' : 's'
            } to playlist (ID: ${playlistId})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error adding tracks to playlist: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

const resumePlayback: tool<{
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'resumePlayback',
  description: 'Resume Spotify playback on the active device',
  schema: {
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to resume playback on'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { deviceId } = args;

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        await spotifyApi.player.startResumePlayback(deviceId || '');
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: 'Playback resumed',
        },
      ],
    };
  },
};

const addToQueue: tool<{
  uri: z.ZodOptional<z.ZodString>;
  type: z.ZodOptional<z.ZodEnum<['track', 'album', 'artist', 'playlist']>>;
  id: z.ZodOptional<z.ZodString>;
  deviceId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'addToQueue',
  description: 'Adds a track, album, artist or playlist to the playback queue',
  schema: {
    uri: z
      .string()
      .optional()
      .describe('The Spotify URI to play (overrides type and id)'),
    type: z
      .enum(['track', 'album', 'artist', 'playlist'])
      .optional()
      .describe('The type of item to play'),
    id: z.string().optional().describe('The Spotify ID of the item to play'),
    deviceId: z
      .string()
      .optional()
      .describe('The Spotify device ID to add the track to'),
  },
  handler: async (args) => {
    const { uri, type, id, deviceId } = args;

    let spotifyUri = uri;
    if (!spotifyUri && type && id) {
      spotifyUri = `spotify:${type}:${id}`;
    }

    if (!spotifyUri) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Must provide either a URI or both a type and ID',
            isError: true,
          },
        ],
      };
    }

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    await handleAuthenticatedSpotifyRequest(
      authInfo.spotifyAccessToken,
      authInfo.spotifyRefreshToken,
      async (spotifyApi) => {
        await spotifyApi.player.addItemToPlaybackQueue(
          spotifyUri,
          deviceId || '',
        );
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: `Added item ${spotifyUri} to queue`,
        },
      ],
    };
  },
};

const reorderPlaylistTracks: tool<{
  playlistId: z.ZodString;
  rangeStart: z.ZodNumber;
  insertBefore: z.ZodNumber;
  rangeLength: z.ZodOptional<z.ZodNumber>;
  snapshotId: z.ZodOptional<z.ZodString>;
}> = {
  name: 'reorderPlaylistTracks',
  description:
    'Reorder tracks in a Spotify playlist by moving a range of tracks to a new position',
  schema: {
    playlistId: z.string().describe('The Spotify ID of the playlist'),
    rangeStart: z
      .number()
      .nonnegative()
      .describe('Position of the first track to reorder (0-based index)'),
    insertBefore: z
      .number()
      .nonnegative()
      .describe('Position where tracks should be inserted (0-based index)'),
    rangeLength: z
      .number()
      .positive()
      .optional()
      .describe('Number of tracks to reorder (defaults to 1)'),
    snapshotId: z
      .string()
      .optional()
      .describe('Playlist snapshot ID for version control'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const {
      playlistId,
      rangeStart,
      insertBefore,
      rangeLength = 1,
      snapshotId,
    } = args;

    if (rangeStart === insertBefore) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: rangeStart and insertBefore cannot be the same position',
          },
        ],
      };
    }

    // Get current auth info
    const authInfo = getCurrentAuth();
    
    if (!authInfo?.spotifyAccessToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No authentication found. Please authenticate first.',
          },
        ],
      };
    }

    try {
      const result = await handleAuthenticatedSpotifyRequest(
        authInfo.spotifyAccessToken,
        authInfo.spotifyRefreshToken,
        async (spotifyApi) => {
          const requestBody: {
            range_start: number;
            insert_before: number;
            range_length?: number;
            snapshot_id?: string;
          } = {
            range_start: rangeStart,
            insert_before: insertBefore,
          };

          if (rangeLength !== 1) {
            requestBody.range_length = rangeLength;
          }

          if (snapshotId) {
            requestBody.snapshot_id = snapshotId;
          }

          return await spotifyApi.playlists.updatePlaylistItems(
            playlistId,
            requestBody,
          );
        },
      );

      const trackWord = rangeLength === 1 ? 'track' : 'tracks';
      const fromPosition = rangeStart + 1; // Convert to 1-based for user display
      const toPosition = insertBefore + 1;

      return {
        content: [
          {
            type: 'text',
            text: `Successfully reordered ${rangeLength} ${trackWord} from position ${fromPosition} to position ${toPosition}\nNew snapshot ID: ${result.snapshot_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reordering playlist tracks: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const playTools = [
  playMusic,
  pausePlayback,
  skipToNext,
  skipToPrevious,
  createPlaylist,
  addTracksToPlaylist,
  resumePlayback,
  addToQueue,
  reorderPlaylistTracks,
];

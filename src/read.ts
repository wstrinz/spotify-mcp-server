import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { z } from "zod";
import { tool } from "./types.js";
import {
  createSpotifyApi,
  formatDuration,
  refreshAccessToken,
} from "./utils.js";

async function handleSpotifyRequest<T>(
  action: (spotifyApi: SpotifyApi) => Promise<T>
): Promise<T> {
  const spotifyApi = createSpotifyApi();

  try {
    return await action(spotifyApi);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("access token expired")
    ) {
      await refreshAccessToken(spotifyApi);
      return await action(spotifyApi);
    }
    throw error;
  }
}

// Simplified type definitions to match the SDK's return structures
interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtist[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  type: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: {
    display_name: string | null;
  };
  tracks: {
    total: number;
  };
}

function isTrack(item: any): item is SpotifyTrack {
  return (
    item &&
    item.type === "track" &&
    Array.isArray(item.artists) &&
    item.album &&
    typeof item.album.name === "string"
  );
}

// Search for tracks, albums, artists, or playlists
export const searchSpotify: tool<{
  query: z.ZodString;
  type: z.ZodEnum<["track", "album", "artist", "playlist"]>;
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: "searchSpotify",
  description: "Search for tracks, albums, artists, or playlists on Spotify",
  schema: {
    query: z.string().describe("The search query"),
    type: z
      .enum(["track", "album", "artist", "playlist"])
      .describe(
        "The type of item to search for either track, album, artist, or playlist"
      ),
    limit: z
      .number()
      .min(10)
      .max(50)
      .optional()
      .describe("Maximum number of results to return (10-50)"),
  },
  handler: async (args, extra: RequestHandlerExtra) => {
    const { query, type, limit = 10 } = args;

    try {
      const results = await handleSpotifyRequest(async (spotifyApi) => {
        // Convert the limit to one of the allowed values
        // The SDK has strict type requirements for the limit parameter
        const limitValue = limit <= 50 ? limit : 50;
        // Converting to string and then as any to avoid TypeScript errors
        const limitStr = limitValue.toString();
        return await spotifyApi.search(
          query,
          [type],
          undefined,
          limitStr as any
        );
      });

      let formattedResults = "";

      if (type === "track" && results.tracks) {
        formattedResults = results.tracks.items
          .map((track, i) => {
            const artists = track.artists.map((a) => a.name).join(", ");
            const duration = formatDuration(track.duration_ms);
            return `${i + 1}. "${
              track.name
            }" by ${artists} (${duration}) - ID: ${track.id}`;
          })
          .join("\n");
      } else if (type === "album" && results.albums) {
        formattedResults = results.albums.items
          .map((album, i) => {
            const artists = album.artists.map((a) => a.name).join(", ");
            return `${i + 1}. "${album.name}" by ${artists} - ID: ${album.id}`;
          })
          .join("\n");
      } else if (type === "artist" && results.artists) {
        formattedResults = results.artists.items
          .map((artist, i) => {
            return `${i + 1}. ${artist.name} - ID: ${artist.id}`;
          })
          .join("\n");
      } else if (type === "playlist" && results.playlists) {
        formattedResults = results.playlists.items
          .map((playlist, i) => {
            return `${i + 1}. "${playlist?.name ?? "Unknown Playlist"} (${
              playlist?.description ?? "No description"
            } tracks)" by ${playlist?.owner?.display_name} - ID: ${
              playlist?.id
            }`;
          })
          .join("\n");
      }

      return {
        content: [
          {
            type: "text",
            text:
              formattedResults.length > 0
                ? `# Search results for "${query}" (type: ${type})\n\n${formattedResults}`
                : `No ${type} results found for "${query}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching for ${type}s: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

// Get currently playing track
export const getNowPlaying: tool<{}> = {
  name: "getNowPlaying",
  description: "Get information about the currently playing track on Spotify",
  schema: {},
  handler: async (args, extra: RequestHandlerExtra) => {
    try {
      const currentTrack = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.player.getCurrentlyPlayingTrack();
      });

      if (!currentTrack || !currentTrack.item) {
        return {
          content: [
            {
              type: "text",
              text: "Nothing is currently playing on Spotify",
            },
          ],
        };
      }

      const item = currentTrack.item;

      if (!isTrack(item)) {
        return {
          content: [
            {
              type: "text",
              text: "Currently playing item is not a track (might be a podcast episode)",
            },
          ],
        };
      }

      const artists = item.artists.map((a) => a.name).join(", ");
      const album = item.album.name;
      const duration = formatDuration(item.duration_ms);
      const progress = formatDuration(currentTrack.progress_ms || 0);
      const isPlaying = currentTrack.is_playing;

      return {
        content: [
          {
            type: "text",
            text:
              `# Currently ${isPlaying ? "Playing" : "Paused"}\n\n` +
              `**Track**: "${item.name}"\n` +
              `**Artist**: ${artists}\n` +
              `**Album**: ${album}\n` +
              `**Progress**: ${progress} / ${duration}\n` +
              `**ID**: ${item.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting current track: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const getMyPlaylists: tool<{
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: "getMyPlaylists",
  description: "Get a list of the current user's playlists on Spotify",
  schema: {
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of playlists to return (1-50)"),
  },
  handler: async (args, extra: RequestHandlerExtra) => {
    const { limit = 20 } = args;

    try {
      const playlists = await handleSpotifyRequest(async (spotifyApi) => {
        // The API expects the limit as a specific type (likely enum of numbers)
        // Cast it to any to bypass the TypeScript error
        return await spotifyApi.currentUser.playlists.playlists(limit as any);
      });

      if (playlists.items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "You don't have any playlists on Spotify",
            },
          ],
        };
      }

      const formattedPlaylists = playlists.items
        .map((playlist, i) => {
          const tracksTotal =
            playlist.tracks && playlist.tracks.total
              ? playlist.tracks.total
              : 0;
          return `${i + 1}. "${playlist.name}" (${tracksTotal} tracks) - ID: ${
            playlist.id
          }`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `# Your Spotify Playlists\n\n${formattedPlaylists}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting playlists: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const getPlaylistTracks: tool<{
  playlistId: z.ZodString;
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: "getPlaylistTracks",
  description: "Get a list of tracks in a Spotify playlist",
  schema: {
    playlistId: z.string().describe("The Spotify ID of the playlist"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of tracks to return (1-100)"),
  },
  handler: async (args, extra: RequestHandlerExtra) => {
    const { playlistId, limit = 50 } = args;

    try {
      const playlistTracks = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.playlists.getPlaylistItems(
          playlistId,
          undefined,
          limit.toString()
        );
      });

      if (playlistTracks.items.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "This playlist doesn't have any tracks",
            },
          ],
        };
      }

      const formattedTracks = playlistTracks.items
        .map((item, i) => {
          const track = item.track;
          if (!track) return `${i + 1}. [Removed track]`;

          if (isTrack(track)) {
            const artists = track.artists.map((a) => a.name).join(", ");
            const duration = formatDuration(track.duration_ms);
            return `${i + 1}. "${
              track.name
            }" by ${artists} (${duration}) - ID: ${track.id}`;
          } else {
            // Handle non-track items safely
            return `${i + 1}. Unknown item`;
          }
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `# Tracks in Playlist\n\n${formattedTracks}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting playlist tracks: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const readTools = [
  searchSpotify,
  getNowPlaying,
  getMyPlaylists,
  getPlaylistTracks,
];

# Remote MCP Spotify Server Setup

This guide explains how to set up and use the Spotify MCP server as a remote server following the latest MCP standards.

## Features

- **OAuth 2.1 with PKCE**: Secure authentication flow
- **Session Management**: Stateful MCP sessions with proper cleanup
- **Streamable HTTP Transport**: Latest MCP transport protocol
- **All Spotify Tools**: Complete set of Spotify integration tools

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Set Up Spotify Credentials
Copy the example config and add your Spotify app credentials:
```bash
cp spotify-config.example.json spotify-config.json
# Edit spotify-config.json with your Spotify app credentials
```

### 4. Start the Remote Server
```bash
# Development mode with debug secrets
npm run dev:remote

# Production mode (set JWT_SECRET environment variable)
JWT_SECRET=your-production-secret npm run start:remote
```

The server will start on port 3000 by default.

## Server Endpoints

### OAuth Discovery
- **Discovery**: `GET /.well-known/oauth-authorization-server`
- **Authorization**: `GET /oauth/authorize`
- **Token**: `POST /oauth/token`

### MCP Protocol
- **MCP Endpoint**: `POST|GET|DELETE /mcp`
- All endpoints require Bearer token authentication

## Client Configuration

Use this configuration in your MCP client:

```json
{
  "remote_servers": {
    "spotify": {
      "url": "http://localhost:3000/mcp",
      "oauth": {
        "authorization_url": "http://localhost:3000/oauth/authorize",
        "token_url": "http://localhost:3000/oauth/token",
        "client_id": "your-client-id",
        "scopes": ["mcp:read", "mcp:write"],
        "pkce": true
      }
    }
  }
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret key for JWT tokens (required in production)

## Available Tools

The remote server provides all the same tools as the local version:

### Read Tools
- `searchSpotify`: Search for tracks, albums, artists, or playlists
- `getNowPlaying`: Get currently playing track information
- `getMyPlaylists`: Get user's playlists
- `getPlaylistTracks`: Get tracks in a specific playlist
- `getRecentlyPlayed`: Get recently played tracks
- `getLikedTracks`: Get user's liked tracks

### Playback Tools
- `playMusic`: Start playing a track, album, artist, or playlist
- `pausePlayback`: Pause current playback
- `resumePlayback`: Resume paused playback
- `skipToNext`: Skip to next track
- `skipToPrevious`: Skip to previous track
- `addToQueue`: Add music to playback queue
- `createPlaylist`: Create a new playlist
- `addTracksToPlaylist`: Add tracks to a playlist
- `reorderPlaylistTracks`: Reorder tracks in a playlist

## Security Features

- **PKCE (Proof Key for Code Exchange)**: Required for OAuth flows
- **JWT Token Authentication**: Secure session management
- **CORS Protection**: Configurable CORS policies
- **Session Validation**: Proper MCP session lifecycle management

## Deployment

For production deployment:

1. Set a strong `JWT_SECRET` environment variable
2. Configure CORS origins for your domain
3. Use HTTPS in production
4. Set up proper Spotify app credentials
5. Consider using a reverse proxy (nginx, etc.)

## Testing

Test the server using the `mcp-remote` tool or Claude Code with remote MCP support:

```bash
# Test OAuth flow
curl -X GET "http://localhost:3000/.well-known/oauth-authorization-server"

# Test with proper authentication headers
curl -X POST "http://localhost:3000/mcp" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'
```

## Troubleshooting

1. **Authentication Issues**: Ensure JWT_SECRET is set and tokens are valid
2. **CORS Errors**: Check CORS configuration in the server
3. **Session Errors**: Verify MCP session IDs are being passed correctly
4. **Spotify Errors**: Check your Spotify app credentials and permissions

## Architecture

The remote server implements:
- Express.js HTTP server
- OAuth 2.1 authorization server
- MCP StreamableHTTPServerTransport
- Session-based transport management
- JWT-based authentication middleware
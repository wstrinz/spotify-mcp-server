# Spotify MCP Server Authentication Setup

This guide explains how to set up OAuth 2.1 authentication for the Spotify MCP Server.

## Overview

The server now implements OAuth 2.1 with PKCE (Proof Key for Code Exchange) for secure authentication. This follows the MCP OAuth specification and allows clients to authenticate users and access their Spotify data securely.

## Prerequisites

1. **Spotify Developer Account**: Create an account at [Spotify for Developers](https://developer.spotify.com/)
2. **Spotify App**: Register a new application in your Spotify Developer Dashboard

## Setup Instructions

### 1. Create Spotify Application

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create app"
3. Fill in the details:
   - **App name**: Your MCP Server name
   - **App description**: Description of your use case
   - **Redirect URI**: `http://localhost:8888/callback`
   - **Which API/SDKs are you planning to use**: Web API
4. Accept the terms and create the app
5. Note down your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Spotify credentials:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   REDIRECT_URL=http://localhost:8888/callback
   JWT_SECRET=generate-a-long-random-string-here
   OAUTH_ISSUER=http://localhost:8888
   PORT=8888
   AUTH_STORE_PATH=./data/auth-store.json
   ```

3. **Important**: Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### 3. Start the Server

```bash
npm run start:remote
```

The server will start on `http://localhost:8888` with the following endpoints:

- **MCP Endpoint**: `http://localhost:8888/mcp` (requires authentication)
- **OAuth Authorization**: `http://localhost:8888/oauth/authorize`
- **OAuth Token Exchange**: `http://localhost:8888/oauth/token`
- **Spotify Callback**: `http://localhost:8888/callback`

## OAuth Flow

The server implements the complete OAuth 2.1 flow:

1. **Initial Request**: Client makes request without auth, receives 401 with discovery metadata
2. **Metadata Discovery**: Client discovers OAuth endpoints
3. **Client Registration**: Client can optionally register (public client flow)
4. **Authorization**: Client redirects user to authorization endpoint with PKCE
5. **User Consent**: User authorizes on Spotify
6. **Callback**: Spotify redirects back with authorization code
7. **Token Exchange**: Client exchanges code for access token using PKCE verifier
8. **Authenticated Requests**: Client uses Bearer token for MCP requests

## Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "spotify": {
      "command": "npx",
      "args": ["-y", "@your-org/spotify-mcp-server"],
      "env": {
        "SPOTIFY_MCP_SERVER_URL": "http://localhost:8888/mcp"
      }
    }
  }
}
```

### Other MCP Clients

Configure your MCP client to connect to:
- **Server URL**: `http://localhost:8888/mcp`
- **Authentication**: OAuth 2.1 with PKCE
- **Authorization URL**: `http://localhost:8888/oauth/authorize`
- **Token URL**: `http://localhost:8888/oauth/token`

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS in production environments
2. **JWT Secret**: Use a cryptographically secure random string for JWT_SECRET. The default in `config.ts` is insecure and must be overridden in production.
3. **Redirect URIs**: Only use trusted redirect URIs in your Spotify app configuration
4. **Token Storage**: Long-lived refresh tokens are persisted to a JSON file (`AUTH_STORE_PATH`, default `./data/auth-store.json`) so authenticated sessions survive restarts and redeploys. This file contains Spotify refresh tokens (long-lived secrets) — keep it on a private volume with restricted permissions (the file is written `0600`). Short-lived state (pending authorizations, authorization codes) remains in memory.

## Durable Auth & Token Refresh

- **Real Spotify refresh**: When an MCP client presents a `refresh_token` grant, the server uses the stored Spotify refresh token to call Spotify's token endpoint (`https://accounts.spotify.com/api/token`), obtains a fresh Spotify access token (and a rotated refresh token if Spotify returns one), persists it, and re-signs the MCP JWT around the new token. This keeps sessions alive past the 1-hour Spotify access-token expiry. If Spotify rejects the refresh token (400/401), the MCP refresh token is dropped and the client must re-authenticate.
- **Persistence path**: Set `AUTH_STORE_PATH` to control where the refresh-token file is written (default `./data/auth-store.json`). A missing or corrupt file is tolerated — the server starts with an empty store.

### Coolify Deployment (Persistent Volume Required)

The deploy runs on Coolify (Nixpacks build, start command `node build/remote-server.js`). Because the refresh-token file must survive redeploys, **mount a persistent volume at the directory holding the auth-store file**:

1. In the Coolify service, add a Persistent Storage volume mounted at the directory containing the auth store (e.g. `/app/data`).
2. Set `AUTH_STORE_PATH` accordingly (e.g. `/app/data/auth-store.json`), or leave the default `./data/auth-store.json` if the working directory is `/app`.
3. Set `JWT_SECRET` to a stable, long random value in Coolify env — if it changes between deploys, previously issued MCP JWTs (though not the persisted refresh tokens) become invalid.

Without the mounted volume, the file is written to the ephemeral container filesystem and auth is wiped on every redeploy.

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**: Ensure your Spotify app has the correct redirect URI configured
2. **"Invalid client credentials"**: Check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
3. **"JWT verification failed"**: Ensure JWT_SECRET is set correctly and consistently

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=spotify-mcp-server:*
```

## API Scopes

The server requests the following Spotify scopes:
- `user-read-private`: Access user profile information
- `user-read-email`: Access user email address
- `user-library-read`: Access user's saved tracks
- `user-read-recently-played`: Access recently played tracks
- `user-read-playback-state`: Read playback state
- `user-modify-playback-state`: Control playback
- `user-read-currently-playing`: Read currently playing track
- `playlist-read-private`: Access private playlists
- `playlist-read-collaborative`: Access collaborative playlists
- `playlist-modify-private`: Modify private playlists
- `playlist-modify-public`: Modify public playlists

## Support

For issues and questions:
1. Check the server logs for error messages
2. Verify your Spotify app configuration
3. Ensure all environment variables are set correctly
4. Test the OAuth flow manually using the browser
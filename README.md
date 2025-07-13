<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
<img src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" width="30" height="30">
<h1>Spotify MCP Server</h1>
</div>

A **Model Context Protocol (MCP)** server that enables AI assistants like Claude and Cursor to control Spotify playback, manage playlists, and access user music data. Supports both **local STDIO** and **remote HTTP** deployment modes with **OAuth 2.1 authentication**.

<details>
<summary>📋 Contents</summary>
  
- [✨ Features](#-features)
- [🎯 Example Interactions](#-example-interactions)
- [🛠️ Tools](#️-tools)
  - [📖 Read Operations](#-read-operations)
  - [▶️ Playback & Playlist Operations](#️-playback--playlist-operations)
- [🚀 Setup](#-setup)
  - [📋 Prerequisites](#-prerequisites)
  - [⚡ Quick Start](#-quick-start)
  - [🔧 Installation](#-installation)
  - [🎵 Spotify Developer Setup](#-spotify-developer-setup)
  - [🔐 Authentication Configuration](#-authentication-configuration)
- [🌐 Deployment Modes](#-deployment-modes)
  - [💻 Local Mode (STDIO)](#-local-mode-stdio)
  - [🌍 Remote Mode (HTTP + OAuth)](#-remote-mode-http--oauth)
- [🔗 Client Integration](#-client-integration)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
  - [VS Code with Cline](#vs-code-with-cline)
  - [Custom MCP Clients](#custom-mcp-clients)
- [🔐 OAuth 2.1 Flow](#-oauth-21-flow)
- [🎼 API Reference](#-api-reference)
- [⚠️ Troubleshooting](#️-troubleshooting)
</details>

## ✨ Features

- **🎵 Full Spotify Control**: Search, play, pause, skip, queue management
- **📝 Playlist Management**: Create, modify, reorder playlists
- **📚 Library Access**: Browse liked tracks, playlists, listening history
- **🔐 Secure OAuth 2.1**: Modern authentication with PKCE support
- **🌐 Dual Deployment**: Local STDIO or remote HTTP server modes
- **⚡ Real-time**: Instant playback control and status updates
- **🔄 Token Management**: Automatic refresh token handling
- **🛡️ Enterprise Ready**: Rate limiting, CORS, security middleware

## 🎯 Example Interactions

- _"Play Elvis's first song"_
- _"Create a Taylor Swift / Slipknot fusion playlist with 20 tracks"_
- _"Copy all the techno tracks from my workout playlist to my work playlist"_
- _"Show me my most recently played tracks"_
- _"Search for chill lo-fi beats and add the top 3 to my study playlist"_
- _"What's currently playing and skip to the next track"_

## 🛠️ Tools

### 📖 Read Operations

#### **searchSpotify**
- **Description**: Search for tracks, albums, artists, or playlists on Spotify
- **Parameters**:
  - `query` (string): The search term
  - `type` (string): Type of item to search for (`track`, `album`, `artist`, `playlist`)
  - `limit` (number, optional): Maximum number of results (1-50, default: 10)
- **Returns**: Formatted list of matching items with IDs, names, and metadata
- **Example**: `searchSpotify("bohemian rhapsody", "track", 20)`

#### **getNowPlaying**
- **Description**: Get information about the currently playing track
- **Parameters**: None
- **Returns**: Current track details, playback progress, and status
- **Example**: `getNowPlaying()`

#### **getMyPlaylists**
- **Description**: Get the current user's playlists
- **Parameters**:
  - `limit` (number, optional): Maximum playlists to return (1-50, default: 50)
- **Returns**: Array of playlists with metadata and track counts
- **Example**: `getMyPlaylists(10)`

#### **getPlaylistTracks**
- **Description**: Get tracks from a specific playlist
- **Parameters**:
  - `playlistId` (string): Spotify playlist ID
  - `limit` (number, optional): Maximum tracks to return (1-50, default: 50)
- **Returns**: Array of tracks with full metadata
- **Example**: `getPlaylistTracks("37i9dQZEVXcJZyENOWUFo7")`

#### **getRecentlyPlayed**
- **Description**: Get recently played tracks from listening history
- **Parameters**:
  - `limit` (number, optional): Maximum tracks to return (1-50, default: 50)
- **Returns**: Chronological list of recently played tracks
- **Example**: `getRecentlyPlayed(10)`

#### **getLikedTracks**
- **Description**: Get tracks from the user's "Liked Songs" library
- **Parameters**:
  - `limit` (number, optional): Maximum tracks to return (1-50, default: 50)
  - `offset` (number, optional): Pagination offset (default: 0)
- **Returns**: User's liked tracks with pagination info
- **Example**: `getLikedTracks(20, 100)`

### ▶️ Playback & Playlist Operations

#### **playMusic**
- **Description**: Start playing a track, album, artist, or playlist
- **Parameters**:
  - `uri` (string, optional): Spotify URI (overrides type/id)
  - `type` (string, optional): Item type (`track`, `album`, `artist`, `playlist`)
  - `id` (string, optional): Spotify ID of the item
  - `deviceId` (string, optional): Target device ID
- **Returns**: Playback confirmation
- **Examples**:
  - `playMusic({ uri: "spotify:track:6rqhFgbbKwnb9MLmUQDhG6" })`
  - `playMusic({ type: "playlist", id: "37i9dQZEVXcJZyENOWUFo7" })`

#### **pausePlayback** / **resumePlayback**
- **Description**: Pause or resume current playback
- **Parameters**:
  - `deviceId` (string, optional): Target device ID
- **Returns**: Playback status confirmation
- **Example**: `pausePlayback()`

#### **skipToNext** / **skipToPrevious**
- **Description**: Navigate playback queue
- **Parameters**:
  - `deviceId` (string, optional): Target device ID
- **Returns**: Skip confirmation
- **Example**: `skipToNext()`

#### **createPlaylist**
- **Description**: Create a new Spotify playlist
- **Parameters**:
  - `name` (string): Playlist name
  - `description` (string, optional): Playlist description
  - `public` (boolean, optional): Public visibility (default: false)
- **Returns**: New playlist ID and URL
- **Example**: `createPlaylist({ name: "AI Workout Mix", description: "Energetic tracks for exercise", public: false })`

#### **addTracksToPlaylist**
- **Description**: Add tracks to an existing playlist
- **Parameters**:
  - `playlistId` (string): Target playlist ID
  - `trackIds` (array): Array of track IDs to add
  - `position` (number, optional): Insert position (0-based)
- **Returns**: Success confirmation and snapshot ID
- **Example**: `addTracksToPlaylist({ playlistId: "3cEYpjA9oz9GiPac4AsH4n", trackIds: ["4iV5W9uYEdYUVa79Axb7Rh", "7qiZfU4dY1lWllzX7mPBI3"] })`

#### **addToQueue**
- **Description**: Add item to current playback queue
- **Parameters**:
  - `uri` (string, optional): Spotify URI (overrides type/id)
  - `type` (string, optional): Item type (`track`, `album`, `artist`, `playlist`)
  - `id` (string, optional): Spotify ID
  - `deviceId` (string, optional): Target device ID
- **Returns**: Queue confirmation
- **Example**: `addToQueue({ type: "track", id: "6rqhFgbbKwnb9MLmUQDhG6" })`

#### **reorderPlaylistTracks**
- **Description**: Reorder tracks within a playlist
- **Parameters**:
  - `playlistId` (string): Target playlist ID
  - `rangeStart` (number): Start position of tracks to move (0-based)
  - `insertBefore` (number): Destination position (0-based)
  - `rangeLength` (number, optional): Number of tracks to move (default: 1)
  - `snapshotId` (string, optional): Playlist version control
- **Returns**: Reorder confirmation and new snapshot ID
- **Example**: `reorderPlaylistTracks({ playlistId: "3cEYpjA9oz9GiPac4AsH4n", rangeStart: 5, insertBefore: 1, rangeLength: 2 })`

## 🚀 Setup

### 📋 Prerequisites

- **Node.js** v16 or higher
- **Spotify Premium Account** (required for playback control)
- **Spotify Developer Application** (free registration)

### ⚡ Quick Start

```bash
# Clone and install
git clone https://github.com/marcelmarais/spotify-mcp-server.git
cd spotify-mcp-server
npm install
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your Spotify credentials

# Start remote server
npm run start:remote
```

### 🔧 Installation

```bash
git clone https://github.com/marcelmarais/spotify-mcp-server.git
cd spotify-mcp-server
npm install
npm run build
```

### 🎵 Spotify Developer Setup

1. **Create Spotify App**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Click "Create app"
   - Fill in app details:
     - **App name**: Your MCP Server
     - **App description**: AI assistant integration
     - **Redirect URI**: `http://localhost:8888/callback`
     - **APIs**: Web API
   - Save your **Client ID** and **Client Secret**

2. **Configure Redirect URIs**:
   Add these redirect URIs to your Spotify app:
   ```
   http://localhost:8888/callback
   https://localhost:8888/callback
   ```

### 🔐 Authentication Configuration

1. **Environment Variables**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file**:
   ```env
   # Spotify API Credentials
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   REDIRECT_URL=http://localhost:8888/callback
   
   # OAuth Configuration
   JWT_SECRET=generate-a-long-random-string-here
   OAUTH_ISSUER=http://localhost:8888
   PORT=8888
   ```

3. **Generate JWT Secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## 🌐 Deployment Modes

### 💻 Local Mode (STDIO)

**Best for**: Direct Claude Desktop integration, single-user setups

```bash
# Build and run locally
npm run build
node build/index.js
```

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/path/to/spotify-mcp-server/build/index.js"]
    }
  }
}
```

### 🌍 Remote Mode (HTTP + OAuth)

**Best for**: Multi-user deployments, web applications, production use

```bash
# Start HTTP server with OAuth
npm run start:remote
```

**Server Endpoints**:
- **MCP API**: `http://localhost:8888/mcp`
- **OAuth Authorization**: `http://localhost:8888/oauth/authorize`
- **Token Exchange**: `http://localhost:8888/oauth/token`
- **Spotify Callback**: `http://localhost:8888/callback`

**Features**:
- ✅ OAuth 2.1 with PKCE authentication
- ✅ Multi-user session management
- ✅ Rate limiting and security middleware
- ✅ CORS support for web clients
- ✅ Automatic token refresh
- ✅ Production-ready scaling

## 🔗 Client Integration

### Claude Desktop

**Local STDIO Mode**:
```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/absolute/path/to/spotify-mcp-server/build/index.js"]
    }
  }
}
```

**Remote HTTP Mode**:
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

### Cursor IDE

1. Open Cursor Settings (`Cmd/Ctrl + Shift + J`)
2. Navigate to MCP tab
3. Add server:
   ```bash
   node /path/to/spotify-mcp-server/build/index.js
   ```

### VS Code with Cline

Create `cline_mcp_settings.json`:
```json
{
  "mcpServers": {
    "spotify": {
      "command": "node",
      "args": ["/path/to/spotify-mcp-server/build/index.js"],
      "autoApprove": ["getNowPlaying", "getRecentlyPlayed"]
    }
  }
}
```

### Custom MCP Clients

**HTTP Connection**:
```javascript
const client = new MCPClient({
  transport: 'http',
  url: 'http://localhost:8888/mcp',
  auth: {
    type: 'oauth2',
    authUrl: 'http://localhost:8888/oauth/authorize',
    tokenUrl: 'http://localhost:8888/oauth/token'
  }
});
```

## 🔐 OAuth 2.1 Flow

The server implements a complete OAuth 2.1 flow with PKCE:

```
┌─────────────┐    1. Request     ┌─────────────┐
│   Client    │ ──────────────→   │    Server   │
│             │ ←─── 401 + WWW   │             │
└─────────────┘    Authenticate   └─────────────┘
       │                                  │
       │ 2. Discovery                     │
       │ ──────────────────────────────→  │
       │ ←──────── OAuth Metadata ─────── │
       │                                  │
       │ 3. Authorization (PKCE)          │
       │ ──────────────────────────────→  │
       │                                  │
       │         4. User Consent          │
       │      ┌─────────────────────┐     │
       │      │     Spotify         │     │
       │ ───→ │   Authorization     │ ──→ │
       │      │      Server         │     │
       │      └─────────────────────┘     │
       │                                  │
       │ 5. Token Exchange                │
       │ ──────────────────────────────→  │
       │ ←────── Access Token ──────────  │
       │                                  │
       │ 6. Authenticated Requests        │
       │ ──────────────────────────────→  │
```

**Security Features**:
- 🔒 PKCE (Proof Key for Code Exchange)
- 🔑 JWT-based session management
- ⏰ Automatic token refresh
- 🛡️ CSRF protection
- 🚫 Rate limiting
- 🌐 CORS configuration

## 🎼 API Reference

**Authentication Scopes**:
The server requests these Spotify permissions:
- `user-read-private` - User profile access
- `user-read-email` - Email address access
- `user-library-read` - Saved tracks access
- `user-read-recently-played` - Listening history
- `user-read-playback-state` - Current playback status
- `user-modify-playback-state` - Playback control
- `user-read-currently-playing` - Now playing info
- `playlist-read-private` - Private playlists
- `playlist-read-collaborative` - Collaborative playlists
- `playlist-modify-private` - Modify private playlists
- `playlist-modify-public` - Modify public playlists

**Rate Limits**:
- **API Requests**: 100 requests per minute per client
- **OAuth Requests**: 20 requests per minute per IP
- **Token Refresh**: 10 requests per minute per user

## ⚠️ Troubleshooting

### Common Issues

**Authentication Errors**:
```
Error: "Invalid redirect URI"
Solution: Ensure Spotify app has correct redirect URI configured
```

```
Error: "Invalid client credentials"
Solution: Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
```

```
Error: "JWT verification failed"
Solution: Verify JWT_SECRET is set correctly and consistently
```

**Connection Issues**:
```
Error: "ECONNREFUSED localhost:8888"
Solution: Start the remote server with 'npm run start:remote'
```

```
Error: "MCP session timeout"
Solution: Check network connectivity and firewall settings
```

**Playback Issues**:
```
Error: "No active device"
Solution: Open Spotify on any device (phone, desktop, web) to activate
```

```
Error: "Premium required"
Solution: Spotify Premium account needed for playback control
```

### Debug Mode

Enable detailed logging:
```bash
export DEBUG=spotify-mcp-server:*
npm run start:remote
```

### Manual Testing

Test OAuth flow manually:
1. Visit: `http://localhost:8888/oauth/authorize?client_id=test&redirect_uri=http://localhost:8888/callback&response_type=code&scope=user-read-private&code_challenge=test&code_challenge_method=S256`
2. Complete Spotify authorization
3. Check server logs for token exchange

### Health Checks

```bash
# Check server status
curl http://localhost:8888/health

# Check MCP endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8888/mcp
```

---

<div align="center">

**🎵 Made with ❤️ for the AI music community**

[Report Issues](https://github.com/marcelmarais/spotify-mcp-server/issues) • [Contribute](https://github.com/marcelmarais/spotify-mcp-server/pulls) • [Discussions](https://github.com/marcelmarais/spotify-mcp-server/discussions)

</div>
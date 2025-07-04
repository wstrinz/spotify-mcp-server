# Working Remote MCP Spotify Server

A clean, working implementation of the Spotify MCP server as a remote server using the latest MCP standards.

## ✅ What Works

- **StreamableHTTP Transport**: Uses the latest MCP StreamableHTTPServerTransport
- **Session Management**: Proper MCP session lifecycle with session IDs
- **All Spotify Tools**: Complete integration with 15 Spotify tools
- **CORS Support**: Configured for web clients
- **Claude Integration**: Successfully tested with Claude AI

## 🚀 Quick Start

### 1. Install and Build
```bash
npm install
npm run build
```

### 2. Configure Spotify
```bash
cp spotify-config.example.json spotify-config.json
# Edit spotify-config.json with your Spotify app credentials
```

### 3. Start the Server
```bash
npm run dev:remote
```

Server runs on `http://localhost:3000/mcp`

## 🛠️ Available Tools

### Read Tools (6)
- `searchSpotify` - Search tracks, albums, artists, playlists
- `getNowPlaying` - Get current track info
- `getMyPlaylists` - List user's playlists
- `getPlaylistTracks` - Get tracks in a playlist
- `getRecentlyPlayed` - Get recently played tracks
- `getLikedTracks` - Get user's liked tracks

### Control Tools (9)
- `playMusic` - Start playing music
- `pausePlayback` - Pause current playback
- `resumePlayback` - Resume playback
- `skipToNext` - Skip to next track
- `skipToPrevious` - Skip to previous track
- `addToQueue` - Add music to queue
- `createPlaylist` - Create new playlist
- `addTracksToPlaylist` - Add tracks to playlist
- `reorderPlaylistTracks` - Reorder playlist tracks

## 🔌 Client Configuration

Configure your MCP client to connect to:
```
URL: http://localhost:3000/mcp
Protocol: StreamableHTTP
Authentication: None (for now)
```

## 🏗️ Architecture

**Clean MCP Implementation:**
- Express.js HTTP server
- MCP StreamableHTTPServerTransport
- Session-based transport management
- Proper initialization flow
- SSE stream for real-time communication

**Key Components:**
- `mcpHandler`: Manages MCP requests and sessions
- `transports`: Map of active MCP sessions
- `server`: McpServer instance with all Spotify tools

## 🧪 Testing

Test the server:
```bash
# Test initialize
curl -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}, "jsonrpc": "2.0", "id": 0}'

# Returns session ID in mcp-session-id header
```

## 📝 Protocol Flow

1. **Initialize**: POST to `/mcp` with `initialize` method
2. **Session Creation**: Server returns `mcp-session-id` header
3. **SSE Stream**: GET to `/mcp` with session ID for events
4. **Tool Calls**: POST to `/mcp` with session ID for tool execution

## 🔮 Future Enhancements

- [ ] OAuth 2.1 authentication
- [ ] Rate limiting
- [ ] Webhook support for real-time updates
- [ ] Multiple user sessions
- [ ] Spotify webhook integration

## 🐛 Troubleshooting

**Common Issues:**
- Missing Spotify credentials → Check `spotify-config.json`
- Session errors → Ensure proper session ID headers
- CORS issues → Server already configured for cross-origin requests

**Debug Mode:**
Server logs all MCP requests and session management for debugging.

---

🎵 **Working remote MCP server ready for Claude integration!** 🎵
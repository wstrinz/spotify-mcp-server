import { config as loadDotenv } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { playTools } from './play.js';
import { readTools } from './read.js';
import { OAuthProvider } from './server/oauth.js';
import { loadServerConfig } from './server/config.js';
import { rateLimitMiddleware, validateProtocolVersion, requestSizeLimit } from './server/middleware.js';

// Load environment variables from .env file
loadDotenv();

const app = express();
const PORT = process.env.PORT || 8888;

// Load server configuration
const config = loadServerConfig();

// Initialize OAuth provider
const oauthProvider = new OAuthProvider({
  ...config,
  validRedirectUris: [
    'http://localhost:8888/callback',
    'https://localhost:8888/callback', 
    'spotify://',
    'claude-code://',
  ],
});

// CORS configuration for MCP clients
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-session-id'],
  }),
);

// Middleware
app.use(express.json());
app.use(rateLimitMiddleware());
app.use(validateProtocolVersion);
app.use(requestSizeLimit());

// Setup OAuth routes
oauthProvider.setupRoutes(app);

// Transport management for MCP sessions
const transports = new Map<string, StreamableHTTPServerTransport>();

// Per-session McpServer instances (keyed by sessionId), for cleanup on close
const servers = new Map<string, McpServer>();

// Map to store session -> auth info
const sessionAuthMap = new Map<string, any>();

// Factory: build a FRESH McpServer (with all tools registered) per session.
// The MCP SDK Server/McpServer can only be connected to ONE transport at a
// time, so a shared global instance breaks concurrent sessions ("Already
// connected to a transport"). Each session must own its own server instance.
function createServer(): McpServer {
  const server = new McpServer({
    name: 'spotify-controller-remote',
    version: '1.0.0',
  });

  // Register all tools onto this instance
  [...readTools, ...playTools].forEach((tool) => {
    server.tool(tool.name, tool.description, tool.schema, tool.handler);
  });

  return server;
}

// Clean MCP request handler
const mcpHandler = async (req: express.Request & { auth?: any }, res: express.Response) => {
  const startTime = Date.now();
  const method = req.body?.method;
  const toolName = req.body?.params?.name;
  
  try {
    const sessionId = req.headers['mcp-session-id'] as string;
    const isInitRequest = req.body?.method === 'initialize';
    
    // Only log actual tool calls, not routine MCP protocol messages
    const isToolCall = toolName && method === 'tools/call';
    if (isToolCall) {
      console.log(`📡 MCP ${req.method} request: ${method} (${toolName}) | Session: ${sessionId || 'new'}`);
    }

    let transport: StreamableHTTPServerTransport;

    if (isInitRequest) {
      // Each session gets its OWN McpServer instance. The MCP SDK can only
      // connect a server to ONE transport at a time, so a shared global server
      // throws "Already connected to a transport" on the 2nd concurrent
      // session's initialize. Build a fresh server per session here.
      const sessionServer = createServer();

      // Create new transport for initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => uuidv4(),
        onsessioninitialized: (newSessionId) => {
          console.log(`MCP session initialized: ${newSessionId}`);
          transports.set(newSessionId, transport);
          // Track the per-session server (keyed by sessionId) for cleanup on
          // close. The SDK assigns transport.sessionId only while handling the
          // initialize request, so register it here rather than after connect().
          servers.set(newSessionId, sessionServer);

          // Store auth info for this session
          if (req.auth?.extra) {
            const authInfo = {
              userId: req.auth.extra.userId,
              spotifyAccessToken: req.auth.extra.spotifyAccessToken,
              spotifyRefreshToken: req.auth.extra.spotifyRefreshToken,
            };
            
            // Import authStore dynamically to avoid circular dependency
            import('./server/auth-store.js').then(({ setAuth }) => {
              setAuth(newSessionId, authInfo);
            });
          }
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports.has(sid)) {
          console.log(`MCP session closed: ${sid}`);
          transports.delete(sid);
          servers.delete(sid);

          // Clean up auth info
          import('./server/auth-store.js').then(({ removeAuth }) => {
            removeAuth(sid);
          });
        }
      };

      // Connect this session's own server to its own transport. Because each
      // session has a distinct McpServer, no transport is ever shared and the
      // "Already connected to a transport" error can no longer occur.
      await sessionServer.connect(transport);
    } else if (sessionId && transports.has(sessionId)) {
      // Use existing transport
      transport = transports.get(sessionId)!;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid or missing session ID' },
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
    
    const duration = Date.now() - startTime;
    // Only log completion for tool calls
    if (isToolCall) {
      console.log(`✅ MCP request completed: ${method} (${toolName}) | ${duration}ms`);
    }
    
  } catch (error) {
    console.error(`❌ MCP request failed: ${method}${toolName ? ` (${toolName})` : ''} | Error: ${error instanceof Error ? error.message : String(error)}`);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
      });
    }
  }
};


// MCP endpoints with authentication
app.post('/mcp', oauthProvider.authMiddleware(), mcpHandler);
app.get('/mcp', oauthProvider.authMiddleware(), mcpHandler);
app.delete('/mcp', oauthProvider.authMiddleware(), mcpHandler);

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`🎵 Remote MCP Spotify server running on port ${PORT}`);
      console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`🛠️  Available tools: ${[...readTools, ...playTools].length} Spotify tools`);
    });
  } catch (error) {
    console.error('Failed to start remote MCP server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer };

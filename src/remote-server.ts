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
const PORT = process.env.PORT || 3000;

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

// Create MCP server instance
const server = new McpServer({
  name: 'spotify-controller-remote',
  version: '1.0.0',
});

// Map to store session -> auth info
const sessionAuthMap = new Map<string, any>();

// Register all tools
[...readTools, ...playTools].forEach((tool) => {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
});

// Clean MCP request handler
const mcpHandler = async (req: express.Request & { auth?: any }, res: express.Response) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string;
    const isInitRequest = req.body?.method === 'initialize';

    let transport: StreamableHTTPServerTransport;

    if (isInitRequest) {
      // Create new transport for initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => uuidv4(),
        onsessioninitialized: (newSessionId) => {
          console.log(`MCP session initialized: ${newSessionId}`);
          transports.set(newSessionId, transport);
          
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
          
          // Clean up auth info
          import('./server/auth-store.js').then(({ removeAuth }) => {
            removeAuth(sid);
          });
        }
      };

      await server.connect(transport);
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
    
  } catch (error) {
    console.error('Error handling MCP request:', error);
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

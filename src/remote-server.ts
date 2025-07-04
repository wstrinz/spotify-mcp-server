import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { playTools } from './play.js';
import { readTools } from './read.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for MCP clients
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-session-id'],
  }),
);

app.use(express.json());

// Transport management for MCP sessions
const transports = new Map<string, StreamableHTTPServerTransport>();

// Create MCP server instance
const server = new McpServer({
  name: 'spotify-controller-remote',
  version: '1.0.0',
});

// Register all tools
[...readTools, ...playTools].forEach((tool) => {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
});

// Clean MCP request handler
const mcpHandler = async (req: express.Request, res: express.Response) => {
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
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports.has(sid)) {
          console.log(`MCP session closed: ${sid}`);
          transports.delete(sid);
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


// MCP endpoints without authentication for now
app.post('/mcp', mcpHandler);
app.get('/mcp', mcpHandler);
app.delete('/mcp', mcpHandler);

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

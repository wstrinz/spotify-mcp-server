export interface ServerConfig {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  REDIRECT_URL: string;
  JWT_SECRET: string;
  OAUTH_ISSUER: string;
}

export function loadServerConfig(): ServerConfig {
  const config = {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
    REDIRECT_URL: process.env.REDIRECT_URL || 'http://localhost:3000/oauth/spotify/callback',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    OAUTH_ISSUER: process.env.OAUTH_ISSUER || 'http://localhost:3000',
  };

  // Validate required config
  if (!config.SPOTIFY_CLIENT_ID || !config.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing required Spotify client credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
  }

  return config;
}
import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ChatWebSocketBroker } from './server/websocket';
import { createApiRouter } from './server/routes';
import { initMongo } from './server/mongoService';

async function startServer() {
  console.log('[System] Starting SimpleChat server...');

  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT || 3000);

  // JSON and URL-encoded body parser with generous limit for direct image uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers supporting credentials and iframe requests
  const allowedFrontend = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : null;

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (allowedFrontend && (origin === allowedFrontend || allowedFrontend === '*')) {
        res.header('Access-Control-Allow-Origin', origin);
      } else if (!allowedFrontend) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        res.header('Access-Control-Allow-Origin', allowedFrontend);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', allowedFrontend || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SimpleChat', timestamp: new Date().toISOString() });
  });

  // Attach WebSocket Broker to HTTP Server
  const wsBroker = new ChatWebSocketBroker(server);

  // Mount API routes
  app.use('/api', createApiRouter(wsBroker));

  // Global Error Handler for API
  app.use('/api/*', (err: any, req: any, res: any, next: any) => {
    console.error('[API] Unhandled error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SimpleChat server running on 0.0.0.0:${PORT}`);
  });

  // Initialize MongoDB Atlas connection (single source of truth for persistent storage)
  try {
    const cols = await initMongo();
    if (cols) {
      console.log('[System] MongoDB Atlas connected and ready.');
    } else {
      console.log('[System] Notice: MONGODB_URI not configured. Please configure MONGODB_URI for MongoDB Atlas.');
    }
  } catch (err: any) {
    console.warn('[System] Database initialization notice:', err?.message || err);
  }
}

startServer().catch((err) => {
  console.error('[System] Failed to start server:', err);
});

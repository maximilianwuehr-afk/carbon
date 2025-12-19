/**
 * Hono app setup with all routes.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/node-server/serve-static';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { notesRoutes } from './routes/notes.js';
import { syncRoutes } from './routes/sync.js';
import { filesRoutes } from './routes/files.js';
import { calendarRoutes } from './routes/calendar.js';
import { driveRoutes } from './routes/drive.js';
import { chatRoutes } from './routes/chat.js';
import { authRoutes } from './routes/auth.js';
import { validateSession } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: true, // Allow all origins in production
    credentials: true,
  })
);

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes (under /api prefix)
app.route('/api/notes', notesRoutes);
app.route('/api/sync', syncRoutes);
app.route('/api/files', filesRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/drive', driveRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/auth', authRoutes);

// Serve static assets (JS, CSS, etc.)
app.use('/assets/*', serveStatic({ root: join(__dirname, '../../web/dist') }));

// Root route and SPA fallback - serve index.html
app.get('*', async (c) => {
  // Skip API routes
  if (c.req.path.startsWith('/api')) {
    return;
  }
  
  try {
    const indexPath = join(__dirname, '../../web/dist/index.html');
    const html = readFileSync(indexPath, 'utf-8');
    return c.html(html);
  } catch (error) {
    console.error('Error serving index.html:', error);
    return c.text('Web app not found', 404);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

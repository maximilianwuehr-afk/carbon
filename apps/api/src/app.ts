/**
 * Hono app setup with all routes.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { notesRoutes } from './routes/notes.js';
import { syncRoutes } from './routes/sync.js';
import { filesRoutes } from './routes/files.js';
import { calendarRoutes } from './routes/calendar.js';
import { driveRoutes } from './routes/drive.js';
import { chatRoutes } from './routes/chat.js';
import { authRoutes } from './routes/auth.js';

export const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Carbon API',
    version: '0.1.0',
    description: 'Local-first Markdown notes with sync and Google Workspace integration',
    endpoints: {
      health: '/health',
      notes: '/notes',
      sync: '/sync',
      files: '/files',
      calendar: '/calendar',
      drive: '/drive',
      chat: '/chat',
      auth: '/auth',
    },
  });
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.route('/notes', notesRoutes);
app.route('/sync', syncRoutes);
app.route('/files', filesRoutes);
app.route('/calendar', calendarRoutes);
app.route('/drive', driveRoutes);
app.route('/chat', chatRoutes);
app.route('/auth', authRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

/**
 * Carbon API Server
 *
 * Main entry point for the Hono-based API server.
 * Handles note CRUD, sync, Google Workspace integration, and AI chat.
 */

import { serve } from '@hono/node-server';
import { app } from './app.js';
import { initDatabase } from './db/index.js';
import { initVault } from './services/vault.js';
import { getConfig } from './config.js';

const config = getConfig();

async function main() {
  console.log('🚀 Starting Carbon API...');

  // Initialize database
  console.log('📦 Initializing database...');
  await initDatabase(config.databasePath);

  // Initialize vault directory
  console.log('📁 Initializing vault...');
  await initVault(config.vaultPath);

  // Start server
  console.log(`🌐 Starting server on port ${config.port}...`);
  serve({
    fetch: app.fetch,
    port: config.port,
  });

  console.log(`✅ Carbon API running at http://localhost:${config.port}`);
}

main().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

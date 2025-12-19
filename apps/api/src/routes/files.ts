/**
 * File upload/download routes for attachments.
 */

import { Hono } from 'hono';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { getVaultPath } from '../services/vault.js';
import { randomUUID } from 'crypto';

const uuid = () => randomUUID();

export const filesRoutes = new Hono();

// Upload a file
filesRoutes.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  const pathParam = body['path'] as string;
  
  if (!file || !pathParam) {
    return c.json({ error: 'File and path are required' }, 400);
  }
  
  const vaultPath = getVaultPath();
  const fullPath = join(vaultPath, pathParam);
  
  // Ensure directory exists
  await fs.mkdir(dirname(fullPath), { recursive: true });
  
  // Write file
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(fullPath, Buffer.from(arrayBuffer));
  
  const stats = await fs.stat(fullPath);
  
  return c.json({
    id: uuid(),
    path: pathParam,
    storageKey: pathParam,
    size: stats.size,
  });
});

// Download a file
filesRoutes.get('/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const vaultPath = getVaultPath();
  const fullPath = join(vaultPath, path);
  
  try {
    const content = await fs.readFile(fullPath);
    const stats = await fs.stat(fullPath);
    
    // Determine content type
    const ext = path.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
    };
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stats.size),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'File not found' }, 404);
    }
    throw error;
  }
});

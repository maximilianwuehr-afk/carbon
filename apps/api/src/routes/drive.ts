/**
 * Google Drive integration routes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';

export const driveRoutes = new Hono();

// Helper to get access token (reused from calendar)
async function getAccessToken(): Promise<string | null> {
  const db = getDb();
  const row = db
    .prepare('SELECT access_token, expires_at FROM oauth_tokens WHERE provider = ?')
    .get('google') as { access_token: string; expires_at: string } | undefined;
  
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  
  return row.access_token;
}

// Search files
driveRoutes.get(
  '/files',
  zValidator(
    'query',
    z.object({
      q: z.string().optional(),
      pageToken: z.string().optional(),
    })
  ),
  async (c) => {
    const { q, pageToken } = c.req.valid('query');
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return c.json({ error: 'Not authenticated with Google' }, 401);
    }
    
    try {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      
      // Build query
      let driveQuery = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
      if (q) {
        driveQuery = `name contains '${q}' and ${driveQuery}`;
      }
      
      url.searchParams.set('q', driveQuery);
      url.searchParams.set('orderBy', 'modifiedTime desc');
      url.searchParams.set('pageSize', '20');
      url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, iconLink, thumbnailLink)');
      
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }
      
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        return c.json({ error: 'Failed to fetch files' }, response.status);
      }
      
      const data = await response.json();
      
      return c.json({
        files: data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          iconLink: file.iconLink,
          thumbnailLink: file.thumbnailLink,
        })),
        nextPageToken: data.nextPageToken,
      });
    } catch (error) {
      console.error('Drive API error:', error);
      return c.json({ error: 'Failed to fetch files' }, 500);
    }
  }
);

// Get recent files
driveRoutes.get('/files/recent', async (c) => {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return c.json({ error: 'Not authenticated with Google' }, 401);
  }
  
  try {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', "mimeType != 'application/vnd.google-apps.folder' and trashed = false");
    url.searchParams.set('orderBy', 'viewedByMeTime desc');
    url.searchParams.set('pageSize', '10');
    url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)');
    
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      return c.json({ error: 'Failed to fetch recent files' }, response.status);
    }
    
    const data = await response.json();
    
    return c.json({
      files: data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
      })),
    });
  } catch (error) {
    console.error('Drive API error:', error);
    return c.json({ error: 'Failed to fetch recent files' }, 500);
  }
});

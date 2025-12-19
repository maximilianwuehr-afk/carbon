/**
 * Authentication routes for Google OAuth.
 */

import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';

export const authRoutes = new Hono();

// Initiate Google OAuth
authRoutes.get('/google', (c) => {
  const config = getConfig();
  
  if (!config.googleClientId) {
    return c.json({ error: 'Google OAuth not configured' }, 500);
  }
  
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: config.googleRedirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// OAuth callback
authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  
  if (error) {
    return c.json({ error: `OAuth error: ${error}` }, 400);
  }
  
  if (!code) {
    return c.json({ error: 'No authorization code received' }, 400);
  }
  
  const config = getConfig();
  
  try {
    // Exchange code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange error:', error);
      return c.json({ error: 'Failed to exchange authorization code' }, 500);
    }
    
    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    // Store tokens
    const db = getDb();
    db.prepare(
      `INSERT INTO oauth_tokens (provider, access_token, refresh_token, expires_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(provider) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, oauth_tokens.refresh_token),
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`
    ).run('google', tokens.access_token, tokens.refresh_token || null, expiresAt, new Date().toISOString());
    
    // Redirect back to app
    return c.redirect('/?auth=success');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Check auth status
authRoutes.get('/status', (c) => {
  const db = getDb();
  const row = db
    .prepare('SELECT provider, expires_at FROM oauth_tokens WHERE provider = ?')
    .get('google') as { provider: string; expires_at: string } | undefined;
  
  if (!row) {
    return c.json({ authenticated: false });
  }
  
  const isValid = new Date(row.expires_at) > new Date();
  
  return c.json({
    authenticated: true,
    provider: 'google',
    valid: isValid,
  });
});

// Logout
authRoutes.post('/logout', (c) => {
  const db = getDb();
  db.prepare('DELETE FROM oauth_tokens WHERE provider = ?').run('google');
  return c.json({ success: true });
});

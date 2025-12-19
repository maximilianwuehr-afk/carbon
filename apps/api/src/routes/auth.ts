/**
 * Authentication routes for Google OAuth.
 */

import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';
import { randomUUID } from 'crypto';

export const authRoutes = new Hono();

// Helper to create a session
function createSession(provider: string): string {
  const db = getDb();
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  db.prepare(
    `INSERT INTO sessions (id, provider, created_at, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(sessionId, provider, now.toISOString(), expiresAt.toISOString());
  
  return sessionId;
}

// Helper to validate a session
export function validateSession(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  
  const db = getDb();
  const row = db
    .prepare('SELECT expires_at FROM sessions WHERE id = ?')
    .get(sessionId) as { expires_at: string } | undefined;
  
  if (!row) return false;
  
  return new Date(row.expires_at) > new Date();
}

// Initiate Google OAuth
authRoutes.get('/google', (c) => {
  const config = getConfig();
  
  if (!config.googleClientId) {
    return c.json({ error: 'Google OAuth not configured' }, 500);
  }
  
  // Construct redirect URI - use HTTPS in production
  const host = c.req.header('host') || 'carbon-notes.fly.dev';
  const protocol = c.req.header('x-forwarded-proto') || (config.nodeEnv === 'production' ? 'https' : 'http');
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
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
    
    // Construct redirect URI - use HTTPS in production
    const host = c.req.header('host') || 'carbon-notes.fly.dev';
    const protocol = c.req.header('x-forwarded-proto') || (config.nodeEnv === 'production' ? 'https' : 'http');
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    
    try {
      // Exchange code for tokens
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.googleClientId,
          client_secret: config.googleClientSecret,
          redirect_uri: redirectUri,
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
    
    // Create session
    const sessionId = createSession('google');
    
    // Set session cookie using Hono's cookie helper
    setCookie(c, 'session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      secure: true,
    });
    
    // Redirect to home
    return c.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Check auth status
authRoutes.get('/status', (c) => {
  const sessionId = getCookie(c, 'session');
  console.log('Auth status check - sessionId:', sessionId ? 'present' : 'missing');
  const isAuthenticated = validateSession(sessionId);
  
  if (!isAuthenticated) {
    return c.json({ authenticated: false });
  }
  
  const db = getDb();
  const row = db
    .prepare('SELECT provider, expires_at FROM oauth_tokens WHERE provider = ?')
    .get('google') as { provider: string; expires_at: string } | undefined;
  
  const tokenValid = row && new Date(row.expires_at) > new Date();
  
  return c.json({
    authenticated: true,
    provider: 'google',
    valid: tokenValid,
  });
});

// Logout
authRoutes.post('/logout', (c) => {
  const sessionId = getCookie(c, 'session');
  
  if (sessionId) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  
  // Clear cookie
  setCookie(c, 'session', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 0,
    secure: true,
  });
  
  return c.json({ success: true });
});

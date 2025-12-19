/**
 * Google Calendar integration routes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDb } from '../db/index.js';
import { getConfig } from '../config.js';

export const calendarRoutes = new Hono();

// Helper to get access token
async function getAccessToken(): Promise<string | null> {
  const db = getDb();
  const row = db
    .prepare('SELECT access_token, refresh_token, expires_at FROM oauth_tokens WHERE provider = ?')
    .get('google') as { access_token: string; refresh_token: string; expires_at: string } | undefined;
  
  if (!row) return null;
  
  // Check if token is expired
  if (new Date(row.expires_at) < new Date()) {
    // Refresh token
    const refreshed = await refreshAccessToken(row.refresh_token);
    if (!refreshed) return null;
    return refreshed.access_token;
  }
  
  return row.access_token;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: string } | null> {
  const config = getConfig();
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    
    // Update token in database
    const db = getDb();
    db.prepare(
      `UPDATE oauth_tokens SET access_token = ?, expires_at = ?, updated_at = ? WHERE provider = ?`
    ).run(data.access_token, expiresAt, new Date().toISOString(), 'google');
    
    return { access_token: data.access_token, expires_at: expiresAt };
  } catch {
    return null;
  }
}

// Get events for a day
calendarRoutes.get(
  '/events',
  zValidator(
    'query',
    z.object({
      date: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
    })
  ),
  async (c) => {
    const { date, start, end } = c.req.valid('query');
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return c.json({ error: 'Not authenticated with Google' }, 401);
    }
    
    // Calculate time range
    let timeMin: string;
    let timeMax: string;
    
    if (date) {
      const d = new Date(date);
      timeMin = new Date(d.setHours(0, 0, 0, 0)).toISOString();
      timeMax = new Date(d.setHours(23, 59, 59, 999)).toISOString();
    } else {
      timeMin = start || new Date().toISOString();
      timeMax = end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    try {
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        return c.json({ error: 'Failed to fetch events' }, response.status);
      }
      
      const data = await response.json();
      
      return c.json({
        events: data.items.map((event: any) => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          meetUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
          attendees: event.attendees?.map((a: any) => ({
            email: a.email,
            name: a.displayName,
            responseStatus: a.responseStatus,
          })),
          organizer: event.organizer,
        })),
      });
    } catch (error) {
      console.error('Calendar API error:', error);
      return c.json({ error: 'Failed to fetch events' }, 500);
    }
  }
);

// Search events
calendarRoutes.get(
  '/search',
  zValidator('query', z.object({ q: z.string() })),
  async (c) => {
    const { q } = c.req.valid('query');
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return c.json({ error: 'Not authenticated with Google' }, 401);
    }
    
    try {
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('q', q);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('timeMin', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      url.searchParams.set('maxResults', '20');
      
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        return c.json({ error: 'Failed to search events' }, response.status);
      }
      
      const data = await response.json();
      
      return c.json({
        events: data.items.map((event: any) => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
        })),
      });
    } catch (error) {
      console.error('Calendar search error:', error);
      return c.json({ error: 'Failed to search events' }, 500);
    }
  }
);

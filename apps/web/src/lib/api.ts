/**
 * API client for Carbon backend.
 */

const API_BASE = '/api';

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for session management
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Notes API
export const notesApi = {
  list: () => fetchApi<{ notes: any[] }>('/notes'),
  tree: () => fetchApi<{ tree: any[] }>('/notes/tree'),
  get: (path: string) => fetchApi<{ note: any }>(`/notes/${encodeURIComponent(path)}`),
  save: (path: string, markdown: string) =>
    fetchApi<{ note: any }>(`/notes/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ markdown }),
    }),
  delete: (path: string) =>
    fetchApi<{ success: boolean }>(`/notes/${encodeURIComponent(path)}`, {
      method: 'DELETE',
    }),
  search: (q: string) => fetchApi<{ results: any[] }>(`/notes/search?q=${encodeURIComponent(q)}`),
  backlinks: (path: string) =>
    fetchApi<{ backlinks: any[] }>(`/notes/backlinks/${encodeURIComponent(path)}`),
};

// Calendar API
export const calendarApi = {
  events: (date: string) =>
    fetchApi<{ events: any[] }>(`/calendar/events?date=${date}`),
  search: (q: string) =>
    fetchApi<{ events: any[] }>(`/calendar/search?q=${encodeURIComponent(q)}`),
};

// Drive API
export const driveApi = {
  files: (q?: string) =>
    fetchApi<{ files: any[] }>(`/drive/files${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  recent: () => fetchApi<{ files: any[] }>('/drive/files/recent'),
};

// Auth API
export const authApi = {
  status: () => fetchApi<{ authenticated: boolean; provider?: string }>('/auth/status'),
  logout: () => fetchApi<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

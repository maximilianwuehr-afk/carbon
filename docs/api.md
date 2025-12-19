# Carbon API Reference

Base URL: `http://localhost:3000` (development) or your Fly.io URL (production)

## Authentication

### Google OAuth

#### GET /auth/google
Initiate Google OAuth flow. Redirects to Google consent page.

#### GET /auth/google/callback
OAuth callback. Exchanges code for tokens and stores them.

#### GET /auth/status
Check authentication status.

**Response:**
```json
{
  "authenticated": true,
  "provider": "google",
  "valid": true
}
```

#### POST /auth/logout
Clear stored OAuth tokens.

---

## Notes

### GET /notes
List all notes.

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "path": "Daily notes/2025-12-19.md",
      "title": "2025-12-19",
      "updatedAt": "2025-12-19T10:00:00Z"
    }
  ]
}
```

### GET /notes/tree
Get folder tree structure.

**Response:**
```json
{
  "tree": [
    {
      "name": "Daily notes",
      "path": "Daily notes",
      "type": "folder",
      "children": [
        {
          "name": "2025-12-19.md",
          "path": "Daily notes/2025-12-19.md",
          "type": "note"
        }
      ]
    }
  ]
}
```

### GET /notes/search?q={query}
Search notes.

**Response:**
```json
{
  "results": [
    {
      "path": "Daily notes/2025-12-19.md",
      "title": "2025-12-19",
      "snippet": "...matching <mark>text</mark>..."
    }
  ]
}
```

### GET /notes/backlinks/{path}
Get notes that link to the specified note.

**Response:**
```json
{
  "backlinks": [
    { "path": "People/John Doe.md" }
  ]
}
```

### GET /notes/{path}
Get a single note.

**Response:**
```json
{
  "note": {
    "id": "uuid",
    "path": "Daily notes/2025-12-19.md",
    "title": "2025-12-19",
    "markdown": "# 2025-12-19\n...",
    "frontmatter": {},
    "revision": "abc123",
    "updatedAt": "2025-12-19T10:00:00Z"
  }
}
```

### PUT /notes/{path}
Create or update a note.

**Request:**
```json
{
  "markdown": "# Note content\n...",
  "baseRevision": "abc123"
}
```

**Response:**
```json
{
  "note": {
    "id": "uuid",
    "path": "path/to/note.md",
    "title": "Note content",
    "revision": "def456",
    "updatedAt": "2025-12-19T10:00:00Z"
  }
}
```

### DELETE /notes/{path}
Delete a note.

**Response:**
```json
{
  "success": true
}
```

---

## Sync

### POST /sync/pull
Pull changes since cursor.

**Request:**
```json
{
  "deviceId": "device-uuid",
  "cursor": "2025-12-19T10:00:00Z"
}
```

**Response:**
```json
{
  "notes": [...],
  "files": [...],
  "deletedPaths": ["old-note.md"],
  "cursor": "2025-12-19T11:00:00Z",
  "hasMore": false
}
```

### POST /sync/push
Push local changes.

**Request:**
```json
{
  "deviceId": "device-uuid",
  "changes": [
    {
      "type": "update",
      "path": "note.md",
      "markdown": "...",
      "revision": "abc",
      "baseRevision": "xyz",
      "updatedAt": "2025-12-19T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "path": "note.md",
      "status": "merged",
      "note": {...}
    }
  ],
  "cursor": "2025-12-19T11:00:00Z"
}
```

---

## Files

### POST /files/upload
Upload a file.

**Request:** multipart/form-data
- `file`: The file to upload
- `path`: Destination path in vault

**Response:**
```json
{
  "id": "uuid",
  "path": "attachments/image.png",
  "storageKey": "attachments/image.png",
  "size": 12345
}
```

### GET /files/{path}
Download a file.

---

## Calendar

### GET /calendar/events?date={YYYY-MM-DD}
Get events for a specific day.

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "title": "Team Meeting",
      "description": "Weekly sync",
      "start": "2025-12-19T10:00:00Z",
      "end": "2025-12-19T11:00:00Z",
      "meetUrl": "https://meet.google.com/xxx",
      "attendees": [
        {
          "email": "john@example.com",
          "name": "John Doe",
          "responseStatus": "accepted"
        }
      ],
      "organizer": {
        "email": "jane@example.com"
      }
    }
  ]
}
```

### GET /calendar/search?q={query}
Search events.

---

## Drive

### GET /drive/files?q={query}
Search Drive files.

**Response:**
```json
{
  "files": [
    {
      "id": "file-id",
      "name": "Document.pdf",
      "mimeType": "application/pdf",
      "modifiedTime": "2025-12-19T10:00:00Z",
      "webViewLink": "https://drive.google.com/...",
      "iconLink": "https://..."
    }
  ],
  "nextPageToken": "..."
}
```

### GET /drive/files/recent
Get recently viewed files.

---

## Chat

### POST /chat
Streaming AI chat.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Summarize my notes" }
  ],
  "context": {
    "currentNotePath": "Daily notes/2025-12-19.md",
    "selectedText": "...",
    "notePaths": ["People/John.md"]
  }
}
```

**Response:** Server-sent events stream

### GET /chat/commands
Get available AI commands for slash menu.

**Response:**
```json
{
  "commands": [
    {
      "id": "summarize",
      "name": "Summarize",
      "description": "Summarize the current note"
    }
  ]
}
```

---

## Health

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:00:00Z"
}
```

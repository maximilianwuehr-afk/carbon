/**
 * Daily Note view with integrated agenda.
 *
 * Mimics the /wuehr pattern:
 * - Gratitude, priorities, habits sections
 * - Auto-inserted calendar agenda
 * - Thoughts & work log
 */

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, RefreshCw, Plus } from 'lucide-react';
import { getDailyNotePath } from '@carbon/core';

interface DailyNoteProps {
  date?: Date;
  onOpenNote: (path: string) => void;
}

export function DailyNote({ date = new Date(), onOpenNote }: DailyNoteProps) {
  const queryClient = useQueryClient();
  const path = getDailyNotePath(date);
  const dateString = date.toISOString().split('T')[0];

  // Fetch note content
  const { data: noteData, isLoading: noteLoading } = useQuery({
    queryKey: ['note', path],
    queryFn: async () => {
      const res = await fetch(`/api/notes/${encodeURIComponent(path)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load note');
      return res.json();
    },
  });

  // Fetch calendar events
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar-events', dateString],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events?date=${dateString}`);
      if (!res.ok) return { events: [], needsAuth: res.status === 401 };
      return res.json();
    },
  });

  // Create daily note mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const template = generateDailyNoteTemplate(date, calendarData?.events || []);
      const res = await fetch(`/api/notes/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: template }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', path] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
    },
  });

  // Insert agenda mutation
  const insertAgendaMutation = useMutation({
    mutationFn: async () => {
      const currentMarkdown = noteData?.note?.markdown || '';
      const agenda = formatAgenda(calendarData?.events || []);
      
      // Find ## Meetings section and insert agenda
      let newMarkdown: string;
      if (currentMarkdown.includes('## Meetings')) {
        newMarkdown = currentMarkdown.replace(
          /## Meetings\n/,
          `## Meetings\n${agenda}\n`
        );
      } else {
        // Append agenda section
        newMarkdown = `${currentMarkdown}\n\n## Meetings\n${agenda}`;
      }
      
      const res = await fetch(`/api/notes/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: newMarkdown }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', path] });
    },
  });

  const events = calendarData?.events || [];
  const hasNote = !!noteData?.note;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <p className="text-sm text-muted-foreground">{path}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasNote ? (
              <button
                onClick={() => onOpenNote(path)}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Open Note
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Daily Note'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Calendar Events */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Today's Agenda
            </h3>
            {hasNote && events.length > 0 && (
              <button
                onClick={() => insertAgendaMutation.mutate()}
                disabled={insertAgendaMutation.isPending}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Insert into note
              </button>
            )}
          </div>

          {calendarLoading ? (
            <p className="text-sm text-muted-foreground">Loading events...</p>
          ) : calendarData?.needsAuth ? (
            <div className="p-4 bg-secondary/30 rounded border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Connect Google Calendar to see your agenda.
              </p>
              <a
                href="/api/auth/google"
                className="text-sm text-primary hover:underline"
              >
                Connect Google
              </a>
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled</p>
          ) : (
            <div className="space-y-2">
              {events.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Note Preview */}
        {hasNote && (
          <section>
            <h3 className="font-medium mb-3">Note Preview</h3>
            <div className="p-4 bg-card border border-border rounded font-mono text-sm whitespace-pre-wrap">
              {noteData.note.markdown.slice(0, 500)}
              {noteData.note.markdown.length > 500 && '...'}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const startTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endTime = new Date(event.end).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded hover:border-primary/50 transition-colors">
      <div className="text-xs font-mono text-muted-foreground min-w-[100px]">
        {startTime} – {endTime}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{event.title}</p>
        {event.attendees && event.attendees.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            with {event.attendees.map((a: any) => a.name || a.email).join(', ')}
          </p>
        )}
        {event.meetUrl && (
          <a
            href={event.meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            Join meeting
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Generate daily note template matching /wuehr pattern
 */
function generateDailyNoteTemplate(date: Date, events: any[]): string {
  const agenda = formatAgenda(events);
  
  return `* ## [[Daily note]]
\t- **Grateful for**
\t\t- 
\t- **Priorities**
\t\t- 
\t- **Daily habits**
\t\t- Be present. In every meeting. In every second.
## Meetings
${agenda}
## Thoughts & Work
* 
`;
}

/**
 * Format events as Markdown agenda matching /wuehr pattern
 */
function formatAgenda(events: any[]): string {
  if (events.length === 0) return '';
  
  return events
    .map((event) => {
      const time = new Date(event.start).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      // Format attendees as wiki-links
      const attendees = event.attendees
        ?.filter((a: any) => a.responseStatus !== 'declined')
        ?.map((a: any) => {
          const name = a.name || a.email.split('@')[0].replace(/[._]/g, ' ');
          return `[[People/${name}|${name}]]`;
        })
        ?.join(', ');
      
      // Create meeting link (path matches /wuehr pattern)
      const safeTitle = (event.title || 'Meeting').replace(/[<>:"/\\|?*]/g, '-');
      const eventDate = new Date(event.start);
      const meetingPath = `Meetings/${eventDate.toISOString().slice(0, 7)}/${safeTitle} ~${event.id}`;
      
      let line = `- ${time} – [[${meetingPath}|${event.title}]]`;
      if (attendees) {
        line += ` with ${attendees}`;
      }
      
      return line;
    })
    .join('\n');
}

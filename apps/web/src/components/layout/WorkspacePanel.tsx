import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, FolderOpen, ChevronRight, Plus } from 'lucide-react';
import { calendarApi, driveApi } from '../../lib/api';

type Tab = 'calendar' | 'drive';

export function WorkspacePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'drive'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Drive
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'drive' && <DriveTab />}
      </div>
    </div>
  );
}

function CalendarTab() {
  const today = new Date().toISOString().split('T')[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar-events', today],
    queryFn: async () => {
      try {
        return await calendarApi.events(today);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('Not authenticated')) {
          return { needsAuth: true, events: [] };
        }
        throw err;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading events...</div>
    );
  }

  if (data?.needsAuth) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Connect Google Calendar to see your events.
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Connect Google
        </a>
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Today's Events
        </span>
        <button
          className="text-xs text-primary hover:underline"
          title="Insert agenda into daily note"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {events.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">No events today</p>
      ) : (
        <div className="space-y-1">
          {events.map((event: any) => (
            <button
              key={event.id}
              className="w-full flex items-start gap-2 p-2 text-left rounded hover:bg-secondary/50 transition-colors group"
            >
              <span className="text-xs text-muted-foreground font-mono min-w-[50px]">
                {new Date(event.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
              <span className="text-sm flex-1 truncate">{event.title}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}

      <button className="w-full mt-2 py-2 text-sm text-primary hover:underline">
        Insert Agenda
      </button>
    </div>
  );
}

function DriveTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['drive-recent'],
    queryFn: async () => {
      try {
        return await driveApi.recent();
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('Not authenticated')) {
          return { needsAuth: true, files: [] };
        }
        throw err;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading files...</div>
    );
  }

  if (data?.needsAuth) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Connect Google Drive to access your files.
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Connect Google
        </a>
      </div>
    );
  }

  const files = data?.files || [];

  return (
    <div className="p-2">
      <div className="px-2 py-1 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent Files
        </span>
      </div>

      {files.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">No recent files</p>
      ) : (
        <div className="space-y-1">
          {files.map((file: any) => (
            <button
              key={file.id}
              className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-secondary/50 transition-colors group"
            >
              {file.iconLink && (
                <img src={file.iconLink} alt="" className="w-4 h-4" />
              )}
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

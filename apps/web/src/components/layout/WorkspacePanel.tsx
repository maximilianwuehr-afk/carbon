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
      <div className="flex border-b-2 border-border">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 ${
            activeTab === 'calendar'
              ? 'text-foreground border-primary bg-secondary'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 ${
            activeTab === 'drive'
              ? 'text-foreground border-primary bg-secondary'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
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

  const { data, isLoading, error } = useQuery<{ events: any[] } | { needsAuth: true; events: [] }>({
    queryKey: ['calendar-events', today],
    queryFn: async () => {
      try {
        return await calendarApi.events(today);
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('Not authenticated')) {
          return { needsAuth: true as const, events: [] };
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

  if (data && 'needsAuth' in data && data.needsAuth) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Connect Google Calendar to see your events.
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/95"
        >
          Connect Google
        </a>
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div className="p-2">
      <div className="flex items-center justify-between px-2 py-2 mb-2 border-b-2 border-border">
        <span className="text-xs font-bold text-foreground uppercase tracking-widest">
          Today's Events
        </span>
        <button
          className="p-1 border-2 border-transparent hover:border-primary hover:bg-secondary"
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
              className="w-full flex items-start gap-2 p-2 text-left border-l-2 border-transparent hover:border-primary hover:bg-secondary group"
            >
              <span className="text-xs text-muted-foreground font-mono font-semibold min-w-[50px]">
                {new Date(event.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
              <span className="text-sm font-medium flex-1 truncate">{event.title}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      <button className="w-full mt-2 py-2 text-sm font-semibold text-primary border-2 border-primary hover:bg-primary/10">
        Insert Agenda
      </button>
    </div>
  );
}

function DriveTab() {
  const { data, isLoading } = useQuery<{ files: any[] } | { needsAuth: true; files: [] }>({
    queryKey: ['drive-recent'],
    queryFn: async () => {
      try {
        return await driveApi.recent();
      } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('Not authenticated')) {
          return { needsAuth: true as const, files: [] };
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

  if (data && 'needsAuth' in data && data.needsAuth) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Connect Google Drive to access your files.
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/95"
        >
          Connect Google
        </a>
      </div>
    );
  }

  const files = data?.files || [];

  return (
    <div className="p-2">
      <div className="px-2 py-2 mb-2 border-b-2 border-border">
        <span className="text-xs font-bold text-foreground uppercase tracking-widest">
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
              className="w-full flex items-center gap-2 p-2 text-left border-l-2 border-transparent hover:border-primary hover:bg-secondary group"
            >
              {file.iconLink && (
                <img src={file.iconLink} alt="" className="w-4 h-4" />
              )}
              <span className="text-sm font-medium flex-1 truncate">{file.name}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

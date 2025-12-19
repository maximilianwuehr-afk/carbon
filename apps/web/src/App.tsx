import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Editor } from './components/layout/Editor';
import { ChatPanel } from './components/layout/ChatPanel';
import { WorkspacePanel } from './components/layout/WorkspacePanel';
import { Header } from './components/layout/Header';
import { authApi } from './lib/api';

/**
 * Main application layout.
 *
 * Layout (non-negotiable per spec):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Header                                                                   │
 * ├────────────────┬──────────────────────────────────┬─────────────────────┤
 * │ Sidebar        │ Editor                           │ Chat Panel          │
 * │ - Folder Tree  │                                  │                     │
 * │ - Note List    │                                  │                     │
 * ├────────────────┤                                  │                     │
 * │ Workspace      │                                  │                     │
 * │ - Calendar     │                                  │                     │
 * │ - Drive        │                                  │                     │
 * └────────────────┴──────────────────────────────────┴─────────────────────┘
 */
export function App() {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(320);
  const [showChat, setShowChat] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [newNotePath, setNewNotePath] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status
    authApi
      .status()
      .then((status) => {
        setIsAuthenticated(status.authenticated);
        if (!status.authenticated) {
          navigate('/login');
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        navigate('/login');
      });
  }, [navigate]);

  // Show nothing while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect handled by useEffect, but show nothing if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <Header onToggleChat={() => setShowChat(!showChat)} showChat={showChat} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div
          className="flex flex-col border-r-2 border-border bg-card"
          style={{ width: sidebarWidth }}
        >
          {/* Folder tree + note list */}
          <div className="flex-1 overflow-hidden">
            <Sidebar
              selectedPath={selectedPath}
              onSelectNote={setSelectedPath}
              onNewNoteCreated={setNewNotePath}
            />
          </div>

          {/* Workspace panel (Calendar + Drive) */}
          <div className="h-64 border-t border-border">
            <WorkspacePanel />
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-0.5 cursor-col-resize bg-border hover:bg-primary"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;

            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX);
              setSidebarWidth(Math.max(200, Math.min(400, newWidth)));
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Main editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            path={selectedPath}
            onNavigate={setSelectedPath}
            isNewNote={selectedPath === newNotePath}
            onNewNoteFocused={() => setNewNotePath(null)}
          />
        </div>

        {/* Chat panel */}
        {showChat && (
          <>
            {/* Resizer */}
            <div
              className="w-0.5 cursor-col-resize bg-border hover:bg-primary"
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startWidth = chatWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth - (e.clientX - startX);
                  setChatWidth(Math.max(250, Math.min(500, newWidth)));
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />

            <div
              className="border-l-2 border-border bg-card"
              style={{ width: chatWidth }}
            >
              <ChatPanel currentNotePath={selectedPath} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

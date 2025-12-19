import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Editor } from './components/layout/Editor';
import { ChatPanel } from './components/layout/ChatPanel';
import { WorkspacePanel } from './components/layout/WorkspacePanel';
import { Header } from './components/layout/Header';

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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [chatWidth, setChatWidth] = useState(320);
  const [showChat, setShowChat] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <Header onToggleChat={() => setShowChat(!showChat)} showChat={showChat} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div
          className="flex flex-col border-r border-border bg-card"
          style={{ width: sidebarWidth }}
        >
          {/* Folder tree + note list */}
          <div className="flex-1 overflow-hidden">
            <Sidebar
              selectedPath={selectedPath}
              onSelectNote={setSelectedPath}
            />
          </div>

          {/* Workspace panel (Calendar + Drive) */}
          <div className="h-64 border-t border-border">
            <WorkspacePanel />
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
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
          <Editor path={selectedPath} onNavigate={setSelectedPath} />
        </div>

        {/* Chat panel */}
        {showChat && (
          <>
            {/* Resizer */}
            <div
              className="w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
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
              className="border-l border-border bg-card"
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

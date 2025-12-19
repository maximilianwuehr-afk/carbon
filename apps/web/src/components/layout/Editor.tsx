import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { Eye, Edit3, Columns, Save } from 'lucide-react';

interface EditorProps {
  path: string | null;
  onNavigate: (path: string) => void;
}

type ViewMode = 'edit' | 'preview' | 'split';

export function Editor({ path, onNavigate }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [localContent, setLocalContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  // Fetch note content
  const { data: noteData, isLoading } = useQuery({
    queryKey: ['note', path],
    queryFn: async () => {
      if (!path) return null;
      const res = await fetch(`/api/notes/${encodeURIComponent(path)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!path,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ path, markdown }: { path: string; markdown: string }) => {
      const res = await fetch(`/api/notes/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      });
      return res.json();
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['tree'] });
    },
  });

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setLocalContent(update.state.doc.toString());
            setIsDirty(true);
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            padding: '16px',
          },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update editor content when note changes
  useEffect(() => {
    if (!viewRef.current || !noteData?.note) return;

    const currentContent = viewRef.current.state.doc.toString();
    const newContent = noteData.note.markdown;

    if (currentContent !== newContent) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newContent,
        },
      });
      setLocalContent(newContent);
      setIsDirty(false);
    }
  }, [noteData]);

  // Save handler
  const handleSave = () => {
    if (!path || !isDirty) return;
    saveMutation.mutate({ path, markdown: localContent });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [path, localContent, isDirty]);

  if (!path) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No note selected</p>
          <p className="text-sm mt-1">Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  const title = path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled';

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-lg">{title}</h2>
          {isDirty && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* View mode buttons */}
          <button
            onClick={() => setViewMode('edit')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'edit'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'preview'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
            title="Split view"
          >
            <Columns className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className={`p-1.5 rounded transition-colors ${
              isDirty
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground'
            }`}
            title="Save (⌘S)"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' && (
          <div ref={editorRef} className="h-full" />
        )}

        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto p-4 prose prose-sm max-w-none">
            <MarkdownPreview content={localContent} />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="flex h-full">
            <div ref={editorRef} className="flex-1 border-r border-border" />
            <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none">
              <MarkdownPreview content={localContent} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple markdown preview (can be enhanced later)
function MarkdownPreview({ content }: { content: string }) {
  // Basic markdown rendering - in production, use a proper markdown library
  const html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\[\[(.*?)\]\]/g, '<span class="wiki-link">$1</span>')
    .replace(/\n/g, '<br />');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Search,
  Plus,
} from 'lucide-react';
import type { TreeNode } from '@carbon/core';

interface SidebarProps {
  selectedPath: string | null;
  onSelectNote: (path: string) => void;
}

export function Sidebar({ selectedPath, onSelectNote }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['Daily notes', 'People', 'Meetings'])
  );

  // Fetch folder tree
  const { data: treeData } = useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      const res = await fetch('/api/notes/tree');
      return res.json();
    },
  });

  const tree: TreeNode[] = treeData?.tree || [];

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpandedFolders(next);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = node.path === selectedPath;
    const paddingLeft = 12 + depth * 16;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className={`
              w-full flex items-center gap-1.5 py-1.5 px-2 text-sm
              hover:bg-secondary/50 transition-colors text-left
            `}
            style={{ paddingLeft }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </button>

          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    if (node.type === 'note') {
      const displayName = node.name.replace(/\.md$/, '');

      return (
        <button
          key={node.path}
          onClick={() => onSelectNote(node.path)}
          className={`
            w-full flex items-center gap-1.5 py-1.5 px-2 text-sm
            hover:bg-secondary/50 transition-colors text-left
            ${isSelected ? 'bg-secondary text-foreground' : ''}
          `}
          style={{ paddingLeft: paddingLeft + 20 }}
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="truncate">{displayName}</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + New note */}
      <div className="p-2 border-b border-border">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary border-0 rounded focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="New note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => renderNode(node))}

        {tree.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No notes yet.
            <br />
            Create your first note!
          </div>
        )}
      </div>
    </div>
  );
}

import { Settings, MessageSquare, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onToggleChat: () => void;
  showChat: boolean;
}

export function Header({ onToggleChat, showChat }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-card">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
          <div className="w-3 h-3 bg-primary-foreground" />
        </div>
        <span className="font-semibold text-lg tracking-tight">Carbon</span>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleChat}
          className={`p-2 rounded hover:bg-secondary transition-colors ${
            showChat ? 'text-primary' : 'text-muted-foreground'
          }`}
          title="Toggle chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <Link
          to="/style-guide"
          className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
        
        <button
          className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground"
          title="Account"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

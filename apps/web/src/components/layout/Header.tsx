import { Settings, MessageSquare, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onToggleChat: () => void;
  showChat: boolean;
}

export function Header({ onToggleChat, showChat }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b-2 border-border bg-card">
      {/* Logo - Geometric, Bauhaus-inspired */}
      <Link to="/" className="flex items-center gap-3">
        <div className="w-6 h-6 bg-primary border-2 border-primary flex items-center justify-center">
          <div className="w-2 h-2 bg-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tighter uppercase">Carbon</span>
      </Link>

      {/* Actions - Functional, geometric */}
      <div className="flex items-center gap-0 border-l-2 border-border pl-2">
        <button
          onClick={onToggleChat}
          className={`p-2 border-2 border-transparent hover:border-border hover:bg-secondary ${
            showChat ? 'text-primary border-primary' : 'text-muted-foreground'
          }`}
          title="Toggle chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <Link
          to="/style-guide"
          className="p-2 border-2 border-transparent hover:border-border hover:bg-secondary text-muted-foreground"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
        
        <button
          className="p-2 border-2 border-transparent hover:border-border hover:bg-secondary text-muted-foreground"
          title="Account"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

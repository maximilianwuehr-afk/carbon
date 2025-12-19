import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, FileText, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  currentNotePath: string | null;
}

export function ChatPanel({ currentNotePath }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextNotes, setContextNotes] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add current note to context
  useEffect(() => {
    if (currentNotePath && !contextNotes.includes(currentNotePath)) {
      setContextNotes([currentNotePath]);
    }
  }, [currentNotePath]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          context: {
            currentNotePath,
            notePaths: contextNotes,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantMessage,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">AI Assistant</span>
      </div>

      {/* Context indicator */}
      {contextNotes.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Context:</span>
            {contextNotes.map((path) => (
              <span
                key={path}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary rounded"
              >
                <FileText className="w-3 h-3" />
                {path.split('/').pop()?.replace('.md', '')}
                <button
                  onClick={() =>
                    setContextNotes((prev) => prev.filter((p) => p !== path))
                  }
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary/50" />
            <p>Ask me anything about your notes!</p>
            <p className="text-xs mt-1">
              I can summarize, extract tasks, or help with writing.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {message.content || (
                <span className="inline-block animate-pulse">...</span>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your notes..."
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-secondary border-0 rounded resize-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

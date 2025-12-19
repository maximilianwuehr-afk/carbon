/**
 * AI Chat routes with streaming.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { streamText } from 'hono/streaming';
import { getConfig } from '../config.js';
import { readNote, listAllNotes } from '../services/vault.js';

export const chatRoutes = new Hono();

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  context: z
    .object({
      currentNotePath: z.string().optional(),
      selectedText: z.string().optional(),
      notePaths: z.array(z.string()).optional(),
    })
    .optional(),
});

chatRoutes.post('/', zValidator('json', chatSchema), async (c) => {
  const { messages, context } = c.req.valid('json');
  const config = getConfig();
  
  if (!config.openaiApiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  // Build system message with context
  let systemMessage = `You are a helpful assistant for Carbon, a Markdown notes app. 
You help the user with their notes, tasks, and questions.
Be concise and helpful.`;
  
  // Add note context if available
  if (context?.currentNotePath) {
    const note = await readNote(context.currentNotePath);
    if (note) {
      systemMessage += `\n\n## Current Note: ${note.title}\n\n${note.markdown.slice(0, 2000)}`;
    }
  }
  
  if (context?.selectedText) {
    systemMessage += `\n\n## Selected Text:\n${context.selectedText}`;
  }
  
  if (context?.notePaths && context.notePaths.length > 0) {
    systemMessage += '\n\n## Referenced Notes:';
    for (const path of context.notePaths.slice(0, 5)) {
      const note = await readNote(path);
      if (note) {
        systemMessage += `\n\n### ${note.title}\n${note.markdown.slice(0, 500)}...`;
      }
    }
  }
  
  // Prepare messages for API
  const apiMessages = [
    { role: 'system', content: systemMessage },
    ...messages,
  ];
  
  // Stream response from OpenAI
  return streamText(c, async (stream) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        await stream.write('Error: Failed to get AI response');
        return;
      }
      
      const reader = response.body?.getReader();
      if (!reader) return;
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                await stream.write(content);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      await stream.write('Error: Failed to get AI response');
    }
  });
});

// Get available commands (for slash menu)
chatRoutes.get('/commands', (c) => {
  return c.json({
    commands: [
      { id: 'summarize', name: 'Summarize', description: 'Summarize the current note' },
      { id: 'tasks', name: 'Extract Tasks', description: 'Extract action items from the note' },
      { id: 'rewrite', name: 'Rewrite', description: 'Rewrite selected text' },
      { id: 'email', name: 'Draft Email', description: 'Draft a follow-up email' },
      { id: 'brief', name: 'Meeting Brief', description: 'Create a meeting brief' },
    ],
  });
});

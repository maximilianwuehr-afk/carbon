/**
 * MCP (Model Context Protocol) Server for vault tools.
 *
 * Exposes vault operations as tools that AI agents can use:
 * - list: List files and folders
 * - read: Read note content
 * - write: Write/update note
 * - append: Append to note
 * - search: Search notes
 * - stat: Get file metadata
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  readNote,
  writeNote,
  listAllNotes,
  getFolderTree,
} from '../services/vault.js';
import { getDb } from '../db/index.js';

export function createMCPServer() {
  const server = new Server(
    {
      name: 'carbon-vault',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'vault_list',
          description: 'List all notes in the vault',
          inputSchema: {
            type: 'object',
            properties: {
              folder: {
                type: 'string',
                description: 'Optional folder to list (e.g., "Daily notes")',
              },
            },
          },
        },
        {
          name: 'vault_read',
          description: 'Read the content of a note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note (e.g., "Daily notes/2025-12-19.md")',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'vault_write',
          description: 'Create or update a note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note',
              },
              content: {
                type: 'string',
                description: 'Markdown content to write',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'vault_append',
          description: 'Append content to an existing note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note',
              },
              content: {
                type: 'string',
                description: 'Content to append',
              },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'vault_search',
          description: 'Search notes by content or title',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum results (default 10)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'vault_stat',
          description: 'Get metadata about a note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'vault_backlinks',
          description: 'Get notes that link to a given note',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the note',
              },
            },
            required: ['path'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'vault_list': {
        const paths = await listAllNotes();
        const filtered = args?.folder
          ? paths.filter((p) => p.startsWith(args.folder as string))
          : paths;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      }

      case 'vault_read': {
        const note = await readNote(args?.path as string);
        if (!note) {
          return {
            content: [{ type: 'text', text: 'Note not found' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: note.markdown,
            },
          ],
        };
      }

      case 'vault_write': {
        const result = await writeNote(
          args?.path as string,
          args?.content as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Written to ${result.path} (revision: ${result.revision})`,
            },
          ],
        };
      }

      case 'vault_append': {
        const existing = await readNote(args?.path as string);
        const newContent = existing
          ? `${existing.markdown}\n${args?.content}`
          : (args?.content as string);
        const result = await writeNote(args?.path as string, newContent);
        return {
          content: [
            {
              type: 'text',
              text: `Appended to ${result.path}`,
            },
          ],
        };
      }

      case 'vault_search': {
        const db = getDb();
        const limit = (args?.limit as number) || 10;
        const results = db
          .prepare(
            `SELECT path, title, snippet(notes_fts, 2, '', '', '...', 32) as snippet
             FROM notes_fts
             WHERE notes_fts MATCH ?
             ORDER BY rank
             LIMIT ?`
          )
          .all(args?.query as string, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'vault_stat': {
        const note = await readNote(args?.path as string);
        if (!note) {
          return {
            content: [{ type: 'text', text: 'Note not found' }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  path: note.path,
                  title: note.title,
                  revision: note.revision,
                  updatedAt: note.updatedAt,
                  frontmatter: note.frontmatter,
                  wordCount: note.markdown.split(/\s+/).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'vault_backlinks': {
        const db = getDb();
        const path = args?.path as string;
        const backlinks = db
          .prepare(
            'SELECT source_path FROM backlinks WHERE target_path = ? OR target_path = ?'
          )
          .all(path, path.replace(/\.md$/, ''));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(backlinks, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  return server;
}

/**
 * Start MCP server on stdio (for use with AI agents)
 */
export async function startMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('MCP server started on stdio');
}

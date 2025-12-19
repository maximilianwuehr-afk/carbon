/**
 * Vault filesystem operations.
 *
 * INVARIANTS:
 * - All paths are relative to vaultPath
 * - Notes are stored as .md files
 * - Directory structure is preserved
 */

import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getConfig } from '../config.js';
import { 
  normalizePath, 
  isMarkdownFile, 
  extractTitle, 
  parseFrontmatter,
  buildTree,
  computeRevision,
  type TreeNode 
} from '@carbon/core';

let vaultPath: string;

export async function initVault(path: string): Promise<void> {
  vaultPath = path;
  
  if (!existsSync(vaultPath)) {
    mkdirSync(vaultPath, { recursive: true });
    console.log(`📁 Created vault directory: ${vaultPath}`);
    
    // Create default folders
    const defaultFolders = ['Daily notes', 'People', 'Meetings', 'Ideas', 'Inbox'];
    for (const folder of defaultFolders) {
      mkdirSync(join(vaultPath, folder), { recursive: true });
    }
    console.log('📁 Created default folders');
  }
}

export function getVaultPath(): string {
  return vaultPath;
}

/**
 * Read a note from the vault
 */
export async function readNote(notePath: string): Promise<{
  path: string;
  markdown: string;
  title: string;
  frontmatter: Record<string, unknown> | null;
  revision: string;
  updatedAt: string;
} | null> {
  const fullPath = join(vaultPath, normalizePath(notePath));
  
  try {
    const markdown = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const { frontmatter } = parseFrontmatter(markdown);
    const title = extractTitle(markdown, notePath);
    const revision = await computeRevision(markdown);
    
    return {
      path: normalizePath(notePath),
      markdown,
      title,
      frontmatter,
      revision,
      updatedAt: stats.mtime.toISOString(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write a note to the vault
 */
export async function writeNote(
  notePath: string, 
  markdown: string
): Promise<{
  path: string;
  revision: string;
  updatedAt: string;
}> {
  if (!vaultPath) {
    throw new Error('Vault not initialized. Call initVault() first.');
  }
  
  const normalized = normalizePath(notePath);
  const fullPath = join(vaultPath, normalized);
  const dir = dirname(fullPath);
  
  // Ensure directory exists (only if not the vault root itself)
  if (dir !== vaultPath) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Write file
  await fs.writeFile(fullPath, markdown, 'utf-8');
  
  const stats = await fs.stat(fullPath);
  const revision = await computeRevision(markdown);
  
  return {
    path: normalized,
    revision,
    updatedAt: stats.mtime.toISOString(),
  };
}

/**
 * Delete a note from the vault
 */
export async function deleteNote(notePath: string): Promise<boolean> {
  const fullPath = join(vaultPath, normalizePath(notePath));
  
  try {
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * List all notes in the vault
 */
export async function listAllNotes(): Promise<string[]> {
  const notes: string[] = [];
  
  async function walk(dir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith('.')) {
          await walk(join(dir, entry.name), relativePath);
        }
      } else if (isMarkdownFile(entry.name)) {
        notes.push(relativePath);
      }
    }
  }
  
  await walk(vaultPath);
  return notes;
}

/**
 * Get folder tree structure
 */
export async function getFolderTree(): Promise<TreeNode[]> {
  const paths: string[] = [];
  
  async function walk(dir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.name.startsWith('.')) continue;
      
      paths.push(relativePath);
      
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), relativePath);
      }
    }
  }
  
  await walk(vaultPath);
  return buildTree(paths);
}

/**
 * Get notes modified since a timestamp
 */
export async function getNotesModifiedSince(since: Date): Promise<string[]> {
  const modified: string[] = [];
  
  async function walk(dir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          await walk(fullPath, relativePath);
        }
      } else if (isMarkdownFile(entry.name)) {
        const stats = await fs.stat(fullPath);
        if (stats.mtime > since) {
          modified.push(relativePath);
        }
      }
    }
  }
  
  await walk(vaultPath);
  return modified;
}

import { describe, it, expect } from 'vitest';
import { parseWikiLinks, getLinkedPaths, resolveWikiLink, createWikiLink } from './parser.js';

describe('parseWikiLinks', () => {
  it('parses simple links', () => {
    const markdown = 'Check out [[Note Name]] for more info.';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Note Name');
    expect(links[0].alias).toBeUndefined();
    expect(links[0].isEmbed).toBe(false);
  });

  it('parses links with aliases', () => {
    const markdown = 'See [[People/John Doe|John]] for details.';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('People/John Doe');
    expect(links[0].alias).toBe('John');
  });

  it('parses links with headings', () => {
    const markdown = 'Jump to [[Note#Section]] here.';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Note');
    expect(links[0].heading).toBe('Section');
  });

  it('parses embeds', () => {
    const markdown = 'Embed this: ![[Image.png]]';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Image.png');
    expect(links[0].isEmbed).toBe(true);
  });

  it('parses multiple links', () => {
    const markdown = '[[Link1]] and [[Link2|Two]] and ![[Embed]]';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(3);
    expect(links[0].target).toBe('Link1');
    expect(links[1].target).toBe('Link2');
    expect(links[1].alias).toBe('Two');
    expect(links[2].isEmbed).toBe(true);
  });

  it('handles complex paths', () => {
    const markdown = '[[Meetings/2025-12/OKR Day ~abc123|OKR Day]]';
    const links = parseWikiLinks(markdown);
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Meetings/2025-12/OKR Day ~abc123');
    expect(links[0].alias).toBe('OKR Day');
  });
});

describe('getLinkedPaths', () => {
  it('returns unique paths', () => {
    const markdown = '[[Note]] and [[Note]] again';
    const paths = getLinkedPaths(markdown);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe('note.md');
  });

  it('normalizes paths to lowercase with .md', () => {
    const markdown = '[[My Note]] and [[Another]]';
    const paths = getLinkedPaths(markdown);
    expect(paths).toContain('my note.md');
    expect(paths).toContain('another.md');
  });
});

describe('resolveWikiLink', () => {
  const allPaths = [
    'Notes/Project.md',
    'People/John Doe.md',
    'Daily notes/2025-12-19.md',
  ];

  it('resolves exact match', () => {
    const result = resolveWikiLink('Notes/Project', 'index.md', allPaths);
    expect(result).toBe('Notes/Project.md');
  });

  it('resolves by filename', () => {
    const result = resolveWikiLink('John Doe', 'index.md', allPaths);
    expect(result).toBe('People/John Doe.md');
  });

  it('returns null for non-existent', () => {
    const result = resolveWikiLink('NonExistent', 'index.md', allPaths);
    expect(result).toBeNull();
  });
});

describe('createWikiLink', () => {
  it('creates simple link', () => {
    expect(createWikiLink('Note')).toBe('[[Note]]');
  });

  it('creates link with alias', () => {
    expect(createWikiLink('Path/Note', { alias: 'Display' })).toBe('[[Path/Note|Display]]');
  });

  it('creates link with heading', () => {
    expect(createWikiLink('Note', { heading: 'Section' })).toBe('[[Note#Section]]');
  });

  it('creates embed', () => {
    expect(createWikiLink('Image.png', { isEmbed: true })).toBe('![[Image.png]]');
  });
});

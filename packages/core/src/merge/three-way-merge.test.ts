import { describe, it, expect } from 'vitest';
import { threeWayMerge, twoWayMerge, mergeMarkdown } from './three-way-merge.js';

describe('threeWayMerge', () => {
  it('returns base when no changes', () => {
    const base = '# Title\n\nContent';
    const result = threeWayMerge(base, base, base);
    expect(result.merged).toBe(base);
    expect(result.clean).toBe(true);
  });

  it('takes server changes when client unchanged', () => {
    const base = '# Title\n\nContent';
    const server = '# Title\n\nNew content from server';
    const result = threeWayMerge(base, base, server);
    expect(result.merged).toBe(server);
    expect(result.clean).toBe(true);
  });

  it('takes client changes when server unchanged', () => {
    const base = '# Title\n\nContent';
    const client = '# Title\n\nNew content from client';
    const result = threeWayMerge(base, client, base);
    expect(result.merged).toBe(client);
    expect(result.clean).toBe(true);
  });

  it('returns either when both made identical changes', () => {
    const base = '# Title\n\nContent';
    const changed = '# Title\n\nSame new content';
    const result = threeWayMerge(base, changed, changed);
    expect(result.merged).toBe(changed);
    expect(result.clean).toBe(true);
  });

  it('merges non-conflicting changes', () => {
    const base = '# Title\n\nParagraph 1\n\nParagraph 2';
    const client = '# Title\n\nParagraph 1 modified\n\nParagraph 2';
    const server = '# Title\n\nParagraph 1\n\nParagraph 2 modified';
    const result = threeWayMerge(base, client, server);
    expect(result.clean).toBe(true);
    expect(result.merged).toContain('Paragraph 1 modified');
    expect(result.merged).toContain('Paragraph 2 modified');
  });

  it('handles additions from both sides', () => {
    const base = '# Title\n\nContent';
    const client = '# Title\n\nContent\n\nClient addition';
    const server = '# Title\n\nServer addition\n\nContent';
    const result = threeWayMerge(base, client, server);
    // Should contain both additions
    expect(result.merged).toContain('Client addition');
    expect(result.merged).toContain('Server addition');
  });
});

describe('twoWayMerge', () => {
  it('returns content when identical', () => {
    const content = '# Title\n\nContent';
    const result = twoWayMerge(content, content);
    expect(result.merged).toBe(content);
    expect(result.clean).toBe(true);
  });

  it('applies client changes to server', () => {
    const client = '# Title\n\nClient content';
    const server = '# Title\n\nServer content';
    const result = twoWayMerge(client, server);
    // Should incorporate client changes
    expect(result.merged).toBeDefined();
  });
});

describe('mergeMarkdown', () => {
  it('uses 3-way when base provided', () => {
    const base = '# Title\n\nContent';
    const client = '# Title\n\nClient content';
    const server = '# Title\n\nServer content';
    const result = mergeMarkdown(client, server, base);
    expect(result).toBeDefined();
  });

  it('uses 2-way when base is null', () => {
    const client = '# Title\n\nClient content';
    const server = '# Title\n\nServer content';
    const result = mergeMarkdown(client, server, null);
    expect(result).toBeDefined();
  });
});

/**
 * Wiki-link parser for Obsidian-compatible links.
 *
 * SUPPORTED SYNTAX:
 * - [[Note]] - Simple link
 * - [[Note|Alias]] - Link with display text
 * - [[Note#Heading]] - Link to heading
 * - [[Note#^blockid]] - Link to block (v2)
 * - ![[Note]] - Embed (v2)
 *
 * INVARIANTS:
 * - Links are case-insensitive for matching
 * - Paths can include folders: [[folder/Note]]
 * - Extensions are optional: [[Note]] matches Note.md
 */

export interface WikiLink {
  /** Full match including brackets */
  raw: string;
  /** Target path (without extension) */
  target: string;
  /** Display alias (if provided) */
  alias?: string;
  /** Heading anchor (if provided) */
  heading?: string;
  /** Block reference (if provided) */
  blockRef?: string;
  /** Whether this is an embed (![[...]]) */
  isEmbed: boolean;
  /** Start index in source text */
  start: number;
  /** End index in source text */
  end: number;
}

/**
 * Regex for matching wiki-links
 * Groups: 1=embed?, 2=target, 3=heading?, 4=blockref?, 5=alias?
 */
const WIKI_LINK_REGEX = /(!?)\[\[([^\]|#^]+)(?:#([^\]|^]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/**
 * Parse all wiki-links from Markdown content.
 */
export function parseWikiLinks(markdown: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(markdown)) !== null) {
    links.push({
      raw: match[0],
      target: match[2].trim(),
      heading: match[3]?.trim(),
      blockRef: match[4]?.trim(),
      alias: match[5]?.trim(),
      isEmbed: match[1] === '!',
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return links;
}

/**
 * Get unique target paths from wiki-links (normalized)
 */
export function getLinkedPaths(markdown: string): string[] {
  const links = parseWikiLinks(markdown);
  const paths = new Set<string>();

  for (const link of links) {
    // Normalize: add .md extension if not present
    let target = link.target;
    if (!target.endsWith('.md')) {
      target = `${target}.md`;
    }
    paths.add(target.toLowerCase());
  }

  return Array.from(paths);
}

/**
 * Resolve a wiki-link target to a full path.
 *
 * RESOLUTION ORDER:
 * 1. Exact match (with .md extension)
 * 2. Case-insensitive match
 * 3. Match in same folder as source
 * 4. Match anywhere in vault
 */
export function resolveWikiLink(
  target: string,
  sourcePath: string,
  allPaths: string[]
): string | null {
  const normalizedTarget = target.toLowerCase();
  const targetWithExt = normalizedTarget.endsWith('.md')
    ? normalizedTarget
    : `${normalizedTarget}.md`;

  // Get source folder
  const sourceFolder = sourcePath.includes('/')
    ? sourcePath.slice(0, sourcePath.lastIndexOf('/'))
    : '';

  // 1. Exact match
  const exactMatch = allPaths.find((p) => p.toLowerCase() === targetWithExt);
  if (exactMatch) return exactMatch;

  // 2. Match in same folder
  if (sourceFolder) {
    const sameFolderPath = `${sourceFolder}/${target}`.toLowerCase();
    const sameFolderMatch = allPaths.find(
      (p) => p.toLowerCase() === sameFolderPath || p.toLowerCase() === `${sameFolderPath}.md`
    );
    if (sameFolderMatch) return sameFolderMatch;
  }

  // 3. Match by filename anywhere
  const fileName = targetWithExt.split('/').pop()!;
  const anywhereMatch = allPaths.find((p) => p.toLowerCase().endsWith(`/${fileName}`) || p.toLowerCase() === fileName);
  if (anywhereMatch) return anywhereMatch;

  return null;
}

/**
 * Create a wiki-link string
 */
export function createWikiLink(
  target: string,
  options?: {
    alias?: string;
    heading?: string;
    isEmbed?: boolean;
  }
): string {
  const { alias, heading, isEmbed } = options || {};
  
  let link = target;
  if (heading) link += `#${heading}`;
  if (alias) link += `|${alias}`;
  
  return isEmbed ? `![[${link}]]` : `[[${link}]]`;
}

/**
 * Replace wiki-links in content with a transform function
 */
export function transformWikiLinks(
  markdown: string,
  transform: (link: WikiLink) => string
): string {
  const links = parseWikiLinks(markdown);
  
  // Process in reverse order to preserve indices
  let result = markdown;
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i];
    const replacement = transform(link);
    result = result.slice(0, link.start) + replacement + result.slice(link.end);
  }
  
  return result;
}

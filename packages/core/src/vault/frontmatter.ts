/**
 * YAML frontmatter parsing and serialization.
 *
 * FRONTMATTER FORMAT:
 * ---
 * key: value
 * ---
 *
 * Content starts after the closing ---
 */

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse YAML frontmatter from Markdown content.
 * Returns null if no frontmatter is present.
 *
 * WHY SIMPLE PARSER:
 * - Avoids heavy YAML library dependency
 * - Frontmatter is typically simple key-value pairs
 * - Complex YAML can be added later if needed
 */
export function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, unknown> | null;
  content: string;
} {
  const match = markdown.match(FRONTMATTER_REGEX);

  if (!match) {
    return { frontmatter: null, content: markdown };
  }

  const yamlContent = match[1];
  const content = markdown.slice(match[0].length);

  try {
    const frontmatter = parseSimpleYaml(yamlContent);
    return { frontmatter, content };
  } catch {
    // If parsing fails, treat as no frontmatter
    return { frontmatter: null, content: markdown };
  }
}

/**
 * Simple YAML parser for frontmatter.
 * Handles basic types: strings, numbers, booleans, arrays, nested objects.
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: unknown[] | null = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for array item
    const arrayMatch = line.match(/^(\s*)-\s*(.*)$/);
    if (arrayMatch && currentKey && currentArray) {
      const value = parseValue(arrayMatch[2].trim());
      currentArray.push(value);
      continue;
    }

    // Check for key-value pair
    const kvMatch = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if any
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      currentKey = kvMatch[2].trim();
      const value = kvMatch[3].trim();

      if (value === '') {
        // Could be start of array or nested object
        currentArray = [];
      } else {
        result[currentKey] = parseValue(value);
        currentKey = null;
      }
    }
  }

  // Save final array if any
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Parse a YAML value string into a JavaScript value
 */
function parseValue(value: string): unknown {
  // Handle quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Handle booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle null
  if (value === 'null' || value === '~') return null;

  // Handle numbers
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  // Default to string
  return value;
}

/**
 * Serialize frontmatter to YAML string
 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${serializeValue(item)}`);
      }
    } else {
      lines.push(`${key}: ${serializeValue(value)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Serialize a value to YAML
 */
function serializeValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Quote if contains special characters
    if (/[:#\[\]{}|>]/.test(value) || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Extract title from frontmatter or first heading
 */
export function extractTitle(markdown: string, path: string): string {
  const { frontmatter, content } = parseFrontmatter(markdown);

  // Check frontmatter for title
  if (frontmatter?.title && typeof frontmatter.title === 'string') {
    return frontmatter.title;
  }

  // Look for first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fall back to filename
  const fileName = path.split('/').pop() || path;
  return fileName.replace(/\.md$/, '');
}

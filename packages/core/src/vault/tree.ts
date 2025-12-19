/**
 * Vault tree structure utilities.
 *
 * WHY TREE:
 * - File browser needs hierarchical structure
 * - Efficient for rendering with expand/collapse
 * - Easy to serialize for API responses
 */

export interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'note' | 'file';
  children?: TreeNode[];
}

/**
 * Build a tree structure from a flat list of paths.
 */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort paths so parent directories come before children
  const sortedPaths = [...paths].sort();

  for (const path of sortedPaths) {
    const parts = path.split('/');
    let currentPath = '';
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let node = nodeMap.get(currentPath);

      if (!node) {
        const isNote = isLast && path.endsWith('.md');
        const isFile = isLast && !path.endsWith('.md') && path.includes('.');

        node = {
          name: part,
          path: currentPath,
          type: isNote ? 'note' : isFile ? 'file' : 'folder',
          children: isLast && (isNote || isFile) ? undefined : [],
        };

        nodeMap.set(currentPath, node);
        currentLevel.push(node);
      }

      if (node.children) {
        currentLevel = node.children;
      }
    }
  }

  return sortTree(root);
}

/**
 * Sort tree: folders first, then alphabetically
 */
function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      // Folders before files
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    })
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
}

/**
 * Find a node in the tree by path
 */
export function findNode(tree: TreeNode[], path: string): TreeNode | null {
  const parts = path.split('/');
  let currentLevel = tree;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const node = currentLevel.find((n) => n.name === part);

    if (!node) return null;
    if (i === parts.length - 1) return node;
    if (!node.children) return null;

    currentLevel = node.children;
  }

  return null;
}

/**
 * Get all paths in a tree (flattened)
 */
export function getAllPaths(tree: TreeNode[]): string[] {
  const paths: string[] = [];

  function traverse(nodes: TreeNode[]) {
    for (const node of nodes) {
      paths.push(node.path);
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return paths;
}

/**
 * Filter tree to only include nodes matching a predicate
 */
export function filterTree(
  tree: TreeNode[],
  predicate: (node: TreeNode) => boolean
): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of tree) {
    if (node.children) {
      const filteredChildren = filterTree(node.children, predicate);
      if (filteredChildren.length > 0 || predicate(node)) {
        result.push({
          ...node,
          children: filteredChildren,
        });
      }
    } else if (predicate(node)) {
      result.push(node);
    }
  }

  return result;
}

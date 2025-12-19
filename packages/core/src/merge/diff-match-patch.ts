import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

/**
 * Compute patches from original text to modified text.
 *
 * WHY: We use Google's diff-match-patch because it handles character-level
 * diffs well for text content, and its patch format is robust for merging.
 */
export function computePatches(original: string, modified: string): string {
  const patches = dmp.patch_make(original, modified);
  return dmp.patch_toText(patches);
}

/**
 * Apply patches to text, returning the result and success status.
 *
 * INVARIANT: If any patch fails to apply cleanly, we return success=false
 * but still return the best-effort result.
 */
export function applyPatches(
  text: string,
  patchText: string
): { result: string; success: boolean } {
  const patches = dmp.patch_fromText(patchText);
  const [result, results] = dmp.patch_apply(patches, text);
  const success = results.every((r) => r);
  return { result, success };
}

/**
 * Compute a diff between two texts and return as operations.
 */
export function computeDiff(
  text1: string,
  text2: string
): Array<{ op: 'equal' | 'insert' | 'delete'; text: string }> {
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, text]) => ({
    op: op === 0 ? 'equal' : op === 1 ? 'insert' : 'delete',
    text,
  }));
}

/**
 * Check if two texts are similar enough to merge (> 50% common content).
 */
export function canMerge(text1: string, text2: string): boolean {
  const diffs = dmp.diff_main(text1, text2);
  let common = 0;
  let total = 0;

  for (const [op, text] of diffs) {
    total += text.length;
    if (op === 0) common += text.length;
  }

  return total === 0 || common / total > 0.5;
}

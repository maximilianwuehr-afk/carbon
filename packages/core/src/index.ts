/**
 * @carbon/core
 *
 * Shared logic for Carbon notes app - merge algorithms, sync state machine,
 * vault operations, and wiki-link parsing.
 *
 * This package is designed to be used by:
 * - apps/web (browser)
 * - apps/api (server)
 * - Future: macOS/iOS native apps
 */

export * from './schemas/index.js';
export * from './merge/index.js';
export * from './sync/index.js';
export * from './vault/index.js';
export * from './links/index.js';

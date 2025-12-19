import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/schemas/index.ts',
    'src/merge/index.ts',
    'src/sync/index.ts',
    'src/vault/index.ts',
    'src/links/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
});

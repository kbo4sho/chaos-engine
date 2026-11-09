import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

// Shared/read-only node_modules symlinks (Morty worktrees) need a writable local cache
// directory. Do not disable caching globally for normal checkouts.
const testExtra = {};
try {
  if (fs.lstatSync('node_modules').isSymbolicLink()) {
    testExtra.cache = { dir: path.resolve('.vitest-local-cache') };
  }
} catch (_) {}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=8192'],
      },
    },
    ...testExtra,
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    cache: false, // node_modules may be a shared, read-only symlink.
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
  },
});

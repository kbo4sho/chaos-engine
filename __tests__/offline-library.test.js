import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { offlineLibrary } from '../scripts/build-offline-library.mjs';

it('publishes a reproducible offline edition of the game, all station files and native dependencies', async () => {
  const root = new URL('../', import.meta.url),
    archive = JSON.parse(await readFile(new URL('one-part-missing/offline-library.json', root), 'utf8'));
  const entry = await readFile(new URL('one-part-missing/bench-release.js', root));
  const tag = createHash('sha256').update(entry).digest('hex').slice(0, 12);
  const expected = await offlineLibrary(root, tag);
  expect(expected).toEqual(archive);
  const paths = archive.assets.map((a) => a.path);
  expect(new Set(paths).size).toBe(paths.length);
  expect(paths).toEqual(
    expect.arrayContaining([
      'index.html',
      'examples/chaos-examples.js',
      'save-codec.js',
      'one-part-missing/index.html',
      'one-part-missing/press-worker.js',
      'one-part-missing/discovery/double.html',
      'one-part-missing/fault-desk/index.html',
      'one-part-missing/test-bay/index.html',
      'one-part-missing/control-room/index.html',
      'vendor/VT323-OFL.txt',
      'vendor/MATTER-LICENSE',
    ]),
  );
  expect(
    paths.some(
      (p) =>
        p.startsWith('artifacts/') ||
        p.startsWith('scripts/') ||
        p.startsWith('node_modules/') ||
        p.endsWith('.json'),
    ),
  ).toBe(false);
  expect(archive.bytes).toBe(archive.assets.reduce((sum, a) => sum + a.size, 0));
});

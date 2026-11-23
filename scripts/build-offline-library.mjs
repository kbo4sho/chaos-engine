import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

export async function offlineLibrary(root, benchVersion) {
  const files = [
    'index.html',
    'one-part-missing.html',
    'save-codec.js',
    'examples/chaos-examples.js',
    'puzzle-offline-worker.js',
    'vendor/matter-0.20.0.min.js',
    'vendor/MATTER-LICENSE',
    'vendor/VT323-Regular.woff2',
    'vendor/VT323-OFL.txt',
  ];
  async function collect(directory) {
    for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
      const path = directory + entry.name;
      if (entry.isDirectory()) await collect(path + '/');
      else if (entry.isFile() && /\.(js|css|html)$/.test(entry.name)) files.push(path);
    }
  }
  await collect('one-part-missing/');
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const assets = await Promise.all(
    files.sort().map(async (path) => {
      const data = await readFile(new URL(path, root));
      return { path, size: data.length, hash: digest(data) };
    }),
  );
  const version = digest(JSON.stringify(assets)).slice(0, 16);
  return { format: 1, version, benchVersion, bytes: assets.reduce((n, a) => n + a.size, 0), assets };
}

// The static website and the local preview use the same entry point and compiler options.
import { build, context } from 'esbuild';
import { offlineLibrary } from './build-offline-library.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('one-part-missing/bench-release.js', root);
const html = new URL('one-part-missing/index.html', root);
const options = {
  absWorkingDir: fileURLToPath(root),
  entryPoints: ['one-part-missing/play.js'],
  outfile: 'one-part-missing/bench-release.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  write: false,
  external: ['./replay-clip.js'],
  banner: { js: '// Generated from play.js by npm run build. Edit the source modules.' },
};

export function createPreviewCompiler() {
  return context(options);
}
async function replaceIfChanged(url, text) {
  let old;
  try {
    old = await readFile(url, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (old === text) return;
  if (process.argv.includes('--check') || process.env.GITHUB_ACTIONS === 'true')
    throw Error('Published puzzle assets are stale. Run npm run build and commit the changes.');
  const temp = new URL(url.href + '.' + process.pid + '.tmp');
  await writeFile(temp, text);
  await rename(temp, url);
}
async function publishFiles() {
  const { outputFiles } = await build(options);
  const js = outputFiles[0].text;
  const version = createHash('sha256').update(js).digest('hex').slice(0, 12);
  const shell = await readFile(html, 'utf8');
  const script =
    /<script type="module" src="(?:play\.js|bench-release\.js(?:\?v=[a-f0-9]+)?)"><\/script>/;
  if (!script.test(shell)) throw Error('Workbench entry script not found');
  const next = shell.replace(
    script,
    '<script type="module" src="bench-release.js?v=' + version + '"></script>',
  );
  await replaceIfChanged(output, js);
  await replaceIfChanged(html, next);
  const library = await offlineLibrary(root, version);
  await replaceIfChanged(
    new URL('one-part-missing/offline-library.json', root),
    JSON.stringify(library, null, 2) + '\n',
  );
  console.log(
    'Offline workshop ' +
      library.version +
      ' · ' +
      library.assets.length +
      ' files · ' +
      library.bytes +
      ' bytes',
  );
  console.log('Puzzle bench ' + version + ' · ' + Buffer.byteLength(js) + ' bytes');
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await publishFiles();

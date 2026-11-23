import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.CHAOS_PORT || process.env.PORT || 3003);

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

let previewCompiler, compressedBench;
const gzipBytes = promisify(gzip);
function acceptsGzip(header = '') {
  return header.split(',').some((entry) => {
    const [coding, ...params] = entry.trim().toLowerCase().split(';');
    if (coding !== 'gzip') return false;
    const quality = params.map((value) => value.trim()).find((value) => value.startsWith('q='));
    return !quality || Number(quality.slice(2)) > 0;
  });
}
async function previewBench(req, res) {
  try {
    previewCompiler ??= import('./scripts/build-puzzle-bench.mjs')
      .then((module) => module.createPreviewCompiler())
      .catch((error) => {
        previewCompiler = null;
        throw error;
      });
    const compiler = await previewCompiler;
    const { outputFiles } = await compiler.rebuild();
    const [asset] = outputFiles;
    const gzip = acceptsGzip(req.headers['accept-encoding']);
    const tag = '"' + asset.hash + (gzip ? '-gzip' : '') + '"';
    if (req.headers['if-none-match'] === tag) {
      res.writeHead(304, { ETag: tag, Vary: 'Accept-Encoding' });
      res.end();
      return;
    }
    if (gzip && compressedBench?.hash !== asset.hash)
      compressedBench = { hash: asset.hash, bytes: gzipBytes(asset.contents) };
    const bytes = gzip ? await compressedBench.bytes : asset.contents;
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      ETag: tag,
      Vary: 'Accept-Encoding',
      'Content-Length': bytes.length,
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    });
    res.end(bytes);
  } catch {
    // Plain Node installations can run directly from the same ES modules.
    res.writeHead(307, { Location: 'play.js', 'Cache-Control': 'no-store' });
    res.end();
  }
}

const server = http.createServer((req, res) => {
  let requestUrl;
  try {
    requestUrl = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const { pathname, search } = requestUrl;
  if (pathname === '/one-part-missing/bench-release.js') {
    void previewBench(req, res);
    return;
  }
  if (pathname === '/one-part-missing') {
    res.writeHead(308, { Location: '/one-part-missing/' + search });
    res.end();
    return;
  }
  const filePath = path.join(__dirname, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 CHAOS ENGINE server running at http://0.0.0.0:${PORT}`);
});

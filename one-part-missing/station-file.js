import { readAsset, base64 } from './asset-source.js';

// Resolve static imports inside the game. A file contains the same physics
// and renderer as the live bench, plus only the explicitly shared sheet.
export async function stationFile(
  attribute,
  hash,
  { page = 'index.html', script = 'desk.js', extraStyles = [] } = {},
) {
  const root = new URL('../', document.baseURI);
  const id = (url) => 'control/' + url.pathname.slice(root.pathname.length);
  const seen = new Set(),
    imports = {};
  async function collect(url) {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const deps = [];
    const source = (await readAsset(url.href)).replace(
      /(\b(?:from\s*|import\(\s*)['"])(\.\.?\/[\w./-]+\.js)(['"])/g,
      (_, start, spec, end) => {
        const child = new URL(spec, url);
        if (child.origin !== root.origin || !child.pathname.startsWith(root.pathname))
          throw Error('Unexpected module path');
        deps.push(child);
        return start + id(child) + end;
      },
    );
    imports[id(url)] = 'data:text/javascript;base64,' + base64(new TextEncoder().encode(source));
    await Promise.all(deps.map(collect));
  }
  const [shell, bench, desk, engine, license, fontLicense, font] = await Promise.all([
    readAsset(page),
    readAsset('../bench.css'),
    Promise.all(['desk.css', ...extraStyles].map((path) => readAsset(path))).then((styles) =>
      styles.join('\n'),
    ),
    readAsset('../../vendor/matter-0.20.0.min.js'),
    readAsset('../../vendor/MATTER-LICENSE'),
    readAsset('../../vendor/VT323-OFL.txt'),
    fetch('../../vendor/VT323-Regular.woff2').then((response) => {
      if (!response.ok) throw Error('Font unavailable');
      return response.arrayBuffer();
    }),
    collect(new URL(script, document.baseURI)),
  ]);
  const doc = new DOMParser().parseFromString(shell, 'text/html');
  const css = doc.createElement('style');
  css.textContent =
    bench.replace(
      '../vendor/VT323-Regular.woff2',
      'data:font/woff2;base64,' + base64(new Uint8Array(font)),
    ) +
    '\n' +
    desk +
    '\n/*\n' +
    fontLicense +
    '\n*/';
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) link.remove();
  doc.head.append(css);
  const physics = doc.querySelector('script[src*="matter-"]');
  physics.removeAttribute('src');
  physics.textContent = engine + '\n/*\n' + license + '\n*/';
  const entry = doc.querySelector('script[type="module"]'),
    map = doc.createElement('script');
  map.type = 'importmap';
  map.textContent = JSON.stringify({ imports });
  entry.before(map);
  entry.removeAttribute('src');
  entry.textContent = 'import ' + JSON.stringify(id(new URL(script, document.baseURI))) + ';';
  doc.body.dataset[attribute] = hash;
  const brand = doc.querySelector('.brand');
  brand.removeAttribute('href');
  brand.textContent = 'One Part Missing';
  return new Blob(['<!doctype html>\n', doc.documentElement.outerHTML], {
    type: 'text/html;charset=utf-8',
  });
}

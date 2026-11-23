// Package only the published application assets. Start from the empty HTML
// shell, so player records, clipboard values and in-progress runs stay local.
const modules = [
  'machines',
  'workshop',
  'maker',
  'press-client',
  'repairs',
  'drawing',
  'portable',
  'play',
];
const sourceCache = new Map();
async function readAsset(path) {
  if (!sourceCache.has(path)) {
    const result = fetch(new URL(path, document.baseURI))
      .then((response) => {
        if (!response.ok) throw new Error('Asset unavailable');
        return response.text();
      })
      .catch((error) => {
        sourceCache.delete(path);
        throw error;
      });
    sourceCache.set(path, result);
  }
  return sourceCache.get(path);
}

function asDataModule(source) {
  const bytes = new TextEncoder().encode(source);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return 'data:text/javascript;base64,' + btoa(binary);
}

export async function portableFile(machine, replay = null) {
  const [shell, css, engine, license, ...sources] = await Promise.all([
    readAsset('one-part-missing.html'),
    readAsset('one-part-missing/bench.css'),
    readAsset('vendor/matter-0.20.0.min.js'),
    readAsset('vendor/MATTER-LICENSE'),
    ...modules.map((name) => readAsset('one-part-missing/' + name + '.js')),
  ]);
  const doc = new DOMParser().parseFromString(shell, 'text/html');
  const style = doc.createElement('style');
  style.textContent = css;
  doc.querySelector('link[rel=stylesheet]').replaceWith(style);
  const physics = doc.querySelector('script[src*="matter-"]');
  physics.removeAttribute('src');
  physics.textContent = engine + '\n/*\n' + license + '\n*/';
  const entry = doc.querySelector('script[type=module]');
  const imports = {};
  modules.forEach((name, i) => {
    // Data modules have no directory for relative imports. Give our own
    // module specifiers stable names in a standard HTML import map.
    const source = sources[i].replace(/(\bfrom\s+['"])\.\/([\w-]+)\.js(['"])/g, '$1missing/$2$3');
    imports['missing/' + name] = asDataModule(source);
  });
  const importMap = doc.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({ imports });
  entry.before(importMap);
  entry.removeAttribute('src');
  entry.textContent = "import 'missing/play';";
  doc.body.dataset.portable = machine.id;
  if (replay) doc.body.dataset.repair = JSON.stringify({ part: replay.part, socket: replay.socket });
  doc.title = machine.title + ' · One Part Missing';
  // The portable file is a single challenge that can be forwarded intact.
  const brand = doc.querySelector('.brand');
  brand.removeAttribute('href');
  const hiddenStyle = doc.createElement('style');
  hiddenStyle.textContent =
    '.library,.workshop,.maker,.bench-links,#next,#save-replay{display:none!important}main{padding-bottom:2rem}';
  doc.head.append(hiddenStyle);
  return new Blob(['<!doctype html>\n', doc.documentElement.outerHTML], {
    type: 'text/html;charset=utf-8',
  });
}

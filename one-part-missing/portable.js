import { readAsset, base64 } from './asset-source.js';
import { packFittings, packedParts } from './machines.js';
// Package only the published application assets. Start from the empty HTML
// shell, so player records, clipboard values and in-progress runs stay local.
const modules = [
  'spare-study',
  'spare-study-desk',
  'dispatch-log',
  'qualification-boards',
  'qualification-course',
  'relay-course',
  'relay-boards',
  'assembly-course',
  'assembly-boards',
  'fitting-ledger',
  'fields',
  'field-art',
  'field-boards',
  'field-course',
  'flight',
  'flight-art',
  'flight-course',
  'flight-boards',
  'sorting',
  'sort-art',
  'sort-course',
  'sort-boards',
  'mechanisms',
  'devices',
  'transmissions',
  'drive-art',
  'drive-course',
  'drive-boards',
  'rigging',
  'rig-art',
  'rig-course',
  'rig-boards',
  'pair-course',
  'pair-boards',
  'machines',
  'tool-course',
  'tool-lab',
  'prediction-plans',
  'prediction-measures',
  'predictions',
  'prediction-desk',
  'tool-boards',
  'clock-boards',
  'campaign-layout',
  'campaign-score',
  'campaign',
  'library-index',
  'library',
  'order-board',
  'order-plans',
  'work-orders',
  'order-desk',
  'challenge-file',
  'match-desk',
  'match-cards',
  'fit-stamp',
  'friend-race',
  'race-book',
  'bench-edits',
  'bench-drafts',
  'draft-desk',
  'certify',
  'press-catalog',
  'press-reserves',
  'tool-press',
  'classic-registration',
  'workshop',
  'blueprints',
  'design-bench',
  'maker',
  'press-client',
  'repairs',
  'sandbox-shutter-art',
  'drawing',
  'path-reader',
  'attempt-film',
  'clip-controls',
  'replay-clip',
  'gifenc',
  'repair-coach',
  'coach-desk',
  'focus',
  'mount-layout',
  'mechanical-art',
  'asset-source',
  'portable',
  'learning',
  'practice-targets',
  'tool-evidence',
  'tool-notebook',
  'offline-workshop',
  'machine-diagram',
  'diagram-desk',
  'pair-training-index',
  'pair-training',
  'pair-training-desk',
  'repair-notebook-file',
  'repair-notebook-desk',
  'play',
];
// This snapshot is taken before the offline bench renders any local records.
let challengeShell;
export function keepChallengeShell() {
  if (/^(race|match)\/1\//.test(document.body.dataset.portable || ''))
    challengeShell = document.documentElement.cloneNode(true);
}
export async function portableFile(machine, replay = null, challenge = null) {
  if (challenge && challengeShell) {
    const shell = challengeShell.cloneNode(true);
    shell.querySelector('body').dataset.portable = challenge;
    shell.querySelector('title').textContent = machine.title + ' · One Part Missing';
    return new Blob(['<!doctype html>\n', shell.outerHTML], { type: 'text/html;charset=utf-8' });
  }
  const [shell, css, engine, license, fontLicense, font, ...sources] = await Promise.all([
    readAsset('index.html'),
    readAsset('bench.css'),
    readAsset('../vendor/matter-0.20.0.min.js'),
    readAsset('../vendor/MATTER-LICENSE'),
    readAsset('../vendor/VT323-OFL.txt'),
    fetch(new URL('../vendor/VT323-Regular.woff2', document.baseURI)).then((response) => {
      if (!response.ok) throw new Error('Font unavailable');
      return response.arrayBuffer();
    }),
    ...modules.map((name) => readAsset(name + '.js')),
  ]);
  const doc = new DOMParser().parseFromString(shell, 'text/html');
  const style = doc.createElement('style');
  style.textContent =
    css.replace('../vendor/VT323-Regular.woff2', 'data:font/woff2;base64,' + base64(new Uint8Array(font))) +
    '\n/*\n' +
    fontLicense +
    '\n*/';
  doc.querySelector('link[rel=stylesheet]').replaceWith(style);
  const physics = doc.querySelector('script[src*="matter-"]');
  physics.removeAttribute('src');
  physics.textContent = engine + '\n/*\n' + license + '\n*/';
  const entry = doc.querySelector('script[type=module]');
  const imports = {};
  modules.forEach((name, i) => {
    // Data modules have no directory for relative imports. Give our own
    // module specifiers stable names in a standard HTML import map.
    const source = sources[i].replace(
      /(\b(?:from\s+|import\(\s*)['"])\.\/([\w-]+)\.js(['"])/g,
      '$1missing/$2$3',
    );
    imports['missing/' + name] =
      'data:text/javascript;base64,' + base64(new TextEncoder().encode(source));
  });
  const importMap = doc.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({ imports });
  entry.before(importMap);
  entry.removeAttribute('src');
  entry.textContent = "import 'missing/play';";
  doc.body.dataset.portable = challenge || machine.id;
  if (replay) doc.body.dataset.repair = JSON.stringify(packFittings(packedParts(replay)));
  doc.title = machine.title + ' · One Part Missing';
  // The portable file is a single challenge that can be forwarded intact.
  const brand = doc.querySelector('.brand');
  brand.removeAttribute('href');
  const hiddenStyle = doc.createElement('style');
  hiddenStyle.textContent =
    '.bench-nav,.map-link,.library,.workshop,.maker,.bench-links,#next,#save-replay{display:none!important}main{padding-bottom:2rem}';
  doc.head.append(hiddenStyle);
  return new Blob(['<!doctype html>\n', doc.documentElement.outerHTML], {
    type: 'text/html;charset=utf-8',
  });
}

import fs from 'node:fs';
import path from 'node:path';

export async function verifyPhoneStartup(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const next = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await next;
  await p.waitForSelector('#parts [data-part]');
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const cdp = await p.createCDPSession(),
    errors = [],
    trials = [],
    requested = new Set(),
    workers = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('request', (r) => requested.add(new URL(r.url()).pathname));
  p.on('workercreated', (w) => workers.push(w.url()));
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1.5e6 / 8,
    uploadThroughput: 750000 / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.evaluateOnNewDocument(() => {
    const observer = new MutationObserver(() => {
      if (
        document.querySelector('#parts [data-part]') &&
        document.querySelector('#sockets [data-socket]')
      ) {
        performance.mark('repair-ready');
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  for (let i = 0; i < 3; i++) {
    requested.clear();
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#parts [data-part]');
    await p.tap('[data-part="bridge"]');
    await p.tap('[data-socket="0"]');
    const row = await p.evaluate(async () => {
      await document.fonts.ready;
      const assets = performance.getEntriesByType('resource'),
        scripts = assets.filter((e) => new URL(e.name).pathname.endsWith('.js'));
      return {
        ready: Math.round(performance.getEntriesByName('repair-ready')[0].startTime),
        fit: document.querySelector('#status').textContent,
        scripts: scripts.map((e) => ({
          file: new URL(e.name).pathname.split('/').at(-1),
          wire: e.transferSize,
          decoded: e.decodedBodySize,
        })),
        font: assets.find((e) => e.name.includes('VT323-Regular.woff2'))?.decodedBodySize,
        loadedFont: document.fonts.check('18px VT323'),
        bytes: assets.reduce((sum, e) => sum + e.transferSize, 0),
        entry: document.querySelector('script[type=module]').getAttribute('src'),
      };
    });
    trials.push(row);
    record(
      'cold-phone-repair-' + (i + 1),
      row.ready > 0 &&
        row.fit.includes('Bridge fitted') &&
        row.scripts.length === 2 &&
        row.scripts.some((e) => e.file === 'bench-release.js' && e.decoded < 620000) &&
        row.font < 40000 &&
        row.loadedFont &&
        /^bench-release\.js\?v=[a-f0-9]{12}$/.test(row.entry),
      row,
    );
    await p.click('#reset');
  }
  await shot(p, 'fast-first-machine.png');
  record(
    'no-encoder-or-worker-to-fit-first-spare',
    ![...requested].some((s) => /press-worker|gifenc|replay-clip/.test(s)),
  );
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await p.waitForSelector('#pilot[data-state=miss]');
  await p.tap('[data-part="bridge"]');
  await p.tap('[data-socket="0"]');
  await p.tap('#run');
  await p.waitForSelector('#pilot[data-state=won]');
  await p.click('#compare-attempts');
  await p.waitForSelector('#attempt-film[open]');
  await p.click('#compare-clip [data-clip-make]');
  await p.waitForSelector('#compare-clip [data-clip-save][href]', { timeout: 30000 });
  record(
    'gif-encoder-loaded-on-request',
    [...requested].some((s) => s.endsWith('/replay-clip.js')) &&
      [...requested].some((s) => s.endsWith('/gifenc.js')),
  );
  await p.click('#compare-close');
  await p.select('#press-style', 'chain');
  await p.click('#generate');
  await p.waitForFunction(
    () => location.hash.startsWith('#press-') && document.querySelector('#proof')?.hidden === false,
    { timeout: 45000 },
  );
  record(
    'release-resolves-origin-worker',
    workers.some((u) => new URL(u).pathname.endsWith('/one-part-missing/press-worker.js')),
    { workers, hash: new URL(p.url()).hash },
  );
  await p.click('#open-lab');
  await p.waitForSelector('#tool-lab[open]');
  await p.click('#lab-close');
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'first-repair.json'),
    JSON.stringify({ trials, workers, errors }, null, 2),
  );
  await cdp.detach();
  await p.close();
}

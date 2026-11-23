import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { saveBrowserFile } from './save-browser-file.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const patch = '\n/* sample-lesson */\n';
// The same running game is served through a switchable loopback connection.
// Cutting this connection also cuts the worker, child tabs and the machine press.
async function portableOrigin(source) {
  const base = new URL(source),
    states = { mode: 'online', cut: 0, requests: 0 };
  const root = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
  const actual = async (file) => Buffer.from(await (await fetch(new URL(file, base))).arrayBuffer());
  const changedCss = Buffer.concat([await actual('one-part-missing/bench.css'), Buffer.from(patch)]);
  const library = JSON.parse(await actual('one-part-missing/offline-library.json'));
  const revised = structuredClone(library),
    css = revised.assets.find((a) => a.path === 'one-part-missing/bench.css');
  revised.bytes += changedCss.length - css.size;
  css.hash = hash(changedCss);
  css.size = changedCss.length;
  revised.version = hash(JSON.stringify(revised.assets)).slice(0, 16);
  const server = http.createServer(async (req, res) => {
    if (states.mode === 'cut') {
      states.cut++;
      req.socket.destroy();
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    const active = states.mode;
    states.requests++;
    if (active === 'slow') await delay(60);
    if (res.destroyed) return;
    if (
      ['broken', 'updated'].includes(active) &&
      url.pathname === root + 'one-part-missing/offline-library.json'
    ) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(revised));
      return;
    }
    if (active === 'updated' && url.pathname === root + 'one-part-missing/bench.css') {
      res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' });
      res.end(changedCss);
      return;
    }
    try {
      const upstream = await fetch(new URL(url.pathname + url.search, base.origin), {
        redirect: 'manual',
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      const headers = {
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'no-store',
      };
      if (upstream.headers.has('location')) headers.Location = upstream.headers.get('location');
      res.writeHead(upstream.status, headers);
      res.end(body);
    } catch {
      if (!res.destroyed) {
        res.writeHead(503);
        res.end();
      }
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: 'http://127.0.0.1:' + server.address().port + root,
    states,
    library,
    revised,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
export async function verifyOfflineWorkshop(home, { url, record, shot, outDir }) {
  const host = await portableOrigin(url),
    browser = home.browser(),
    ctx = await browser.createBrowserContext();
  try {
    const start = await ctx.newPage(),
      errors = [],
      sources = [];
    const watch = (q) => {
      q.on('pageerror', (e) => errors.push(e.message));
      q.on('response', (r) => {
        if (r.fromServiceWorker()) sources.push(new URL(r.url()).pathname);
      });
    };
    await start.goto(host.url);
    const opened = new Promise((done) => start.once('popup', done));
    await start.click('#puzzle-launcher');
    const p = await opened;
    watch(p);
    await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
    await p.waitForSelector('#parts [data-part]');
    const base = p.url().split('#')[0],
      status = (q) => q.$eval('#offline-status', (e) => e.textContent),
      expectState = (q, needle) =>
        q.waitForFunction(
          (s) => document.querySelector('#offline-status').textContent.includes(s),
          { timeout: 90000 },
          needle,
        );
    const openPanel = async (q) => {
      await q.click('#map-link');
      if (!(await q.$eval('#offline-workshop', (e) => e.open)))
        await q.click('#offline-workshop summary');
    };
    await openPanel(p);
    await expectState(p, 'No offline copy');
    record(
      'optional-download-before-registration',
      await p.evaluate(async () => !(await navigator.serviceWorker.getRegistrations()).length),
    );
    host.states.mode = 'slow';
    await p.tap('#offline-save');
    await p.waitForFunction(() => document.querySelector('#offline-progress').value >= 3);
    await p.tap('#offline-cancel');
    await expectState(p, 'Download canceled.');
    record(
      'partial-download-removed',
      await p.evaluate(async () => !(await caches.keys()).some((n) => n.includes(':files:'))),
      await status(p),
    );
    host.states.mode = 'online';
    await p.tap('#offline-save');
    await expectState(p, 'Ready for offline play.');
    const version = () => p.$eval('#offline-workshop', (el) => el.dataset.version);
    const stored = await version();
    record('complete-verified-release', stored === host.library.version, {
      version: stored,
      files: host.library.assets.length,
      bytes: host.library.bytes,
    });
    await p.tap('#offline-save');
    await expectState(p, 'up to date');
    record('refresh-recognizes-same-edition', (await version()) === stored, await status(p));
    const second = await ctx.newPage();
    watch(second);
    await second.goto(base);
    await second.waitForSelector('#parts [data-part]');
    await openPanel(second);
    await expectState(second, 'Ready for offline');
    record(
      'second-tab-sees-complete-copy',
      await second.$eval('#offline-workshop', (e) => Boolean(e.dataset.version)),
    );
    await p.bringToFront();
    host.states.mode = 'broken';
    await p.tap('#offline-save');
    await expectState(p, 'previous offline copy is ready');
    record(
      'interrupted-replacement-keeps-entire-older-copy',
      stored === (await version()) &&
        (await p.evaluate(
          async () => (await caches.keys()).filter((n) => n.includes(':files:')).length === 1,
        )),
      await status(p),
    );
    host.states.mode = 'updated';
    await p.tap('#offline-save');
    await expectState(p, 'Ready for offline play.');
    await second.bringToFront();
    await second.waitForFunction(
      (v) => document.querySelector('#offline-workshop').dataset.version === v,
      {},
      host.revised.version,
    );
    record(
      'verified-update-reaches-second-tab',
      (await version()) === host.revised.version,
      await status(second),
    );
    await p.bringToFront();
    await shot(p, 'phone-offline-ready.png');
    const cdp = await p.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.detach();
    host.states.mode = 'cut';
    await second.close();
    await p.close();
    await start.close();
    const offline = await ctx.newPage();
    watch(offline);
    await offline.goto(base + '#last-bell');
    await offline.waitForSelector('#parts [data-part]');
    const cssText = await offline.evaluate(async () => await (await fetch('bench.css')).text());
    record('fresh-tab-loads-verified-offline-version', cssText.endsWith(patch) && host.states.cut > 0, {
      disconnectedRequests: host.states.cut,
    });
    await offline.click('[data-part=bridge]');
    await offline.click('[data-socket="0"]');
    await offline.select('#playback-rate', '4');
    await offline.click('#run');
    await offline.waitForSelector('#pilot[data-state=won]');
    record(
      'offline-campaign-repair-earned',
      await offline.evaluate(
        () =>
          JSON.parse(localStorage.getItem('chaos.one-part-missing.repair.last-bell')).part === 'bridge',
      ),
    );
    const native = new Promise((done) => offline.once('popup', done));
    await offline.click('#open-sandbox');
    const sandbox = await native;
    watch(sandbox);
    await sandbox.reload({ waitUntil: 'domcontentloaded' });
    await sandbox.waitForSelector('#puzzle-launcher');
    await sandbox.waitForFunction(
      () =>
        document.querySelector('canvas')?.width > 0 &&
        typeof window.Matter?.Engine?.create === 'function',
    );
    record(
      'native-sandbox-launches-with-no-origin',
      new URL(sandbox.url()).pathname === new URL(host.url).pathname,
      sandbox.url(),
    );
    await sandbox.close();
    await offline.click('#generate');
    await offline.waitForFunction(() => location.hash.startsWith('#press-'));
    const print = await offline.$eval('#machine-title', (e) => e.textContent);
    record('dedicated-machine-press-worker-works-offline', Boolean(print), print);
    const id = new URL(offline.url()).hash.slice(1);
    const single = await saveBrowserFile(
      offline,
      '#download',
      outDir,
      'one-part-missing-' + id + '.html',
    );
    const separate = await browser.createBrowserContext(),
      singleTab = await separate.newPage();
    await singleTab.setOfflineMode(true);
    await singleTab.goto(single.url);
    await singleTab.waitForSelector('#parts [data-part]');
    record(
      'offline-origin-exports-a-playable-file',
      (await singleTab.$eval('#machine-title', (e) => e.textContent)) === print,
      single.name,
    );
    await separate.close();
    for (const [name, route, selector] of [
      ['discovery', 'discovery/', '#discovery-settings button'],
      ['double', 'discovery/double.html', '#double-controls button, #double-play'],
      ['operator', 'control-room/', '#op-act option'],
      ['commission', 'test-bay/', '#bay-act option'],
      ['fault', 'fault-desk/', '#case-select option'],
    ]) {
      await offline.goto(new URL(route, base).href);
      await offline.waitForSelector(selector);
      record('offline-station-' + name, true, await offline.title());
    }
    await offline.goto(base + '#tool-pair/1/cam/fan/3');
    await offline.waitForSelector('#training-panel:not([hidden])');
    await offline.click('#reader-open');
    await offline.waitForSelector('#machine-reader[open]');
    record(
      'offline-pair-course-opens-inspectable-physical-board',
      await offline.$eval('#reader-item', (e) => e.options.length > 5),
    );
    await offline.click('#reader-close');
    await openPanel(offline);
    await expectState(offline, 'Ready for offline play.');
    const stripped = await offline.evaluate(() =>
      localStorage.getItem('chaos.one-part-missing.repair.last-bell'),
    );
    host.states.mode = 'online';
    await offline.click('#offline-remove');
    await expectState(offline, 'Offline game files removed');
    record(
      'remove-leaves-earned-repair-and-clears-only-game-files',
      await offline.evaluate(
        async (before) =>
          localStorage.getItem('chaos.one-part-missing.repair.last-bell') === before &&
          !(await caches.keys()).some((k) => k.startsWith('chaos-puzzle-library:')),
        stripped,
      ),
    );
    record(
      'service-worker-delivered-the-campaign-and-station-pages',
      sources.some((s) => s.endsWith('/discovery/double.html')) &&
        sources.some((s) => s.endsWith('/bench-release.js')) &&
        sources.some((s) => s === new URL(host.url).pathname),
      { distinct: [...new Set(sources)].length },
    );
    record('no-runtime-errors', !errors.length, errors);
    fs.writeFileSync(
      path.join(outDir, 'offline-release.json'),
      JSON.stringify(
        {
          saved: stored,
          replacement: host.revised.version,
          files: host.library.assets.length,
          bytes: host.library.bytes,
          disconnected: host.states.cut,
          served: [...new Set(sources)],
        },
        null,
        2,
      ),
    );
  } finally {
    await ctx.close();
    host.close();
  }
}

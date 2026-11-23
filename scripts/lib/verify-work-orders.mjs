import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { orders, fitCode, orderPrefix } from '../../one-part-missing/work-orders.js';
import { trial } from '../../one-part-missing/machines.js';
import { benchmarks } from './work-order-benchmarks.mjs';

export async function verifyWorkOrders(home, { url, record, shot, outDir }) {
  const popup = async (page, action) => {
    const opened = new Promise((done) => page.once('popup', done));
    await action();
    return opened;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const phase = (page, state) =>
    page.waitForFunction(
      (s) => document.querySelector('#pilot').dataset.state === s,
      { timeout: 18000 },
      state,
    );
  const set = async (page, fit) => {
    if (!(await page.$eval('#reset', (b) => b.disabled))) await page.click('#reset');
    for (const f of [fit, fit.second].filter(Boolean)) {
      await page.click('[data-part="' + f.part + '"]');
      await page.click('[data-socket="' + f.socket + '"]');
    }
  };
  const test = async (page) => {
    await page.select('#playback-rate', '4');
    await page.click('#run');
    await phase(page, 'won');
  };
  const scores = (page) =>
    page.evaluate(() =>
      ['economy', 'speed'].map((k) => document.querySelector('#order-' + k + '-value').textContent),
    );
  const openOrder = async (i) => {
    await p.click('#map-link');
    if (!(await p.$eval('#order-map', (e) => e.open))) await p.click('#order-map summary');
    await p.select('#order-group', String(Math.floor(i / 6)));
    await p.click('#order-list a[href="#' + orders[i].id + '"]');
    await p.waitForFunction(
      (t) => document.querySelector('#machine-title').textContent === t,
      {},
      orders[i].title,
    );
  };
  for (const [i, m] of orders.entries()) {
    if (i === 12) await p.setViewport({ width: 1280, height: 800 });
    await openOrder(i);
    if (i === 0) {
      await p.select('#playback-rate', '4');
      await p.click('#run');
      await phase(p, 'miss');
      record(
        'empty-keeps-record-book-clear',
        (await scores(p)).every((v) => v === 'Awaiting delivery'),
        await scores(p),
      );
    }
    const [one, two] = benchmarks[i],
      times = [one, two].map((f) => trial(M, m, f).tick);
    for (const f of [one, two]) {
      await set(p, f);
      await test(p);
    }
    const actual = await scores(p),
      stored = await p.evaluate(
        (prefix) => Object.entries(localStorage).filter(([k]) => k.startsWith(prefix)),
        orderPrefix + m.id + '/',
      );
    const expected = [
      '1 part · ' + (times[0] / 60).toFixed(2) + ' s',
      (times[1] / 60).toFixed(2) + ' s · 2 parts',
    ];
    record(
      'two-records-' + m.id,
      JSON.stringify(actual) === JSON.stringify(expected) &&
        stored.length === 2 &&
        [one, two].every((f, j) =>
          stored.some(([key, value]) => key.endsWith('/' + fitCode(m, f)) && Number(value) === times[j]),
        ),
      { actual, stored },
    );
    if (i === 0) {
      await p.click('#order-economy-load');
      record(
        'refit-one-part',
        (await p.$eval('#pair-count', (e) => e.textContent)).startsWith('1 of 2'),
        await p.$eval('#status', (e) => e.textContent),
      );
      await p.click('#compare-attempts');
      await shot(p, 'one-and-two-part-routes.png');
      await p.click('#compare-close');
      await p.click('#order-speed-load');
      await p
        .browserContext()
        .overridePermissions(new URL(p.url()).origin, ['clipboard-read', 'clipboard-write']);
      await p.click('#share-setup');
      await p.waitForFunction(
        () =>
          !document.querySelector('#copy-fallback').hidden ||
          document.querySelector('#status').textContent.includes('Setup link copied'),
      );
      const link = await p.evaluate(async () =>
        document.querySelector('#copy-fallback').hidden
          ? await navigator.clipboard.readText()
          : document.querySelector('#share-url').value,
      );
      const ctx = await p.browser().createBrowserContext(),
        fresh = await ctx.newPage();
      fresh.on('pageerror', (e) => errors.push(e.message));
      await fresh.goto(link);
      await fresh.waitForSelector('#order-card:not([hidden])');
      const untouched = await scores(fresh);
      record(
        'shared-two-fitted-before-credit',
        untouched.every((v) => v === 'Awaiting delivery') &&
          (await fresh.$eval('#pair-count', (e) => e.textContent)).startsWith('2 of 2'),
        { link, untouched },
      );
      await test(fresh);
      record(
        'shared-delivery-reproduces-time',
        (await scores(fresh))[1] === expected[1],
        await scores(fresh),
      );
      await ctx.close();
      await p.bringToFront();
      await p.reload();
      await p.waitForSelector('#order-card:not([hidden])');
      record(
        'records-survive-reload',
        JSON.stringify(await scores(p)) === JSON.stringify(expected),
        await scores(p),
      );
      await p.click('#order-economy-load');
      const dl = await p.createCDPSession();
      await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
      await p.click('#save-replay');
      await p.waitForFunction(() =>
        document.querySelector('#status').textContent.includes('Replay file ready'),
      );
      const file = path.join(outDir, 'one-part-missing-' + m.id + '-replay.html');
      for (let k = 0; k < 60 && !fs.existsSync(file); k++) await delay(100);
      const offline = await p.browser().newPage(),
        external = [];
      offline.on('request', (r) => {
        if (/^https?:/.test(r.url())) external.push(r.url());
      });
      await offline.setOfflineMode(true);
      await offline.goto(pathToFileURL(file).href);
      await offline.select('#playback-rate', '4');
      await offline.click('#replay');
      await phase(offline, 'won');
      record(
        'chosen-economy-replay-offline',
        !external.length &&
          (await offline.$eval('#pair-count', (e) => e.textContent)).startsWith('1 of 2'),
        { external, parts: await offline.$eval('#pair-count', (e) => e.textContent) },
      );
      await offline.close();
      await dl.detach();
      await p.bringToFront();
      await shot(p, 'work-order-records-phone.png');
    }
    if (i === orders.length - 1) {
      const native = await popup(p, () => p.click('#open-sandbox'));
      await native.waitForFunction(() =>
        document.querySelector('#btn-pause').textContent.includes('PLAY'),
      );
      const placed = await native.evaluate(() =>
        Composite.allBodies(world)
          .filter((b) => b.render.machineShape?.fitted)
          .map((b) => b.label),
      );
      record(
        'two-spares-in-sandbox',
        placed.length === 2 && [two.part, two.second.part].every((k) => placed.includes(k)),
        placed,
      );
      await native.click('#btn-pause');
      await native.waitForFunction(
        () =>
          Composite.allBodies(world).some(
            (b) => b.render.machineShape?.sensor && Number.isFinite(b.render.struckAt),
          ),
        { timeout: 18000 },
      );
      await native.close();
      await p.bringToFront();
      await p.click('#next');
      const progress = await p.$eval('#order-progress', (e) => e.textContent);
      record('all-orders-complete', progress === '24 of 24 delivered', progress);
      await shot(p, 'completed-order-book.png');
    }
  }
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

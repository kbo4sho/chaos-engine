import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { trial } from '../../one-part-missing/machines.js';
import { orderPrefix, orders } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';

export async function verifyOfflineRaces(home, { url, record, shot, outDir }) {
  const pending = new Promise((resolve) => home.once('popup', resolve));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const sender = await pending;
  const errors = [],
    requests = [],
    files = [],
    contexts = [];
  const observe = (p) => p.on('pageerror', (error) => errors.push(error.message));
  observe(sender);
  const fit = async (p, move) => {
    for (const f of [move, move.second].filter(Boolean)) {
      await p.click('[data-part="' + f.part + '"]');
      await p.click('[data-socket="' + f.socket + '"]');
    }
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await p.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won');
  };
  const download = async (p) => {
    if (!(await p.$eval('#race-files', (e) => e.open))) await p.click('#race-files summary');
    await p.click('#race-pack');
    await p.waitForSelector('#race-file:not([hidden])');
    const name = await p.$eval('#race-file', (e) => e.download),
      target = path.join(outDir, name);
    const cdp = await p.createCDPSession(),
      id = p.browserContext().id;
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outDir,
      ...(id ? { browserContextId: id } : {}),
    });
    await p.click('#race-file');
    for (let retry = 0; retry < 100 && !fs.existsSync(target); retry++) await delay(75);
    files.push({ name, bytes: fs.statSync(target).size });
    await cdp.detach();
    return pathToFileURL(target).href;
  };
  const detached = async (href) => {
    const ctx = await sender.browser().createBrowserContext(),
      tab = await ctx.newPage();
    contexts.push(ctx);
    observe(tab);
    tab.on('request', (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await tab.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
    await tab.setOfflineMode(true);
    await tab.goto(href);
    await tab.waitForSelector('#race-target:not([hidden])');
    return tab;
  };
  const m = orders[0],
    [first, second] = benchmarks[0];
  try {
    await sender.click('#map-link');
    await sender.click('#order-map summary');
    await sender.click('#order-list a[href="#' + m.id + '"]');
    await sender.waitForSelector('#race-panel:not([hidden])');
    await fit(sender, first);
    const invite = await download(sender),
      guest = await detached(invite);
    record(
      'offline-invite-is-blind',
      (await guest.$eval('#pair-count', (e) => e.textContent.startsWith('0 of'))) &&
        (await guest.$eval('#race-watch', (e) => e.hidden)),
    );
    await shot(guest, 'disconnected-invitation.png');
    await fit(guest, second);
    const reply = await download(guest),
      viewer = await detached(reply);
    await viewer.waitForSelector('#attempt-film[open]');
    const start = await viewer.$eval('#compare-frame', (e) => Number(e.value));
    await viewer.click('#compare-change');
    record(
      'offline-return-opens-at-separation',
      start > 0 && start === (await viewer.$eval('#compare-frame', (e) => Number(e.value))),
    );
    for (const [button, move] of [
      ['reply', second],
      ['host', first],
    ]) {
      await viewer.click('#compare-' + button + '-arrival');
      record(
        'offline-receipt-' + button,
        (await viewer.$eval('#compare-frame', (e) => Number(e.value))) === trial(M, m, move).tick,
      );
    }
    await viewer.click('#compare-clip [data-clip-make]');
    await viewer.waitForSelector('#compare-clip [data-clip-save]:not([hidden])');
    await shot(viewer, 'disconnected-return.png');
    await viewer.keyboard.press('Escape');
    const storage = await viewer.evaluate(
      (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)),
      orderPrefix,
    );
    record(
      'independent-viewer-and-no-network',
      !storage.length && !requests.length && files.length === 2 && files.every((f) => f.bytes > 10000),
      { storage, requests, files },
    );
    record('no-page-errors', !errors.length, errors);
  } finally {
    await Promise.all(contexts.map((ctx) => ctx.close()));
    await sender.close();
  }
}

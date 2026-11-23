import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import M from 'matter-js';
import { pairCourse } from '../../one-part-missing/pair-course.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings, parts } from '../../one-part-missing/machines.js';
export async function verifyPairs(home, { url, record, shot, outDir }) {
  const errors = [];
  const popup = async (p, act) => {
    const ready = new Promise((ok) => p.once('popup', ok));
    await act();
    const tab = await ready;
    tab.on('pageerror', (e) => errors.push(e.message));
    return tab;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const waitPhase = (page, state) =>
    page.waitForFunction(
      (s) => document.querySelector('#pilot').dataset.state === s,
      { timeout: 18000 },
      state,
    );
  const run = async (page, state) => {
    await page.click('#run');
    await waitPhase(page, state);
  };
  const place = async (page, fit) => {
    await page.click('[data-part="' + fit.part + '"]');
    if (fit.flipped) await page.click('#flip');
    await page.click('[data-socket="' + fit.socket + '"]');
  };
  const key = (m) => 'chaos.one-part-missing.repair.' + m.id;
  const cues = (page) => page.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  const first = pairCourse[0],
    last = pairCourse.at(-1),
    [a, b] = fittings(first, certify(M, first)[0]);
  await p.tap('#map-link');
  await p.tap('#pair-entry');
  await p.waitForSelector('#fitted-pair:not([hidden])');
  await p.select('#playback-rate', '4');
  await run(p, 'miss');
  await place(p, b);
  await run(p, 'miss');
  const partial = await p.evaluate(
    (k) => ({
      count: document.querySelector('#pair-count').textContent,
      status: document.querySelector('#status').textContent,
      saved: localStorage.getItem(k),
    }),
    key(first),
  );
  record(
    'one-part-trial',
    partial.count === '1 of 2 parts fitted' &&
      partial.saved === null &&
      partial.status.includes('second'),
    partial,
  );
  await p.tap('#pair-pieces button');
  record(
    'unfit-one-spare',
    (await p.$eval('#pair-count', (e) => e.textContent)) === '0 of 2 parts fitted',
  );
  await place(p, { ...b, socket: a.socket });
  await place(p, { ...a, socket: b.socket });
  await run(p, 'miss');
  record(
    'swapped-tools-miss',
    (await p.$eval('#pair-count', (e) => e.textContent)) === '2 of 2 parts fitted' &&
      !(await p.evaluate((k) => localStorage.getItem(k), key(first))),
  );
  await place(p, b);
  await place(p, a);
  await run(p, 'won');
  const record1 = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key(first));
  record(
    'reverse-order-saves-both',
    record1.part === a.part &&
      record1.socket === a.socket &&
      record1.second.part === b.part &&
      record1.second.socket === b.socket,
    record1,
  );
  await p.tap('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'first-two-handoffs-phone.png');
  await p.reload();
  await p.waitForSelector('#replay', { visible: true });
  await p.tap('#replay');
  await waitPhase(p, 'won');
  const restored = await p.$$eval('#pair-pieces button', (bs) => bs.map((b) => b.textContent));
  record(
    'replay-restores-complete-rack',
    restored.length === 2 && restored.some((t) => t.includes(parts[b.part].name)),
    restored,
  );
  await p.tap('#next');
  await p.waitForFunction(
    (t) => document.querySelector('#machine-title').textContent === t,
    {},
    pairCourse[1].title,
  );
  record(
    'advance-in-course',
    (await p.$eval('#pair-count', (e) => e.textContent)) === '0 of 2 parts fitted',
  );
  await p.setViewport({ width: 1280, height: 800 });
  await p.click('#map-link');
  await p.select('#chapter', '27');
  await p.click('#shelf a[href="#' + last.id + '"]');
  await p.waitForFunction(
    (t) => document.querySelector('#machine-title').textContent === t,
    {},
    last.title,
  );
  await p.select('#playback-rate', '4');
  const fit = certify(M, last)[0];
  for (const item of fittings(last, fit)) await place(p, item);
  const spare = last.tray.find((k) => k !== fit.part && k !== fit.second.part),
    empty = last.sockets.findIndex((_, n) => n !== fit.socket && n !== fit.second.socket);
  await place(p, { part: spare, socket: empty });
  record('full-rack-keeps-fit', await p.$eval('#status', (e) => e.textContent.includes('Remove one')));
  await run(p, 'won');
  const expected = await cues(p);
  record(
    'seven-tool-master-repair',
    new Set(expected.map((t) => t.replace('Parcel · ', '').split(' · ')[0])).size >= 7,
    expected,
  );
  await p.click('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'seven-tool-pair-desktop.png');
  const s = await popup(p, () => p.click('#open-sandbox'));
  await s.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  const physical = await s.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape?.fitted)
      .map((b) => b.label),
  );
  record(
    'both-editable-in-sandbox',
    physical.includes(fit.part) && physical.includes(fit.second.part),
    physical,
  );
  await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.striker === 'cargo' && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 18000 },
  );
  await s.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + last.id + '-replay.html');
  for (let i = 0; i < 50 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage(),
    external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.click('#replay');
  await waitPhase(offline, 'won');
  const repeated = await cues(offline);
  record(
    'offline-pair-delivery',
    !external.length && JSON.stringify(expected) === JSON.stringify(repeated),
    { external, repeated },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

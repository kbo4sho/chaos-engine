import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import M from 'matter-js';
import { sortCourse } from '../../one-part-missing/sort-course.js';
import { sortingParts } from '../../one-part-missing/sorting.js';
import { certify } from '../../one-part-missing/certify.js';
export async function verifySorting(home, { url, record, shot, outDir }) {
  const errors = [];
  const popup = async (page, action) => {
    const next = new Promise((done) => page.once('popup', done));
    await action();
    const p = await next;
    p.on('pageerror', (e) => errors.push(e.message));
    return p;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, hasTouch: true, isMobile: true });
  await p.bringToFront();
  const phase = (page, s) =>
    page.waitForFunction(
      (expected) => document.querySelector('#pilot').dataset.state === expected,
      { timeout: 18000 },
      s,
    );
  const heading = (page, m) =>
    page.waitForFunction((t) => document.querySelector('#machine-title').textContent === t, {}, m.title);
  const navigate = async (i) => {
    await p.click('#map-link');
    await p.select('#chapter', String(32 + Math.floor(i / 10)));
    await p.click('#shelf a[href="#' + sortCourse[i].id + '"]');
    await heading(p, sortCourse[i]);
  };
  const repair = async (page, m) => {
    const fit = certify(M, m)[0];
    await page.select('#playback-rate', '4');
    await page.click('[data-part="' + fit.part + '"]');
    await page.click('[data-socket="' + fit.socket + '"]');
    await page.click('#run');
    await phase(page, 'won');
    return page.$$eval('#cues button', (a) => a.map((b) => b.textContent));
  };
  const seek = async (label) => {
    const buttons = await p.$$('#cues button'),
      labels = await p.$$eval('#cues button', (a) => a.map((b) => b.textContent));
    await buttons[labels.findIndex((t) => t.startsWith(label))].click();
    return p.evaluate(() => ({
      signal: document.querySelector('#signal').textContent,
      gold: document.querySelector('#gold-bin').textContent,
      blue: document.querySelector('#blue-bin').textContent,
      t: document.querySelector('#film-time').value,
    }));
  };
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#sort-entry');
  await heading(p, sortCourse[0]);
  await p.tap('#open-lab');
  for (const kind of Object.keys(sortingParts)) {
    await p.select('#lab-tool', kind);
    await p.select('#lab-offset', '24');
    const contact = await p.$eval('#lab-contact', (e) => e.textContent);
    record(
      'handling-lab-' + kind,
      contact.startsWith(sortingParts[kind].name) && contact.includes(' at '),
      contact,
    );
  }
  await p.select('#lab-tool', 'sieve');
  await p.select('#lab-offset', '-24');
  const small = await p.$eval('#lab-contact', (e) => e.textContent);
  await p.select('#lab-offset', '24');
  const large = await p.$eval('#lab-contact', (e) => e.textContent);
  record(
    'diameter-changes-clearance',
    small.includes('through gap') && large.includes('caught on bars'),
    { small, large },
  );
  await shot(p, 'sieve-clearance-phone.png');
  await p.tap('#lab-close');
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await phase(p, 'miss');
  const empty = await p.$eval('#signal', (e) => e.textContent);
  record('one-unassisted-delivery', empty === '1 / 2 sorted', empty);
  const first = await repair(p, sortCourse[0]);
  const blue = await seek('Blue received'),
    gold = await seek('Gold received');
  record(
    'independent-blue-first-receipt',
    blue.signal === '1 / 2 sorted' &&
      gold.signal === '2 / 2 sorted' &&
      blue.gold.includes('In transit') &&
      blue.blue.endsWith(blue.t) &&
      gold.gold.endsWith(gold.t),
    { blue, gold, first },
  );
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'two-receipts-phone.png');
  await navigate(16);
  const gate = await repair(p, sortCourse[16]);
  record(
    'pass-and-land-on-same-gate',
    gate.some((t) => t.includes('passed with arrow')) && gate.some((t) => t.includes('blocked return')),
    gate,
  );
  await p.setViewport({ width: 1280, height: 800 });
  await navigate(39);
  const final = await repair(p, sortCourse[39]);
  record(
    'four-tools-two-receivers',
    ['Sieve', 'Magnet', 'Zipline', 'Basket', 'Gold received', 'Blue received'].every((v) =>
      final.some((t) => t.includes(v)),
    ),
    final,
  );
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'dispatch-floor-desktop.png');
  const s = await popup(p, () => p.click('#open-sandbox'));
  await s.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  await s.click('#btn-save');
  if (await s.$eval('#save-confirm', (e) => e.open)) await s.click('#save-accept');
  await s.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await s.goto(url);
  await s.click('#btn-load');
  await s.click('#save-accept');
  await s.waitForFunction(
    () => Composite.allBodies(world).filter((b) => b.render.machineShape?.bin).length === 2,
  );
  const inventory = await s.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => ['sieve', 'basket', 'zipline'].includes(b.label))
      .map((b) => [b.label, b.parts.length, b.render.machineShape.span]),
  );
  record(
    'restored-solid-assemblies',
    inventory.some(([k, n]) => k === 'basket' && n === 4) &&
      inventory.some(([k, n]) => k === 'sieve' && n === 3) &&
      inventory.some(([k]) => k === 'zipline'),
    inventory,
  );
  if ((await s.$eval('#btn-pause', (b) => b.textContent)).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).filter((b) => b.render.machineShape?.bin && b.render.binDelivered)
        .length === 2,
    { timeout: 15000 },
  );
  const received = await s.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape?.bin)
      .map((b) => [b.render.machineShape.bin, b.render.struckAt]),
  );
  record(
    'restored-double-delivery',
    received.every(([, t]) => Number.isFinite(t)),
    received,
  );
  await s.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + sortCourse.at(-1).id + '-replay.html');
  for (let i = 0; i < 60 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage(),
    external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.select('#playback-rate', '4');
  await offline.click('#replay');
  await phase(offline, 'won');
  const events = await offline.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'offline-two-load-receipts',
    !external.length && JSON.stringify(events) === JSON.stringify(final),
    { events, external },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

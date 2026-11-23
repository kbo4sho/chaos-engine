import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import {
  designKits,
  freshDesign,
  encodeDesign,
  readDesign,
  buildDesign,
  designFilm,
  draftKey,
} from '../../one-part-missing/blueprints.js';

export async function verifyDesignBench(home, { url, record, shot, outDir }) {
  const popup = async (p, fn) => {
    const event = new Promise((r) => p.once('popup', r));
    await fn();
    return event;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher')),
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.bringToFront();
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent);
  const phase = (page, state) =>
    page.waitForFunction((s) => document.querySelector('#pilot').dataset.state === s, {}, state);
  const value = (page, id) => page.$eval('#' + id, (e) => e.value);
  const panel = async (page) => {
    if (!(await page.$eval('#design-bench', (d) => d.open))) await page.click('#design-bench summary');
    await page.waitForFunction(() => document.querySelector('#design-station').options.length > 0);
  };
  const frameAt = async (page, n) => {
    const max = await page.$eval('#design-frame', (e) => Number(e.max));
    await page.focus('#design-frame');
    await page.keyboard.press(n <= max - n ? 'Home' : 'End');
    for (let j = 0; j < Math.min(n, max - n); j++)
      await page.keyboard.press(n <= max - n ? 'ArrowRight' : 'ArrowLeft');
  };
  const repair = async (page, id) => {
    await page.waitForFunction(
      () => document.querySelector('#machine-no').textContent === 'Design bench · verified',
    );
    const f = buildDesign(readDesign(id)).intended;
    await page.select('#playback-rate', '4');
    await page.click('[data-part="' + f.part + '"]');
    await page.click('[data-socket="' + f.socket + '"]');
    await page.click('#run');
    await phase(page, 'won');
    return page.$$eval('#cues button', (b) => b.map((e) => e.textContent));
  };
  await panel(p);
  await p.select('#design-station', '0');
  await p.focus('#design-x');
  await p.keyboard.press('ArrowRight');
  record(
    'slide-a-real-station',
    (await value(p, 'design-offset-x')) === '8 right' &&
      (await p.evaluate((key) => localStorage.getItem(key), draftKey)).includes('0542'),
  );
  await p.click('#design-undo');
  await p.click('#design-redo');
  await p.click('#design-undo');
  await p.select('#design-part', '1');
  await p.select('#design-missing', '0');
  await p.select('#design-view', 'missing');
  await p.click('#design-play');
  await p.waitForFunction(() => Number(document.querySelector('#design-frame').value) > 2);
  await p.select('#design-view', 'intact');
  await p.click('#design-prove');
  await p.waitForFunction(() => document.querySelector('#design-status').textContent.includes('of 7'));
  record(
    'a-bad-machine-cannot-be-issued',
    !p.url().includes('#design-') && (await read(p, 'design-status')).includes('0 of 7'),
    await read(p, 'design-status'),
  );
  const draft = freshDesign();
  draft.missing = 0;
  draft.edits[0].type = 1;
  const f = designFilm(M, draft, true),
    t = 101;
  draft.target = f.tape[t].poses[f.actorIndex].slice(0, 2).map(Math.round);
  const id = encodeDesign(draft);
  await frameAt(p, t);
  await p.click('#design-target');
  const stored = await p.evaluate((key) => localStorage.getItem(key), draftKey);
  record(
    'capture-an-observed-target',
    stored === id && (await p.$eval('#design-bench', (e) => e.scrollWidth <= e.clientWidth + 1)),
    { stored, target: draft.target },
  );
  await shot(p, 'phone-edited-drawing.png');
  await p.reload();
  await panel(p);
  record(
    'draft-after-reload',
    (await value(p, 'design-part')) === '1' &&
      (await value(p, 'design-missing')) === '0' &&
      !(await p.$eval('#design-stock-target', (e) => e.hidden)),
  );
  await p.click('#design-prove');
  await p.waitForFunction((match) => location.hash === '#' + match, {}, id);
  const events = await repair(p, id);
  record(
    'replacement-repairs-the-new-machine',
    events.some((s) => s.includes('Trampoline')) && events.some((s) => s.includes('0.')),
    events,
  );
  const context = await p.browser().createBrowserContext(),
    fresh = await context.newPage();
  fresh.on('pageerror', (e) => errors.push(e.message));
  await fresh.goto(p.url());
  const repeated = await repair(fresh, id);
  record('shared-drawing-in-a-fresh-profile', JSON.stringify(events) === JSON.stringify(repeated), {
    url: fresh.url(),
    repeated,
  });
  await panel(fresh);
  await fresh.click('#design-import');
  record(
    'edit-a-shared-drawing',
    (await value(fresh, 'design-part')) === '1' &&
      (await fresh.evaluate((key) => localStorage.getItem(key), draftKey)) === id,
  );
  await fresh.select('#design-kit', '4');
  await fresh.select('#design-station', '1');
  await fresh.focus('#design-tune');
  await fresh.keyboard.press('End');
  record(
    'motor-calibration',
    (await value(fresh, 'design-setting')) === '130%' &&
      (await fresh.$eval('#design-position', (e) => e.hidden)),
  );
  await fresh.setViewport({ width: 1280, height: 800 });
  await panel(fresh);
  await fresh.select('#design-station', '1');
  await shot(fresh, 'desktop-shaft-design.png');
  await fresh.click('#design-prove');
  await fresh.waitForFunction(() => location.hash.startsWith('#design-1-4-'));
  await repair(fresh, new URL(fresh.url()).hash.slice(1));
  await context.close();
  // Every starter remains solvable after a genuinely different station is removed.
  for (const [i, k] of designKits.entries()) {
    await panel(p);
    if (Number(await value(p, 'design-kit')) === i) {
      await p.select('#design-kit', String((i + 1) % designKits.length));
    }
    await p.select('#design-kit', String(i));
    await p.select('#design-missing', '0');
    const d = freshDesign(i);
    d.missing = 0;
    const expected = encodeDesign(d);
    await p.click('#design-prove');
    await p.waitForFunction((e) => location.hash === '#' + e, {}, expected);
    const notes = await repair(p, expected);
    record('kit-' + i, notes.length > 0, { name: k.name, notes });
  }
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
  await s.waitForFunction(() => Composite.allBodies(world).some((b) => b.label === 'zipline'));
  if ((await read(s, 'btn-pause')).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).filter((b) => b.render.machineShape?.bin && b.render.binDelivered)
        .length === 2,
    { timeout: 15000 },
  );
  record('custom-machine-survives-sandbox-save', true);
  await s.close();
  await p.bringToFront();
  const current = new URL(p.url()).hash.slice(1),
    dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + current + '-replay.html');
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
  record(
    'exported-custom-replay',
    !external.length && (await read(offline, 'cues')).includes('Blue received'),
    { external },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

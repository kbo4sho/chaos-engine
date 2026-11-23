import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { rigs, doubleRun } from '../../one-part-missing/discovery/double-rigs.js';
import {
  readSheet,
  certifySheet,
  capture,
  suggestShutters,
} from '../../one-part-missing/discovery/shutter-sheet.js';
import { doublePrefix } from '../../one-part-missing/discovery/double-records.js';

export async function verifyShutterSheets(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.bringToFront();
  await p.waitForSelector('#map-link');
  await p.click('#map-link');
  await p.waitForSelector('#parts [data-part]');
  await p.evaluate(() => document.fonts.ready);
  await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.click('#discovery-entry')]);
  await p.waitForSelector('#double-entry',{visible:true});
  await p.evaluate(() => document.fonts.ready);
  await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.click('#double-entry')]);
  await p.waitForSelector('#double-title');
  const browser = p.browser(),
    guestCtx = await browser.createBrowserContext(),
    viewerCtx = await browser.createBrowserContext();
  const guest = await guestCtx.newPage(),
    viewer = await viewerCtx.newPage(),
    errors = [],
    examples = [];
  [p, guest, viewer].forEach((page) => page.on('pageerror', (e) => errors.push(e.message)));
  await guest.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await Promise.all(
    [p.browserContext(), guestCtx].map((ctx) => ctx.overridePermissions(new URL(url).origin, [])),
  );
  const knobs = async (page, settings) => {
    for (const [k, v] of settings.entries())
      await page.click('[data-knob="' + k + '"][data-position="' + v + '"]');
  };
  const run = async (page, settings) => {
    await knobs(page, settings);
    await page.select('#double-rate', '2');
    await page.click('#double-run');
    await page.waitForSelector('#double-clip:not([hidden])');
  };
  const storage = (page, id) =>
    page.evaluate(
      (prefix) => Object.entries(localStorage).filter(([k]) => k.startsWith(prefix)),
      doublePrefix + id + '.',
    );
  let example;
  for (const [i, rig] of rigs.entries()) {
    await p.bringToFront();
    await p.select('#double-select', rig.id);
    await p.waitForFunction(
      (title) => document.querySelector('#double-title').textContent === title,
      {},
      rig.title,
    );
    let design, expectedMarks;
    for (const [a] of rig.controls[0].values.entries())
      for (const [b] of rig.controls[1].values.entries()) {
        if (design) continue;
        const tape = doubleRun(M, rig, [a, b]);
        if (tape.count === 2) continue;
        const marks =
          i < 6
            ? rig.shots.map((s, j) => capture(tape, rig, j, s.tick - (j === 0 ? 1 : 0)))
            : suggestShutters(M, rig, tape);
        if (marks && certifySheet(M, rig, marks).route) {
          design = [a, b];
          expectedMarks = marks;
        }
      }
    if (!design) throw Error('No authorable alternate setup: ' + rig.id);
    await run(p, design);
    await p.click('#double-maker summary');
    if (!i) {
      await p.focus('#double-mark-1');
      await p.keyboard.press('End');
      await p.click('#double-test-sheet');
      record(
        'rejects-reversed-shutters',
        (await p.$eval('#double-maker-result', (e) => e.textContent.includes('earlier'))) &&
          (await p.$eval('#double-copy-sheet', (e) => e.hidden)),
      );
      await p.keyboard.press('Tab');
      await p.focus('#double-mark-1');
      await p.keyboard.press('Home');
      for (let j = 0; j < rig.shots[0].tick; j++) await p.keyboard.press('ArrowRight');
    }
    if (i < 6) {
      await p.focus('#double-mark-1');
      await p.keyboard.press('ArrowLeft');
    } else await p.click('#double-suggest');
    await p.click('#double-test-sheet');
    await p.waitForSelector('#double-copy-sheet:not([hidden])');
    await p.click('#double-copy-sheet');
    await p.waitForSelector('#double-sheet-url:not([hidden])');
    const invite = await p.$eval('#double-sheet-url', (e) => e.value),
      src = readSheet(new URL(invite).hash.slice(1));
    record(
      'custom-exposures-' + rig.id,
      src.rig.shots.every(
        (s, j) =>
          s.tick === expectedMarks[j].tick && s.x === expectedMarks[j].x && s.y === expectedMarks[j].y,
      ) && src.rig.shots.some((s, i) => s.x !== rig.shots[i].x || s.y !== rig.shots[i].y),
      src.rig.shots,
    );
    if (!i) await shot(p, 'author-stamped-exposures.png');
    await guest.goto(invite);
    await guest.waitForFunction(
      () => document.querySelector('#double-number').textContent === 'Player shutter puzzle',
    );
    const neutral = await guest.$$eval('#double-controls [aria-pressed=true]', (rows) =>
      rows.map((b) => Number(b.dataset.position)),
    );
    record(
      'blind-custom-start-' + rig.id,
      doubleRun(M, src.rig, neutral).count < 2 && !(await storage(guest, rig.id)).length,
    );
    await run(guest, design);
    await guest.click('#double-return-copy');
    await guest.waitForSelector('#double-return-url:not([hidden])');
    const reply = await guest.$eval('#double-return-url', (e) => e.value);
    await viewer.goto(reply);
    await viewer.waitForFunction(
      () => document.querySelector('#double-number').textContent === 'Returned take',
    );
    const two = await viewer.$$eval('#double-shots [data-hit=true]', (bs) => bs.length);
    record(
      'returned-take-no-viewer-credit-' + rig.id,
      two === 2 &&
        !(await storage(viewer, src.rig.sheet)).length &&
        !(await storage(guest, rig.id)).length,
    );
    if (!i) example = { invite, reply, design };
    examples.push({ id: rig.id, invite, reply, design, neutral });
  }
  const offline = async (address, label) => {
    await viewer.bringToFront();
    await viewer.goto(address);
    await viewer.waitForSelector('#double-controls button');
    await viewer.click('#double-make-file');
    await viewer.waitForSelector('#double-file:not([hidden])');
    const name = await viewer.$eval('#double-file', (e) => e.download),
      file = path.join(outDir, name);
    const cdp = await viewer.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      browserContextId: viewerCtx.id,
      downloadPath: outDir,
    });
    await viewer.click('#double-file');
    for (let i = 0; i < 100 && !fs.existsSync(file); i++) await delay(75);
    if (!fs.existsSync(file))
      throw Error('No completed download in the isolated viewer context: ' + name);
    const ctx = await browser.createBrowserContext(),
      tab = await ctx.newPage(),
      remote = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    tab.on('request', (r) => {
      if (/^https?:/.test(r.url())) remote.push(r.url());
    });
    await tab.setOfflineMode(true);
    await tab.goto(pathToFileURL(file).href);
    await tab.waitForSelector('#double-controls button');
    if (label === 'puzzle') await run(tab, example.design);
    else
      await tab.waitForFunction(
        () => document.querySelector('#double-number').textContent === 'Returned take',
      );
    await tab.click('#double-shots button');
    await tab.click('#double-clip [data-clip-make]');
    await tab.waitForSelector('#double-clip [data-clip-save]:not([hidden])');
    record(
      'offline-' + label + '-includes-physics-and-gif',
      remote.length === 0 && (await tab.$eval('#double-result', (e) => e.dataset.solved === 'true')),
      { name, bytes: fs.statSync(file).size, remote },
    );
    await shot(tab, 'standalone-' + label + '.png');
    await ctx.close();
  };
  await offline(example.invite, 'puzzle');
  await offline(example.reply, 'replay');
  await viewer.goto(example.invite + '/take/9.9');
  await viewer.waitForFunction(() =>
    document.querySelector('#double-result').textContent.includes('could not be reproduced'),
  );
  record(
    'bad-take-recovers-to-custom-machine',
    (await viewer.$eval('#double-number', (e) => e.textContent)) === 'Player shutter puzzle',
  );
  fs.writeFileSync(path.join(outDir, 'sheet-addresses.json'), JSON.stringify(examples, null, 2));
  record('no-page-errors', !errors.length, errors);
  await viewerCtx.close();
  await guestCtx.close();
  await p.close();
}

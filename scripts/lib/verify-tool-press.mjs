import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { certify, resolveMachine } from '../../one-part-missing/workshop.js';

export async function verifyToolPress(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const popup = async (page, action) => {
    const opening = new Promise((resolve) => page.once('popup', resolve));
    await action();
    return opening;
  };
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const solve = async (page, m) => {
    const fit = certify(M, m)[0];
    await page.waitForFunction(
      (name) => document.querySelector('#machine-title').textContent === name,
      {},
      m.title,
    );
    await page.select('#playback-rate', '4');
    await page.click('[data-part="' + fit.part + '"]');
    if (fit.flipped) await page.click('#flip');
    await page.click('[data-socket="' + fit.socket + '"]');
    const actual = await page.$eval('#open-sandbox', (a) => a.hash);
    const fitted = new URLSearchParams(actual.slice(1));
    record(
      'fitted-' + m.id,
      fitted.get('part') === fit.part && Number(fitted.get('socket')) === fit.socket,
      { actual, fit },
    );
    await page.click('#run');
    await page.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
      timeout: 18000,
    });
    return fit;
  };
  const print = async (style, focus, partner) => {
    await p.select('#press-style', style);
    await p.select('#press-focus', focus);
    await p.select('#press-partner', partner);
    const prev = p.url();
    await p.tap('#generate');
    await p.waitForFunction(
      (old) =>
        location.href !== old &&
        location.hash.startsWith('#press-2-') &&
        !document.querySelector('#proof').hidden,
      { timeout: 24000 },
      prev,
    );
    return resolveMachine(M, new URL(p.url()).hash.slice(1));
  };
  // A shared rack print with two shafts just 35 bench units apart.
  const dense = resolveMachine(M, 'press-2-8w-1y3y9w6-0-79-6d');
  const denseUrl = new URL(p.url());
  denseUrl.hash = dense.id;
  await p.goto(denseUrl.href);
  await solve(p, dense);
  await p.click('#reset');
  const targets = await p.$$eval('#sockets button', (bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }),
  );
  record(
    'separate-phone-hit-targets',
    targets.every((a, i) =>
      targets
        .slice(i + 1)
        .every((b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top),
    ),
    targets,
  );
  await shot(p, 'separate-rack-sockets-phone.png');
  const first = await print('chain', 'fan', 'magnet');
  await solve(p, first);
  const events = await p.$$eval('#cues button', (buttons) => buttons.map((b) => b.textContent));
  record(
    'requested-fields-act',
    events.some((t) => t.includes('Lift fan')) && events.some((t) => t.includes('Magnet')),
    { id: first.id, events },
  );
  await p
    .browserContext()
    .overridePermissions(new URL(p.url()).origin, ['clipboard-read', 'clipboard-write']);
  await p.tap('#share');
  await p.waitForFunction(
    () =>
      !document.querySelector('#copy-fallback').hidden ||
      document.querySelector('#status').textContent.includes('link copied'),
  );
  const shared = await p.evaluate(async () =>
    document.querySelector('#copy-fallback').hidden
      ? await navigator.clipboard.readText()
      : document.querySelector('#share-url').value,
  );
  const context = await p.browser().createBrowserContext();
  const fresh = await context.newPage();
  fresh.on('pageerror', (e) => errors.push(e.message));
  await fresh.goto(shared);
  await fresh.waitForSelector('#proof:not([hidden])');
  record(
    'shared-clean-new-player',
    new URL(shared).hash === '#' + first.id &&
      (await fresh.$eval('#progress', (e) => e.textContent)).startsWith('0 of'),
    shared,
  );
  await solve(fresh, first);
  const sharedEvents = await fresh.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'shared-print-matches-timeline',
    JSON.stringify(events) === JSON.stringify(sharedEvents),
    sharedEvents,
  );
  await context.close();
  await p.bringToFront();
  const rig = await print('rig', 'pulley', 'damper');
  await solve(p, rig);
  const rigEvents = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'printed-rig-tools-carry-load',
    rigEvents.some((t) => t.includes('Pulley taut')) &&
      rigEvents.some((t) => t.includes('Damper damping')),
    rigEvents,
  );
  const drive = await print('drive', 'gearbox', 'rack');
  await solve(p, drive);
  const driveEvents = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'printed-power-transmission',
    ['Gearbox meshed', 'Rack and pinion engaged'].every((k) => driveEvents.some((t) => t.includes(k))),
    driveEvents,
  );
  const sorting = await print('sort', 'sieve', 'basket');
  await solve(p, sorting);
  const sortingEvents = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'printed-double-sort',
    ['Basket', 'Sieve', 'Blue received', 'Gold received'].every((t) =>
      sortingEvents.some((s) => s.includes(t)),
    ),
    sortingEvents,
  );
  const airy = await print('flight', 'hopper', 'thruster');
  await solve(p, airy);
  const flightEvents = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'printed-flight-rig',
    ['Hopper foot hopped', 'Thruster attached'].every((s) => flightEvents.some((e) => e.includes(s))),
    flightEvents,
  );
  const field = await print('field','ground','phase');
  await solve(p,field);
  const fieldEvents=await p.$$eval('#cues button',bs=>bs.map(b=>b.textContent));
  record('printed-ground-and-phase',['Grounding brush grounded','Phase gate phased'].every(k=>fieldEvents.some(e=>e.includes(k))),fieldEvents);
  const parcel = await print('parcel', 'switch', 'hatch');
  const move = await solve(p, parcel);
  record(
    'printed-parcel-delivered',
    await p.$eval('#signal', (e) => e.textContent === 'Parcel delivered'),
    { id: parcel.id, move, plate: parcel.pressPlate },
  );
  await p.tap('#proof summary');
  await shot(p, 'parcel-print-trial.png');
  const sandbox = await popup(p, () => p.tap('#open-sandbox'));
  await sandbox.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  const inventory = await sandbox.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape)
      .map((b) => b.render.machineShape.kind),
  );
  record(
    'editable-printed-payload',
    inventory.includes('cargo') && inventory.includes('switch') && inventory.includes('hatch'),
    inventory,
  );
  await sandbox.close();
  await p.bringToFront();
  const session = await p.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.tap('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + parcel.id + '-replay.html');
  for (let i = 0; i < 50 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage();
  const external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.waitForSelector('#replay', { visible: true });
  await offline.select('#playback-rate', '4');
  await offline.click('#replay');
  await offline.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
    timeout: 18000,
  });
  record(
    'offline-press-replay',
    external.length === 0 &&
      (await offline.$eval('#signal', (e) => e.textContent === 'Parcel delivered')),
    { external },
  );
  await offline.close();
  await session.detach();
  await p.tap('#practice summary');
  await p.select('#practice-tool', 'pinwheel');
  const before = p.url();
  await p.tap('#print-practice');
  await p.waitForFunction(
    (old) => location.href !== old && !document.querySelector('#proof').hidden,
    { timeout: 24000 },
    before,
  );
  const practice = resolveMachine(M, new URL(p.url()).hash.slice(1));
  await solve(p, practice);
  const observed = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'practice-prints-selected-tool',
    observed.some((t) => t.includes('Pinwheel')),
    observed,
  );
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

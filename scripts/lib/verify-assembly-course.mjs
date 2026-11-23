import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { assemblyCourse } from '../../one-part-missing/assembly-course.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings, parts } from '../../one-part-missing/machines.js';
export async function verifyAssembly(home, { url, record, shot, outDir }) {
  const errors = [],
    popup = async (page, sel) => {
      const opening = new Promise((r) => page.once('popup', r));
      await page.click(sel);
      const tab = await opening;
      tab.on('pageerror', (e) => errors.push(e.message));
      return tab;
    };
  await home.goto(url);
  const p = await popup(home, '#puzzle-launcher');
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent);
  const head = (page, m) =>
    page.waitForFunction(
      (t) => document.querySelector('#machine-title')?.textContent === t,
      {},
      m.title,
    );
  const phase = (page, state) =>
    page.waitForFunction(
      (s) => document.querySelector('#pilot')?.dataset.state === s,
      { timeout: 18000 },
      state,
    );
  const run = async (p, state) => {
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await phase(p, state);
  };
  const place = async (p, f) => {
    await p.click('[data-part="' + f.part + '"]');
    await p.click('[data-socket="' + f.socket + '"]');
  };
  const key = (m) => 'chaos.one-part-missing.repair.' + m.id,
    stored = (p, m) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key(m));
  const first = assemblyCourse[0],
    last = assemblyCourse.at(-1);
  const firstFit = certify(M, first)[0],
    fits = fittings(first, firstFit);
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#assembly-entry');
  await head(p, first);
  await run(p, 'miss');
  record(
    'three-missing-without-credit',
    (await read(p, 'pair-count')) === '0 of 3 parts fitted' && !(await stored(p, first)),
  );
  await place(p, fits[0]);
  await run(p, 'miss');
  record(
    'working-first-station',
    (await p.$$eval('#fitting-events .acted', (ns) => ns.length)) === 1 &&
      (await read(p, 'status')).includes('1 of 1'),
  );
  await place(p, fits[1]);
  await run(p, 'miss');
  record(
    'two-fittings-miss',
    (await read(p, 'pair-count')) === '2 of 3 parts fitted' && !(await stored(p, first)),
  );
  await p.click('#inspect-miss');
  await p.click('#coach-compare');
  await p.waitForSelector('#coach-reveal', { visible: true });
  await p.click('#coach-reveal');
  record(
    'coach-retains-two-fits',
    (await read(p, 'coach-steps')).includes(parts[fits[2].part].name) &&
      (await p.$eval('#coach-reveal', (e) => e.hidden)),
  );
  await p.click('#coach-steps button');
  await p.keyboard.press('Enter');
  await p.click('[data-remove="' + fits[0].socket + '"]');
  record(
    'removing-first-keeps-remaining',
    await p.$$eval('#pair-pieces button', (ns) => ns.length === 2),
  );
  await place(p, fits[0]);
  await run(p, 'won');
  const result = await stored(p, first);
  record(
    'earned-first-triple',
    JSON.stringify(fittings(first, result)) === JSON.stringify(fits),
    result,
  );
  const activated = await p.$$eval('#fitting-events .acted', (bs) => bs.map((b) => b.textContent));
  await p.focus('#scrubber');
  await p.keyboard.press('Home');
  record('inspection-starts-before-contacts', !(await p.$('#fitting-events .acted')));
  await p.keyboard.press('End');
  await p.click('#fitting-events button:nth-child(2)');
  record('contact-follows-film', activated[1].endsWith(await p.$eval('#film-time', (e) => e.value)));
  await shot(p, 'inspect-three-fittings-phone.png');
  await p.reload();
  await p.click('#replay');
  await phase(p, 'won');
  record('replay-reinstalls-three', await p.$$eval('#pair-pieces button', (bs) => bs.length === 3));
  const level = async (i) => {
    const m = assemblyCourse[i];
    await p.click('#map-link');
    await p.select('#chapter', String(40 + Math.floor(i / 10)));
    await p.click('#shelf a[href="#' + m.id + '"]');
    await head(p, m);
    return m;
  };
  const machine = await level(34),
    mix = certify(M, machine)[0];
  for (const f of fittings(machine, mix)) await place(p, f);
  await run(p, 'won');
  record(
    'both-cold-store-loads-delivered',
    (await read(p, 'signal')) === '2 / 2 sorted' &&
      (await p.$$eval('#fitting-events .acted', (ns) => ns.length === 3)),
  );
  await p.setViewport({ width: 1280, height: 800 });
  await level(39);
  const finalFit = certify(M, last)[0],
    placed = fittings(last, finalFit);
  for (const f of [...placed].reverse()) await place(p, f);
  const spare = last.tray.find((k) => placed.every((f) => f.part !== k)),
    empty = last.sockets.findIndex((_, k) => placed.every((f) => f.socket !== k));
  await place(p, { part: spare, socket: empty });
  record('full-triple-kept', (await read(p, 'status')).includes('Remove one'));
  await run(p, 'won');
  const cues = await p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'seven-station-timed-dispatch',
    [
      'Trip switch',
      'Hatch',
      'Conveyor',
      'Parachute',
      'Thruster',
      'Release hoop',
      'Bank vane',
      'Receiver accepted',
    ].every((name) => cues.some((s) => s.includes(name))),
    cues,
  );
  const linked = await p.$eval('#open-sandbox', (a) => a.hash),
    hash = new URLSearchParams(linked.slice(1));
  record(
    'all-three-sandbox-parameters',
    hash.get('part3') === finalFit.third.part && hash.get('socket3') === String(finalFit.third.socket),
  );
  await shot(p, 'final-three-fitted-desktop.png');
  const sandbox = await popup(p, '#open-sandbox');
  await sandbox.waitForFunction(() =>
    document.querySelector('#btn-pause')?.textContent.includes('PLAY'),
  );
  const imported = await sandbox.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape?.fitted)
      .map((b) => b.render.machineShape.kind),
  );
  record(
    'sandbox-imports-three',
    placed.every((f) => imported.includes(f.part)) && imported.length === 3,
    imported,
  );
  await sandbox.close();
  await p.bringToFront();
  const protocol = await p.createCDPSession();
  await protocol.send('Browser.grantPermissions', {
    origin: new URL(url).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await p.click('#share-assembly');
  const href = await p.evaluate(async () =>
    document.querySelector('#copy-fallback').hidden
      ? await navigator.clipboard.readText()
      : document.querySelector('#share-url').value,
  );
  const c = await p.browser().createBrowserContext(),
    shared = await c.newPage();
  shared.on('pageerror', (e) => errors.push(e.message));
  await shared.goto(href);
  await head(shared, last);
  record(
    'unearned-shared-assembly',
    (await read(shared, 'pair-count')) === '3 of 3 parts fitted' && !(await stored(shared, last)),
  );
  await run(shared, 'won');
  record('earned-from-shared-triple', !!(await stored(shared, last))?.third);
  await protocol.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + last.id + '-replay.html');
  for (let i = 0; i < 60 && !fs.existsSync(file); i++) await delay(100);
  const f = await c.newPage(),
    external = [];
  f.on('pageerror', (e) => errors.push(e.message));
  f.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await f.setOfflineMode(true);
  await f.goto(pathToFileURL(file).href);
  await head(f, last);
  await f.select('#playback-rate', '4');
  await f.click('#replay');
  await phase(f, 'won');
  record(
    'standalone-three-fittings',
    !external.length && (await f.$$eval('#fitting-events .acted', (ns) => ns.length === 3)),
    { external },
  );
  fs.writeFileSync(
    path.join(outDir, 'assembly-proofs.json'),
    JSON.stringify({ first: result, href, final: await stored(p, last), cues, imported }, null, 2),
  );
  await protocol.detach();
  await c.close();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { fieldCourse } from '../../one-part-missing/field-course.js';
import { certify } from '../../one-part-missing/certify.js';
export async function verifyFieldCourse(home, { url, record, shot, outDir }) {
  const errors = [],
    popup = async (page, sel) => {
      const ready = new Promise((r) => page.once('popup', r));
      await page.click(sel);
      const q = await ready;
      q.on('pageerror', (e) => errors.push(e.message));
      return q;
    };
  await home.goto(url);
  const p = await popup(home, '#puzzle-launcher');
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent),
    head = (page, m) =>
      page.waitForFunction(
        (t) => document.querySelector('#machine-title')?.textContent === t,
        {},
        m.title,
      );
  const phase = (page, s) =>
    page.waitForFunction((v) => document.querySelector('#pilot').dataset.state === v, {}, s);
  const level = async (i) => {
    const m = fieldCourse[i];
    await p.click('#map-link');
    await p.select('#chapter', String(44 + Math.floor(i / 10)));
    await p.click('#shelf a[href="#' + m.id + '"]');
    await head(p, m);
    return m;
  };
  const fit = async (m) => {
    const correct = certify(M, m)[0];
    await p.click('[data-part="' + correct.part + '"]');
    await p.click('[data-socket="' + correct.socket + '"]');
  };
  const run = async (page, state) => {
    await page.select('#playback-rate', '4');
    await page.click('#run');
    await phase(page, state);
  };
  const cue = async (page, kind) => {
    const bs = await page.$$('#cues button');
    for (const b of bs) {
      if ((await b.evaluate((e) => e.textContent)).includes(kind)) {
        await b.click();
        return;
      }
    }
    throw Error('No recorded cue ' + kind);
  };
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#field-entry');
  await head(p, fieldCourse[0]);
  await run(p, 'miss');
  await fit(fieldCourse[0]);
  await run(p, 'won');
  await cue(p, 'Pulse coil pulsed');
  await shot(p, 'first-pulse-phone.png');
  const phaseGate = await level(4);
  await fit(phaseGate);
  await run(p, 'won');
  await cue(p, 'Phase gate phased');
  record('phase-follows-tape', (await read(p, 'field-display')).includes('Phased 0.35 s'));
  await p.focus('#scrubber');
  await p.keyboard.press('Home');
  record('no-phase-at-release', !(await read(p, 'field-display')).includes('Phased'));
  const moving = await level(20);
  record(
    'one-moving-charge-visible',
    (await read(p, 'field-display')) === 'Gold · Neutral / Blue · Negative (−)',
  );
  await fit(moving);
  await run(p, 'won');
  await cue(p, 'Positive terminal charged');
  record(
    'two-moving-poles-read-separately',
    (await read(p, 'field-display')) === 'Gold · Positive (+) / Blue · Negative (−)',
  );
  await shot(p, 'signed-moving-poles-phone.png');
  const gyro = await level(3);
  await fit(gyro);
  await run(p, 'won');
  await cue(p, 'Gyroscope attached');
  record(
    'gyro-and-thruster-on-the-same-body',
    (await read(p, 'flight-gear')).includes('Thruster + Gyroscope'),
  );
  await p.setViewport({ width: 1280, height: 800 });
  const last = await level(39);
  await fit(last);
  await run(p, 'won');
  const events = await p.$$eval('#cues button', (es) => es.map((e) => e.textContent));
  record(
    'ordered-seven-field-stations',
    [
      'Trip switch',
      'Hatch',
      'Conveyor',
      'Positive terminal charged',
      'Grounding brush grounded',
      'Swirl coil turned',
      'Phase gate phased',
      'Receiver accepted',
    ].every((e) => events.some((s) => s.includes(e))) && (await read(p, 'signal')).startsWith('2 / 2'),
    events,
  );
  await cue(p, 'Positive terminal charged');
  const charged = await read(p, 'field-display');
  await cue(p, 'Grounding brush grounded');
  const neutral = await read(p, 'field-display');
  await cue(p, 'Phase gate phased');
  const phased = await read(p, 'field-display');
  record(
    'charge-ground-phase-film',
    charged.includes('Blue · Positive') &&
      neutral.includes('Blue · Neutral') &&
      phased.includes('Phased 0.35 s'),
    { charged, neutral, phased },
  );
  await shot(p, 'field-dispatch-desktop.png');
  const sandbox = await popup(p, '#open-sandbox');
  await sandbox.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  await sandbox.click('#btn-pause');
  await sandbox.waitForFunction(
    () => Composite.allBodies(world).some((b) => b.label === 'cargo' && b.render.phaseFrames >= 17),
    { polling: 'raf', timeout: 12000 },
  );
  await sandbox.click('#btn-pause');
  const snap = () =>
    sandbox.evaluate(() => {
      const b = Composite.allBodies(world).find((b) => b.label === 'cargo');
      return {
        phase: b.render.phaseFrames,
        charge: b.render.fieldCharge,
        mask: b.collisionFilter.mask,
        original: b.render.phaseBaseMask,
      };
    });
  const saved = await snap();
  record('sandbox-real-phased-load', saved.phase > 0 && saved.mask === 0 && saved.original !== 0, saved);
  await sandbox.click('#btn-save');
  if (await sandbox.$eval('#save-confirm', (e) => e.open)) await sandbox.click('#save-accept');
  await sandbox.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await sandbox.reload();
  await sandbox.click('#btn-load');
  await sandbox.click('#save-accept');
  await sandbox.waitForFunction(() =>
    Composite.allBodies(world).some((b) => b.label === 'cargo' && b.render.phaseFrames > 0),
  );
  const loaded = await snap();
  record(
    'restored-phase-countdown',
    loaded.phase === saved.phase && loaded.mask === 0 && loaded.original === saved.original,
    loaded,
  );
  if ((await read(sandbox, 'btn-pause')).includes('PLAY')) await sandbox.click('#btn-pause');
  await sandbox.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.window && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 14000 },
  );
  const solid = await snap();
  record('materialized-at-due-step', !solid.phase && solid.mask === saved.original, solid);
  await sandbox.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + last.id + '-replay.html');
  for (let i = 0; i < 75 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage(),
    external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await head(offline, last);
  await offline.select('#playback-rate', '4');
  await offline.click('#replay');
  await phase(offline, 'won');
  await cue(offline, 'Phase gate phased');
  record(
    'offline-field-replay',
    !external.length &&
      (await read(offline, 'field-display')).includes('Blue · Neutral · Phased 0.35 s'),
    { external },
  );
  fs.writeFileSync(
    path.join(outDir, 'field-evidence.json'),
    JSON.stringify({ saved, loaded, solid, events, charged, neutral, phased }, null, 2),
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

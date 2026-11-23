import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { flightCourse } from '../../one-part-missing/flight-course.js';
import { flightParts } from '../../one-part-missing/flight.js';
import { certify } from '../../one-part-missing/certify.js';
export async function verifyFlight(home, { url, record, shot, outDir }) {
  const errors = [];
  const popup = async (p, fn) => {
    const event = new Promise((r) => p.once('popup', r));
    await fn();
    const fresh = await event;
    fresh.on('pageerror', (e) => errors.push(e.message));
    return fresh;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent);
  const phase = (page, s) =>
    page.waitForFunction((x) => document.querySelector('#pilot').dataset.state === x, {}, s);
  const head = (page, m) =>
    page.waitForFunction((t) => document.querySelector('#machine-title').textContent === t, {}, m.title);
  const navigate = async (i) => {
    await p.click('#map-link');
    await p.select('#chapter', String(36 + Math.floor(i / 10)));
    await p.click('#shelf a[href="#' + flightCourse[i].id + '"]');
    await head(p, flightCourse[i]);
  };
  const fit = async (page, m) => {
    const f = certify(M, m)[0];
    await page.select('#playback-rate', '4');
    await page.click('[data-part="' + f.part + '"]');
    await page.click('[data-socket="' + f.socket + '"]');
    await page.click('#run');
    await phase(page, 'won');
    return page.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  };
  const cue = async (page, fragment) => {
    const buttons = await page.$$('#cues button');
    for (const b of buttons)
      if ((await b.evaluate((e) => e.textContent)).includes(fragment)) {
        await b.click();
        return;
      }
    throw Error('Missing cue ' + fragment);
  };
  await p.click('#map-link');
  await p.click('#course-index summary');
  await p.click('#flight-entry');
  await head(p, flightCourse[0]);
  await p.select('#playback-rate', '4');
  await p.click('#run');
  await phase(p, 'miss');
  record('empty-load-no-collar', (await read(p, 'flight-gear')) === 'Gold · No gear');
  await fit(p, flightCourse[0]);
  await cue(p, 'Float collar attached');
  record('flight-equipment-reflects-the-film', (await read(p, 'flight-gear')).includes('Float collar'));
  await p.focus('#scrubber');
  await p.keyboard.press('Home');
  record('frame-before-pickup', (await read(p, 'flight-gear')) === 'Gold · No gear');
  await p.click('#open-lab');
  for (const k of Object.keys(flightParts)) {
    await p.select('#lab-tool', k);
    const contact = await read(p, 'lab-contact');
    record('lab-' + k, !contact.includes('Outside') && contact.includes(' s'), contact);
  }
  await p.select('#lab-tool', 'keel');
  await p.select('#lab-offset', '24');
  record(
    'actual-body-heading-input',
    (await read(p, 'lab-release-label')) === 'Body heading' &&
      (await p.$eval('#lab-offset', (e) => e.selectedOptions[0].textContent)) === 'Nose down',
  );
  await p.click('#lab-close');
  await navigate(4);
  const hops = await fit(p, flightCourse[4]);
  record(
    'foot-lands-after-it-attaches',
    hops.some((t) => t.includes('Hopper foot hopped')) &&
      hops.some((t) => t.includes('Hopper foot attached')),
    hops,
  );
  await cue(p, 'hopped');
  await shot(p, 'hopper-phone.png');
  await navigate(6);
  await fit(p, flightCourse[6]);
  await cue(p, 'Float collar attached');
  const before = await read(p, 'flight-gear');
  await cue(p, 'released gear');
  const after = await read(p, 'flight-gear');
  record(
    'release-changes-the-carried-equipment',
    before.includes('Float collar') && after === 'Gold · No gear',
    { before, after },
  );
  await p.setViewport({ width: 1280, height: 800 });
  await navigate(39);
  const final = await fit(p, flightCourse[39]);
  record(
    'seven-station-flight',
    [
      'Trip switch',
      'Hatch',
      'Conveyor',
      'Parachute attached',
      'Thruster attached',
      'Release hoop released gear',
      'Bank vane banked',
    ].every((s) => final.some((e) => e.includes(s))),
    final,
  );
  record(
    'both-ordered-contacts-recorded',
    (await read(p, 'signal')) === '2 / 2 · Parcel delivered',
    await read(p, 'signal'),
  );
  await p.focus('#scrubber');
  await p.keyboard.press('Home');
  record(
    'ordered-contacts-follow-film',
    (await read(p, 'signal')) === '0 / 2 · Hatch closed',
    await read(p, 'signal'),
  );
  await cue(p, 'Thruster attached');
  record(
    'only-blue-carries-two-fittings',
    (await read(p, 'flight-gear')) === 'Gold · No gear / Blue · Parachute + Thruster',
    await read(p, 'flight-gear'),
  );
  await shot(p, 'parcel-flight-desktop.png');
  const s = await popup(p, () => p.click('#open-sandbox'));
  await s.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  await s.click('#btn-pause');
  await s.waitForFunction(
    () => Composite.allBodies(world).some((b) => b.label === 'cargo' && b.render.gearMask === 6),
    { polling: 'raf', timeout: 14000 },
  );
  await s.click('#btn-pause');
  const mask = await s.evaluate(
    () => Composite.allBodies(world).find((b) => b.label === 'cargo').render.gearMask,
  );
  record('sandbox-paused-with-equipment', mask === 6, mask);
  await s.click('#btn-save');
  if (await s.$eval('#save-confirm', (e) => e.open)) await s.click('#save-accept');
  await s.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await s.goto(url);
  await s.click('#btn-load');
  await s.click('#save-accept');
  await s.waitForFunction(() =>
    Composite.allBodies(world).some((b) => b.label === 'cargo' && b.render.gearMask === 6),
  );
  if ((await read(s, 'btn-pause')).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.window && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 15000 },
  );
  record(
    'restored-load-drops-gear-and-hits-timed-receiver',
    (await s.evaluate(
      () => Composite.allBodies(world).find((b) => b.label === 'cargo').render.gearMask,
    )) === 0,
  );
  await s.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + flightCourse[39].id + '-replay.html');
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
    'offline-seven-station-flight',
    !external.length && JSON.stringify(events) === JSON.stringify(final),
    { events, external },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

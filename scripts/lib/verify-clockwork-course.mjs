import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { clockCourse } from '../../one-part-missing/tool-course.js';
import { mechanisms } from '../../one-part-missing/mechanisms.js';
import { certify } from '../../one-part-missing/workshop.js';

export async function verifyClockwork(home, { url, record, shot, outDir }) {
  const errors = [];
  const popup = async (p, action) => {
    const next = new Promise((resolve) => p.once('popup', resolve));
    await action();
    const page = await next;
    page.on('pageerror', (err) => errors.push(err.message));
    return page;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const phase = (s) =>
    p.waitForFunction(
      (state) => document.querySelector('#pilot').dataset.state === state,
      { timeout: 18000 },
      s,
    );
  const waitLevel = (m) =>
    p.waitForFunction(
      (title) => document.querySelector('#machine-title').textContent === title,
      {},
      m.title,
    );
  const level = async (m) => {
    await p.tap('#map-link');
    await p.select('#chapter', String(Math.floor(campaign.indexOf(m) / 10)));
    await p.tap('#shelf a[href="#' + m.id + '"]');
    await waitLevel(m);
  };
  const repair = async (m) => {
    const move = certify(M, m)[0];
    await p.tap('[data-part="' + move.part + '"]');
    await p.tap('[data-socket="' + move.socket + '"]');
    await p.tap('#run');
    await phase('won');
    return move;
  };
  const first = clockCourse[0],
    gatehouse = clockCourse[20],
    last = clockCourse.at(-1);
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#clock-entry');
  await waitLevel(first);
  await p.tap('#open-lab');
  await p.select('#lab-offset', '0');
  for (const kind of Object.keys(mechanisms)) {
    await p.select('#lab-tool', kind);
    const contact = await p.$eval('#lab-contact', (el) => el.textContent);
    record('live-motion-' + kind, contact.includes('First contact'), contact);
  }
  await shot(p, 'hatch-experiment-mobile.png');
  await p.tap('#lab-close');
  await repair(first);
  record('deck-collision', await p.$eval('#cues button', (b) => b.textContent.includes('Elevator')));
  await level(gatehouse);
  await p.tap('#run');
  await phase('miss');
  record(
    'cargo-waits-for-signal',
    await p.$eval('#status', (e) => e.textContent.includes('parcel is waiting')),
  );
  await repair(gatehouse);
  record('two-body-delivery', await p.$eval('#signal', (el) => el.textContent === 'Parcel delivered'));
  await level(last);
  const move = await repair(last);
  const cues = await p.$$eval('#cues button', (all) => all.map((e) => e.textContent));
  record(
    'seven-instruments-including-parcel',
    cues.length >= 7 && cues.at(-1).startsWith('Parcel · Pinwheel'),
    cues,
  );
  await p.tap('#cues button:last-child');
  record(
    'unobstructed-contact-frame',
    await p.evaluate(
      () =>
        document.querySelector('#sockets').hidden &&
        document.querySelector('#counter').textContent === document.querySelector('#film-time').value &&
        document.querySelector('#signal').textContent === 'Hatch open',
    ),
  );
  record('inspect-parcel', cues.at(-1).includes(await p.$eval('#film-time', (e) => e.value)));
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'seven-instrument-finale-phone.png');
  await p.setViewport({ width: 1280, height: 800 });
  await p.waitForSelector('#replay', { visible: true });
  await p.click('#replay');
  await phase('won');
  await p.click('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'parcel-handoff-desktop.png');
  const s = await popup(p, () => p.click('#open-sandbox'));
  await s.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  await s.click('#btn-save');
  if (await s.$eval('#save-confirm', (el) => el.open)) await s.click('#save-accept');
  await s.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await s.goto(url);
  await s.click('#btn-load');
  await s.click('#save-accept');
  await s.waitForFunction(() =>
    Composite.allBodies(world).some((b) => b.render.machineShape?.kind === 'cargo'),
  );
  const before = await s.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape)
      .map((b) => b.label),
  );
  record(
    'compound-rotor-and-parcel-saved',
    before.includes(move.part) && before.includes('cargo') && before.includes('hatch'),
    before,
  );
  if ((await s.$eval('#btn-pause', (b) => b.textContent)).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.striker === 'cargo' && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 18000 },
  );
  const states = await s.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape)
      .map((b) => ({
        kind: b.label,
        triggered: !!b.render.switchOn,
        open: !!b.render.gateOpen,
        time: b.render.driveTime,
        powered: Number.isFinite(b.render.poweredAt),
        target: Number.isFinite(b.render.struckAt),
      })),
  );
  record(
    'saved-signal-opens-door',
    states.some((e) => e.kind === 'switch' && e.triggered) &&
      states.some((e) => e.kind === 'hatch' && e.open && e.time > 0) &&
      states.some((e) => e.kind === 'flag' && e.target),
    states,
  );
  await shot(s, 'sandbox-delivery.png');
  await s.close();
  await p.bringToFront();
  const downloads = await p.createCDPSession();
  await downloads.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + last.id + '-replay.html');
  for (let i = 0; i < 50 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage();
  const external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.click('#replay');
  await offline.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
    timeout: 18000,
  });
  record(
    'offline-cargo-delivery',
    external.length === 0 &&
      (await offline.$eval('#signal', (e) => e.textContent)) === 'Parcel delivered',
    { external },
  );
  await offline.close();
  await downloads.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

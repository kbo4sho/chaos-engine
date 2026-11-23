import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import M from 'matter-js';
import { driveCourse } from '../../one-part-missing/drive-course.js';
import { transmissions } from '../../one-part-missing/transmissions.js';
import { certify } from '../../one-part-missing/certify.js';
export async function verifyDrives(home, { url, record, shot, outDir }) {
  const errors = [];
  const popup = async (p, act) => {
    const next = new Promise((ok) => p.once('popup', ok));
    await act();
    const page = await next;
    page.on('pageerror', (e) => errors.push(e.message));
    return page;
  };
  await home.goto(url);
  const p = await popup(home, () => home.click('#puzzle-launcher'));
  await p.setViewport({ width: 390, height: 664, hasTouch: true, isMobile: true });
  await p.bringToFront();
  const phase = (s) =>
    p.waitForFunction(
      (state) => document.querySelector('#pilot').dataset.state === state,
      { timeout: 18000 },
      s,
    );
  const cues = (page) => page.$$eval('#cues button', (all) => all.map((b) => b.textContent));
  const level = async (i) => {
    await p.click('#map-link');
    await p.select('#chapter', String(28 + Math.floor(i / 10)));
    await p.click('#shelf a[href="#' + driveCourse[i].id + '"]');
    await p.waitForFunction(
      (t) => document.querySelector('#machine-title').textContent === t,
      {},
      driveCourse[i].title,
    );
  };
  const repair = async (i) => {
    const m = driveCourse[i],
      fit = certify(M, m)[0];
    await p.select('#playback-rate', '4');
    await p.click('[data-part="' + fit.part + '"]');
    await p.click('[data-socket="' + fit.socket + '"]');
    await p.click('#run');
    await phase('won');
    const stored = await p.evaluate(
      (id) => JSON.parse(localStorage.getItem('chaos.one-part-missing.repair.' + id)),
      m.id,
    );
    record('stored-' + m.id, stored.part === fit.part && stored.socket === fit.socket, stored);
    return cues(p);
  };
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#drive-entry');
  await p.waitForFunction(() => document.querySelector('#machine-no').textContent.includes('281 /'));
  await p.tap('#open-lab');
  for (const kind of Object.keys(transmissions)) {
    await p.select('#lab-tool', kind);
    await p.select('#lab-offset', '24');
    const info = await p.evaluate(() => ({
      label: document.querySelector('#lab-release-label').textContent,
      contact: document.querySelector('#lab-contact').textContent,
      setting: document.querySelector('#lab-offset').selectedOptions[0].textContent,
    }));
    record(
      'drive-experiment-' + kind,
      info.label === 'Input speed' &&
        info.setting === 'Faster' &&
        info.contact.includes(transmissions[kind].name) &&
        info.contact.includes(' at '),
      info,
    );
  }
  await p.select('#lab-tool', 'gearbox');
  await shot(p, 'gearbox-lab-phone.png');
  await p.tap('#lab-close');
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await phase('miss');
  const first = await repair(0);
  record(
    'rack-load',
    first.some((t) => t.includes('Rack and pinion engaged')),
    first,
  );
  await level(22);
  const passes = await repair(22);
  const info = async (label) => {
    const i = passes.findIndex((t) => t.startsWith(label)),
      buttons = await p.$$('#cues button');
    await buttons[i].tap();
    return p.evaluate(() => ({
      clock: document.querySelector('#receiver-clock').textContent,
      t: document.querySelector('#film-time').value,
    }));
  };
  const closed = await info('Receiver closed'),
    open = await info('Receiver accepted');
  record(
    'later-open-passage',
    closed.clock.startsWith('Opens in') &&
      open.clock.startsWith('Open ·') &&
      parseFloat(open.t) > parseFloat(closed.t),
    { closed, open, passes },
  );
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'receiver-open-phone.png');
  await p.setViewport({ width: 1280, height: 800 });
  await level(39);
  const final = await repair(39);
  record(
    'five-working-tools-and-accepted-window',
    [
      'Motor driving',
      'Gearbox meshed',
      'Rack and pinion engaged',
      'Repulsor',
      'Magnet',
      'Receiver accepted',
    ].every((k) => final.some((t) => t.includes(k))),
    final,
  );
  await p.click('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'dispatch-drive-desktop.png');
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
  await s.waitForFunction(() => Composite.allConstraints(world).some((c) => c.drive));
  const assembly = await s.evaluate(() => ({
    connections: Composite.allConstraints(world)
      .filter((c) => c.drive)
      .map((c) => [
        c.drive.kind,
        c.bodyA.render.machineShape?.node,
        c.bodyB.render.machineShape?.node || c.bodyB.label,
      ]),
    slide: Composite.allBodies(world).find((b) => b.label === 'cargo').plugin.benchGuide,
    window: Composite.allBodies(world).find((b) => b.render.machineShape?.window).render.machineShape
      .window,
  }));
  record(
    'restored-gear-train',
    assembly.connections.length === 3 &&
      assembly.connections.some(([k, a, b]) => k === 'rack' && a === 'relay' && b === 'parcel') &&
      assembly.slide.max > assembly.slide.min &&
      assembly.window.period > assembly.window.duration,
    assembly,
  );
  if ((await s.$eval('#btn-pause', (b) => b.textContent)).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.window && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 18000 },
  );
  const active = await s.evaluate(() =>
    Composite.allConstraints(world)
      .filter((c) => c.drive?.active)
      .map((c) => c.drive.kind),
  );
  record('restored-drive-delivery', active.length === 3, active);
  await s.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + driveCourse.at(-1).id + '-replay.html');
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
  await offline.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
    timeout: 18000,
  });
  const offlineCues = await cues(offline);
  record(
    'offline-window-and-drive',
    !external.length && JSON.stringify(offlineCues) === JSON.stringify(final),
    { external, offlineCues },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

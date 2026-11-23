import M from 'matter-js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { rigCourse } from '../../one-part-missing/rig-course.js';
import { links } from '../../one-part-missing/rigging.js';
import { certify } from '../../one-part-missing/certify.js';
export async function verifyRigging(home, { url, record, shot, outDir }) {
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
  const phase = (state) =>
    p.waitForFunction(
      (s) => document.querySelector('#pilot').dataset.state === s,
      { timeout: 18000 },
      state,
    );
  const level = async (i) => {
    await p.tap('#map-link');
    await p.select('#chapter', String(20 + Math.floor(i / 10)));
    await p.tap('#shelf a[href="#' + rigCourse[i].id + '"]');
    await p.waitForFunction(
      (t) => document.querySelector('#machine-title').textContent === t,
      {},
      rigCourse[i].title,
    );
  };
  const repair = async (i) => {
    const m = rigCourse[i],
      move = certify(M, m)[0];
    await p.tap('[data-part="' + move.part + '"]');
    await p.tap('[data-socket="' + move.socket + '"]');
    await p.tap('#run');
    await phase('won');
    const saved = await p.evaluate(
      (id) => JSON.parse(localStorage.getItem('chaos.one-part-missing.repair.' + id)),
      m.id,
    );
    record('saved-' + m.id, saved.part === move.part && saved.socket === move.socket, saved);
    return p.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  };
  await p.tap('#map-link');
  await p.tap('#rig-entry');
  await p.waitForFunction(() => document.querySelector('#machine-no').textContent.includes('201 /'));
  await p.select('#playback-rate', '4');
  await p.tap('#open-lab');
  for (const kind of Object.keys(links)) {
    await p.select('#lab-tool', kind);
    const msg = await p.$eval('#lab-contact', (e) => e.textContent);
    record('lab-' + kind, msg.includes(' at ') && msg.startsWith(links[kind].name), msg);
  }
  await p.select('#lab-tool', 'pulley');
  await shot(p, 'pulley-experiment-phone.png');
  await p.tap('#lab-close');
  await p.tap('#run');
  await phase('miss');
  const a = await p.$$eval('[data-socket]', (bs) => bs.map((b) => b.getAttribute('aria-label')));
  record(
    'mount-endpoints',
    a.every((t) => t.includes('gold marble') && t.includes('span')),
    a,
  );
  const first = await repair(0);
  record(
    'tether-in-tension',
    first.some((e) => e.includes('Tether taut')),
    first,
  );
  await level(6);
  const seam = await repair(6);
  record(
    'loaded-and-snapped',
    seam.some((e) => e.includes('Weak link loaded')) &&
      seam.some((e) => e.includes('Weak link snapped')),
    seam,
  );
  const snap = await p.$$('#cues button');
  const snapIndex = seam.findIndex((e) => e.includes('snapped'));
  await snap[snapIndex].tap();
  const frame = await p.$eval('#film-time', (e) => e.value);
  record('inspect-break-frame', seam[snapIndex].endsWith(frame), frame);
  await level(39);
  const last = await repair(39);
  record(
    'both-rigs-and-both-fields',
    ['Pulley taut', 'Damper damping', 'Lift fan', 'Repulsor'].every((k) =>
      last.some((e) => e.includes(k)),
    ),
    last,
  );
  record('blue-parcel-delivered', await p.$eval('#signal', (e) => e.textContent === 'Parcel delivered'));
  await p.tap('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'last-lift-phone.png');
  await p.setViewport({ width: 1280, height: 800 });
  await p.waitForSelector('#replay', { visible: true });
  await p.click('#replay');
  await phase('won');
  await p.click('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'last-lift-desktop.png');
  const s = await popup(p, () => p.click('#open-sandbox'));
  await s.waitForFunction(() => document.querySelector('#btn-pause').textContent.includes('PLAY'));
  await s.click('#btn-save');
  if (await s.$eval('#save-confirm', (d) => d.open)) await s.click('#save-accept');
  await s.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await s.goto(url);
  await s.click('#btn-load');
  await s.click('#save-accept');
  await s.waitForFunction(() => Composite.allConstraints(world).some((l) => l.rig));
  const actual = await s.evaluate(() => {
    const bodies = Composite.allBodies(world);
    return Composite.allConstraints(world)
      .filter((l) => l.rig)
      .map((l) => ({
        kind: l.rig.kind,
        ends: [l.bodyA, l.bodyB, l.rigMarker].map(
          (b) => bodies.includes(b) && b.render.machineShape?.kind,
        ),
      }));
  });
  record(
    'saved-body-references',
    actual.length === 2 &&
      actual.every((l) => l.ends.every(Boolean)) &&
      actual.some((l) => l.kind === 'pulley' && l.ends.includes('cargo') && l.ends.includes('marble')),
    actual,
  );
  if ((await s.$eval('#btn-pause', (b) => b.textContent)).includes('PLAY')) await s.click('#btn-pause');
  await s.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.machineShape?.striker === 'cargo' && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 18000 },
  );
  const active = await s.evaluate(() =>
    Composite.allConstraints(world)
      .filter((l) => l.rig?.active)
      .map((l) => l.rig.kind),
  );
  record('restored-rig-delivery', active.includes('damper') && active.includes('pulley'), active);
  await s.close();
  await p.bringToFront();
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + rigCourse.at(-1).id + '-replay.html');
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
  const offlineCues = await offline.$$eval('#cues button', (bs) => bs.map((b) => b.textContent));
  record(
    'offline-rig-and-timing',
    !external.length && JSON.stringify(offlineCues) === JSON.stringify(last),
    { external, offlineCues },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

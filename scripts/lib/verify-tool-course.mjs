import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { devices } from '../../one-part-missing/devices.js';
import { certify } from '../../one-part-missing/workshop.js';

export async function verifyToolCourse(home, { url, record, shot, outDir }) {
  const pop = async (p, action) => {
    const next = new Promise((resolve) => p.once('popup', resolve));
    await action();
    return next;
  };
  await home.goto(url);
  const p = await pop(home, () => home.click('#puzzle-launcher'));
  const errors = [];
  p.on('pageerror', (err) => errors.push(err.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const phase = (s) =>
    p.waitForFunction(
      (value) => document.querySelector('#pilot').dataset.state === value,
      { timeout: 18000 },
      s,
    );
  const waitLevel = (m) =>
    p.waitForFunction((s) => document.querySelector('#machine-title')?.textContent === s, {}, m.title);
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#tool-entry');
  const levels = campaign.filter((m) => m.toolCourse),
    first = levels[0],
    last = levels.at(-1);
  await waitLevel(first);
  record('direct-entry-through-level-map', new URL(p.url()).hash === '#' + first.id, p.url());
  await p.tap('#open-lab');
  for (const id of Object.keys(devices)) {
    await p.select('#lab-tool', id);
    await p.select('#lab-offset', '-24');
    const sample = await p.$eval('#lab-contact', (e) => e.textContent);
    record('experiment-' + id, sample.startsWith('First contact at '), sample);
  }
  await p.select('#lab-tool', 'portal');
  await p.tap('#lab-play');
  await p.waitForFunction(() => document.querySelector('#lab-play').textContent === 'Pause comparison');
  await p.tap('#lab-play');
  await p.focus('#lab-frame');
  await p.keyboard.press('Home');
  record('comparison-rewinds', (await p.$eval('#lab-time', (e) => e.value)) === '0.00 s');
  await p.keyboard.press('End');
  await shot(p, 'phone-portal-experiment.png');
  await p.keyboard.press('Escape');
  record(
    'experiment-restores-focus',
    await p.evaluate(
      () => !document.querySelector('#tool-lab').open && document.activeElement.id === 'open-lab',
    ),
  );
  await p.tap('#run');
  await phase('miss');
  record('unpowered-first-belt-misses', await p.$eval('#cues', (el) => el.hidden));
  const solve = async (m) => {
    const move = certify(M, m)[0];
    await p.tap('[data-part="' + move.part + '"]');
    await p.tap('[data-socket="' + move.socket + '"]');
    await p.tap('#run');
    await phase('won');
    return move;
  };
  await solve(first);
  await p.tap('#cues button');
  const inspect = () => p.$eval('#film-time', (e) => e.value);
  const cue = await p.$eval('#cues button', (b) => b.textContent);
  record('activation-seeks-to-first-contact', cue.includes(await inspect()), {
    cue,
    time: await inspect(),
  });
  await p.reload();
  record(
    'resume-tool-course',
    new URL(await p.$eval('#tool-entry', (el) => el.href)).hash === '#' + levels[1].id,
  );
  await p.tap('#map-link');
  await p.select('#chapter', String(Math.floor(campaign.indexOf(last) / 10)));
  await p.tap('#shelf a[href="#' + last.id + '"]');
  await waitLevel(last);
  const move = await solve(last);
  const chain = await p.$$eval('#cues button', (buttons) => buttons.map((b) => b.textContent));
  record('four-tool-finale', chain.length === 4, chain);
  for (const btn of await p.$$('#cues button')) {
    await btn.tap();
    const text = await btn.evaluate((b) => b.textContent);
    record('inspect-' + text, text.includes(await inspect()), await inspect());
  }
  await p.setViewport({ width: 1280, height: 800 });
  await p.waitForSelector('#replay', { visible: true });
  await p.click('#replay');
  await phase('won');
  await p.click('#cues button:last-child');
  await p.evaluate(() => scrollTo(0, 0));
  await shot(p, 'finale-inspection.png');
  const sandbox = await pop(p, () => p.click('#open-sandbox'));
  sandbox.on('pageerror', (err) => errors.push(err.message));
  await sandbox.waitForFunction(() =>
    document.querySelector('#btn-pause')?.textContent.includes('PLAY'),
  );
  await sandbox.click('#btn-save');
  if (await sandbox.$eval('#save-confirm', (e) => e.open)) await sandbox.click('#save-accept');
  await sandbox.waitForFunction(() =>
    document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
  );
  await sandbox.goto(url);
  await sandbox.click('#btn-load');
  await sandbox.click('#save-accept');
  await sandbox.waitForFunction(() =>
    Composite.allBodies(world).some((b) => b.render.machineShape?.fitted),
  );
  const restored = await sandbox.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => b.render.machineShape)
      .map((b) => b.render.machineShape.kind),
  );
  record('powered-save-restored', restored.includes(move.part) && restored.includes('outlet'), restored);
  if ((await sandbox.$eval('#btn-pause', (b) => b.textContent)).includes('PLAY'))
    await sandbox.click('#btn-pause');
  await sandbox.waitForFunction(
    () =>
      Composite.allBodies(world).some(
        (b) => b.render.noteIndex === 1 && Number.isFinite(b.render.struckAt),
      ),
    { timeout: 18000 },
  );
  const actuated = await sandbox.evaluate(() =>
    Composite.allBodies(world)
      .filter((b) => Number.isFinite(b.render.poweredAt))
      .map((b) => b.render.machineShape.kind),
  );
  record('restored-tools-operate', actuated.length === 4, actuated);
  await shot(sandbox, 'restored-sandbox-delivery.png');
  await sandbox.close();
  await p.bringToFront();
  const session = await p.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
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
  offline.on('pageerror', (err) => errors.push(err.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.click('#replay');
  await offline.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
    timeout: 18000,
  });
  const cues = await offline.$$eval('#cues button', (buttons) => buttons.map((b) => b.textContent));
  record(
    'standalone-powered-replay',
    JSON.stringify(cues) === JSON.stringify(chain) && external.length === 0,
    { cues, external },
  );
  await offline.click('#open-lab');
  await offline.select('#lab-tool', 'magnet');
  record(
    'standalone-tool-lab',
    (await offline.$eval('#lab-contact', (e) => e.textContent)).includes('First contact'),
  );
  await offline.close();
  await session.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

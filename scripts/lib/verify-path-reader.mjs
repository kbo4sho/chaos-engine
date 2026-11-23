import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { campaignById } from '../../one-part-missing/campaign.js';
import { orders } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';
import { raceRoute } from '../../one-part-missing/friend-race.js';
import { recordSimulation } from '../../one-part-missing/attempt-film.js';
import { filmPaths, pathLandmark, pathPasses } from '../../one-part-missing/path-reader.js';
import { lessons, simulate, exposures, framing } from '../../one-part-missing/discovery/experiments.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyPathReader(home, { url, record, shot, outDir }) {
  const open = new Promise((resolve) => home.once('popup', resolve));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await open,
    errors = [],
    reported = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  await p.waitForSelector('#map-link');
  const base = new URL('./', p.url()).href;
  const get = (id, k) => '#' + id + '-path ' + (k === 'summary' ? 'summary' : '[data-path-' + k + ']');
  const openPath = async (who, id) => {
    await who.click(get(id, 'summary'));
    await who.waitForSelector(get(id, 'choice') + ' option', { visible: false });
    await who.waitForFunction(
      (id) => {
        const e = document.querySelector('#' + id + '-path');
        return e.open && e.querySelector('[data-path-reading]').value.length > 0;
      },
      {},
      id,
    );
  };
  const read = (who, id, k = 'reading') => who.$eval(get(id, k), (e) => e.value || e.textContent);
  async function pointer(who, selector, point, view = [0, 0, 720, 400]) {
    await who.$eval(selector, (e) => e.scrollIntoView({ block: 'center' }));
    const c = await who.$eval(
      selector,
      (e, { point, view }) => {
        const r = e.getBoundingClientRect(),
          sx = r.width / view[2],
          sy = r.height / view[3];
        const x = r.left + (point[0] - view[0]) * sx,
          y = r.top + (point[1] - view[1]) * sy;
        return { x, y, sx, sy, top: document.elementFromPoint(x, y)?.id };
      },
      { point, view },
    );
    if ('#' + c.top !== selector) throw Error('Cannot tap the recorded position: ' + JSON.stringify(c));
    await who.touchscreen.tap(c.x, c.y);
    return c;
  }
  await p.goto(base + '#last-bell');
  await p.waitForSelector('#parts button');
  record('fresh-machine-has-no-recorded-path', await p.$eval('#bench-path', (e) => e.hidden));
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await p.waitForSelector('#bench-path:not([hidden])');
  await openPath(p, 'bench');
  const empty = filmPaths(recordSimulation(M, campaignById.get('last-bell')).film)[0];
  await p.select(get('bench', 'landmark'), 'right');
  const right = await p.$eval('#scrubber', (e) => e.valueAsNumber);
  record('rightmost-real-empty-run', right === pathLandmark(empty, 'right'), {
    right,
    read: await read(p, 'bench'),
  });
  const target = 17;
  await pointer(p, '#diagram', empty.points[target]);
  const hit = await p.$eval('#scrubber', (e) => e.valueAsNumber);
  record('tap-recorded-marble-on-phone', Math.abs(hit - target) <= 2, {
    hit,
    text: await read(p, 'bench'),
  });
  await pointer(p, '#diagram', [700, 20]);
  record(
    'empty-glass-resists-false-hit',
    (await read(p, 'bench', 'feedback')).includes('No recorded path') &&
      (await p.$eval('#scrubber', (e) => e.valueAsNumber)) === hit,
  );
  await shot(p, 'phone-empty-repair-path.png');
  await p.tap('#reset');
  record('reset-clears-old-trace', await p.$eval('#bench-path', (e) => e.hidden && !e.open));
  const index = 21,
    m = orders[index],
    host = benchmarks[index][0],
    reply = benchmarks[index][1],
    race = raceRoute(m, host, reply);
  await p.goto(base + '#' + race);
  await p.waitForSelector('#attempt-film[open]');
  await openPath(p, 'compare');
  const names = await p.$$eval(get('compare', 'choice') + ' option', (rows) =>
    rows.map((o) => o.textContent),
  );
  const previous = names.indexOf('Challenger · Gold marble');
  await p.select(get('compare', 'choice'), String(previous));
  const tr = filmPaths(recordSimulation(M, m, host).film)[0],
    sz = await p.$eval('#compare-diagram', (e) => {
      const r = e.getBoundingClientRect();
      return [r.width / 720, r.height / 400];
    });
  let chosen;
  for (let f = 18; f < tr.points.length - 10; f++) {
    const [x, y] = tr.points[f];
    if (x < 60 || x > 660 || y < 45 || y > 350) continue;
    const passes = pathPasses(tr, x, y, 18, 0, ...sz);
    if (passes.length >= 3 && (!chosen || passes.length > chosen.passes.length))
      chosen = { x, y, passes };
  }
  if (!chosen) throw Error('Expected a recorded path with repeated visits');
  await pointer(p, '#compare-diagram', [chosen.x, chosen.y]);
  await p.waitForSelector(get('compare', 'pass') + ':not([hidden])');
  const visits = [],
    labels = [];
  const steps = Number((await read(p, 'compare', 'feedback')).match(/of (\d+)/)[1]);
  for (let i = 0; i < steps; i++) {
    visits.push(await p.$eval('#compare-frame', (e) => e.valueAsNumber));
    labels.push(await read(p, 'compare', 'feedback'));
    await p.tap(get('compare', 'pass'));
  }
  record(
    'separate-passes-same-position',
    visits.length >= 2 &&
      new Set(visits).size === steps &&
      (await p.$eval('#compare-frame', (e) => e.valueAsNumber)) === visits[0],
    { visits, labels },
  );
  reported.push({ race, visits });
  await shot(p, 'multiple-passes-on-return.png');
  await p.tap('#compare-close');
  await p.tap('#race-files summary');
  await p.tap('#race-pack');
  await p.waitForSelector('#race-file:not([hidden])');
  const file = await saveBrowserFile(p, '#race-file', outDir),
    ctx = await p.browser().createBrowserContext(),
    off = await ctx.newPage(),
    network = [];
  try {
    off.on('pageerror', (e) => errors.push(e.message));
    off.on('request', (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    await off.setOfflineMode(true);
    await off.goto(file.url);
    await off.waitForSelector('#attempt-film[open]');
    await openPath(off, 'compare');
    await off.select(get('compare', 'landmark'), 'top');
    record(
      'offline-archive-includes-path-reader',
      !network.length && (await read(off, 'compare')).includes('Reply'),
      { network, name: file.name, read: await read(off, 'compare') },
    );
  } finally {
    await ctx.close();
  }
  const lesson = lessons.find((l) => l.id === 'clutch-input');
  await p.goto(base + 'discovery/#' + lesson.id + '/test');
  await p.waitForSelector('#discovery-settings button');
  for (const j of [0, 1]) {
    await p.tap('#discovery-settings button:nth-child(' + (j + 1) + ')');
    await p.tap('#discovery-run');
    await p.waitForSelector('#discovery-path:not([hidden])');
  }
  await openPath(p, 'discovery');
  await p.select(get('discovery', 'choice'), '1');
  const old = simulate(M, lesson, true, 0, exposures[lesson.id][1]),
    clip = framing[lesson.id][1],
    view = [...clip, clip[2] / 1.8];
  const point = old.frames[16].poses[old.actors[0].index].slice(0, 2);
  await pointer(p, '#discovery-scene', point, view);
  record(
    'cropped-previous-setting',
    (await read(p, 'discovery')).includes(lesson.labels[0]) &&
      ((await read(p, 'discovery', 'feedback')).includes('Recorded point') ||
        (await read(p, 'discovery', 'feedback')).includes('Pass ')),
    { value: await read(p, 'discovery'), feedback: await read(p, 'discovery', 'feedback') },
  );
  await p.tap('#discovery-lens');
  await pointer(p, '#discovery-scene', point);
  record(
    'full-bench-uses-same-world-point',
    Math.abs((await p.$eval('#discovery-frame', (e) => e.valueAsNumber)) - 16) <= 2,
    await read(p, 'discovery'),
  );
  await p.goto(base + 'discovery/double.html#rack-hoist');
  await p.waitForSelector('#double-controls button');
  await p.tap('#double-run');
  await p.waitForSelector('#double-path:not([hidden])');
  await openPath(p, 'double');
  await p.select(get('double', 'choice'), '1');
  await p.select(get('double', 'landmark'), 'bottom');
  record(
    'independent-weight-landmark',
    (await read(p, 'double')).includes('Square weight') &&
      (await read(p, 'double', 'feedback')).includes('Lowest'),
    { value: await read(p, 'double'), feedback: await read(p, 'double', 'feedback') },
  );
  await shot(p, 'tracked-hoist-weight.png');
  fs.writeFileSync(path.join(outDir, 'picked-frames.json'), JSON.stringify(reported, null, 2));
  record('no-page-errors', !errors.length, errors);
  await p.close();
}

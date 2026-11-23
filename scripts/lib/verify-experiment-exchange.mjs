import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { lessons, simulate, exposures, measure } from '../../one-part-missing/discovery/experiments.js';
import { readSheet } from '../../one-part-missing/discovery/shutter-sheet.js';
import { rigs, doubleRun } from '../../one-part-missing/discovery/double-rigs.js';

export async function verifyExperimentExchange(home, { url, record, shot, outDir }) {
  const open = new Promise((resolve) => home.once('popup', resolve));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const desk = await open;
  await desk.waitForSelector('#map-link');
  const base = new URL('discovery/', desk.url()).href;
  const errors = [],
    reports = [];
  const watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
  watch(desk);
  const popup = async (p, selector) => {
    const ready = new Promise((resolve) => p.once('popup', resolve));
    await p.click(selector);
    const page = await ready;
    watch(page);
    await page.bringToFront();
    return page;
  };
  const marked = async (p) => {
    await p.waitForFunction(
      () =>
        typeof world !== 'undefined' &&
        Matter.Composite.allBodies(world).some((b) => b.render.machineShape?.kind === 'exposure'),
    );
  };
  const marks = (p) =>
    p.evaluate(() =>
      Matter.Composite.allBodies(world)
        .filter((b) => b.render.machineShape?.kind === 'exposure')
        .map((b) => ({
          shape: b.render.machineShape,
          elapsed: b.render.exposureTick || 0,
          result: b.render.exposureResult || null,
          filter: b.collisionFilter.mask,
        })),
    );
  const finish = async (p) => {
    await p.click('#btn-pause');
    await p.waitForFunction(() => {
      const marks = Matter.Composite.allBodies(world).filter(
        (b) => b.render.machineShape?.kind === 'exposure',
      );
      return marks.length > 0 && marks.every((b) => b.render.exposureResult);
    });
    await p.click('#btn-pause');
    return marks(p);
  };
  async function checkDesk(p, selector, expected, key) {
    const sandbox = await popup(p, selector);
    await marked(sandbox);
    const initial = await marks(sandbox);
    if (
      initial.some((m) => m.elapsed || m.result || m.filter !== 0) ||
      !(await sandbox.$eval('#btn-pause', (b) => b.textContent.includes('PLAY')))
    )
      throw Error('Loaded machine did not start paused: ' + key);
    const scored = await finish(sandbox);
    const errors = scored.map((s, i) =>
      s.result.missing ? Infinity : Math.hypot(s.result.x - expected[i].x, s.result.y - expected[i].y),
    );
    const back = await sandbox.$eval('#puzzle-launcher', (a) => a.href);
    record(
      'native-measurement-' + key,
      scored.length === expected.length &&
        scored.every((s, i) => s.result.matched === expected[i].matched) &&
        errors.every((n) => n < 1.5),
      { errors, marks: scored.map((m) => m.result), back },
    );
    reports.push({ key, errors, back, results: scored.map((m) => m.result) });
    return sandbox;
  }
  await desk.click('#map-link');
  await desk.click('#discovery-entry');
  for (const [i, l] of lessons.entries()) {
    await desk.goto(base + '#' + l.id + '/test');
    await desk.waitForSelector('#discovery-settings button');
    const end = exposures[l.id][1],
      target = exposures[l.id][2];
    const takes = l.values.map((_, j) => simulate(M, l, true, j, end));
    const goal = i % 3 !== 0;
    const j = takes.findIndex((t) => measure(t, target).every((r) => r.inside) === goal);
    await desk.click('#discovery-settings button:nth-child(' + (j + 1) + ')');
    const tape = takes[j],
      expected = tape.actors.map(({ index }, k) => {
        const [x, y] = tape.frames.at(-1).poses[index];
        return { x, y, matched: Math.hypot(x - target[k][0], y - target[k][1]) <= 20 };
      });
    const playable = await checkDesk(desk, '#discovery-sandbox', expected, l.id);
    if (i === 0 || i === 9) {
      const returned = await popup(playable, '#puzzle-launcher');
      await returned.waitForSelector('#discovery-settings [aria-pressed=true]');
      record(
        'exact-settings-return-' + l.id,
        (await returned.$eval('#discovery-settings [aria-pressed=true]', (b) => b.textContent)) ===
          l.labels[j] && (await returned.$eval('#discovery-film', (e) => e.hidden)),
        returned.url(),
      );
      await returned.close();
      if (i === 9) await shot(playable, 'two-physical-shutters.png');
    }
    await playable.close();
    await desk.bringToFront();
  }
  // The teaching bench carries a reference exposure of the selected setting.
  await desk.goto(base + '#cut-away/fit/2');
  await desk.waitForSelector('#discovery-settings [aria-pressed=true]');
  const teaching = await popup(desk, '#discovery-sandbox');
  await marked(teaching);
  const ref = await finish(teaching);
  record(
    'explore-reference-shutter',
    ref.length === 1 && ref[0].shape.reference && ref[0].result.matched,
    ref,
  );
  await teaching.close();
  for (const [i, rig] of rigs.entries()) {
    await desk.goto(base + 'double.html#' + rig.id);
    await desk.waitForSelector('#double-controls button');
    let settings, tape;
    for (const [a] of rig.controls[0].values.entries())
      for (const [b] of rig.controls[1].values.entries()) {
        const candidate = doubleRun(M, rig, [a, b]);
        if (!settings && candidate.count === (i % 3 === 0 ? 1 : 2)) {
          settings = [a, b];
          tape = candidate;
        }
      }
    for (const [k, v] of settings.entries())
      await desk.click('[data-knob="' + k + '"][data-position="' + v + '"]');
    const expected = tape.receipts.map((r) => ({ x: r.x, y: r.y, matched: r.hit })),
      s = await checkDesk(desk, '#double-sandbox', expected, rig.id);
    if (i === 4 || i === rigs.length - 1) {
      const returned = await popup(s, '#puzzle-launcher');
      await returned.waitForSelector('#double-controls [aria-pressed=true]');
      record(
        'return-two-knobs-' + rig.id,
        JSON.stringify(
          await returned.$$eval('#double-controls [aria-pressed=true]', (bs) =>
            bs.map((b) => Number(b.dataset.position)),
          ),
        ) === JSON.stringify(settings) && (await returned.$eval('#double-clip', (el) => el.hidden)),
      );
      await returned.close();
    }
    await s.close();
    await desk.bringToFront();
  }
  const playerSheet = 'screened-slide/sheet/1/1n.au.3m/2c.8m.5y';
  const tape = doubleRun(M, readSheet(playerSheet).rig, [1, 0]);
  for (const suffix of ['fit/1.0', 'take/1.0']) {
    const route = playerSheet + '/' + suffix;
    await desk.goto(base + 'double.html#' + route);
    await desk.waitForSelector('#double-controls button');
    const native = await checkDesk(
      desk,
      '#double-sandbox',
      tape.receipts.map((r) => ({ x: r.x, y: r.y, matched: r.hit })),
      suffix.startsWith('take') ? 'returned-sheet' : 'player-sheet',
    );
    const returned = await popup(native, '#puzzle-launcher');
    await returned.waitForSelector('#double-controls button');
    record(
      'sheet-origin-' + suffix.split('/')[0],
      new URL(returned.url()).hash === '#' + route &&
        (await returned.$eval('#double-number', (e) => e.textContent)) ===
          (suffix.startsWith('fit') ? 'Player shutter puzzle' : 'Returned take'),
      returned.url(),
    );
    await returned.close();
    await native.close();
    await desk.bringToFront();
  }
  const invalid = await home.browserContext().newPage();
  watch(invalid);
  await invalid.goto(url + '#study=air-brake/test/fit/9');
  await invalid.waitForFunction(() => document.body.textContent.includes('UNKNOWN MACHINE'));
  record(
    'invalid-setup-leaves-sandbox-playable',
    (await invalid.$eval('#btn-pause', (b) => b.textContent.includes('PAUSE'))) &&
      !(await marks(invalid)).length,
  );
  await invalid.close();
  // Pause between two shutters, save, then load from a fresh plain sandbox tab.
  await desk.goto(base + 'double.html#pawl-and-spring/fit/2.0');
  await desk.waitForSelector('#double-controls button');
  const s = await popup(desk, '#double-sandbox');
  await marked(s);
  await s.click('#btn-pause');
  await s.waitForFunction(() => Matter.Composite.allBodies(world).some((b) => b.render.exposureResult));
  await s.click('#btn-pause');
  const half = await marks(s);
  record(
    'paused-between-shutters',
    !!half[0].result && !half[1].result,
    half.map((m) => m.elapsed),
  );
  await s.select('#save-slot', '1');
  await s.click('#btn-save');
  if (await s.$eval('#save-confirm', (e) => e.open)) await s.click('#save-accept');
  await s.waitForFunction(() => !!localStorage.getItem('chaos-engine-save-1'));
  const generic = await s.browserContext().newPage();
  watch(generic);
  await generic.goto(url);
  await generic.select('#save-slot', '1');
  await generic.click('#btn-load');
  if (await generic.$eval('#save-confirm', (e) => e.open)) await generic.click('#save-accept');
  await marked(generic);
  const loaded = await marks(generic),
    back = await generic.$eval('#puzzle-launcher', (a) => a.href);
  record(
    'native-slot-restores-readings-and-return',
    JSON.stringify(half) === JSON.stringify(loaded) && back.includes('pawl-and-spring/fit/2.0'),
    { loaded, back },
  );
  const rest = await finish(generic);
  record(
    'second-exposure-finishes-after-load',
    rest.every((m) => m.result?.matched),
    rest.map((m) => m.result),
  );
  await shot(generic, 'saved-physical-exposures.png');
  await generic.close();
  await s.close();
  // A native sandbox bumper changes the previously successful canopy delivery.
  await desk.goto(base + '#air-brake/test/fit/1');
  await desk.waitForSelector('#discovery-settings button');
  const edited = await popup(desk, '#discovery-sandbox');
  await marked(edited);
  await edited.click('[data-tool="bumper"]');
  const pos = await edited.$eval('#game', (c) => {
    const r = c.getBoundingClientRect();
    return [r.x + (r.width * 510) / 720, r.y + (r.height * 174) / 400];
  });
  await edited.mouse.click(...pos);
  const change = await finish(edited);
  record('sandbox-edit-changes-receipt', !change[0].result.matched, change[0].result);
  await shot(edited, 'edited-canopy-miss.png');
  await edited.close();
  const saved = await desk.evaluate(() =>
    Object.keys(localStorage).filter(
      (k) => k.endsWith('.solved') || k.startsWith('chaos.one-part-missing.double.v1.'),
    ),
  );
  record('experimentation-never-awards-a-puzzle', !saved.length, saved);
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(path.join(outDir, 'native-exposures.json'), JSON.stringify(reports, null, 2));
  await desk.close();
}

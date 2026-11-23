import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { pairFinals } from '../../one-part-missing/pair-training-index.js';
import {
  pairCourse,
  trainingRoute,
  contactReceipt,
  arrivalOrder,
} from '../../one-part-missing/pair-training.js';
import { fittings } from '../../one-part-missing/machines.js';
import { certify } from '../../one-part-missing/certify.js';
import { recordSimulation } from '../../one-part-missing/attempt-film.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyPairTraining(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.waitForSelector('#parts [data-part]', { visible: true });
  const errors = [],
    proof = [],
    singles = new Set(),
    solutions = new Map();
  const watch = (q) => q.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  const view = (q, phone) =>
    q.setViewport(
      phone
        ? { width: 390, height: 664, isMobile: true, hasTouch: true }
        : { width: 1280, height: 800, isMobile: false, hasTouch: false },
    );
  await view(p, true);
  const heading = (q, m) =>
    q.waitForFunction((t) => document.querySelector('#machine-title')?.textContent === t, {}, m.title);
  const openPicker = async (q, a, b) => {
    await q.click('#map-link');
    if (!(await q.$eval('#practice', (e) => e.open))) await q.click('#practice summary');
    await q.select('#practice-tool', a);
    if (!(await q.$eval('#training-picker', (e) => e.open))) await q.click('#training-picker summary');
    await q.select('#training-partner', b);
  };
  const solve = async (q, step, call) => {
    await heading(q, step.machine);
    if (!solutions.has(step.n)) solutions.set(step.n, certify(M, step.machine)[0]);
    const move = solutions.get(step.n),
      ref = contactReceipt(step, move, recordSimulation(M, step.machine, move).run);
    for (const f of fittings(step.machine, move)) {
      await q.click('[data-part="' + f.part + '"]');
      if (f.flipped) await q.click('#flip');
      await q.click('[data-socket="' + f.socket + '"]');
    }
    if (call) {
      const choice = arrivalOrder(ref);
      const target = call === 'correct' ? choice : step.targets.find((k) => k !== choice);
      await q.click('[data-prediction="' + target + '"]');
    }
    await q.select('#playback-rate', '4');
    await q.click('#run');
    await q.waitForSelector('#pilot[data-state=won]');
    const buttons = await q.$$eval('#training-contacts button', (bs) => bs.map((b) => b.textContent));
    if (ref.length !== buttons.length || ref.some((r, i) => !buttons[i].endsWith('frame ' + r.tick)))
      throw Error(step.machine.id + ' contact frames differ: ' + buttons);
    return ref;
  };
  const pairs = Object.keys(pairFinals).sort((a, b) =>
    a === 'cam+fan' ? -1 : b === 'cam+fan' ? 1 : a.localeCompare(b),
  );
  let file;
  for (const [i, key] of pairs.entries()) {
    const [a, b] = key.split('+'),
      c = pairCourse(a, b);
    if (i === 5) await view(p, false);
    await openPicker(p, a, b);
    if (i === 0) {
      await p.click('#training-pack');
      await p.waitForSelector('#training-file[href]', { visible: true });
      file = await saveBrowserFile(p, '#training-file', outDir);
      record(
        'clean-three-machine-practice-file',
        file.bytes > 200000 &&
          !fs.readFileSync(path.join(outDir, file.name), 'utf8').includes('data-repair='),
        file,
      );
    }
    await p.click('#training-enter');
    await heading(p, c.steps[0].machine);
    for (const [j, s] of c.steps.slice(0, 2).entries()) {
      if (singles.has(s.targets[0])) continue;
      await p.click('#training-steps a:nth-child(' + (j + 1) + ')');
      await heading(p, s.machine);
      const refs = await solve(p, s);
      singles.add(s.targets[0]);
      record('warmup-' + s.targets[0], refs.length === 1, {
        level: s.n,
        grade: s.grade,
        contact: refs[0],
      });
      if (i === 0 && j === 0) {
        await p.click('#training-contacts button');
        record(
          'tap-contact-seeks-live-film',
          Number(await p.$eval('#scrubber', (e) => e.value)) === refs[0].tick,
        );
        await shot(p, 'phone-working-cam.png');
        await p.click('#training-next');
        await heading(p, c.steps[1].machine);
      }
    }
    await p.click('#training-steps a:nth-child(3)');
    await heading(p, c.steps[2].machine);
    const refs = await solve(p, c.steps[2], i === 0 ? 'wrong' : 'correct');
    const receipt = await p.$eval('#training-result', (e) => e.textContent);
    record(
      'both-tools-' + key,
      refs.length === 2 &&
        (i === 0 ? !receipt.includes('Correct call') : receipt.includes('Correct call')),
      { level: c.steps[2].n, contacts: refs, receipt },
    );
    proof.push({ pair: key, level: c.steps[2].n, contacts: refs });
    if (i === 0) {
      await p.click('#training-contacts button:last-child');
      const f = Number(await p.$eval('#scrubber', (e) => e.value));
      record('wrong-call-reveals-two-real-contact-frames', f === refs[1].tick, receipt);
      await p.reload();
      await heading(p, c.steps[2].machine);
      record(
        'completed-three-stage-course-survives-reload',
        await p.$eval('#training-progress', (e) => e.textContent === '3 of 3 complete'),
      );
      await p.screenshot({ path: path.join(outDir, 'phone-pair-fold.png') });
    }
  }
  const alt = pairCourse('conveyor', 'trampoline');
  await openPicker(p, alt.first, alt.second);
  await p.click('#training-enter');
  await p.click('#training-steps a:nth-child(3)');
  await heading(p, alt.steps[2].machine);
  await p.click('#training-alternate');
  const next = pairCourse(alt.first, alt.second, 1);
  await heading(p, next.steps[2].machine);
  const alternate = await solve(p, next.steps[2], 'correct');
  record(
    'alternate-combined-machine-uses-both-fittings',
    alternate.length === 2 && alt.steps[2].n !== next.steps[2].n,
    { level: next.steps[2].n, alternate },
  );
  record('all-tools-have-live-warmups', singles.size === 54, singles.size);
  const ctx = await p.browser().createBrowserContext(),
    off = await ctx.newPage(),
    external = [];
  watch(off);
  off.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await view(off, true);
  await off.setOfflineMode(true);
  await off.goto(file.url);
  const c = pairCourse('cam', 'fan');
  for (const [i, s] of c.steps.entries()) {
    if (i) await off.click('#training-next');
    await heading(off, s.machine);
    if (i === 0)
      record(
        'clean-file-starts-unearned',
        await off.$eval('#training-progress', (e) => e.textContent === '0 of 3 complete'),
      );
    await solve(off, s, i === 2 ? 'correct' : null);
  }
  record(
    'offline-course-completed-without-requests',
    (await off.$eval('#training-progress', (e) => e.textContent === '3 of 3 complete')) &&
      !external.length,
    { external },
  );
  await shot(off, 'offline-pair-finished.png');
  await off.goto(file.url + '#' + trainingRoute(pairCourse('hatch', 'trampoline'), 2));
  await heading(off, c.steps[0].machine);
  record(
    'offline-file-retains-its-original-pair',
    await off.$eval('#training-title', (e) => e.textContent.toLowerCase().includes('cam')),
  );
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(path.join(outDir, 'working-pairs.json'), JSON.stringify(proof, null, 2));
  await ctx.close();
  await p.close();
}

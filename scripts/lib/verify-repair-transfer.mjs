import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { saveBrowserFile } from './save-browser-file.mjs';
import { campaign } from '../../one-part-missing/campaign.js';
import { qualificationCourse } from '../../one-part-missing/qualification-course.js';
import { assemblyCourse } from '../../one-part-missing/assembly-course.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings } from '../../one-part-missing/machines.js';
import { orders } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';
import { raceRoute } from '../../one-part-missing/friend-race.js';

export async function verifyRepairTransfer(home, { url, record, shot, outDir }) {
  const pop = new Promise((done) => home.once('popup', done));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const sender = await pop,
    base = new URL('./one-part-missing/', url).href,
    errors = [];
  const watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
  watch(sender);
  const first = campaign[0],
    qualification = qualificationCourse[0],
    draft = assemblyCourse[0],
    other = assemblyCourse[1],
    order = orders[0];
  const phone = async (p) => p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const heading = (p, m) =>
    p.waitForFunction((t) => document.querySelector('#machine-title')?.textContent === t, {}, m.title);
  const go = async (p, m) => {
    await p.goto(base + '#' + m.id);
    await heading(p, m);
  };
  const place = async (p, m, move, n = 3) => {
    for (const fit of fittings(m, move).slice(0, n)) {
      await p.click('[data-part="' + fit.part + '"]');
      if (fit.flipped) await p.click('#flip');
      await p.click('[data-socket="' + fit.socket + '"]');
    }
  };
  const fix = async (p, m, move) => {
    await go(p, m);
    await place(p, m, move);
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await p.waitForSelector('#pilot[data-state=won]');
  };
  const open = async (p) => {
    await p.click('#map-link');
    if (!(await p.$eval('#repair-transfer', (e) => e.open))) await p.click('#repair-transfer summary');
  };
  const upload = async (p, f) => {
    const el = await p.$('#notebook-file');
    await el.uploadFile(f);
  };
  const note = (p) => p.$eval('#notebook-file-status', (e) => e.textContent);
  await phone(sender);
  await fix(sender, first, certify(M, first)[0]);
  await fix(sender, qualification, certify(M, qualification)[0]);
  const orderFit = benchmarks[0][0];
  await fix(sender, order, orderFit);
  await go(sender, draft);
  const draftSolution = certify(M, draft)[0];
  await place(sender, draft, draftSolution, 2);
  await go(sender, other);
  await place(sender, other, certify(M, other)[0], 2);
  await open(sender);
  const name = 'one-part-missing-repair-notebook.json';
  await saveBrowserFile(sender, '#notebook-export', outDir, name);
  const file = path.join(outDir, name),
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  record(
    'anonymous-file-has-physical-fittings-only',
    data.repairs.length === 3 &&
      data.drafts.length === 2 &&
      data.contacts.length > 0 &&
      data.orders.length > 0 &&
      !/savedAt|localStorage|playerName|https?:|friend|race\//.test(JSON.stringify(data)),
    data,
  );
  const ctx = await home.browser().createBrowserContext(),
    receiver = await ctx.newPage();
  watch(receiver);
  await phone(receiver);
  await go(receiver, other);
  await place(receiver, other, certify(M, other)[0], 1);
  await go(receiver, first);
  await open(receiver);
  await upload(receiver, file);
  await receiver.waitForSelector('#notebook-merge:not([hidden])');
  record(
    'review-before-writing',
    await receiver.$eval('#progress', (e) => e.textContent === '0 of 520 repaired'),
    await note(receiver),
  );
  await shot(receiver, 'phone-review.png');
  await receiver.click('#notebook-cancel');
  record(
    'cancel-preserves-device',
    (await receiver.$eval('#progress', (e) => e.textContent === '0 of 520 repaired')) &&
      (await note(receiver)).includes('canceled'),
  );
  await upload(receiver, file);
  await receiver.waitForSelector('#notebook-merge:not([hidden])');
  await receiver.click('#notebook-merge');
  const receipt = await note(receiver);
  record(
    'local-draft-kept-other-work-merged',
    receipt.includes('Merged 3 repairs, 1 unfinished build') &&
      receipt.includes('Kept 1 existing entry') &&
      (await receiver.$eval('#progress', (e) => e.textContent)) === '2 of 520 repaired',
    receipt,
  );
  await upload(receiver, file);
  await receiver.waitForSelector('#notebook-merge:not([hidden])');
  await receiver.click('#notebook-merge');
  record(
    'second-import-does-not-duplicate',
    (await note(receiver)).includes(
      'Merged 0 repairs, 0 unfinished builds, 0 tool marks and 0 order records.',
    ),
    await note(receiver),
  );
  await receiver.reload();
  await heading(receiver, first);
  await receiver.click('#map-link');
  await receiver.click('#practice summary');
  await receiver.select('#practice-tool', 'cam');
  await receiver.click('#tool-events [data-event-grade=combined]');
  await receiver.waitForSelector('#attempt-film[open]');
  await shot(receiver, 'phone-restored-cam-contact.png');
  record(
    'restored-contact-opens-actual-replay',
    await receiver.evaluate(() => {
      const row = JSON.parse(localStorage.getItem('chaos.one-part-missing.tool-event.v1.cam.combined'));
      return (
        document.querySelector('#attempt-film').open &&
        Number(document.querySelector('#compare-frame').value) === row.tick &&
        document.querySelector('#compare-previous').textContent.includes('Miss') &&
        row.partner === 'fan'
      );
    }),
  );
  await go(receiver, other);
  await receiver.click('#resume-draft');
  record(
    'local-in-progress-fit-wins-conflict',
    await receiver.$eval('#pair-count', (e) => e.textContent === '1 of 3 parts fitted'),
  );
  await go(receiver, draft);
  await receiver.click('#resume-draft');
  record(
    'imported-draft-restores-two-fits',
    await receiver.$eval('#pair-count', (e) => e.textContent === '2 of 3 parts fitted'),
  );
  await receiver.click('#undo-fitting');
  record(
    'undo-survives-device-transfer',
    await receiver.$eval('#pair-count', (e) => e.textContent === '1 of 3 parts fitted'),
  );
  await go(receiver, order);
  record(
    'real-validated-order-score',
    await receiver.$eval('#order-economy-value', (e) => e.textContent.startsWith('1 part ·')),
  );
  await open(receiver);
  const bad = path.join(outDir, 'sample-invalid-notebook.json');
  fs.writeFileSync(
    bad,
    JSON.stringify({
      ...data,
      repairs: [
        { id: first.id, fit: '0.weight' },
        { id: 'sample-unknown', fit: '0.bridge' },
      ],
      drafts: [],
      orders: [],
      contacts: [],
    }),
  );
  await upload(receiver, bad);
  await receiver.waitForFunction(() =>
    document.querySelector('#notebook-file-status').textContent.includes('No usable'),
  );
  record(
    'miss-and-unknown-machine-never-earn-credit',
    await receiver.$eval('#notebook-merge', (e) => e.hidden),
    await note(receiver),
  );
  fs.writeFileSync(bad, '{}');
  await upload(receiver, bad);
  await receiver.waitForFunction(() =>
    document.querySelector('#notebook-file-status').textContent.includes('Choose a One Part'),
  );
  const challenge = base + '#' + raceRoute(order, orderFit);
  await receiver.goto(challenge);
  await heading(receiver, order);
  record(
    'personal-file-controls-hidden-in-challenge',
    await receiver.$eval('#repair-transfer', (e) => e.hidden),
  );
  record('no-page-errors', !errors.length, errors);
  await ctx.close();
  await sender.close();
}

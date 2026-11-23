import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { qualificationCourse } from '../../one-part-missing/qualification-course.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings, parts } from '../../one-part-missing/machines.js';
import { recordSimulation } from '../../one-part-missing/attempt-film.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyQualifications(home, { url, record, shot, outDir }) {
  const errors = [],
    results = [],
    pop = async (p, sel) => {
      const opened = new Promise((d) => p.once('popup', d));
      await p.click(sel);
      const q = await opened;
      q.on('pageerror', (e) => errors.push(e.message));
      return q;
    };
  await home.goto(url);
  const p = await pop(home, '#puzzle-launcher');
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const title = (p, m) =>
    p.waitForFunction((t) => document.querySelector('#machine-title')?.textContent === t, {}, m.title);
  const hit = (p, f) =>
    p.click('[data-part="' + f.part + '"]').then(() => p.click('[data-socket="' + f.socket + '"]'));
  const play = async (p, state) => {
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await p.waitForSelector('#pilot[data-state=' + state + ']', { timeout: 14000 });
  };
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#qualification-entry');
  const protocol = await p.createCDPSession();
  await protocol.send('Browser.grantPermissions', {
    origin: new URL(url).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  for (const [i, m] of qualificationCourse.entries()) {
    await title(p, m);
    const move = certify(M, m)[0],
      fits = fittings(m, move);
    for (const f of fits.slice(0, -1)) await hit(p, f);
    await play(p, 'miss');
    const feedback = await p.$eval('#status', (e) => e.textContent);
    record(
      'incomplete-' + (501 + i),
      feedback.includes('stations acted') &&
        !(await p.evaluate((id) => localStorage.getItem('chaos.one-part-missing.repair.' + id), m.id)),
      feedback,
    );
    await hit(p, fits.at(-1));
    await play(p, 'won');
    const physical = recordSimulation(M, m, move).run;
    const actual = await p.$$eval('#fitting-events .acted', (bs) => bs.map((b) => b.textContent));
    record(
      'qualified-' + (i + 501),
      actual.length === m.capacity &&
        fits.every((f) => actual.some((a) => a.includes(parts[f.part].name))) &&
        (await p.$eval('#machine-no', (e) => e.textContent.includes('/ 520'))),
      { id: m.id, actual, arrivals: physical.hits },
    );
    results.push({ machine: m.id, actual, arrivals: physical.hits });
    if (i === 0) {
      await p.click('#share-assembly');
      await p.waitForFunction(
        () =>
          document.querySelector('#status').textContent.includes('copied') ||
          !document.querySelector('#copy-fallback').hidden,
      );
      const link = await p.evaluate(async () =>
        document.querySelector('#copy-fallback').hidden
          ? await navigator.clipboard.readText()
          : document.querySelector('#share-url').value,
      );
      const ctx = await p.browser().createBrowserContext(),
        q = await ctx.newPage();
      await q.goto(link);
      await title(q, m);
      record(
        'shared-two-fitting-qualification',
        (await q.$eval('#pair-count', (e) => e.textContent === '2 of 2 parts fitted')) &&
          !(await q.evaluate((id) => localStorage.getItem('chaos.one-part-missing.repair.' + id), m.id)),
        link,
      );
      await play(q, 'won');
      await ctx.close();
      await p.bringToFront();
    }
    if (i === 13) {
      const index = actual.findIndex((s) => s.includes(parts.domino.name));
      await p.click('#fitting-events button:nth-child(' + (index + 1) + ')');
      const frame = Number(await p.$eval('#scrubber', (e) => e.value));
      const expected = physical.uses.find(
        (e) => e.kind === 'domino' && physical.items[e.item].shape.fitted,
      );
      record('tall-domino-first-handoff', frame === expected.tick, {
        frame,
        actor: expected.actor,
        goals: m.goals.map((g) => g.striker),
      });
      await shot(p, 'phone-falling-domino.png');
    }
    if (i === 15) await p.setViewport({ width: 1280, height: 800 });
    if (i + 1 < qualificationCourse.length) await p.click('#next');
  }
  const last = qualificationCourse.at(-1);
  const native = await pop(p, '#open-sandbox');
  await native.waitForFunction(() => document.querySelector('#btn-pause')?.textContent.includes('PLAY'));
  const imported = await native.evaluate(() =>
    Matter.Composite.allBodies(world)
      .filter((b) => b.render.machineShape?.fitted)
      .map((b) => b.render.machineShape.kind),
  );
  record(
    'final-native-physical-fittings',
    imported.length === 3 && ['ground', 'positive', 'pulse'].every((k) => imported.includes(k)),
    imported,
  );
  await native.click('#btn-pause');
  await native.waitForFunction(
    () =>
      Matter.Composite.allBodies(world).filter((b) => b.render.machineShape?.sensor && b.render.struckAt)
        .length === 2,
  );
  await shot(native, 'native-final-receivers.png');
  await native.close();
  await p.bringToFront();
  const download = await saveBrowserFile(
    p,
    '#save-replay',
    outDir,
    'one-part-missing-' + last.id + '-replay.html',
  );
  const isolated = await p.browser().createBrowserContext(),
    offline = await isolated.newPage(),
    requests = [];
  offline.on('pageerror', (e) => errors.push(e.message));
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await offline.setOfflineMode(true);
  await offline.goto(download.url);
  await title(offline, last);
  await offline.select('#playback-rate', '4');
  await offline.click('#replay');
  await offline.waitForSelector('#pilot[data-state=won]');
  record(
    'portable-working-final',
    !requests.length && (await offline.$$eval('#fitting-events .acted', (a) => a.length === 3)),
    { requests, bytes: download.bytes },
  );
  await isolated.close();
  await p.click('#practice summary');
  await p.select('#practice-tool', 'pulse');
  await p.click('[data-event-grade=combined]');
  await p.waitForSelector('#attempt-film[open]');
  await p.click('#compare-partner');
  const partner = await p.evaluate(() => ({
    text: document.querySelector('#compare-partner').textContent,
    frame: document.querySelector('#compare-frame').value,
    stamp: JSON.parse(localStorage.getItem('chaos.one-part-missing.tool-event.v1.pulse.combined')),
  }));
  record(
    'second-working-spare-has-its-own-frame',
    Number(partner.frame) === partner.stamp.partnerTick &&
      partner.text.includes(parts[partner.stamp.partner].name),
    partner,
  );
  await shot(p, 'inspect-both-fitted-tools.png');
  await p.click('#compare-close');
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'qualification-receipts.json'),
    JSON.stringify({ results, imported, partner }, null, 2),
  );
  await protocol.detach();
  await p.close();
}

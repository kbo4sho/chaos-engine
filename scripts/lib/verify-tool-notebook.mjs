import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { practiceTargets } from '../../one-part-missing/practice-targets.js';
import { parts, fittings } from '../../one-part-missing/machines.js';
import { certify } from '../../one-part-missing/certify.js';
import { recordSimulation } from '../../one-part-missing/attempt-film.js';
import { toolEvents, evidencePrefix } from '../../one-part-missing/tool-evidence.js';
import { orders, fitCode } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';
export async function verifyToolNotebook(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const open = new Promise((d) => home.once('popup', d));
  await home.click('#puzzle-launcher');
  const page = await open;
  await page.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const errors = [],
    watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
  watch(page);
  await page.bringToFront();
  await page.waitForSelector('#map-link');
  const base = new URL('./', page.url()).href;
  await page.tap('#map-link');
  await page.tap('#practice summary');
  await page.waitForSelector('#tool-notebook:not([hidden])');
  const get = (p, k, g) =>
    p.evaluate((key) => JSON.parse(localStorage.getItem(key)), evidencePrefix + k + '.' + g);
  const data = (p) =>
    p.evaluate(
      (prefix) =>
        Object.fromEntries(
          Object.entries(localStorage)
            .filter(([k]) => k.startsWith(prefix))
            .map(([k, v]) => [k.slice(prefix.length), JSON.parse(v)]),
        ),
      evidencePrefix,
    );
  const head = (m) =>
    page.waitForFunction(
      (t) => document.querySelector('#machine-title')?.textContent === t,
      {},
      m.title,
    );
  const fit = async (p, m, move) => {
    for (const f of fittings(m, move)) {
      await p.click('[data-part="' + f.part + '"]');
      if (f.flipped) await p.click('#flip');
      await p.click('[data-socket="' + f.socket + '"]');
    }
  };
  await page.select('#practice-tool', 'conveyor');
  const fresh = await page.$eval('#tool-practice-next', (a) => a.href);
  record(
    'fresh-personal-recommendation',
    fresh.endsWith('#' + campaign[100].id) &&
      (await page.$eval('#tool-progress', (e) => e.textContent.startsWith('0 of 54'))),
    fresh,
  );
  await page.tap('#tool-practice-next');
  await head(campaign[100]);
  await page.select('#playback-rate', '4');
  await page.tap('#run');
  await page.waitForSelector('#pilot[data-state=miss]');
  record('miss-earns-no-working-contact', !Object.keys(await data(page)).length);
  const seen = new Map();
  for (const [kind, [solo, mixed]] of Object.entries(practiceTargets)) {
    const n = solo[0] || mixed[0],
      m = campaign[n - 1];
    if (!seen.has(n)) {
      await page.goto(base + '#' + m.id);
      await head(m);
      const move = certify(M, m)[0],
        run = recordSimulation(M, m, move).run,
        expected = toolEvents(m, move, run);
      await fit(page, m, move);
      await page.select('#playback-rate', '4');
      await page.click('#run');
      await page.waitForSelector('#pilot[data-state=won]');
      seen.set(n, expected);
    }
    const r = await get(page, kind, 'fitted');
    record(
      'actual-fitted-' + kind,
      !!r && r.tick >= 1 && Object.hasOwn(parts, r.kind),
      r && { machine: r.machine, tick: r.tick, actor: r.actor },
    );
  }
  const grading = await data(page);
  record(
    'all-54-personally-fitted',
    Object.keys(grading).filter((k) => k.endsWith('.fitted')).length === 54,
  );
  for (const n of new Set(
    Object.values(practiceTargets)
      .map((v) => v[1][0])
      .filter(Boolean),
  )) {
    const m = campaign[n - 1];
    if (!seen.has(n)) {
      await page.goto(base + '#' + m.id);
      await head(m);
      const move = certify(M, m)[0];
      await fit(page, m, move);
      await page.select('#playback-rate', '4');
      await page.click('#run');
      await page.waitForSelector('#pilot[data-state=won]');
      seen.set(n, toolEvents(m, move, recordSimulation(M, m, move).run));
    }
  }
  const final = await data(page);
  const paired = Object.keys(practiceTargets).filter((k) => practiceTargets[k][1].length);
  record(
    'every-recommended-pair-has-two-working-spares',
    paired.every((k) => final[k + '.combined']?.partner && final[k + '.combined'].partner !== k),
    paired,
  );
  await page.select('#practice-tool', 'conveyor');
  const meta = await get(page, 'conveyor', 'combined');
  await page.click('[data-event-grade=combined]');
  await page.waitForSelector('#attempt-film[open]');
  const film = await page.evaluate(() => ({
    tick: Number(document.querySelector('#compare-frame').value),
    title: document.querySelector('#compare-title').textContent,
    out: document.querySelector('#compare-latest').textContent,
    empty: document.querySelector('#compare-previous').textContent,
  }));
  record(
    'two-physical-films-open-on-working-frame',
    film.tick === meta.tick &&
      film.title.includes(meta.title) &&
      film.out.includes('Repaired') &&
      film.empty.includes('Missed'),
    film,
  );
  await shot(page, 'matched-contact-film.png');
  await page.click('#compare-close');
  await page.waitForFunction(() => document.activeElement?.dataset.eventGrade === 'combined');
  await page.reload();
  await page.waitForSelector('#map-link');
  await page.click('#practice summary');
  await page.waitForSelector('#tool-notebook:not([hidden])');
  await page.select('#practice-tool', 'phase');
  record(
    'persistent-tool-count',
    (await page.$eval('#tool-progress', (e) => e.textContent.startsWith('54 of 54'))) &&
      (await page.$eval('#tool-next-untried', (b) => b.hidden)),
  );
  await shot(page, 'phase-notebook-phone.png');
  const ctx = await home.browser().createBrowserContext(),
    guest = await ctx.newPage();
  watch(guest);
  const order = orders[0],
    setup = benchmarks[0][0];
  await guest.goto(base + '#' + order.id + '/build/' + fitCode(order, setup));
  await guest.waitForSelector('#parts button');
  await guest.select('#playback-rate', '4');
  await guest.click('#run');
  await guest.waitForSelector('#pilot[data-state=won]');
  await guest.goto(base + '#last-bell');
  await guest.waitForSelector('#parts button');
  await guest.click('#practice summary');
  await guest.waitForSelector('#tool-progress');
  record(
    'shared-prebuilt-delivery-never-becomes-a-personal-fitting',
    !Object.keys(await data(guest)).length &&
      (await guest.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem('chaos.one-part-missing.repair.' + id)).evidenceEligible ===
          false,
        order.id,
      )),
  );
  await guest.select('#practice-tool', 'bridge');
  await guest.click('#tool-next-untried');
  record('choose-an-unfitted-tool', (await guest.$eval('#practice-tool', (e) => e.value)) !== 'bridge');
  await ctx.close();
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'working-tools.json'),
    JSON.stringify(
      { count: Object.keys(parts).length, machines: seen.size, paired, film, receipts: final },
      null,
      2,
    ),
  );
  await page.close();
}

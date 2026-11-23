import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { jobs, stampPrefix } from '../../one-part-missing/test-bay/station.js';
import { batchBenchmarks } from './batch-benchmarks.mjs';
export async function verifyTestBay(home, { url, record, shot, outDir }) {
  const opening = new Promise((r) => home.once('popup', r));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await opening,
    errors = [];
  const watch = (q) => q.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  await p.bringToFront();
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const head = (q, j) =>
    q.waitForFunction((t) => document.querySelector('#bay-title')?.textContent === t, {}, j.title);
  const read = (q, id) => q.$eval('#' + id, (e) => e.textContent);
  const tested = (q) =>
    q.waitForFunction(
      () =>
        !document.querySelector('#bay-all').hidden &&
        document.querySelectorAll('#bay-lots [data-result=untested]').length === 0,
      { timeout: 18000 },
    );
  const all = async (q) => {
    await q.select('#bay-rate', '4');
    await q.click('#bay-all');
    await tested(q);
  };
  const set = async (q, i, n) => {
    await q.focus('#bay-dial-' + i);
    await q.keyboard.press('Home');
    for (let k = 0; k < n; k++) await q.keyboard.press('ArrowRight');
  };
  const stamps = (q) =>
    q.evaluate(
      (prefix) => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith(prefix))),
      stampPrefix,
    );
  await p.click('#map-link');
  await p.click('#course-index summary');
  await p.click('#batch-entry');
  await head(p, jobs[0]);
  record(
    'phone-ready',
    (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) &&
      (await p.$eval('#bay-dial-0', (e) => e.getAttribute('aria-valuetext') === '162 u')),
  );
  await all(p);
  const initial = await p.$$eval('.bay-lot', (bs) => bs.map((b) => b.dataset.result));
  record(
    'one-size-fails-default',
    initial.join(',') === 'pass,pass,miss' && !Object.keys(await stamps(p)).length,
    initial,
  );
  await p.click('#bay-overlay');
  await shot(p, 'default-two-out-of-three-phone.png');
  await p.click('[data-lot="0"]');
  await p.focus('#bay-frame');
  await p.keyboard.press('Home');
  record('review-load-from-release', (await p.$eval('#bay-time', (e) => e.value)) === '0.00 s');
  await set(p, 0, 1);
  record(
    'change-clears-stale-tests',
    (await p.$$eval('.bay-lot', (ns) => ns.every((n) => n.dataset.result === 'untested'))) &&
      (await p.$eval('#bay-overlay-row', (e) => e.hidden)),
  );
  await p.select('#bay-rate', '.5');
  await p.click('#bay-all');
  await p.click('#bay-pause');
  record('real-batch-pauses', await p.$eval('#bay-phase', (e) => e.dataset.state === 'paused'));
  await p.click('#bay-stop');
  record('stop-awards-no-certificate', !Object.keys(await stamps(p)).length);
  await p.click('#bay-one');
  await p.waitForFunction(() => document.querySelector('#bay-phase').dataset.state === 'pass');
  record(
    'one-lot-is-not-approval',
    !Object.keys(await stamps(p)).length && (await read(p, 'bay-summary')).includes('1 of 3'),
  );
  await p.reload();
  await head(p, jobs[0]);
  record(
    'restores-only-draft',
    (await p.$eval('#bay-dial-0', (e) => e.value === '1')) && !(await p.$('[data-result=pass]')),
  );
  const results = [];
  await p.setViewport({ width: 1280, height: 800 });
  for (const [i, j] of jobs.entries()) {
    if (i) {
      await p.click('#bay-next');
      await head(p, j);
    }
    const b = batchBenchmarks[i];
    for (const [k, s] of b.settings.entries()) await set(p, k, s);
    await all(p);
    const rec = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), stampPrefix + j.id),
      actual = await p.$$eval('.bay-lot output', (es) => es.map((e) => e.textContent));
    record(
      'three-pass-' + j.id,
      !!rec &&
        JSON.stringify(rec.settings) === JSON.stringify(b.settings) &&
        JSON.stringify(rec.ticks) === JSON.stringify(b.ticks),
      { actual, record: rec },
    );
    results.push({ job: j.id, ...rec });
  }
  await p.click('#bay-overlay');
  await shot(p, 'production-final-comparison-desktop.png');
  record(
    'all-jobs-approved',
    (await read(p, 'bay-progress')) === '24 of 24 approved' &&
      Object.keys(await stamps(p)).length === 24,
  );
  await p.reload();
  await head(p, jobs.at(-1));
  await p.click('#bay-recall');
  const protocol = await p.createCDPSession();
  await protocol.send('Browser.grantPermissions', {
    origin: new URL(url).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await p.click('#bay-share');
  const href = await p.evaluate(async () =>
    document.querySelector('#bay-copy').hidden
      ? await navigator.clipboard.readText()
      : document.querySelector('#bay-url').value,
  );
  const c = await p.browser().createBrowserContext(),
    q = await c.newPage();
  watch(q);
  await q.goto(href);
  await head(q, jobs.at(-1));
  record(
    'shared-calibration-is-unearned',
    !Object.keys(await stamps(q)).length && (await q.$eval('#bay-recall', (e) => e.hidden)),
  );
  await all(q);
  record('shared-final-passes', await q.$$eval('.bay-lot[data-result=pass]', (es) => es.length === 3));
  await protocol.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#bay-download');
  await p.waitForFunction(() =>
    document.querySelector('#bay-summary').textContent.includes('Playable job ready'),
  );
  const file = path.join(outDir, 'test-bay-' + jobs.at(-1).id + '.html');
  for (let i = 0; i < 80 && !fs.existsSync(file); i++) await delay(100);
  const f = await c.newPage(),
    external = [];
  watch(f);
  f.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await f.setOfflineMode(true);
  await f.goto(pathToFileURL(file).href);
  await head(f, jobs.at(-1));
  await all(f);
  record(
    'standalone-calibration',
    !external.length && (await f.$$eval('.bay-lot[data-result=pass]', (es) => es.length === 3)),
    { external },
  );
  fs.writeFileSync(
    path.join(outDir, 'production-certificates.json'),
    JSON.stringify({ href, results }, null, 2),
  );
  await protocol.detach();
  await c.close();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

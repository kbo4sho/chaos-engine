import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { cases } from '../../one-part-missing/fault-desk/cases.js';
export async function verifyFaultDesk(home, { url, outDir, record, shot }) {
  await home.goto(url);
  const pp = new Promise((r) => home.once('popup', r));
  await home.click('#puzzle-launcher');
  const p = await pp,
    errors = [],
    results = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({
    width: 390,
    height: 664,
    isMobile: true,
    hasTouch: true,
  });
  await p.bringToFront();
  await p.click('#map-link');
  await p.click('#course-index summary');
  await p.click('#fault-entry');
  const read = (q, id) => q.$eval('#' + id, (e) => e.textContent);
  const head = (q, j) =>
    q.waitForFunction(
      (t) => document.querySelector('#case-title')?.textContent === t,
      {},
      j.title,
    );
  const state = (q, v) =>
    q.waitForFunction(
      (s) => document.querySelector('#case-film-label').textContent === s,
      {},
      v,
    );
  const count = (q, j) =>
    q.evaluate(
      (id) =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) =>
            k.startsWith('chaos.one-part-missing.fault.v1.' + id + '.'),
          ),
        ),
      j.id,
    );
  const test = async (q, j, slot, success) => {
    await q.select('#case-rate', '4');
    await q.click('[data-station="' + slot + '"]');
    await q.click('#case-service');
    await state(q, success ? 'Repaired run' : 'Failed service test');
  };
  const opening = cases[0];
  await head(p, opening);
  record(
    'phone-layout',
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.click('#case-split');
  record(
    'measured-first-difference',
    (await read(p, 'case-measure')).includes('units from reference') &&
      parseFloat(await p.$eval('#case-clock', (e) => e.value)) > 0,
  );
  await p.focus('#case-frame');
  await p.keyboard.press('Home');
  record(
    'rewind-to-release',
    (await p.$eval('#case-clock', (e) => e.value)) === '0.00 s',
  );
  await p.click('#case-play');
  await p.waitForFunction(
    () => parseFloat(document.querySelector('#case-clock').value) > 0,
  );
  await p.click('#case-play');
  const paused = await p.$eval('#case-clock', (e) => e.value);
  await delay(120);
  record(
    'pause-preserves-film-time',
    (await p.$eval('#case-clock', (e) => e.value)) === paused,
  );
  const wrong = opening.indices.find((k) => k !== opening.station);
  await p.click('[data-station="' + wrong + '"]');
  await p.select('#case-rate', '0.5');
  await p.click('#case-service');
  await p.click('#case-stop');
  record(
    'canceled-test-unearned',
    !Object.keys(await count(p, opening)).length &&
      (await read(p, 'case-result')).includes('canceled'),
  );
  await test(p, opening, wrong, false);
  record(
    'wrong-service-physically-misses',
    !Object.keys(await count(p, opening)).length &&
      (await read(p, 'case-result')).includes('still missed'),
  );
  await p.click('#case-split');
  await shot(p, 'phone-failed-service.png');
  await test(p, opening, opening.station, true);
  record(
    'two-tests-first-record',
    Object.keys(await count(p, opening)).some((k) => k.endsWith('.2')),
  );
  await p.reload();
  await head(p, opening);
  record(
    'repair-count-restored',
    (await read(p, 'case-result')).includes('2 service tests'),
  );
  await test(p, opening, opening.station, true);
  await p.reload();
  await head(p, opening);
  record(
    'best-result-improves',
    (await read(p, 'case-result')).includes('1 service test.'),
  );
  for (const [i, j] of cases.entries()) {
    if (i === 6)
      await p.setViewport({
        width: 1280,
        height: 800,
        isMobile: false,
        hasTouch: false,
      });
    if (i) await p.select('#case-select', j.id);
    await head(p, j);
    await test(p, j, j.station, true);
    const receipts = await count(p, j);
    record(
      'service-' + j.id,
      Object.keys(receipts).some((k) => k.endsWith('.1')),
      await read(p, 'case-result'),
    );
    results.push({ id: j.id, receipts });
  }
  record(
    'case-directory-complete',
    (await read(p, 'case-progress')) === '18 of 18 diagnosed',
  );
  await shot(p, 'desktop-final-serviced.png');
  const last = cases.at(-1),
    protocol = await p.createCDPSession();
  await protocol.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: outDir,
  });
  await p.click('#case-download');
  await p.waitForFunction(() =>
    document
      .querySelector('#case-result')
      .textContent.includes('Playable case ready'),
  );
  const file = path.join(outDir, 'fault-desk-' + last.id + '.html');
  for (let n = 0; n < 60 && !fs.existsSync(file); n++) await delay(100);
  const context = await p.browser().createBrowserContext(),
    q = await context.newPage(),
    external = [];
  q.on('pageerror', (e) => errors.push(e.message));
  q.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await q.setOfflineMode(true);
  await q.goto(pathToFileURL(file).href);
  await head(q, last);
  record(
    'portable-case-starts-unsolved',
    !(await q.$eval('#case-reset', (e) => !e.hidden)) &&
      !Object.keys(await count(q, last)).length,
  );
  await test(q, last, last.station, true);
  record(
    'offline-diagnosis-earned',
    Object.keys(await count(q, last)).some((k) => k.endsWith('.1')) &&
      !external.length,
    { external },
  );
  await protocol.detach();
  await context.close();
  await p.close();
  record('runtime-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'fault-records.json'),
    JSON.stringify(results, null, 2),
  );
}

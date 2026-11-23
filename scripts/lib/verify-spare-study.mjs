import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings } from '../../one-part-missing/machines.js';
import { compareSpare, studyKey } from '../../one-part-missing/spare-study.js';
export async function verifySpareStudy(home, { url, shot, record, outDir }) {
  await home.goto(url);
  const opened = new Promise((r) => home.once('popup', r));
  await home.click('#puzzle-launcher');
  const p = await opened,
    errors = [],
    measures = [];
  const watch = (q) => q.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  await p.setViewport({
    width: 390,
    height: 664,
    isMobile: true,
    hasTouch: true,
  });
  await p.bringToFront();
  const head = (q, m) =>
    q.waitForFunction(
      (t) => document.querySelector('#machine-title')?.textContent === t,
      {},
      m.title,
    );
  const read = (q, id) => q.$eval('#' + id, (e) => e.textContent);
  const saved = (q, m) =>
    q.evaluate(
      (k) => localStorage.getItem('chaos.one-part-missing.repair.' + k),
      m.id,
    );
  const solve = async (q, m) => {
    const move = certify(M, m)[0];
    for (const f of fittings(m, move)) {
      await q.click('[data-part="' + f.part + '"]');
      if (f.flipped) await q.click('#flip');
      await q.click('[data-socket="' + f.socket + '"]');
    }
    await q.select('#playback-rate', '4');
    await q.click('#run');
    await q.waitForFunction(
      () => document.querySelector('#pilot').dataset.state === 'won',
    );
    return move;
  };
  const open = async (q) => {
    await q.click('#study-open');
    await q.waitForSelector('#spare-study[open]');
  };
  const guess = (q, i) =>
    q.click('#study-choices button:nth-child(' + (i + 1) + ')');
  const first = campaign[0];
  await head(p, first);
  record(
    'unearned-study-hidden',
    await p.$eval('#study-open', (e) => e.offsetParent === null),
  );
  const fit = await solve(p, first),
    original = await saved(p, first),
    a = compareSpare(M, first, fit, fit.socket);
  await open(p);
  record(
    'first-working-reference-only',
    (await read(p, 'study-mode')) === 'Working setup' &&
      (await p.$eval('#study-compare', (e) => e.hidden)) &&
      (await read(p, 'study-result')) === '',
  );
  await guess(p, (a.correct + 1) % a.answers.length);
  record(
    'wrong-prediction-reveals-measurement',
    (await read(p, 'study-result')).includes('Your prediction was') &&
      (await read(p, 'study-mode')) === 'Spare removed',
  );
  await p.focus('#study-frame');
  await p.keyboard.press('Home');
  record(
    'rewind-real-frames',
    (await p.$eval('#study-time', (e) => e.value)) === '0.00 s',
  );
  await p.tap('#study-observe');
  await p.tap('#study-overlay');
  await p.tap('#study-overlay');
  await shot(p, 'phone-with-and-without.png');
  await p.tap('#study-retry');
  await guess(p, a.correct);
  record(
    'prediction-earned',
    (await read(p, 'study-record')).includes('Prediction recorded') &&
      (await saved(p, first)) === original,
  );
  await p.keyboard.press('Escape');
  record(
    'focus-back-on-bench',
    await p.evaluate(
      () =>
        !document.getElementById('spare-study').open &&
        document.activeElement.id === 'study-open',
    ),
  );
  await p.reload();
  await head(p, first);
  await open(p);
  record(
    'prediction-survives-reload',
    (await read(p, 'study-record')).includes('Prediction recorded') &&
      (await read(p, 'study-result')) === '',
  );
  await p.click('#study-close');
  await p.setViewport({
    width: 1280,
    height: 800,
    isMobile: false,
    hasTouch: false,
  });
  const last = campaign.at(-1);
  await p.click('#map-link');
  await p.select('#chapter', '49');
  await p.click('#shelf a[href="#' + last.id + '"]');
  await head(p, last);
  const set = await solve(p, last),
    before = await saved(p, last);
  await open(p);
  const fits = fittings(last, set);
  record(
    'all-installed-spares-selectable',
    (await p.$$('#study-spare option')).length === fits.length,
  );
  for (const f of fits) {
    await p.select('#study-spare', String(f.socket));
    const ref = compareSpare(M, last, set, f.socket);
    record(
      'fresh-question-' + f.part,
      (await read(p, 'study-result')) === '' &&
        (await read(p, 'study-goal')) === ref.question,
    );
    await guess(p, ref.correct);
    const result = await read(p, 'study-result');
    record(
      'actual-difference-' + f.part,
      result.startsWith('Correct.') && result.endsWith(ref.result),
      result,
    );
    const key = studyKey(last, set, f.socket);
    record(
      'per-spare-prediction-' + f.part,
      await p.evaluate(
        (k) => localStorage.getItem(k) === '1',
        key + '.predicted',
      ),
    );
    measures.push({ part: f.part, result });
  }
  record(
    'original-three-part-stamp-unchanged',
    (await saved(p, last)) === before,
  );
  await shot(p, 'three-part-study-desktop.png');
  await p.click('#study-close');
  const protocol = await p.createCDPSession();
  await protocol.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: outDir,
  });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(
    outDir,
    'one-part-missing-' + last.id + '-replay.html',
  );
  for (let i = 0; i < 60 && !fs.existsSync(file); i++) await delay(100);
  const ctx = await p.browser().createBrowserContext(),
    f = await ctx.newPage(),
    external = [];
  watch(f);
  f.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await f.setOfflineMode(true);
  await f.goto(pathToFileURL(file).href);
  await head(f, last);
  await open(f);
  await guess(f, compareSpare(M, last, set, fits[0].socket).correct);
  record(
    'portable-fitted-removal-works',
    !external.length && (await read(f, 'study-result')).startsWith('Correct.'),
    { external },
  );
  await ctx.close();
  await protocol.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'spare-measurements.json'),
    JSON.stringify(measures, null, 2),
  );
}

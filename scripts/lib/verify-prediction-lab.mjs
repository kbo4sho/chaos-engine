import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import M from 'matter-js';
import { prediction, exercises, predictionPrefix } from '../../one-part-missing/predictions.js';
import { certify } from '../../one-part-missing/certify.js';
import { lessons } from '../../one-part-missing/learning.js';
export async function verifyPredictions(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const popup = new Promise((r) => home.once('popup', r));
  await home.click('#puzzle-launcher');
  const p = await popup,
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent);
  const phase = (page, state) =>
    page.waitForFunction((s) => document.querySelector('#pilot').dataset.state === s, {}, state);
  await p.click('#open-lab');
  await p.select('#lab-tool', 'fan');
  await p.click('#lab-play');
  await p.click('#lab-predict');
  await p.waitForSelector('#prediction-lab[open]');
  const fan = prediction(M, 'fan', 'effect');
  const intact = await p.$eval('#prediction-lab', (e) => e.scrollWidth <= e.clientWidth + 1);
  await p.click('#predict-play');
  await p.waitForFunction(() => Number(document.querySelector('#predict-frame').value) > 0);
  await p.focus('#predict-frame');
  await p.keyboard.press('End');
  record(
    'reference-before-a-prediction',
    intact &&
      !(await read(p, 'predict-result')) &&
      (await read(p, 'predict-live')).startsWith(fan.labels[1]) &&
      (await read(p, 'predict-progress')) === '0 of 78 correct · 0 tried',
  );
  await shot(p, 'prediction-before-phone.png');
  const wrong = (fan.correct + 1) % fan.answers.length;
  await p.click('[data-answer="' + wrong + '"]');
  record(
    'first-miss-is-a-try',
    (await read(p, 'predict-progress')) === '0 of 78 correct · 1 tried' &&
      (await read(p, 'predict-result')).includes(fan.result),
  );
  await p.click('#predict-again');
  await p.click('[data-answer="' + fan.correct + '"]');
  record('retry-earned-mastery', (await read(p, 'predict-progress')) === '1 of 78 correct · 1 tried');
  await shot(p, 'prediction-after-phone.png');
  await p.click('#predict-next');
  record(
    'next-unmastered',
    (await p.$eval('#predict-mode', (e) => e.value)) === 'input' &&
      (await p.$eval('#predict-tool', (e) => e.value)) === 'fan',
  );
  await p.keyboard.press('Escape');
  await p.waitForFunction(
    () => !document.querySelector('#prediction-lab').open && document.activeElement.id === 'lab-predict',
  );
  record(
    'returns-to-stationary-tool-comparison',
    (await p.$eval('#tool-lab', (e) => e.open)) && (await read(p, 'lab-play')) === 'Play comparison',
  );
  await p.click('#lab-close');
  await p.click('#practice summary');
  await p.select('#practice-tool', 'sieve');
  await p.click('#practice-predict');
  record('practice-opens-chosen-tool', (await p.$eval('#predict-tool', (e) => e.value)) === 'sieve');
  await p.click('#predict-close');
  await p.setViewport({ width: 1280, height: 800 });
  await p.waitForSelector('#open-lab', { visible: true });
  await p.click('#open-lab');
  await p.click('#lab-predict');
  for (const { kind, mode } of exercises) {
    await p.select('#predict-tool', kind);
    await p.select('#predict-mode', mode);
    const l = prediction(M, kind, mode);
    await p.click('[data-answer="' + l.correct + '"]');
    const measure = await read(p, 'predict-result'),
      stored = await p.evaluate(
        (k) => localStorage.getItem(k),
        predictionPrefix + kind + '/' + mode + '/correct',
      );
    record(kind + '-' + mode, measure === 'Correct. ' + l.result && stored === '1', {
      answer: l.answers[l.correct],
      measure,
      stored,
    });
    if (kind === 'sieve' && mode === 'input') await shot(p, 'input-line-desktop.png');
  }
  record('full-notebook', (await read(p, 'predict-progress')) === '78 of 78 correct · 78 tried');
  await p.click('#predict-close');
  await p.click('#lab-close');
  await p.reload();
  await p.click('#open-lab');
  await p.click('#lab-predict');
  record('notebook-restored', (await read(p, 'predict-progress')) === '78 of 78 correct · 78 tried');
  await p.click('#predict-close');
  await p.click('#lab-close');
  const machine = lessons[0].machine,
    fit = certify(M, machine)[0];
  await p.click('[data-part="' + fit.part + '"]');
  if (fit.flipped) await p.click('#flip');
  await p.click('[data-socket="' + fit.socket + '"]');
  await p.select('#playback-rate', '0.5');
  if (!(await p.$eval('#practice', (d) => d.open))) await p.click('#practice summary');
  await p.click('#run');
  await phase(p, 'running');
  await p.click('#practice-predict');
  await phase(p, 'paused');
  const before = await read(p, 'counter');
  await delay(120);
  record('prediction-pauses-active-machine', before === (await read(p, 'counter')));
  await p.click('#predict-close');
  await phase(p, 'running');
  await p.select('#playback-rate', '4');
  await phase(p, 'won');
  const cdp = await p.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#save-replay');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Replay file ready'),
  );
  const file = path.join(outDir, 'one-part-missing-' + machine.id + '-replay.html');
  for (let n = 0; n < 60 && !fs.existsSync(file); n++) await delay(100);
  const offline = await p.browser().newPage(),
    external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await offline.click('#open-lab');
  await offline.select('#lab-tool', 'ratchet');
  await offline.click('#lab-predict');
  await offline.select('#predict-mode', 'input');
  await offline.click('[data-answer="3"]');
  const offlineResult = await read(offline, 'predict-result');
  record(
    'standalone-experiment',
    !external.length && offlineResult === 'Correct. ' + prediction(M, 'ratchet', 'input').result,
    { offlineResult, external },
  );
  await offline.close();
  await cdp.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

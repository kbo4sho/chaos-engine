import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { lessons, exposures, simulate, measure } from '../../one-part-missing/discovery/experiments.js';

export async function verifyDiscovery(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  await p.click('#map-link');
  await p.click('#discovery-entry');
  await p.waitForSelector('#discovery-settings button');
  const errors = [],
    receipts = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const read = (id) => p.$eval('#discovery-' + id, (e) => e.textContent);
  async function run(i, touch) {
    const use = (s) => (touch ? p.tap(s) : p.click(s));
    await use('#discovery-settings button:nth-child(' + (i + 1) + ')');
    await use('#discovery-run');
    await p.waitForFunction(
      () =>
        document.querySelector('#discovery-clock').value ===
          document.querySelector('#discovery-limit').textContent.replace('Exposure ', '') &&
        document.querySelector('#discovery-run').textContent === 'Run again',
    );
  }
  await p.select('#discovery-rate', '2');
  for (const [index, l] of lessons.entries()) {
    const phone = index % 12 < 6;
    if (index % 12 === 6) await p.setViewport({ width: 1280, height: 800 });
    if (index === 12) await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
    await p.waitForFunction(
      (t) => document.querySelector('#discovery-title').textContent === t,
      {},
      l.title,
    );
    await run(0, phone);
    await run(1, phone);
    await p.click('#discovery-first');
    record(
      'compare-settings-' + l.id,
      (await read('reading')) !== '' && Number(await p.$eval('#discovery-frame', (e) => e.value)) > 0,
    );
    if (index === 0) {
      await shot(p, 'phone-compare-cable-settings.png');
      await p.click('#discovery-overlay');
      record('overlay-switchable', !(await p.$eval('#discovery-overlay', (e) => e.checked)));
    }
    await p.click('#discovery-next');
    await p.waitForFunction(
      () => document.querySelector('#discovery-mode').textContent === 'New machine',
    );
    const [_, end, targets] = exposures[l.id];
    const valid = l.values.map((v, i) =>
      measure(simulate(M, l, true, i, end), targets).every((r) => r.inside),
    );
    const wrong = valid.indexOf(false),
      win = valid.indexOf(true);
    await run(wrong, phone);
    const miss = await read('result'),
      key = 'chaos.one-part-missing.discovery.v1.' + l.id + '.solved';
    record(
      'measured-miss-' + l.id,
      miss.includes('units') && !(await p.evaluate((k) => localStorage.getItem(k), key)),
      miss,
    );
    if (l.instruments) {
      await p.click('#discovery-changes summary');
      const changes = await p.$$('#discovery-transitions button');
      if (changes.length) {
        await changes.at(-1).click();
        record(
          'measured-instrument-seek-' + l.id,
          Number(await p.$eval('#discovery-frame', (e) => e.value)) ===
            Number(await changes.at(-1).evaluate((b) => b.dataset.frame)),
          await read('state'),
        );
      }
      if (l.kind === 'phase') await shot(p, 'phase-window-reading.png');
    }
    if (index === 9) await shot(p, 'two-load-missed-exposure.png');
    await run(win, phone);
    const stored = await p.evaluate((k) => localStorage.getItem(k), key),
      score = await read('result');
    receipts.push({ id: l.id, wrong: l.labels[wrong], miss, setting: l.labels[win], score, stored });
    record(
      'earned-new-machine-' + l.id,
      score.endsWith('Exposure recorded.') &&
        stored === '1' &&
        !(await p.$eval('#discovery-next', (e) => e.hidden)),
      score,
    );
    if (index === 9) await shot(p, 'matched-two-load-exposure.png');
    if (index === 3) {
      await p.reload();
      await p.waitForFunction(
        (n) => document.querySelector('#discovery-progress').textContent === '4 of ' + n + ' solved',
        {},
        lessons.length,
      );
      record('progress-survives-reload', (await read('mode')) === 'New machine');
      await p.select('#discovery-rate', '2');
    }
    if (index < lessons.length - 1) await p.click('#discovery-next');
  }
  await p.reload();
  await p.waitForFunction(
    (n) => document.querySelector('#discovery-progress').textContent === n + ' of ' + n + ' solved',
    {},
    lessons.length,
  );
  record('all-exposures-survive-reload', true);
  await p.click('#discovery-back');
  await p.select('#discovery-select', lessons[2].id);
  await p.waitForFunction(
    () => document.querySelector('#discovery-title').textContent === 'Across the sheave',
  );
  await p.focus('#discovery-run');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('#discovery-run').textContent === 'Pause');
  await p.keyboard.press('Space');
  record('keyboard-pauses-film', (await read('run')) !== 'Pause');
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.select('#discovery-select', 'phase-clearance');
  await p.waitForFunction(
    () => document.querySelector('#discovery-title').textContent === 'Cross before the gate closes',
  );
  await p.click('#discovery-run');
  await p.waitForFunction(() => document.querySelector('#discovery-run').textContent === 'Run again');
  await p.click('#discovery-changes summary');
  await p.click('#discovery-transitions button:last-child');
  record(
    'reduced-motion-real-phase-expiry',
    (await read('state')).startsWith('Solid') && (await read('transitions')).includes('Solid again'),
  );
  fs.writeFileSync(path.join(outDir, 'exposure-receipts.json'), JSON.stringify(receipts, null, 2));
  record('no-page-errors', errors.length === 0, errors);
  await p.close();
}

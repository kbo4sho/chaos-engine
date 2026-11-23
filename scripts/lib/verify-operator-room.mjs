import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { operatorBenchmarks } from './operator-benchmarks.mjs';
import { jobs, time, recordPrefix } from '../../one-part-missing/control-room/console.js';
export async function verifyOperatorRoom(home, { url, record, shot, outDir }) {
  const popup = new Promise((r) => home.once('popup', r));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await popup,
    errors = [];
  const watch = (page) => page.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  await p.bringToFront();
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.click('#map-link');
  await p.click('#course-index summary');
  await p.click('#operator-entry');
  const waitTitle = (page, j) =>
    page.waitForFunction((t) => document.querySelector('#op-title')?.textContent === t, {}, j.title);
  const state = (page, s) =>
    page.waitForFunction((t) => document.querySelector('#op-status')?.dataset.state === t, {}, s);
  const val = (page, id) => page.$eval('#' + id, (e) => e.value ?? e.textContent);
  const set = (page, i, t) => {
    const sel = '[data-slot="' + i + '"]';
    return (async () => {
      const slider = sel + ' input[type=range]';
      await page.focus(slider);
      await page.keyboard.press('Home');
      const min = Number(await page.$eval(slider, (e) => e.min));
      for (let k = min; k < t; k++) await page.keyboard.press('ArrowRight');
      const check = sel + ' input[type=checkbox]';
      if (!(await page.$eval(check, (e) => e.checked))) await page.click(check);
    })();
  };
  const keyRecords = (page) =>
    page.evaluate(
      (prefix) => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith(prefix))),
      recordPrefix,
    );
  const playback = async (page, j, expected) => {
    await page.select('#op-rate', '4');
    await page.click('#op-test');
    await state(page, expected);
    return val(page, 'op-time');
  };
  await waitTitle(p, jobs[0]);
  await shot(p, 'first-shift-phone.png');
  record(
    'first-window-and-mobile-fit',
    (await val(p, 'op-window')).includes('0.92 s') &&
      (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)),
  );
  await p.select('#op-rate', '4');
  await p.click('#op-live');
  await state(p, 'miss');
  record(
    'unattended-line-misses',
    (await val(p, 'op-result')).includes('0 of 1') && !Object.keys(await keyRecords(p)).length,
  );
  await p.select('#op-rate', '.25');
  await p.click('#op-live');
  await p.click('#op-pause');
  await state(p, 'paused');
  const tick = operatorBenchmarks[0].cues[0];
  let frame = await p.$eval(
    '#op-frame',
    (e) => Number(e.getAttribute('aria-valuetext').split(' ')[0]) * 60,
  );
  for (let k = Math.round(frame); k < tick - 1; k++) await p.click('#op-step');
  record('live-signal-window', !(await p.$eval('#op-send', (e) => e.disabled)));
  await p.focus('#op-diagram');
  await p.keyboard.press('Space');
  await p.click('#op-step');
  await p.select('#op-rate', '4');
  await p.click('#op-pause');
  await state(p, 'won');
  record(
    'live-delivery-earned',
    (await val(p, 'op-best')) === time(operatorBenchmarks[0].tick) &&
      Object.keys(await keyRecords(p)).length === 1,
  );
  await p.click('#op-events button');
  record(
    'measured-brake',
    (await val(p, 'op-readout')).includes('Gold outgoing arrow · 0.0 units/frame') &&
      (await val(p, 'op-time')) === time(tick),
  );
  await shot(p, 'inspect-live-brake.png');
  await p.click('#op-recording');
  record(
    'recording-becomes-editable',
    (await p.$eval('[data-slot="0"] input[type=range]', (e) => Number(e.value))) === tick,
  );
  await p.reload();
  await waitTitle(p, jobs[0]);
  record(
    'draft-survives-reload',
    (await p.$eval('[data-slot="0"] input[type=range]', (e) => Number(e.value))) === tick,
  );
  const summary = [];
  await p.setViewport({ width: 1280, height: 800 });
  for (const [i, j] of jobs.entries()) {
    if (i > 0) {
      await p.click('#op-next');
      await waitTitle(p, j);
    }
    const b = operatorBenchmarks[i];
    for (const [index, t] of b.cues.entries()) await set(p, index, t);
    const actual = await playback(p, j, 'won');
    summary.push({ shift: j.id, cues: b.cues, time: actual, contacts: await val(p, 'op-delivery') });
    record(
      'deliver-' + j.id,
      actual === time(b.tick) &&
        (await val(p, 'op-delivery')) === j.goals.length + ' / ' + j.goals.length + ' received',
    );
  }
  record(
    'all-thirty-progress',
    (await val(p, 'op-progress')) === '30 of 30 delivered' &&
      Object.keys(await keyRecords(p)).length === 30,
  );
  await p.click('#op-events button:last-child');
  await shot(p, 'three-operator-console.png');
  await p.reload();
  await waitTitle(p, jobs.at(-1));
  await p.click('#op-load');
  await playback(p, jobs.at(-1), 'won');
  const b = operatorBenchmarks.at(-1);
  const protocol = await p.createCDPSession();
  // Use the real copy button and read either the clipboard or its selectable fallback.
  await protocol.send('Browser.grantPermissions', {
    origin: new URL(url).origin,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await p.click('#op-share');
  const href = await p.evaluate(async () =>
    document.querySelector('#op-link-box').hidden
      ? await navigator.clipboard.readText()
      : document.querySelector('#op-link').value,
  );
  const context = await p.browser().createBrowserContext(),
    q = await context.newPage();
  watch(q);
  await q.goto(href);
  await waitTitle(q, jobs.at(-1));
  record(
    'shared-sheet-starts-unearned',
    (await val(q, 'op-best')) === '—' && (await val(q, 'op-result')).includes('Shared cue sheet'),
  );
  await playback(q, jobs.at(-1), 'won');
  record('shared-sheet-reproduces-delivery', (await val(q, 'op-time')) === time(b.tick));
  await protocol.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#op-download');
  await p.waitForFunction(() =>
    document.querySelector('#op-result').textContent.includes('Playable shift ready'),
  );
  const file = path.join(outDir, 'operator-' + jobs.at(-1).id + '.html');
  for (let i = 0; i < 80 && !fs.existsSync(file); i++) await delay(100);
  const f = await context.newPage(),
    external = [];
  watch(f);
  f.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await f.setOfflineMode(true);
  await f.goto(pathToFileURL(file).href);
  await waitTitle(f, jobs.at(-1));
  await playback(f, jobs.at(-1), 'won');
  record('standalone-file-replays', (await val(f, 'op-time')) === time(b.tick) && !external.length, {
    external,
  });
  fs.writeFileSync(
    path.join(outDir, 'operator-shifts.json'),
    JSON.stringify({ summary, href, records: await keyRecords(p) }, null, 2),
  );
  await protocol.detach();
  await context.close();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

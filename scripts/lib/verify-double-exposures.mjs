import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { rigs, doubleRun } from '../../one-part-missing/discovery/double-rigs.js';
import { doublePrefix } from '../../one-part-missing/discovery/double-records.js';

export async function verifyDoubleExposures(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  await p.waitForSelector('#map-link');
  await p.click('#map-link');
  await p.click('#discovery-entry');
  await p.click('#double-entry');
  const errors = [],
    receipts = [];
  p.on('pageerror', (e) => errors.push(e.message));
  for (const [i, rig] of rigs.entries()) {
    if (i===6) await p.setViewport({width:390,height:664,isMobile:true,hasTouch:true});
    if (i % 6 === 3) await p.setViewport({ width: 1280, height: 800 });
    const use = (s) => (i % 6 < 3 ? p.tap(s) : p.click(s));
    await p.waitForFunction(
      (title) => document.querySelector('#double-title').textContent === title,
      {},
      rig.title,
    );
    await p.select('#double-rate', '2');
    const choices = [];
    for (const [a] of rig.controls[0].values.entries())
      for (const [b] of rig.controls[1].values.entries())
        choices.push({ settings: [a, b], tape: doubleRun(M, rig, [a, b]) });
    const partial = choices.find((c) => c.tape.count === 1),
      different = choices.find((c) => c.tape.count === 0),
      correct = choices.find((c) => c.tape.count === 2);
    const set = async (values) => {
      for (const [j, v] of values.entries())
        await use('[data-knob="' + j + '"][data-position="' + v + '"]');
    };
    const run = async () => {
      await use('#double-run');
      await p.waitForFunction(
        () =>
          document.querySelector('#double-result').textContent.includes('shutter') &&
          !document.querySelector('#double-clip').hidden,
      );
    };
    await set(partial.settings);
    await run();
    const first = await p.$$eval('#double-shots button', (bs) =>
      bs.map((b) => b.dataset.hit === 'true'),
    );
    record(
      'one-shutter-on-this-run-' + rig.id,
      first.filter(Boolean).length === 1 && (await p.$eval('#double-next', (b) => b.hidden)),
      first,
    );
    await use('#double-shots button:nth-child(1)');
    record(
      'first-shutter-seek-' + rig.id,
      (await p.$eval('#double-frame', (e) => Number(e.value))) === rig.shots[0].tick,
    );
    if (i === 0) await shot(p, 'one-shutter-on-phone.png');
    await set(different.settings);
    await use('#double-refit');
    const refitted = await p.$$eval('#double-controls [aria-pressed=true]', (bs) =>
      bs.map((b) => Number(b.dataset.position)),
    );
    record(
      'recover-partial-setup-' + rig.id,
      refitted.every((v, j) => v === partial.settings[j]),
    );
    await set(correct.settings);
    await run();
    const solved = await p.$eval('#double-result', (e) => e.dataset.solved === 'true');
    const prefix = doublePrefix + rig.id + '.';
    const stored = await p.evaluate(
      (prefix) => Object.entries(localStorage).filter(([k]) => k.startsWith(prefix)),
      prefix,
    );
    receipts.push({ id: rig.id, partial: partial.settings, winner: correct.settings, stored, first });
    record(
      'both-shutters-physically-earned-' + rig.id,
      solved &&
        stored.some(([k, v]) => k === prefix + correct.settings.join('.') && JSON.parse(v)[0] === 2),
      stored,
    );
    await use('#double-shots button:nth-child(2)');
    if (i === 1) {
      await use('#double-clip [data-clip-make]');
      await p.waitForSelector('#double-clip [data-clip-save]:not([hidden])');
      record(
        'successful-signal-rig-makes-a-film',
        await p.$eval('#double-clip [data-clip-save]', (a) => a.download === 'double-timed-cable.gif'),
      );
    }
    if (i === 4) await shot(p, 'rim-and-output-dial.png');
    if(rig.id==='rack-hoist'){
      await p.click('#double-help summary');await p.click('#double-practice a');await p.waitForFunction(()=>document.querySelector('#discovery-title')?.textContent==='Bring the carriage in');
      record('rack-hoist-opens-motor-practice',true);
      await p.goBack();await p.waitForSelector('#double-next:not([hidden])');
    }
    if (i < rigs.length - 1) await use('#double-next');
  }
  await p.reload();
  await p.waitForFunction(
    n => document.querySelector('#double-progress').textContent === n+' of '+n+' developed', {}, rigs.length,
  );
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.click('#double-refit');
  await p.focus('#double-run');
  await p.keyboard.press('Enter');
  record(
    'reduced-motion-and-keyboard-exposure',
    await p.$eval('#double-result', (e) => e.dataset.solved === 'true'),
  );
  await p.click('#double-help summary');
  await p.click('#double-practice a');
  await p.waitForSelector('#discovery-title');
  record(
    'practice-returns-to-specific-control',
    await p.$eval('#discovery-title', (e) => e.textContent === 'Share the input spin'),
  );
  fs.writeFileSync(path.join(outDir, 'paired-receipts.json'), JSON.stringify(receipts, null, 2));
  record('no-page-errors', !errors.length, errors);
  await p.close();
}

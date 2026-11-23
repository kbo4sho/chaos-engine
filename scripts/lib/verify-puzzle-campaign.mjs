import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import Matter from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { certify } from '../../one-part-missing/workshop.js';
import { assembly, trial } from '../../one-part-missing/machines.js';

export async function verifyCampaign(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opening = new Promise((resolve) => home.once('popup', resolve));
  await home.click('#puzzle-launcher');
  const page = await opening;
  await page.bringToFront();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const mobile = { width: 390, height: 664, isMobile: true, hasTouch: true };
  const desktop = { width: 1280, height: 800 };
  let touch = false,
    flipChecked = false,
    portableChecked = false;
  const press = (selector) => (touch ? page.tap(selector) : page.click(selector));
  const phase = (state) =>
    page.waitForFunction(
      (expected) => document.querySelector('#pilot')?.dataset.state === expected,
      { timeout: 18000 },
      state,
    );
  const storageKey = (id) => 'chaos.one-part-missing.repair.' + id;
  for (const [i, machine] of campaign.entries()) {
    const n = i + 1;
    if (n === 1 || n === 61 || n === 81) {
      touch = n === 61;
      await page.setViewport(touch ? mobile : desktop);
      await page.bringToFront();
    }
    await page.waitForFunction(
      (title) => document.querySelector('#machine-title')?.textContent === title,
      {},
      machine.title,
    );
    if (n > 2) await page.select('#playback-rate', '4');
    const solutions = certify(Matter, machine);
    if (!solutions?.length) throw new Error('No certified repair for ' + machine.id);
    const move = solutions[0],
      expected = trial(Matter, machine, move);
    await press('[data-part="' + move.part + '"]');
    const socket = '[data-socket="' + move.socket + '"]';
    if (move.flipped && !flipChecked) {
      await press(socket);
      await press('#run');
      await phase('miss');
      await press('#flip');
      record(
        'reverse-an-installed-rail',
        await page.$eval('#open-sandbox', (a) => a.href.includes('flip=1')),
        machine.id,
      );
      flipChecked = true;
    } else {
      if (move.flipped) await press('#flip');
      await press(socket);
    }
    if ([1, 61, 81, 100, 101, 112, 133, campaign.length].includes(n)) {
      await page.evaluate(() => scrollTo(0, 0));
      await shot(page, 'level-' + n + '-fitted.png');
    }
    await press('#run');
    await phase('won');
    const state = await page.evaluate(
      (key) => ({
        elapsed: parseFloat(document.getElementById('film-time').value),
        repair: JSON.parse(localStorage.getItem(key)),
        progress: document.getElementById('progress').textContent,
        signal: document.getElementById('signal').textContent,
        feedback: document.getElementById('status').textContent,
        overflows: document.documentElement.scrollWidth > innerWidth,
        link: document.getElementById('open-sandbox').href,
      }),
      storageKey(machine.id),
    );
    record(
      'level-' + n + '-' + machine.id,
      !state.overflows &&
        state.progress === n + ' of ' + campaign.length + ' repaired' &&
        state.repair?.tick === Math.round(state.elapsed * 60) - 30 &&
        state.repair?.part === move.part &&
        state.repair.socket === move.socket &&
        Boolean(state.repair.flipped) === Boolean(move.flipped) &&
        (machine.goals.length === 1 ||
          state.signal.startsWith(machine.goals.length + ' / ' + machine.goals.length)),
      { move, referenceContacts: expected.hits, ...state },
    );
    if (n % 10 === 0) {
      await shot(page, 'chapter-' + n / 10 + '-repaired.png');
      await press('#map-link');
      record(
        'chapter-' + n / 10 + '-recorded',
        await page.$$eval(
          '#shelf .check',
          (marks) => marks.length === 10 && marks.every((m) => m.textContent === '✓'),
        ),
        await page.$eval('#chapter', (select) => select.selectedOptions[0].textContent),
      );
    }
    if (move.flipped && move.socket >= 2 && touch && !portableChecked) {
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#replay', { visible: true });
      await press('#replay');
      await phase('won');
      const info = await page.$eval('#status', (e) => e.textContent);
      record('reversed-rail-replays-on-phone', info.includes('Replay complete'), info);
      const openingSandbox = new Promise((resolve) => page.once('popup', resolve));
      await press('#open-sandbox');
      const sandbox = await openingSandbox;
      await sandbox.waitForFunction(() =>
        document.querySelector('#btn-pause')?.textContent.includes('PLAY'),
      );
      const fitted = await sandbox.evaluate(
        () => Composite.allBodies(world).find((b) => b.render.machineShape?.fitted)?.render.machineShape,
      );
      const intendedShape = assembly(machine, move).find((s) => s.fitted);
      record(
        'reversed-rail-imports-at-its-socket',
        fitted?.a === intendedShape.a && fitted.x === intendedShape.x && fitted.y === intendedShape.y,
        { fitted, intendedShape },
      );
      await sandbox.close();
      await page.bringToFront();
      const download = await page.createCDPSession();
      await download.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
      await press('#save-replay');
      await page.waitForFunction(() =>
        document.getElementById('status').textContent.includes('Replay file ready'),
      );
      const file = path.join(outDir, 'one-part-missing-' + machine.id + '-replay.html');
      for (let attempt = 0; attempt < 50 && !fs.existsSync(file); attempt++) await delay(100);
      const offline = await page.browser().newPage();
      const external = [];
      offline.on('request', (request) => {
        if (/^https?:/.test(request.url())) external.push(request.url());
      });
      await offline.setOfflineMode(true);
      await offline.goto(pathToFileURL(file).href);
      await offline.waitForSelector('#replay', { visible: true });
      await offline.click('#replay');
      await offline.waitForFunction(() => document.getElementById('pilot').dataset.state === 'won', {
        timeout: 18000,
      });
      const packed = await offline.evaluate(() => JSON.parse(document.body.dataset.repair));
      record(
        'portable-reversed-replay',
        packed.flipped === true && packed.socket === move.socket && external.length === 0,
        { packed, external },
      );
      await offline.close();
      await download.detach();
      await page.bringToFront();
      portableChecked = true;
    }
    if (n < campaign.length) await press('#next');
  }
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(
    (total) => document.getElementById('progress').textContent === total + ' of ' + total + ' repaired',
    {},
    campaign.length,
  );
  const final = await page.evaluate(() => ({
    progress: document.getElementById('progress').textContent,
    resumeHidden: document.getElementById('continue').hidden,
    records: Object.keys(localStorage).filter((key) => key.startsWith('chaos.one-part-missing.repair.'))
      .length,
  }));
  record(
    'campaign-complete-after-reload',
    final.resumeHidden && final.records === campaign.length && flipChecked && portableChecked,
    final,
  );
  record('campaign-runtime-errors', errors.length === 0, errors);
  await page.close();
}

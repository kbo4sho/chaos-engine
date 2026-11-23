import M from 'matter-js';
import { lessons, practice } from '../../one-part-missing/learning.js';
import { certify } from '../../one-part-missing/workshop.js';
import { setTimeout as delay } from 'node:timers/promises';

export async function verifyLessons(home, { url, record, shot }) {
  await home.goto(url);
  const open = new Promise((resolve) => home.once('popup', resolve));
  await home.click('#puzzle-launcher');
  const p = await open;
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const phase = (state) =>
    p.waitForFunction(
      (value) => document.getElementById('pilot').dataset.state === value,
      { timeout: 18000 },
      state,
    );
  const heading = (i) =>
    p.waitForFunction(
      (n) => document.querySelector('#machine-no').textContent.startsWith('Lesson ' + n + ' /'),
      {},
      String(i + 1).padStart(2, '0'),
    );
  await p.tap('#learn-start');
  await heading(0);
  for (const [i, { machine }] of lessons.entries()) {
    await heading(i);
    const move = certify(M, machine)[0];
    await p.tap('[data-part="' + move.part + '"]');
    if (move.flipped) await p.tap('#flip');
    await p.tap('[data-socket="' + move.socket + '"]');
    await p.select('#playback-rate', i === 0 ? '0.5' : '4');
    await p.tap('#run');
    if (i === 0) {
      await phase('running');
      await p.tap('#open-lab');
      await phase('paused');
      await p.tap('#lab-close');
      await phase('running');
      record('lab-preserves-a-live-attempt', true);
      await p.tap('#run');
      await phase('paused');
      const clock = () => p.$eval('#counter', (e) => e.textContent);
      const before = await clock();
      await delay(175);
      record('paused-time-stays-fixed', (await clock()) === before, before);
      await p.tap('#frame-step');
      const after = await clock();
      record('single-physics-frame', Math.round((parseFloat(after) - parseFloat(before)) * 60) === 1, {
        before,
        after,
      });
      await shot(p, 'phone-single-frame.png');
      await p.select('#playback-rate', '4');
      await p.tap('#run');
    }
    await phase('won');
    const progress = await p.$eval('#learning-progress', (el) => el.textContent);
    const key = 'chaos.one-part-missing.repair.' + machine.id;
    const saved = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
    record(
      'lesson-' + (i + 1),
      progress === i + 1 + ' of ' + lessons.length + ' lessons repaired' &&
        saved.part === move.part &&
        saved.socket === move.socket,
      { progress, level: machine.id, move: saved },
    );
    if (i === 0) {
      await p.reload();
      await heading(i);
      await p.select('#playback-rate', '2');
      await p.tap('#replay');
      await phase('won');
      record(
        'same-physical-time-at-2x',
        saved.tick === Math.round(parseFloat(await p.$eval('#film-time', (e) => e.value)) * 60) - 30,
      );
    }
    if (i < lessons.length - 1) await p.tap('#next');
  }
  await p.tap('#next');
  await p.waitForSelector('#lesson-chapter', { visible: true });
  const positions = await p.$$eval('#lesson-list [aria-current=step]', (links) =>
    links.map((a) => a.href),
  );
  record(
    'final-lesson-map',
    positions.length === 1 && positions[0].endsWith('#learn/' + lessons.at(-1).machine.id),
    positions,
  );
  await p.select('#lesson-chapter', '0');
  await p.tap('#lesson-list a');
  await heading(0);
  await p.tap('#practice summary');
  for (const id of Object.keys(practice)) {
    await p.select('#practice-tool', id);
    const links = await p.$$eval('#practice-links a', (list) => list.map((e) => e.hash));
    record('practice-' + id, links.length === 3 && new Set(links).size === 3, links);
  }
  await p.select('#practice-tool', 'domino');
  await p.tap('#practice-demo');
  const label = await p.$eval('#lab-contact', (el) => el.textContent);
  record(
    'classic-domino-comparison',
    label.includes('First contact') &&
      (await p.$eval('.lab-legend span', (el) => el.textContent)) === 'Part fitted',
    label,
  );
  await shot(p, 'domino-comparison-phone.png');
  await p.tap('#lab-close');
  await p.tap('#practice-links a:nth-child(2)');
  await p.waitForFunction(() => document.querySelector('#machine-no').textContent.startsWith('Level '));
  record('return-to-numbered-campaign', !new URL(p.url()).hash.startsWith('#learn/'), p.url());
  await p.setViewport({ width: 1280, height: 800 });
  await p.click('#learn-start');
  await heading(0);
  await p.click('#learn-start');
  await shot(p, 'desktop-lesson-map.png');
  record('no-runtime-errors', !errors.length, errors);
  await p.close();
}

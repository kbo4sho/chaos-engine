import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { lessons } from '../../one-part-missing/learning.js';
import { certify } from '../../one-part-missing/certify.js';

export async function verifyPhoneBench(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.setViewport({ width: 390, height: 664, hasTouch: true, isMobile: true });
  await p.bringToFront();
  await p.waitForSelector('.part');
  const errors = [],
    receipts = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const phase = (state) =>
    p.waitForFunction((s) => document.querySelector('#pilot').dataset.state === s, {}, state);
  const tapVisible = async (selector) => {
    const pos = await p.$eval(selector, (e) => {
      const r = e.getBoundingClientRect(),
        x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      if (
        r.left < 0 ||
        r.right > innerWidth ||
        r.top < 0 ||
        r.bottom > innerHeight ||
        !e.contains(document.elementFromPoint(x, y))
      )
        return null;
      return { x, y, scroll: scrollY };
    });
    if (!pos) throw Error('Control outside phone viewport or obscured: ' + selector);
    await p.touchscreen.tap(pos.x, pos.y);
    return pos;
  };
  await tapVisible('[data-socket="1"]');
  record(
    'mount-can-be-picked-first',
    await p.$eval('[data-socket="1"]', (e) => e.classList.contains('awaiting-part')),
  );
  await tapVisible('[data-part="bumper"]');
  record(
    'spare-fits-armed-mount',
    await p.$eval('[data-socket="1"]', (e) => e.getAttribute('aria-pressed') === 'true'),
  );
  await tapVisible('#undo-fitting');
  record(
    'undo-removes-only-last-edit',
    await p.$eval('#sockets', (e) => !e.querySelector('[aria-pressed=true]')),
  );
  await p.select('#playback-rate', '4');
  await tapVisible('#run');
  await phase('miss');
  await shot(p, 'miss-pin-touch.png');
  await tapVisible('#miss-pin');
  await p.waitForSelector('#repair-coach[open]');
  await p.waitForFunction(() => document.querySelector('#coach-slow').textContent === 'Pause replay');
  const before = await p.$eval('#coach-frame', (e) => Number(e.value));
  await p.waitForFunction(
    (v) => Number(document.querySelector('#coach-frame').value) >= v + 2,
    {},
    before,
  );
  await p.tap('#coach-slow');
  record(
    'tap-measured-handoff-plays-slow-film',
    await p.$eval('#coach-slow', (e) => e.textContent === 'Replay at ¼ speed'),
  );
  await p.tap('#coach-return');
  await shot(p, 'measured-miss.png');
  await p.tap('#coach-close');
  for (const [i, { machine }] of lessons.slice(0, 3).entries()) {
    await p.waitForFunction(
      (title) => document.querySelector('#machine-title').textContent === title,
      {},
      machine.title,
    );
    const fit = certify(M, machine)[0];
    const taps = [];
    for (const selector of [
      '[data-part="' + fit.part + '"]',
      '[data-socket="' + fit.socket + '"]',
      '#run',
    ])
      taps.push(await tapVisible(selector));
    await phase('won');
    const receipt = await p.evaluate(
      (id) => ({ stored: localStorage.getItem('chaos.one-part-missing.repair.' + id), top: scrollY }),
      machine.id,
    );
    receipts.push({ id: machine.id, taps, ...receipt });
    record(
      'touch-repair-without-scrolling-' + i,
      !!receipt.stored &&
        taps.every((t) => t.scroll === taps[0].scroll) &&
        Math.abs(receipt.top - taps[0].scroll) < 1,
      receipt,
    );
    await shot(p, 'guided-repair-' + (i + 1) + '.png');
    if (i < 2) await tapVisible('#next');
  }
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.tap('#reset');
  await p.tap('#run');
  await phase('miss');
  await p.tap('#miss-pin');
  record(
    'reduced-motion-pin-opens-at-still-frame',
    await p.$eval('#coach-slow', (e) => e.textContent === 'Replay at ¼ speed'),
  );
  await p.keyboard.press('Escape');
  await p.setViewport({ width: 1280, height: 800 });
  record('wide-bench-restores-film', await p.$eval('#film', (e) => !!e.closest('.cabinet')));
  fs.writeFileSync(path.join(outDir, 'phone-receipts.json'), JSON.stringify(receipts, null, 2));
  record('no-page-errors', !errors.length, errors);
  await p.close();
}

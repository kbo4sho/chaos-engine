import path from 'node:path';
import { cases } from '../../one-part-missing/fault-desk/cases.js';

export async function verifyRepairCelebration(page, { url, record, outDir }) {
  const bench = new URL('one-part-missing/', url.replace(/\/?$/, '/'));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const waitPhase = (phase) => page.waitForFunction(
    (s) => document.querySelector('#pilot')?.dataset.state === s, {}, phase,
  );
  const quiet = () => page.$eval('body', (el) => !el.querySelector('#repair-signal'));
  const fit = async (press) => {
    await press('[data-part="bridge"]');
    await press('[data-socket="0"]');
  };
  async function inspect(label, reduced = false) {
    await page.waitForSelector('#repair-signal', { visible: true });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#repair-signal')).opacity === '1');
    const state = await page.$eval('#repair-signal', (el) => {
      const rect = el.getBoundingClientRect(), title = el.querySelector('strong');
      return {
        text: title.textContent, name: el.querySelector('.repair-name').textContent,
        machine: document.querySelector('#machine-title, #case-title').textContent,
        pilot: document.querySelector('#pilot, #case-film-label').textContent,
        width: rect.width, height: rect.height, textSize: parseFloat(getComputedStyle(title).fontSize),
        centered: Math.abs(rect.left + rect.width / 2 - innerWidth / 2) < 2 &&
          Math.abs(rect.top + rect.height / 2 - innerHeight / 2) < 2,
        visible: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        topLayer: el.matches(':popover-open'), focus: document.activeElement.id,
        animation: getComputedStyle(el).animationName,
        sparkAnimation: getComputedStyle(el.querySelector('.repair-terminal'), '::after').animationName,
        clickThrough: !el.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)),
      };
    });
    record(label, state.text === 'REPAIRED' && state.name === state.machine && state.topLayer &&
      state.visible && state.centered && state.width >= 300 && state.textSize >= 48 &&
      state.clickThrough && (reduced ? state.animation === 'none' && state.sparkAnimation === 'none'
        : state.animation === 'repair-light-on' && state.sparkAnimation === 'repair-sparks'), state);
    await page.screenshot({ path: path.join(outDir, label + '.png') });
    return state;
  }

  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(new URL('#last-bell', bench).href);
  await waitPhase('ready');
  await page.select('#playback-rate', '4');
  const key = async (selector) => {
    await page.focus(selector);
    await page.keyboard.press('Enter');
  };
  await key('#run');
  await waitPhase('miss');
  record('empty-run-stays-dark', await quiet());
  await fit(key);
  await key('#run');
  await waitPhase('won');
  const first = await inspect('desktop-first-repair');
  const receiptKey = 'chaos.one-part-missing.repair.last-bell';
  const receipt = () => page.evaluate((k) => localStorage.getItem(k), receiptKey);
  const saved = await receipt();
  record('earned-repair-keeps-keyboard-focus', first.focus === 'run' && !!saved, { focus: first.focus, saved });
  await page.waitForSelector('#repair-signal', { hidden: true, timeout: 5000 });
  record('signal-clears-and-pilot-stays-repaired', await page.$eval('#pilot', (p) => p.textContent === 'Repaired'));

  await key('#focus-open');
  await key('#run');
  await waitPhase('won');
  await inspect('expanded-repeat-repair');
  record('expanded-bench-still-open', await page.$eval('#focus-view', (el) => el.open));
  await key('#run');
  record('restart-clears-previous-signal', await quiet());
  await waitPhase('won');
  await page.waitForSelector('#repair-signal', { visible: true });
  const repeatReceipt = await receipt();
  await page.reload();
  await waitPhase('ready');
  record('reopening-solved-machine-stays-dark', await quiet() && await receipt() === repeatReceipt);

  await page.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await page.select('#playback-rate', '4');
  await fit((selector) => page.tap(selector));
  await page.tap('#run');
  await waitPhase('won');
  await inspect('phone-touch-repair');
  const phoneReceipt = await receipt();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.tap('#replay');
  await waitPhase('running');
  record('new-replay-clears-signal', await quiet());
  await waitPhase('won');
  await inspect('phone-replay-reduced-motion', true);
  record('replay-keeps-receipt', await receipt() === phoneReceipt);
  const tap = await page.$eval('#next', (el) => {
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const panel = document.querySelector('#repair-signal').getBoundingClientRect();
    return { x, y, underGlass: x > panel.left && x < panel.right && y > panel.top &&
      y < panel.bottom && el.contains(document.elementFromPoint(x, y)) };
  });
  await page.touchscreen.tap(tap.x, tap.y);
  await page.waitForFunction(() => document.querySelector('#machine-title').textContent !== 'The last bell');
  record('tap-through-advances-machine-and-clears-signal', tap.underGlass && await quiet(), tap);

  const job = cases[0];
  await page.goto(new URL('fault-desk/#' + job.id, bench).href);
  await page.select('#case-rate', '4');
  const service = async (station, result) => {
    await page.tap('[data-station="' + station + '"]');
    await page.tap('#case-service');
    await page.waitForFunction((s) => document.querySelector('#case-film-label').textContent === s, {}, result);
  };
  await service(job.indices.find((index) => index !== job.station), 'Failed service test');
  record('wrong-service-stays-dark', await quiet());
  await service(job.station, 'Repaired run');
  await inspect('phone-fault-desk-repair', true);
  await page.tap('#case-reset');
  record('service-reset-clears-signal', await quiet());
  record('runtime-errors', !errors.length, errors);
}

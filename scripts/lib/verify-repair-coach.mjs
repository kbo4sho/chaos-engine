import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { campaign } from '../../one-part-missing/campaign.js';
export async function verifyRepairCoach(home, { url, record, shot, outDir }) {
  const popup = new Promise((r) => home.once('popup', r));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await popup,
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const phase = (page, s) =>
    page.waitForFunction((x) => document.querySelector('#pilot').dataset.state === x, {}, s);
  const read = (page, id) => page.$eval('#' + id, (e) => e.textContent);
  const head = (page, m) =>
    page.waitForFunction((t) => document.querySelector('#machine-title').textContent === t, {}, m.title);
  const level = async (n) => {
    const m = campaign[n - 1];
    await p.click('#map-link');
    await p.select('#chapter', String(Math.floor((n - 1) / 10)));
    await p.click('#shelf a[href="#' + m.id + '"]');
    await head(p, m);
  };
  const set = async (page, k, i) => {
    await page.click('[data-part="' + k + '"]');
    await page.click('[data-socket="' + i + '"]');
  };
  const miss = async (page) => {
    await page.select('#playback-rate', '4');
    await page.click('#run');
    await phase(page, 'miss');
    await page.click('#inspect-miss');
    await page.waitForSelector('#repair-coach[open]');
  };
  const compare = async (page) => {
    await page.click('#coach-compare');
    await page.waitForSelector('#coach-reveal', { visible: true });
  };
  await head(p, campaign[0]);
  await miss(p);
  record(
    'measured-no-spoiler',
    (await read(p, 'coach-observation')).includes('90 units outside the receiver') &&
      (await read(p, 'coach-steps')) === '' &&
      (await p.$eval('#coach-legend', (e) => e.hidden)) &&
      (await p.$eval('#repair-coach', (e) => e.scrollWidth <= e.clientWidth + 1)),
  );
  await shot(p, 'untouched-hint-phone.png');
  await compare(p);
  const rule = await read(p, 'coach-rule');
  record(
    'motion-before-hardware',
    rule.startsWith('Span a gap.') &&
      (await read(p, 'coach-steps')) === '' &&
      !(await p.$eval('#coach-legend', (e) => e.hidden)),
    rule,
  );
  await p.click('#coach-change');
  record('first-measured-separation', (await p.$eval('#coach-time', (e) => e.value)) === '3.60 s');
  await p.click('#coach-compare');
  record('can-return-to-unassisted-film', await p.$eval('#coach-legend', (e) => e.hidden));
  await p.click('#coach-return');
  record('exact-miss-frame', (await p.$eval('#coach-time', (e) => e.value)) === '3.82 s');
  await p.click('#coach-compare');
  await p.click('#coach-reveal');
  record(
    'one-fitted-spare-revealed',
    (await read(p, 'coach-steps')).includes('Fit Bridge at socket A.'),
  );
  const key = 'chaos.one-part-missing.repair.last-bell';
  record('inspection-awards-no-win', !(await p.evaluate((k) => localStorage.getItem(k), key)));
  await p.click('#coach-steps button');
  await p.waitForFunction(
    () => !document.querySelector('#repair-coach').open && document.activeElement.dataset.socket === '0',
  );
  await p.keyboard.press('Enter');
  await p.click('#run');
  await phase(p, 'won');
  record('player-earns-the-repair', !!(await p.evaluate((k) => localStorage.getItem(k), key)));
  await level(241);
  await set(p, 'conveyor', 0);
  await miss(p);
  await compare(p);
  await p.click('#coach-reveal');
  record(
    'good-fitting-is-preserved',
    (await read(p, 'coach-steps')).includes('Fit Trampoline at socket B.') &&
      (await p.$eval('#coach-reveal', (e) => e.hidden)),
  );
  await p.click('#coach-steps button');
  await p.keyboard.press('Enter');
  await p.click('#run');
  await phase(p, 'won');
  await level(321);
  await set(p, 'chute', 0);
  await miss(p);
  record(
    'held-too-briefly',
    (await read(p, 'coach-observation')).includes('10 of the 12 consecutive frames'),
  );
  await p.keyboard.press('Escape');
  await p.setViewport({ width: 1280, height: 800 });
  await level(286);
  await set(p, 'torsion', 1);
  await miss(p);
  record('observed-timing-miss', (await read(p, 'coach-observation')).includes('while it was closed'));
  await compare(p);
  await shot(p, 'closed-receiver-desktop.png');
  await p.click('#coach-close');
  await level(56);
  await miss(p);
  record('no-invented-weight-path', (await read(p, 'coach-observation')).includes('no drop weight'));
  await p.click('#coach-close');
  await p.click('#map-link');
  await p.click('#order-map summary');
  await p.click('#order-list a');
  await miss(p);
  await compare(p);
  await p.click('#coach-reveal');
  record('open-order-single-fitting', await p.$eval('#coach-reveal', (e) => e.hidden));
  await p.click('#coach-close');
  await level(1);
  const dl = await p.createCDPSession();
  await dl.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await p.click('#download');
  await p.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Playable copy ready'),
  );
  const file = path.join(outDir, 'one-part-missing-last-bell.html');
  for (let i = 0; i < 60 && !fs.existsSync(file); i++) await delay(100);
  const offline = await p.browser().newPage(),
    external = [];
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  offline.on('pageerror', (e) => errors.push(e.message));
  await offline.setOfflineMode(true);
  await offline.goto(pathToFileURL(file).href);
  await miss(offline);
  await compare(offline);
  await offline.click('#coach-reveal');
  record(
    'offline-physical-coach',
    !external.length && (await read(offline, 'coach-steps')).includes('Fit Bridge at socket A.'),
    { external },
  );
  await offline.close();
  await dl.detach();
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

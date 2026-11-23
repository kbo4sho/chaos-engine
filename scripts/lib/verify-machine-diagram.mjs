import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { campaign } from '../../one-part-missing/campaign.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyMachineDiagram(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opening = new Promise((done) => home.once('popup', done));
  await home.click('#puzzle-launcher');
  const p = await opening;
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.waitForSelector('#parts [data-part]');
  const base = new URL('./', p.url()).href,
    errors = [],
    audit = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const head = (q, m) =>
    q.waitForFunction((t) => document.querySelector('#machine-title')?.textContent === t, {}, m.title);
  const go = async (q, m) => {
    await q.goto(base + '#' + m.id);
    await head(q, m);
  };
  const open = async (q, trigger = '#reader-open') => {
    await q.click(trigger);
    await q.waitForSelector('#machine-reader[open]');
  };
  const read = (q, k) => q.$eval('#' + k, (e) => e.textContent);
  const value = (q, k) => q.$eval('#' + k, (e) => e.value);
  await p.focus('#reader-open');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#machine-reader[open]');
  record(
    'keyboard-opens-grouped-diagram',
    await p.evaluate(
      () =>
        document.activeElement.id === 'reader-item' &&
        document.querySelectorAll('#reader-item optgroup').length === 4,
    ),
  );
  await p.focus('#reader-item');
  await p.keyboard.press('Home');
  for (let i = 0; i < 10 && (await value(p, 'reader-item')) !== 'socket-0'; i++)
    await p.keyboard.press('ArrowDown');
  record(
    'keyboard-traverses-to-actual-socket',
    (await value(p, 'reader-item')) === 'socket-0',
    await read(p, 'reader-position'),
  );
  await p.focus('#reader-choose');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.activeElement.matches('#parts button'));
  record(
    'socket-handoff-focuses-actual-parts',
    await p.evaluate(
      () =>
        document.activeElement.matches('#parts button') &&
        document.querySelector('#status').textContent.includes('Socket A selected'),
    ),
  );
  await p.focus('[data-part=bridge]');
  await p.keyboard.press('Enter');
  await p.focus('#run');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#pilot[data-state=won]');
  record(
    'keyboard-repair-writes-real-winning-fit',
    await p.evaluate(
      (id) => JSON.parse(localStorage.getItem('chaos.one-part-missing.repair.' + id)).part === 'bridge',
      campaign[0].id,
    ),
  );
  await open(p);
  await p.select('#reader-item', 'socket-0');
  record('installed-rail-read-back', (await read(p, 'reader-notes')).includes('Fitted with Bridge'));
  await p.click('#reader-nearest');
  record(
    'nearby-jump-opens-physical-target',
    (await value(p, 'reader-item')) === 'receiver-0' &&
      (await read(p, 'reader-notes')).includes('Gold marble'),
  );
  await p.click('#reader-close');
  await p.click('#reset');
  await p.select('#playback-rate', '0.5');
  await p.click('#run');
  await open(p);
  const frozen = await read(p, 'counter');
  await delay(210);
  record(
    'reading-pauses-running-bench',
    frozen === (await read(p, 'counter')) && (await p.$eval('#reader-choose', (e) => e.hidden)),
    frozen,
  );
  await p.click('#reader-close');
  await p.waitForFunction((t) => document.querySelector('#counter').textContent !== t, {}, frozen);
  await p.click('#run');
  const paused = await read(p, 'counter');
  await open(p);
  await p.click('#reader-close');
  await delay(160);
  record(
    'already-paused-bench-remains-paused',
    paused === (await read(p, 'counter')) && (await read(p, 'run-label')).includes('Resume'),
  );
  const final = campaign.at(-1);
  await go(p, final);
  await p.tap('#focus-open');
  await open(p, '#focus-reader');
  await p.select('#reader-item', 'receiver-1');
  await p.tap('#reader-next-window');
  const first = await value(p, 'reader-clock-time');
  await p.tap('#reader-last-open');
  const last = await value(p, 'reader-clock-time');
  await p.focus('#reader-frame');
  await p.keyboard.press('ArrowRight');
  const closed = await value(p, 'reader-clock-time');
  await p.tap('#reader-next-window');
  const second = await value(p, 'reader-clock-time');
  record(
    'published-receiver-clock-matches-true-boundaries',
    first === 'Frame 89 · 1.48 s · open' &&
      last.startsWith('Frame 106 ') &&
      closed.includes('Frame 107') &&
      closed.endsWith('closed') &&
      second.startsWith('Frame 372'),
    { first, last, closed, second },
  );
  const client = await p.createCDPSession();
  await client.send('Accessibility.enable');
  const tree = await client.send('Accessibility.getFullAXTree');
  const roles = tree.nodes
    .filter((n) => !n.ignored)
    .map((n) => ({ role: n.role?.value, name: n.name?.value }))
    .filter((n) => n.name);
  record(
    'dialog-slider-and-combobox-named',
    roles.some((n) => n.role === 'dialog' && n.name === 'Read machine diagram') &&
      roles.some((n) => n.role === 'slider' && n.name === 'Preview a frame') &&
      roles.some((n) => n.role === 'combobox' && n.name === 'Parts at release'),
    roles.filter((n) => ['dialog', 'slider', 'combobox'].includes(n.role)),
  );
  fs.writeFileSync(path.join(outDir, 'reader-accessibility.json'), JSON.stringify(roles, null, 2));
  await client.detach();
  await shot(p, 'phone-receiver-clock.png');
  await p.keyboard.press('Escape');
  await p.waitForSelector('#machine-reader', { hidden: true });
  record(
    'nested-reader-restores-expanded-workbench',
    await p.evaluate(
      () => document.querySelector('#focus-view').open && document.activeElement.id === 'focus-reader',
    ),
  );
  await p.click('#focus-close');
  const bin = campaign.find((m) => m.goals.some((s) => s.bin && s.hold > 1 && s.pace !== undefined)),
    bi = bin.goals.findIndex((s) => s.hold > 1 && s.pace !== undefined);
  await go(p, bin);
  await open(p);
  await p.select('#reader-item', 'receiver-' + bi);
  record(
    'independent-bin-dwell-and-pace-visible',
    (await read(p, 'reader-notes')).includes(bin.goals[bi].hold + ' consecutive frames') &&
      (await read(p, 'reader-notes')).includes('either order'),
    await read(p, 'reader-notes'),
  );
  await p.click('#reader-close');
  await go(p, campaign[0]);
  await open(p);
  const point = await p.$eval(
    '#reader-diagram',
    (e, s) => {
      const r = e.getBoundingClientRect();
      return { x: r.x + (r.width * s.x) / 720, y: r.y + (r.height * s.y) / 400 };
    },
    campaign[0].sockets[0],
  );
  await p.touchscreen.tap(point.x, point.y);
  record('touch-locates-socket-in-diagram', (await value(p, 'reader-item')) === 'socket-0', point);
  await p.click('#reader-close');
  const file = await saveBrowserFile(
    p,
    '#download',
    outDir,
    'one-part-missing-' + campaign[0].id + '.html',
  );
  const ctx = await p.browser().createBrowserContext(),
    off = await ctx.newPage(),
    requests = [];
  off.on('pageerror', (e) => errors.push(e.message));
  off.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await off.setOfflineMode(true);
  await off.goto(file.url);
  await off.waitForSelector('#parts [data-part]');
  await off.click('#focus-open');
  await open(off, '#focus-reader');
  await off.select('#reader-item', 'socket-0');
  await off.click('#reader-choose');
  await off.click('[data-part=bridge]');
  await off.click('#run');
  await off.waitForSelector('#pilot[data-state=won]');
  record('offline-diagram-physical-fit-without-network', !requests.length, { requests });
  await ctx.close();
  await p.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
  for (const [i, m] of campaign.entries()) {
    await go(p, m);
    await open(p);
    const count = await p.$$eval('#reader-item option', (os) => os.length);
    if (count !== m.fixtures.length + 1 + m.sockets.length + m.goals.length)
      throw Error('Missing release object ' + m.id);
    await p.select('#reader-item', 'receiver-' + (m.goals.length - 1));
    const notes = await read(p, 'reader-notes');
    if (!notes || (await p.$eval('#reader-clock', (e) => !e.hidden)) !== Boolean(m.goals.at(-1).window))
      throw Error('Receiver mismatch ' + m.id);
    audit.push({ level: i + 1, id: m.id, objects: count, lastReceiver: notes });
    if (i === 513) await shot(p, 'desktop-domino-receiver.png');
    await p.click('#reader-close');
    if ((i + 1) % 10 === 0)
      record('chapter-' + (i + 1) / 10 + '-all-ten-release-diagrams', true, {
        last: m.id,
        objects: count,
      });
  }
  record('all-numbered-release-diagrams', audit.length === 520, audit.length);
  record('no-runtime-errors', !errors.length, errors);
  fs.writeFileSync(path.join(outDir, 'release-diagrams.json'), JSON.stringify(audit, null, 2));
  await p.close();
}

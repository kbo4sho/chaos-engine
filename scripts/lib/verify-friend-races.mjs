import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { orders, orderPrefix } from '../../one-part-missing/work-orders.js';
import { trial } from '../../one-part-missing/machines.js';
import { benchmarks } from './work-order-benchmarks.mjs';

export async function verifyFriendRaces(home, { url, record, shot, outDir }) {
  const errors = [],
    reports = [];
  const monitor = (p) => p.on('pageerror', (e) => errors.push(e.message));
  const open = new Promise((done) => home.once('popup', done));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const sender = await open;
  monitor(sender);
  await sender.setViewport({ width: 1280, height: 800 });
  const guestContext = await sender.browser().createBrowserContext();
  const returnedContext = await sender.browser().createBrowserContext();
  const guest = await guestContext.newPage(),
    viewer = await returnedContext.newPage();
  [guest, viewer].forEach(monitor);
  await guest.setViewport({ width: 390, height: 664, hasTouch: true, isMobile: true });
  const read = (p, id) => p.$eval('#' + id, (e) => e.textContent);
  const copy = async (p, manual = false) => {
    await p.bringToFront();
    await p.click('#race-copy');
    await p.waitForFunction(() => document.querySelector('#race-feedback').textContent !== '');
    const fallback = await p.$eval('#race-url', (e) => !e.hidden);
    if (manual) record('clipboard-denied-manual-link', fallback);
    return fallback
      ? p.$eval('#race-url', (e) => e.value)
      : p.evaluate(() => navigator.clipboard.readText());
  };
  const test = async (p, move, touch = false) => {
    await p.bringToFront();
    const use = (selector) => (touch ? p.tap(selector) : p.click(selector));
    if (!(await p.$eval('#reset', (e) => e.disabled))) await use('#reset');
    for (const f of [move, move.second].filter(Boolean)) {
      await use('[data-part="' + f.part + '"]');
      await use('[data-socket="' + f.socket + '"]');
    }
    await p.select('#playback-rate', '4');
    await use('#run');
    await p.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won');
  };
  const stored = (p, m) =>
    p.evaluate(
      (prefix) => Object.entries(localStorage).filter(([k]) => k.startsWith(prefix)),
      orderPrefix + m.id + '/',
    );
  await sender
    .browserContext()
    .overridePermissions(new URL(url).origin, ['clipboard-read', 'clipboard-write']);
  await guestContext.overridePermissions(new URL(url).origin, []);
  for (const [i, m] of orders.entries()) {
    await sender.bringToFront();
    await sender.click('#map-link');
    if (!(await sender.$eval('#order-map', (e) => e.open))) await sender.click('#order-map summary');
    await sender.select('#order-group', String(Math.floor(i / 6)));
    await sender.click('#order-list a[href="#' + m.id + '"]');
    await sender.waitForFunction(
      (title) => document.querySelector('#machine-title').textContent === title,
      {},
      m.title,
    );
    const [one, two] = benchmarks[i],
      flip = i === 1;
    const first = flip ? two : one,
      second = i === 2 ? one : flip ? one : two;
    await test(sender, first);
    const invite = await copy(sender);
    if (!i) {
      await sender.click('#race-pass');
      await sender.waitForSelector('#race-target:not([hidden])');
      record(
        'pass-device-keeps-records-blind',
        await sender.evaluate(
          () =>
            document.querySelector('#order-card').hidden &&
            document.querySelector('#after-win').hidden &&
            document.querySelector('#pair-count').textContent.startsWith('0 of') &&
            document.querySelector('#race-watch').hidden,
        ),
      );
      await sender.reload();
      await sender.waitForSelector('#race-target:not([hidden])');
      const recent = await sender.$$eval('#race-list a', (links) => links.map((a) => a.textContent));
      record(
        'own-invitation-survives-a-blind-return',
        recent.includes(m.title + ' · Your invitation'),
        recent,
      );
    }
    await guest.goto(invite);
    await guest.waitForSelector('#race-target:not([hidden])');
    const hidden = await guest.evaluate(() => ({
      count: document.querySelector('#pair-count').textContent,
      disabled: document.querySelector('#race-copy').disabled,
      blind: document.querySelector('#race-watch').hidden,
    }));
    record(
      'blind-invite-' + m.id,
      hidden.disabled &&
        hidden.blind &&
        hidden.count.startsWith('0 of') &&
        !(await stored(guest, m)).length,
      hidden,
    );
    if (!i) await shot(guest, 'phone-unfitted-invitation.png');
    await test(guest, second, true);
    const reply = await copy(guest, i === 0);
    await viewer.goto(reply);
    await viewer.waitForSelector('#race-watch:not([hidden])');
    const saved = await stored(viewer, m),
      score = await read(viewer, 'race-score');
    await viewer.waitForSelector('#attempt-film[open]');
    const times = [first, second].map((f) => trial(M, m, f).tick);
    const receipts = [];
    for (const [id, t] of [
      ['compare-reply-arrival', times[1]],
      ['compare-host-arrival', times[0]],
    ]) {
      await viewer.click('#' + id);
      receipts.push(await viewer.$eval('#compare-frame', (e) => Number(e.value)));
      if (receipts.at(-1) !== t) throw Error('Arrival mismatch ' + m.id);
    }
    record(
      'independent-reply-' + m.id,
      !saved.length &&
        score.includes(
          times[0] === times[1]
            ? 'Same delivery time'
            : times[0] < times[1]
              ? 'Challenger arrived'
              : 'Reply arrived',
        ),
      { score, receipts },
    );
    if (!i) {
      await viewer.click('#compare-change');
      await shot(viewer, 'returned-first-separation.png');
      await viewer.click('#compare-host-arrival');
      await shot(viewer, 'both-receipts.png');
      await viewer.keyboard.press('Escape');
      await viewer.reload();
      await viewer.waitForSelector('#race-watch:not([hidden])');
      await viewer.waitForSelector('#attempt-film[open]');
      record('reload-preserves-return', (await read(viewer, 'race-score')) === score);
      await viewer.keyboard.press('Escape');
      await viewer.click('#race-watch');
      await viewer.waitForSelector('#attempt-film[open]');
      await viewer.keyboard.press('Escape');
    } else await viewer.keyboard.press('Escape');
    reports.push({ order: m.id, invite, reply, score, receipts, saved });
  }
  await viewer.goto(reports[0].invite + '/zzz');
  await viewer.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('could not be replayed'),
  );
  record('invalid-reply-hides-challenge', await viewer.$eval('#race-panel', (e) => e.hidden));
  fs.writeFileSync(path.join(outDir, 'round-trips.json'), JSON.stringify(reports, null, 2));
  record('no-page-errors', !errors.length, errors);
  await guestContext.close();
  await returnedContext.close();
  await sender.close();
}

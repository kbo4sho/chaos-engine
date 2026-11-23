import { saveBrowserFile } from './save-browser-file.mjs';
import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { benchmarks } from './work-order-benchmarks.mjs';
import { cards, matchPrefix, compareScore, verifyEntry } from '../../one-part-missing/match-cards.js';
import { orderPrefix } from '../../one-part-missing/work-orders.js';
import { stamp } from '../../one-part-missing/fit-stamp.js';

export async function verifyMatchCards(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((resolve) => home.once('popup', resolve));
  await home.click('#puzzle-launcher');
  const sender = await opened,
    browser = sender.browser();
  const guestCtx = await browser.createBrowserContext(),
    viewerCtx = await browser.createBrowserContext();
  const guest = await guestCtx.newPage(),
    viewer = await viewerCtx.newPage(),
    errors = [],
    reports = [];
  const players = [sender, guest, viewer];
  players.forEach((p) => p.on('pageerror', (error) => errors.push(error.message)));
  await Promise.all(
    [sender.browserContext(), guestCtx].map((ctx) => ctx.overridePermissions(new URL(url).origin, [])),
  );
  await guest.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const fit = async (p, m, move) => {
    await p.bringToFront();
    if (!(await p.$eval('#reset', (e) => e.disabled))) await p.click('#reset');
    for (const f of [move, move.second].filter(Boolean)) {
      const use = (s) => (p === guest ? p.tap(s) : p.click(s));
      await use('[data-part="' + f.part + '"]');
      await use('[data-socket="' + f.socket + '"]');
    }
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await p.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won');
    return verifyEntry(M, m, stamp(m, move));
  };
  const text = (p, id) => p.$eval('#' + id, (e) => e.textContent);
  const copy = async (p, id) => {
    await p.click('#' + id);
    await p.waitForSelector('#match-url:not([hidden])');
    return p.$eval('#match-url', (e) => e.value);
  };
  const stored = (p) =>
    p.evaluate(
      (prefixes) => Object.keys(localStorage).filter((k) => prefixes.some((pre) => k.startsWith(pre))),
      [matchPrefix, orderPrefix],
    );
  try {
    for (const [ci, card] of cards.entries()) {
      await sender.bringToFront();
      await sender.click('#map-link');
      if (!(await sender.$eval('#match-map', (e) => e.open))) await sender.click('#match-map summary');
      await sender.select('#match-select', card.id);
      await sender.click('#match-enter');
      const host = [],
        response = [];
      for (const [i, m] of card.rounds.entries()) {
        await sender.waitForFunction(
          (name) => document.querySelector('#machine-title').textContent === name,
          {},
          m.title,
        );
        const choices = benchmarks[m.orderIndex],
          code = card.house.split('~')[i];
        const challengeFit = choices.find((f) => stamp(m, f) !== code),
          best = await fit(sender, m, challengeFit);
        host.push(best);
        if (!ci && !i) {
          await sender.reload();
          await sender.waitForSelector('#match-panel:not([hidden])');
          await sender.click('#match-sheet summary');
          record('reload-recovers-earned-round', !(await sender.$eval('#match-watch', (e) => e.hidden)));
          await fit(
            sender,
            m,
            choices.find((f) => stamp(m, f) === code),
          );
          record('inferior-run-keeps-best', (await text(sender, 'match-personal')).includes('1 part ·'));
          await sender.click('#match-watch');
          await sender.waitForSelector('#attempt-film[open]');
          record(
            'film-identifies-house',
            (await text(sender, 'compare-previous')).includes('House') &&
              (await text(sender, 'compare-latest')).includes('Your run'),
          );
          await sender.keyboard.press('Escape');
        }
        if (i < 2) await sender.click('#match-next');
      }
      const solo = await text(sender, 'match-result');
      record(
        'three-physical-house-wins-' + card.id,
        solo.includes('You win the card') && solo.includes('You 3 / House 0'),
        solo,
      );
      const invite = await copy(sender, 'match-send');
      await guest.goto(invite);
      await guest.waitForSelector('#match-target:not([hidden])');
      for (const [i, m] of card.rounds.entries()) {
        await guest.waitForFunction(
          (name) => document.querySelector('#machine-title').textContent === name,
          {},
          m.title,
        );
        record(
          'no-fittings-or-film-before-delivery-' + card.id + '-' + i,
          (await text(guest, 'pair-count')).startsWith('0 of') &&
            (await guest.$eval('#match-watch', (e) => e.hidden)) &&
            (await guest.$eval('#order-card', (e) => e.hidden)),
        );
        const picks = benchmarks[m.orderIndex],
          f =
            i === ci % 3
              ? picks.find((f) => stamp(m, f) === host[i].code)
              : picks.find((f) => stamp(m, f) !== host[i].code);
        response.push(await fit(guest, m, f));
        if (!ci && !i) await shot(guest, 'phone-after-round.png');
        if (i < 2) await guest.click('#match-next');
      }
      const reply = await copy(guest, 'match-return');
      await viewer.goto(reply);
      await viewer.waitForSelector('#match-sheet[open]');
      const expected = response.map((e, i) => Math.sign(compareScore(card, i, e, host[i]))),
        verdict = await text(viewer, 'match-result');
      record(
        'three-round-verified-result-' + card.id,
        verdict.includes(
          'Reply ' +
            expected.filter((x) => x < 0).length +
            ' / Challenger ' +
            expected.filter((x) => x > 0).length,
        ) && !(await stored(viewer)).length,
        verdict,
      );
      for (const [i, m] of card.rounds.entries()) {
        await viewer.click('#match-rounds a:nth-child(' + (i + 1) + ')');
        await viewer.waitForFunction(
          (name) => document.querySelector('#machine-title').textContent === name,
          {},
          m.title,
        );
        await viewer.click('#match-watch');
        await viewer.waitForSelector('#attempt-film[open]');
        await viewer.click('#compare-reply-arrival');
        const t = await viewer.$eval('#compare-frame', (e) => Number(e.value));
        record(
          'return-film-' + card.id + '-' + i,
          t === response[i].tick &&
            (await viewer.$eval('#compare-host-arrival', (e) => e.textContent.includes('Challenger'))),
        );
        if (!ci && i === 2) await shot(viewer, 'called-time-return.png');
        await viewer.keyboard.press('Escape');
      }
      reports.push({ card: card.id, invite, reply, solo, verdict, expected });
      if (!ci) {
        await viewer.click('#match-try');
        await viewer.waitForFunction(() => !document.body.classList.contains('returned-card'));
        record(
          'watching-does-not-start-a-personal-card',
          (await viewer.$eval('#match-watch', (e) => e.hidden)) && !(await stored(viewer)).length,
        );
      }
    }
    // Move a whole card between two disconnected profiles, including the reply made offline.
    const isolated = [],
      requests = [],
      files = [];
    const offlinePage = async (href) => {
      const ctx = await browser.createBrowserContext(),
        page = await ctx.newPage();
      isolated.push(ctx);
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      await page.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
      await page.setOfflineMode(true);
      await page.goto(href);
      await page.waitForSelector('#match-panel:not([hidden])');
      return page;
    };
    const pack = async (page, kind) => {
      if (!(await page.$eval('#match-sheet', (e) => e.open))) await page.click('#match-sheet summary');
      if (!(await page.$eval('#match-files', (e) => e.open))) await page.click('#match-files summary');
      await page.select('#match-file-kind', kind);
      await page.click('#match-pack');
      await page.waitForSelector('#match-file:not([hidden])');
      const file = await saveBrowserFile(page, '#match-file', outDir);
      files.push({ name: file.name, bytes: file.bytes });
      return file.url;
    };
    try {
      await sender.goto(reports[0].invite);
      await sender.waitForSelector('#match-panel:not([hidden])');
      const detached = await offlinePage(await pack(sender, 'blank'));
      for (const [i, m] of cards[0].rounds.entries()) {
        await detached.waitForFunction(
          (name) => document.querySelector('#machine-title').textContent === name,
          {},
          m.title,
        );
        await fit(detached, m, benchmarks[m.orderIndex][0]);
        if (!i) {
          const clock = await text(detached, 'counter');
          record(
            'work-order-clock-stops-at-receipt',
            clock === ((await text(detached, 'match-personal')).match(/[0-9]+\.[0-9]{2} s/) || [])[0],
            clock,
          );
          const next = await detached.$eval('#match-next', (a) => a.getBoundingClientRect().bottom);
          record('phone-next-round-inside-first-screen', next <= 664, next);
        }
        if (i < 2) await detached.click('#match-next');
      }
      const watch = await offlinePage(await pack(detached, 'reply'));
      record(
        'offline-card-does-not-credit-viewer',
        !(await stored(watch)).length && (await watch.$eval('#match-sheet', (e) => e.open)),
      );
      for (const [i, m] of cards[0].rounds.entries()) {
        await watch.click('#match-rounds a:nth-child(' + (i + 1) + ')');
        await watch.waitForFunction(
          (name) => document.querySelector('#machine-title').textContent === name,
          {},
          m.title,
        );
        await watch.click('#match-watch');
        await watch.waitForSelector('#attempt-film[open]');
        if (i === 2) {
          await watch.click('#compare-clip [data-clip-make]');
          await watch.waitForSelector('#compare-clip [data-clip-save]:not([hidden])');
          await shot(watch, 'offline-on-the-bell.png');
        }
        await watch.keyboard.press('Escape');
      }
      record(
        'two-disconnected-files-with-three-replays',
        !requests.length && files.length === 2 && files.every((f) => f.bytes > 100000),
        { requests, files },
      );
    } finally {
      await Promise.all(isolated.map((c) => c.close()));
    }
    await viewer.goto(reports[0].invite + '/z~z~z');
    await viewer.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('could not be replayed'),
    );
    record(
      'invalid-card-has-no-score',
      (await viewer.$eval('#match-panel', (e) => e.hidden)) && !(await stored(viewer)).length,
    );
    fs.writeFileSync(path.join(outDir, 'match-cards.json'), JSON.stringify(reports, null, 2));
    record('no-page-errors', !errors.length, errors);
  } finally {
    await guestCtx.close();
    await viewerCtx.close();
    await sender.close();
  }
}

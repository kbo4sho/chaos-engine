import fs from 'node:fs';
import path from 'node:path';
import M from 'matter-js';
import { saveBrowserFile } from './save-browser-file.mjs';
import { campaign } from '../../one-part-missing/campaign.js';
import { assemblyCourse } from '../../one-part-missing/assembly-course.js';
import { certify } from '../../one-part-missing/certify.js';
import { fittings } from '../../one-part-missing/machines.js';
import { orders, fitCode } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';
import { raceRoute } from '../../one-part-missing/friend-race.js';
import { draftPrefix } from '../../one-part-missing/bench-drafts.js';

export async function verifyUnfinished(home, { url, record, shot, outDir }) {
  const opening = new Promise((done) => home.once('popup', done));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await opening;
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const errors = [],
    watch = (p) => p.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  await p.waitForSelector('#map-link');
  const base = new URL('./', p.url()).href,
    m = assemblyCourse[0],
    fit = certify(M, m)[0],
    pieces = fittings(m, fit);
  const heading = (p, m) =>
    p.waitForFunction((t) => document.querySelector('#machine-title')?.textContent === t, {}, m.title);
  const place = async (p, f) => {
    await p.click('[data-part="' + f.part + '"]');
    await p.click('[data-socket="' + f.socket + '"]');
  };
  const get = (p, m) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), draftPrefix + m.id);
  const count = (p) => p.$eval('#pair-count', (e) => e.textContent);
  const tab = async (link) => {
    const q = await home.browserContext().newPage();
    watch(q);
    await q.goto(link);
    return q;
  };
  await p.tap('#map-link');
  await p.tap('#course-index summary');
  await p.tap('#assembly-entry');
  await heading(p, m);
  await place(p, pieces[0]);
  await place(p, pieces[1]);
  const before = await get(p, m);
  record(
    'partial-is-a-draft',
    before.move.second.part === pieces[1].part &&
      !(await p.evaluate((id) => localStorage.getItem('chaos.one-part-missing.repair.' + id), m.id)),
    before,
  );
  await p.reload();
  await heading(p, m);
  record(
    'reload-restores-two-fittings',
    (await count(p)) === '2 of 3 parts fitted' && (await p.$eval('#undo-fitting', (e) => !e.hidden)),
    await count(p),
  );
  await p.tap('#undo-fitting');
  record('undo-crosses-reload', (await count(p)) === '1 of 3 parts fitted');
  await place(p, pieces[1]);
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await p.waitForSelector('#pilot[data-state=miss]');
  await p.tap('#map-link');
  await p.tap('#unfinished-repairs summary');
  await p.waitForSelector('#draft-list a');
  const link = await p.$eval('#draft-list a', (a) => a.href);
  record(
    'library-names-machine-and-count',
    (await p.$eval('#draft-list a', (a) => a.textContent.includes('2 of 3 fitted'))) &&
      link.endsWith('/' + m.id),
    link,
  );
  await shot(p, 'phone-unfinished-list.png');
  const bare = await tab(base + '#' + m.id);
  await heading(bare, m);
  record(
    'plain-shared-puzzle-opens-empty',
    (await count(bare)) === '0 of 3 parts fitted' &&
      (await bare.$eval('#resume-draft', (e) => !e.hidden)),
  );
  await bare.click('#resume-draft');
  record('resume-offer-restores-physical-fittings', (await count(bare)) === '2 of 3 parts fitted');
  await place(bare, pieces[2]);
  await bare.click('#reset');
  // An older tab never clears a more recent edit from a different tab.
  await place(bare, pieces[0]);
  await p.bringToFront();
  await p.tap('#reset');
  const newer = await get(bare, m);
  record(
    'older-reset-keeps-other-tab-work',
    newer?.move.part === pieces[0].part && !newer.move.second,
    newer,
  );
  await p.tap('#resume-draft');
  await place(p, pieces[1]);
  await p.close();
  await bare.close();
  const resumed = await tab(base);
  await heading(resumed, m);
  record(
    'home-after-close-resumes-last-unfinished-machine',
    (await count(resumed)) === '2 of 3 parts fitted',
    resumed.url(),
  );
  await place(resumed, pieces[2]);
  await resumed.select('#playback-rate', '4');
  await resumed.click('#run');
  await resumed.waitForSelector('#pilot[data-state=won]');
  record(
    'delivery-retires-draft',
    !(await get(resumed, m)) && (await resumed.$eval('#unfinished-repairs', (e) => e.hidden)),
  );
  const reversible = campaign.find((m) => m.reversible && m.tray.includes('bridge'));
  await resumed.goto(base + '#' + reversible.id);
  await heading(resumed, reversible);
  await resumed.click('[data-part="bridge"]');
  await resumed.click('#flip');
  await resumed.click('[data-socket="0"]');
  await resumed.reload();
  await heading(resumed, reversible);
  record(
    'reversed-rail-survives-reload',
    (await resumed.$eval('#open-sandbox', (a) =>
      new URLSearchParams(new URL(a.href).hash.slice(1)).get('flip'),
    )) === '1',
  );
  const order = orders[0],
    first = benchmarks[0][0],
    r = await tab(base + '#' + order.id);
  await heading(r, order);
  await place(r, first);
  const ov = await get(r, order);
  const blind = await tab(base + '#' + raceRoute(order, first));
  await heading(blind, order);
  record(
    'blind-invite-hides-every-draft',
    (await count(blind)) === '0 of 2 parts fitted' &&
      (await blind.$eval('#resume-draft', (e) => e.hidden)) &&
      (await blind.$eval('#unfinished-repairs', (e) => e.hidden)),
  );
  await place(blind, benchmarks[0][1]);
  record('blind-edits-leave-personal-fit', JSON.stringify(await get(r, order)) === JSON.stringify(ov));
  const incoming = await tab(base + '#' + order.id + '/build/' + fitCode(order, benchmarks[0][1]));
  await heading(incoming, order);
  await incoming.click('#reset');
  record(
    'shared-build-reset-leaves-local-fit',
    JSON.stringify(await get(r, order)) === JSON.stringify(ov) &&
      (await incoming.$eval('#resume-draft', (e) => e.hidden)),
  );
  const map = await tab(link);
  await heading(map, m);
  record(
    'retired-resume-link-opens-ready',
    (await count(map)) === '0 of 3 parts fitted' && (await map.$eval('#replay', (e) => !e.hidden)),
  );
  await map.goto(base + '#learn/last-bell');
  await heading(map, campaign[0]);
  await place(map, certify(M, campaign[0])[0]);
  await map.tap('#map-link');
  await map.click('#unfinished-repairs summary');
  await map
    .waitForSelector('#draft-list a[href*="learn/last-bell"]', { visible: true, timeout: 5000 })
    .catch(async (error) => {
      throw new Error(
        error.message +
          ' ' +
          JSON.stringify(
            await map.evaluate(() => ({
              active: location.hash,
              panel: document.querySelector('#unfinished-repairs').open,
              list: document.querySelector('#draft-list').innerText,
              records: Object.entries(localStorage).filter(([k]) => k.includes('.draft.')),
            })),
          ),
      );
    });
  const guided = await map.$eval('#draft-list a[href*="learn/last-bell"]', (a) => a.href);
  await map.click('#draft-list a[href*="learn/last-bell"]');
  await map.waitForFunction(() => document.querySelector('#status').textContent.includes('restored'));
  record(
    'guided-draft-retains-lesson',
    guided.endsWith('#resume/learn/last-bell') &&
      (await map.$eval('#machine-no', (e) => e.textContent)).startsWith('Lesson 01'),
  );
  await shot(map, 'resume-guided-fit.png');
  await map.select('#press-style', 'classic');
  await map.click('#generate');
  await map.waitForFunction(
    () =>
      document.querySelector('#machine-no').textContent.includes('Machine press') &&
      location.hash.startsWith('#press-'),
    { timeout: 30000 },
  );
  const printId = new URL(map.url()).hash.slice(1);
  const part = await map.$eval('#parts [data-part]', (e) => e.dataset.part);
  await place(map, { part, socket: 0 });
  await map.reload();
  await map.waitForFunction(() => document.querySelector('#status').textContent.includes('restored'));
  record(
    'printed-fitting-rebuilt-after-reload',
    (await get(map, { id: printId })).move.part === part &&
      (await map.$eval('#open-sandbox', (a) =>
        new URLSearchParams(new URL(a.href).hash.slice(1)).get('part'),
      )) === part,
    printId,
  );
  const file = await saveBrowserFile(map, '#download', outDir, 'one-part-missing-' + printId + '.html');
  const ctx = await home.browser().createBrowserContext(),
    offline = await ctx.newPage();
  watch(offline);
  await offline.setOfflineMode(true);
  await offline.goto(file.url);
  await offline.waitForSelector('#parts [data-part]');
  record(
    'portable-puzzle-starts-clean',
    (await offline.$eval('#resume-draft', (e) => e.hidden)) &&
      (await offline.$eval(
        '#open-sandbox',
        (a) => !new URLSearchParams(new URL(a.href).hash.slice(1)).has('part'),
      )) &&
      (await offline.$eval('#unfinished-repairs', (e) => e.hidden)),
  );
  await place(offline, { part, socket: 0 });
  record('portable-edits-stay-in-file', !(await get(offline, { id: printId })));
  await ctx.close();
  record('no-page-errors', !errors.length, errors);
  fs.writeFileSync(
    path.join(outDir, 'unfinished-state.json'),
    JSON.stringify({ before, newer, order: ov, guided, link }, null, 2),
  );
  await Promise.all([r.close(), blind.close(), incoming.close(), map.close(), resumed.close()]);
}

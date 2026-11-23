import M from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { orders } from '../../one-part-missing/work-orders.js';
import { certify } from '../../one-part-missing/certify.js';
import { benchmarks } from './work-order-benchmarks.mjs';

export async function verifyLibrary(home, { url, record, shot }) {
  await home.goto(url);
  const errors = [];
  const enter = async () => {
    const next = new Promise((done) => home.once('popup', done));
    await home.click('#puzzle-launcher');
    const p = await next;
    p.on('pageerror', (e) => errors.push(e.message));
    await p.setViewport({ width: 390, height: 664, hasTouch: true, isMobile: true });
    await p.bringToFront();
    await p.waitForSelector('.socket');
    return p;
  };
  const heading = (p, t) =>
    p.waitForFunction((s) => document.querySelector('#machine-title').textContent === s, {}, t);
  const repair = async (p, fit) => {
    await p.select('#playback-rate', '4');
    for (const f of [fit, fit.second].filter(Boolean)) {
      await p.click('[data-part="' + f.part + '"]');
      await p.click('[data-socket="' + f.socket + '"]');
    }
    await p.click('#run');
    await p.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
      timeout: 18000,
    });
  };
  let p = await enter();
  await heading(p, campaign[0].title);
  record(
    'fresh-guided-start',
    new URL(p.url()).hash === '#learn/last-bell' &&
      (await p.$eval('#machine-no', (e) => e.textContent)).startsWith('Lesson 01'),
    p.url(),
  );
  await repair(p, certify(M, campaign[0])[0]);
  await p.close();
  p = await enter();
  await heading(p, campaign[100].title);
  record(
    'launcher-continues-with-conveyor',
    new URL(p.url()).hash === '#learn/' + campaign[100].id,
    p.url(),
  );
  await p.tap('#map-link');
  await p.tap('#finder summary');
  const search = async (q) => {
    await p.click('#find-query', { clickCount: 3 });
    await p.keyboard.press('Backspace');
    if (q) await p.type('#find-query', q);
  };
  await search('gearbox rack');
  const matches = await p.$$eval('#find-list a', (a) => a.map((v) => v.textContent));
  record(
    'both-tools-in-each-result',
    matches.length > 0 && matches.every((t) => t.includes('Gearbox') && t.includes('Rack and pinion')),
    matches,
  );
  await shot(p, 'phone-working-tool-results.png');
  await search('unbuilt sample');
  record('empty-search', await p.$eval('#find-count', (e) => e.textContent === 'No matching machines.'));
  await search('last bell');
  await p.click('#find-unfinished');
  record('completed-machine-filtered', await p.$$eval('#find-list a', (a) => a.length === 0));
  await p.click('#find-unfinished');
  await search('');
  const initial = await p.$$eval('#find-list a', (a) => a.length);
  await p.click('#find-more');
  const more = await p.$$eval('#find-list a', (a) => a.length);
  record('more-search-results', initial === 12 && more === 24, { initial, more });
  await search('303');
  await p.select('#find-scope', 'campaign');
  await p.click('#find-list a');
  await heading(p, campaign[302].title);
  await p.close();
  p = await enter();
  await heading(p, campaign[302].title);
  record('unfinished-numbered-job-resumes', new URL(p.url()).hash === '#' + campaign[302].id, p.url());
  await p.setViewport({ width: 1280, height: 800 });
  await p.click('#map-link');
  await p.click('#finder summary');
  await p.select('#find-scope', 'orders');
  await search('first bid');
  await p.click('#find-list a');
  await heading(p, orders[0].title);
  await repair(p, benchmarks[0][0]);
  await p.close();
  p = await enter();
  await heading(p, orders[1].title);
  record('completed-order-continues-its-book', new URL(p.url()).hash === '#' + orders[1].id, p.url());
  await p.click('#map-link');
  await p.click('#course-index summary');
  await p.click('#drive-entry');
  await heading(p, campaign[280].title);
  record('jump-to-course', new URL(p.url()).hash === '#' + campaign[280].id, p.url());
  await p.click('#map-link');
  await p.click('#finder summary');
  await p.select('#find-scope', 'lessons');
  await search('3');
  await p.click('#find-list a');
  await heading(p, campaign[101].title);
  record(
    'lesson-number-opens-guided-route',
    new URL(p.url()).hash === '#learn/' + campaign[101].id,
    p.url(),
  );
  await p.setViewport({ width: 1280, height: 800 });
  await p.click('#map-link');
  await search('pulley');
  await shot(p, 'desktop-guided-tool-search.png');
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

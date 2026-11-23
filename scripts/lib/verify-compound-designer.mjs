import { compoundById, compoundKits } from '../../one-part-missing/compound-design.js';
import { buildDesign, encodeDesign, freshDesign, draftKey } from '../../one-part-missing/blueprints.js';
import { fittings } from '../../one-part-missing/machines.js';
import { repairPrefix } from '../../one-part-missing/repairs.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyCompoundDesigner(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const opened = new Promise((resolve) => home.once('popup', resolve));
  await home.click('#puzzle-launcher');
  const p = await opened,
    errors = [];
  const watch = (q) => q.on('pageerror', (e) => errors.push(e.message));
  watch(p);
  await p.bringToFront();
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  const address = p.url().split('#')[0];
  const value = (q, id) => q.$eval('#' + id, (e) => e.value);
  const storedDraft = (q) => q.evaluate((key) => localStorage.getItem(key), draftKey);
  const panel = async (q) => {
    if (!(await q.$eval('#design-bench', (e) => e.open))) await q.click('#design-bench > summary');
    await q.waitForFunction(() => document.querySelector('#design-station').options.length > 0);
  };
  const selectStock = async (q, k) => {
    await panel(q);
    const group = String(k.stations.length);
    if ((await value(q, 'design-library')) !== group) await q.select('#design-library', group);
    await q.select('#design-kit', String(k.id));
  };
  const issue = async (q, d) => {
    const id = encodeDesign(d);
    await q.click('#design-prove');
    await q.waitForFunction(
      (code) => location.hash === '#' + code && !document.querySelector('#design-bench').open,
      {},
      id,
    );
    await q.waitForFunction(
      () => document.querySelector('#machine-no').textContent === 'Design bench · verified',
    );
  };
  const fit = async (q, f) => {
    await q.click('[data-part="' + f.part + '"]');
    if (f.flipped) await q.click('#flip');
    await q.click('[data-socket="' + f.socket + '"]');
  };
  const run = async (q, state) => {
    await q.select('#playback-rate', '4');
    await q.click('#run');
    await q.waitForSelector('#pilot[data-state="' + state + '"]');
  };
  const solve = async (q, m, moves) => {
    for (const f of moves) await fit(q, f);
    await run(q, 'won');
    const saved = await q.evaluate((key) => JSON.parse(localStorage.getItem(key)), repairPrefix + m.id);
    if (!saved?.tick) throw Error('Missing earned repair ' + m.id);
    return saved;
  };
  const last = compoundById.get(1520),
    stock = freshDesign(last.id);
  await p.goto(address + '#' + last.base.id);
  await p.waitForFunction(
    (t) => document.querySelector('#machine-title').textContent === t,
    {},
    last.base.title,
  );
  const untouched = buildDesign(stock);
  await solve(p, last.base, fittings(untouched.machine, untouched.intended));
  await p.click('#design-working');
  record(
    'earned-campaign-machine-opens-in-editor',
    (await value(p, 'design-kit')) === '1520' &&
      (await p.$eval('#design-kit', (e) => e === document.activeElement)),
  );
  await p.click('#design-hidden-stations input[value="1"]');
  await p.focus('#design-tune');
  await p.keyboard.press('ArrowRight');
  const custom = freshDesign(last.id);
  custom.hidden = [0, 2];
  custom.edits[0].tune = 1;
  const id = encodeDesign(custom),
    layout = buildDesign(custom),
    moves = fittings(layout.machine, layout.intended);
  await p.click('#design-undo');
  const undo = await value(p, 'design-setting');
  await p.click('#design-redo');
  await p.select('#design-view', 'missing');
  record(
    'calibrate-and-leave-installed',
    undo === '100%' &&
      (await value(p, 'design-setting')) === '115%' &&
      (await storedDraft(p)) === id &&
      (await p.$$eval('#design-hidden-stations input:checked', (es) => es.length)) === 2,
    { id, tools: moves },
  );
  await shot(p, 'phone-author-two-missing.png');
  await p.reload();
  await panel(p);
  record(
    'reload-custom-drawing',
    (await storedDraft(p)) === id && (await value(p, 'design-kit')) === '1520',
  );
  await issue(p, custom);
  await fit(p, moves[0]);
  await run(p, 'miss');
  await fit(p, moves[1]);
  await run(p, 'won');
  record(
    'partial-misses-complete-delivers',
    (await p.$eval('#pilot', (e) => e.dataset.state)) === 'won',
    { id },
  );
  const file = await saveBrowserFile(
    p,
    '#save-replay',
    outDir,
    'one-part-missing-' + id + '-replay.html',
  );
  const offline = await p.browser().newPage(),
    requests = [];
  watch(offline);
  offline.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await offline.setOfflineMode(true);
  await offline.goto(file.url);
  await offline.select('#playback-rate', '4');
  await offline.click('#replay');
  await offline.waitForSelector('#pilot[data-state=won]');
  record('standalone-compound-replay', requests.length === 0 && file.bytes > 200000, {
    bytes: file.bytes,
    requests,
  });
  await offline.close();
  const guest = await p.browser().createBrowserContext(),
    q = await guest.newPage();
  watch(q);
  await q.goto(address + '#' + id);
  await q.waitForSelector('#parts [data-part]', { visible: true });
  record(
    'invitation-starts-with-empty-sockets',
    (await q.$eval('#pair-count', e => e.textContent))==='0 of 2 parts fitted' &&
      (await q.$$eval('[data-socket].fitted', es=>!es.length)),
  );
  await solve(q, layout.machine, moves);
  await panel(q);
  await q.click('#design-import');
  record(
    'guest-edits-same-drawing',
    (await storedDraft(q)) === id && (await value(q, 'design-setting')) === '115%',
  );
  await guest.close();
  await p.bringToFront();
  const duplicate = compoundKits.find(
    (k) => k.stations.length === 2 && k.stations[0].options.includes(k.stations[1].kind),
  );
  await selectStock(p, duplicate);
  await p.select(
    '#design-part',
    String(duplicate.stations[0].options.indexOf(duplicate.stations[1].kind)),
  );
  await p.click('#design-prove');
  await p.waitForFunction(() =>
    document.querySelector('#design-status').textContent.includes('different spares'),
  );
  record('duplicate-removable-stations-explained', p.url().endsWith(id), { stock: duplicate.level });
  const seen = new Set();
  for (const [i, k] of compoundKits.entries()) {
    if (i === 4) {
      await p.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
      await p.waitForFunction(t => document.querySelector('#machine-title')?.textContent===t,{},compoundKits[i-1].name+' · custom build');
    }
    await selectStock(p, k);
    const d = freshDesign(k.id),
      l = buildDesign(d);
    if ((await storedDraft(p)) !== encodeDesign(d)) throw Error('Library did not select stock ' + k.id);
    await issue(p, d);
    const moves = fittings(l.machine, l.intended),
      result = await solve(p, l.machine, moves);
    for (const f of moves) seen.add(f.part);
    record('issued-and-repaired-' + k.level, true, {
      tools: moves.map((f) => f.part),
      deliveryFrame: result.tick,
    });
  }
  record('all-templates-and-tools', compoundKits.length === 120 && seen.size === 54, {
    machines: compoundKits.length,
    tools: seen.size,
  });
  await panel(p);
  await shot(p, 'desktop-compound-library.png');
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

import fs from 'node:fs';
import path from 'node:path';
import { buildDesign, draftKey, encodeDesign, freshDesign } from '../../one-part-missing/blueprints.js';
import { compoundById } from '../../one-part-missing/compound-design.js';
import { drawingFile } from '../../one-part-missing/drawing-exchange.js';
import { fittings } from '../../one-part-missing/machines.js';
import { repairPrefix } from '../../one-part-missing/repairs.js';
import { saveBrowserFile } from './save-browser-file.mjs';

export async function verifyDrawingExchange(home, { url, record, shot, outDir }) {
  const faults = [];
  const watch = (p) => p.on('pageerror', (e) => faults.push(e.message));
  await home.goto(url);
  const opened = new Promise((r) => home.once('popup', r));
  await home.click('#puzzle-launcher');
  const author = await opened;
  await author.bringToFront();
  watch(author);
  await author.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await author.waitForSelector('#parts [data-part]', { visible: true });
  const base = author.url().split('#')[0],
    origin = new URL(base).origin;
  const draft = (q) => q.evaluate((key) => localStorage.getItem(key), draftKey);
  const counts = (q) =>
    q.evaluate(
      (prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)).length,
      repairPrefix,
    );
  const expand = async (q, id) => {
    if (!(await q.$eval('#' + id, (e) => e.open))) await q.click('#' + id + ' > summary');
  };
  const show = async (q) => {
    await expand(q, 'design-bench');
    await expand(q, 'drawing-exchange');
    await q.waitForSelector('#drawing-download[href]', { visible: true });
  };
  const state = async (q) => ({ draft: await draft(q), repairs: await counts(q) });
  await author
    .browserContext()
    .overridePermissions(origin, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  await show(author);
  const stock = compoundById.get(1266),
    unfinished = freshDesign(stock.id);
  unfinished.edits[0].type = stock.stations[0].options.indexOf(stock.stations[1].kind);
  const id = encodeDesign(unfinished);
  await author.select('#design-library', '2');
  await author.select('#design-kit', String(stock.id));
  await author.select('#design-part', String(unfinished.edits[0].type));
  await author.click('#design-prove');
  await author.waitForFunction(() =>
    document.querySelector('#design-status').textContent.includes('different spares'),
  );
  const file = await saveBrowserFile(author, '#drawing-download', outDir);
  const fileText = fs.readFileSync(path.join(outDir, file.name), 'utf8');
  await author.click('#drawing-copy');
  await author.waitForFunction(() => document.querySelector('#drawing-feedback').textContent.length);
  const link = await author.$eval('#drawing-address', async (e) =>
    e.hidden ? await navigator.clipboard.readText() : e.value,
  );
  record(
    'send-physically-unfinished-drawing',
    new URL(link).hash === '#drawing/' + id && fileText === drawingFile(unfinished) && file.bytes < 200,
    { link, bytes: file.bytes },
  );
  const guest = await author.browser().createBrowserContext(),
    q = await guest.newPage();
  watch(q);
  await q.goto(base);
  await q.waitForSelector('#parts [data-part]');
  await expand(q, 'design-bench');
  await q.select('#design-station', '0');
  await q.focus('#design-x');
  await q.keyboard.press('ArrowRight');
  const previous = await state(q);
  await q.goto(link);
  await q.waitForSelector('#drawing-review[open]');
  const unchanged = await state(q);
  const list = await q.$$eval('#drawing-stations li', (es) => es.map((e) => e.textContent));
  const title = await q.$eval('#drawing-name', (e) => e.textContent);
  record(
    'review-leaves-local-work-and-scores-alone',
    previous.draft &&
      previous.draft !== id &&
      JSON.stringify(previous) === JSON.stringify(unchanged) &&
      list.length === 2 &&
      title === stock.name,
    { previous, list, title },
  );
  const intact = await q.$eval('#drawing-outcome', (e) => e.textContent);
  await q.select('#drawing-view', 'missing');
  const stripped = await q.$eval('#drawing-outcome', (e) => e.textContent);
  await q.focus('#drawing-frame');
  await q.keyboard.press('Home');
  await q.keyboard.press('ArrowRight');
  record(
    'inspect-both-films-and-one-frame',
    Boolean(intact && stripped) &&
      (await q.$eval('#drawing-time', (e) => e.value)).startsWith('Frame 1 of '),
    { intact, stripped },
  );
  await shot(q, 'desktop-review-unfinished-machine.png');
  await q.keyboard.press('Escape');
  await q.waitForSelector('#drawing-review', { hidden: true });
  record('dismiss-review', !q.url().includes('#drawing/') && (await draft(q)) === previous.draft);
  await q.goto(link);
  await q.click('#drawing-use');
  await q.waitForSelector('#design-bench[open]');
  const accepted = await draft(q);
  await q.click('#design-undo');
  const undone = await draft(q);
  await q.click('#design-redo');
  await q.click('#design-prove');
  await q.waitForFunction(() =>
    document.querySelector('#design-status').textContent.includes('different spares'),
  );
  record(
    'adopt-undo-redo-still-requires-proof',
    accepted === id && undone === previous.draft && (await draft(q)) === id && (await counts(q)) === 0,
  );
  await q.select('#design-part', '0');
  const completed = freshDesign(stock.id),
    solved = buildDesign(completed);
  await q.click('#design-prove');
  await q.waitForFunction((c) => location.hash === '#' + c, {}, encodeDesign(completed));
  for (const f of fittings(solved.machine, solved.intended)) {
    await q.click('[data-part="' + f.part + '"]');
    if (f.flipped) await q.click('#flip');
    await q.click('[data-socket="' + f.socket + '"]');
  }
  await q.select('#playback-rate', '4');
  await q.click('#run');
  await q.waitForSelector('#pilot[data-state=won]');
  const earned = await q.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    repairPrefix + solved.machine.id,
  );
  record(
    'recipient-fixes-issues-and-repairs-it',
    Boolean(earned?.tick) && (await draft(author)) === id,
    { issued: solved.machine.id, frame: earned?.tick },
  );
  await author.bringToFront();
  await author.select('#design-part', '0');
  const local = await state(author);
  await author.setOfflineMode(true);
  await (await author.$('#drawing-file')).uploadFile(path.join(outDir, file.name));
  await author.waitForSelector('#drawing-review[open]');
  await author.select('#drawing-view', 'missing');
  await shot(author, 'phone-offline-drawing.png');
  record(
    'offline-file-reviews-identically',
    (await author.$eval('#drawing-name', (e) => e.textContent)) === title &&
      (await author.$eval('#drawing-outcome', (e) => e.textContent)) === stripped &&
      (await draft(author)) === local.draft,
  );
  await author.click('#drawing-use');
  await author.waitForSelector('#design-bench[open]');
  record('offline-adoption', (await draft(author)) === id && (await counts(author)) === 0);
  const bad = path.join(outDir, 'sample-invalid-drawing.json');
  fs.writeFileSync(bad, '{"format":"one-part-missing-drawing","version":1,"drawing":"sample-invalid"}');
  await (await author.$('#drawing-file')).uploadFile(bad);
  await author.waitForSelector('#drawing-review[open]');
  record(
    'invalid-file-preserves-drawing',
    (await author.$eval('#drawing-use', (e) => e.hidden)) && (await draft(author)) === id,
  );
  await author.click('#drawing-keep');
  await author.setOfflineMode(false);
  await q.bringToFront();
  const old = await state(q);
  await q.goto(base + '#drawing/sample-invalid');
  await q.waitForSelector('#drawing-review[open]');
  record(
    'invalid-link-preserves-drawing',
    (await q.$eval('#drawing-use', (e) => e.hidden)) &&
      JSON.stringify(await state(q)) === JSON.stringify(old),
  );
  await q.click('#drawing-keep');
  await guest.close();
  await author.close();
  record('no-runtime-errors', !faults.length, faults);
}

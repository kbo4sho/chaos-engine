import M from 'matter-js';
import {
  buildDesign,
  designFilm,
  encodeDesign,
  freshDesign,
  proveDesign,
  readDesign,
  releaseTrials,
  draftKey,
} from '../../one-part-missing/blueprints.js';
import { fittings, parts } from '../../one-part-missing/machines.js';
import { repairPrefix } from '../../one-part-missing/repairs.js';

export async function verifyReleaseTrials(home, { url, record, shot }) {
  await home.goto(url);
  const opened = new Promise((resolve) => home.once('popup', resolve));
  await home.click('#puzzle-launcher');
  const p = await opened;
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.waitForSelector('#parts [data-part]');
  const base = p.url().split('#')[0];
  const t = (id) => p.$eval('#' + id, (e) => e.textContent),
    v = (id) => p.$eval('#' + id, (e) => e.value);
  const book = () =>
    p.evaluate(
      (prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)).length,
      repairPrefix,
    );
  const adopt = async (code) => {
    await p.goto(base + '#drawing/' + code);
    await p.waitForSelector('#drawing-review[open]');
    await p.click('#drawing-use');
    await p.waitForSelector('#design-bench[open]');
    await p.waitForFunction((key, c) => localStorage.getItem(key) === c, {}, draftKey, code);
  };
  const probe = async (code) => {
    await adopt(code);
    await p.click('#design-prove');
    await p.waitForSelector('#design-witness', { visible: true });
    const reason = await t('design-status');
    await p.click('#design-witness');
    await p.waitForSelector('#release-rows button', { visible: true });
    return reason;
  };
  const data = (view, n) => '#release-rows [data-view="' + view + '"][data-offset="' + n + '"]';
  const mix = 'design-2-e1-3-04420442-5o.40',
    d = readDesign(mix),
    grid = releaseTrials(M, d),
    reason = await probe(mix);
  record(
    'unreliable-six-of-seven',
    reason.includes('6 of 7') &&
      (await p.$eval(data('complete', 0), (e) => e.getAttribute('aria-pressed') === 'true')) &&
      (await t('release-observation')).startsWith('Missed'),
    { reason },
  );
  for (const row of grid)
    for (const view of ['complete', 'empty']) {
      const ref = row[view],
        btn = data(view, row.offset);
      await p.click(btn);
      const label = await p.$eval(btn, (e) => e.getAttribute('aria-label')),
        outcome = (ref.state === 'won' ? 'Delivered' : 'Missed') + ' at frame ' + ref.tick;
      const actual = await t('release-observation');
      if (
        !actual.startsWith(outcome) ||
        (await v('release-time')) !== 'Frame ' + ref.tick + ' of ' + ref.tick
      )
        throw Error(label + ': ' + actual);
      await p.focus('#release-frame');
      await p.keyboard.press('Home');
      const film = designFilm(M, d, view === 'complete', row.offset),
        xy = film.tape[0].poses[film.actorIndex];
      if (
        !(await t('release-position')).includes('at x ' + Math.round(xy[0]) + ', y ' + Math.round(xy[1]))
      )
        throw Error('Wrong position ' + label);
      record('release-' + row.offset + '-' + view, true, { label, actual });
    }
  await p.click(data('complete', 2));
  record('film-gets-focus', await p.$eval('#release-selected', (e) => e === document.activeElement));
  await p.click('#release-back');
  record(
    'back-to-selected-release',
    await p.$eval(data('complete', 2), (e) => e === document.activeElement),
  );
  const buttons = await p.$$eval('#release-jumps button', (es) => es.map((e) => e.textContent));
  for (const [i, button] of buttons.entries()) {
    await p.click('#release-jumps button:nth-child(' + (i + 1) + ')');
    if ((await v('release-frame')) !== button.split('frame ')[1]) throw Error('Jump drift ' + button);
  }
  record(
    'recorded-contact-jumps',
    buttons.some((b) => b.startsWith('Receiver ')) && buttons.length > 1 && (await book()) === 0,
    { buttons },
  );
  await shot(p, 'phone-seven-release-results.png');
  await p.click('#design-stock-target');
  await p.waitForFunction(
    () =>
      document.querySelectorAll('#release-rows [data-view=complete]').length === 7 &&
      [...document.querySelectorAll('#release-rows [data-view=complete]')].every((b) =>
        b.textContent.startsWith('Delivered'),
      ),
  );
  record(
    'edit-recomputes-open-table',
    (await p.$eval('#design-witness', (e) => e.hidden)) &&
      (await t('release-observation')).startsWith('Delivered'),
  );
  await p.click('#design-prove');
  const fixed = encodeDesign(freshDesign(d.kit));
  await p.waitForFunction((code) => location.hash === '#' + code, {}, fixed);
  record('corrected-drawing-issues-without-earning-a-repair', (await book()) === 0, { fixed });
  await p.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
  await p.waitForFunction(
    () => document.querySelector('#machine-no').textContent === 'Design bench · verified',
  );
  const shorter = 'design-2-dl-3-04420442-7n.3v',
    shortDraft = readDesign(shorter),
    proof = proveDesign(M, shortDraft).witness,
    s = await probe(shorter);
  const fs = fittings(buildDesign(shortDraft).machine, proof.move),
    selected = await t('release-selected');
  record(
    'exact-shorter-working-repair',
    s.includes('shorter repair') &&
      selected.startsWith('Shorter repair') &&
      fs.every((f) =>
        selected.includes(parts[f.part].name + ' at ' + String.fromCharCode(65 + f.socket)),
      ) &&
      (await t('release-observation')).startsWith('Delivered'),
    { s, selected, witness: proof },
  );
  await shot(p, 'desktop-shorter-working-delivery.png');
  const empty = 'design-1-0-2-044204420442-8r.5d',
    emptyProof = proveDesign(M, readDesign(empty)).witness;
  await probe(empty);
  record(
    'stripped-classic-delivers',
    (await p.$eval(
      data('empty', emptyProof.offset),
      (e) => e.getAttribute('aria-pressed') === 'true',
    )) && (await t('release-observation')).startsWith('Delivered'),
    { emptyProof },
  );
  await p.click('#design-trials > summary');
  await p.click('#design-trials > summary');
  await p.waitForSelector('#release-rows button', { visible: true });
  record(
    'reopening-retains-draft',
    (await p.evaluate((key, c) => localStorage.getItem(key) === c, draftKey, empty)) &&
      (await book()) === 0,
  );
  for (const [width,height] of [[320,568],[667,375]]) {
    await p.setViewport({width,height,isMobile:true,hasTouch:true});
    await probe(mix);
    const bounds=await p.evaluate(()=>{
      const area=document.querySelector('#design-prove').getBoundingClientRect();
      return {page:document.documentElement.scrollWidth,viewport:visualViewport.width,buttonEnd:area.right,focus:document.activeElement.id};
    });
    record('small-bench-'+width,bounds.page<=width+1 && bounds.buttonEnd<=width+1 && bounds.focus==='release-selected',bounds);
  }
  await p.close();
  record('no-runtime-errors', !errors.length, errors);
}

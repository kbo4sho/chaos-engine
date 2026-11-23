import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import Matter from 'matter-js';
import { campaign } from '../../one-part-missing/campaign.js';
import { machines } from '../../one-part-missing/machines.js';
import { resolveMachine, certify } from '../../one-part-missing/workshop.js';

// Solve through player controls. Node physics supplies only the candidate move
// for a freshly printed machine. Browser state is observed after each action.
export async function verifyPuzzles(home, { url, record, shot, outDir }) {
  const runtimeErrors = [];
  const watch = (p) => p.on('pageerror', (error) => runtimeErrors.push(error.message));
  watch(home);
  const popup = async (p, action) => {
    const opening = new Promise((resolve) => p.once('popup', resolve));
    await action();
    const target = await opening;
    watch(target);
    return target;
  };
  const states = [];
  for (const device of ['desktop', 'mobile']) {
    const mobile = device === 'mobile';
    const view = mobile
      ? { width: 390, height: 664, hasTouch: true, isMobile: true }
      : { width: 1280, height: 800 };
    await home.setViewport(view);
    await home.goto(url, { waitUntil: 'networkidle0' });
    const page = await popup(home, () =>
      mobile ? home.tap('#puzzle-launcher') : home.click('#puzzle-launcher'),
    );
    await page.setViewport(view);
    await page.bringToFront();
    await page.waitForSelector('.socket');
    const press = async (selector) => {
      await page.$eval(selector, (e) => e.scrollIntoView({ block: 'nearest', inline: 'center' }));
      if (mobile) await page.tap(selector);
      else await page.click(selector);
    };
    const openLevel = async (id) => {
      const chapter = Math.floor(campaign.findIndex((m) => m.id === id) / 10);
      await page.select('#chapter', String(chapter));
      await press('#shelf a[href="#' + id + '"]');
    };
    const wait = (phase) =>
      page.waitForFunction(
        (value) => document.querySelector('#pilot').dataset.state === value,
        { timeout: 16000 },
        phase,
      );
    const fit = async (part, socket) => {
      await press('[data-part="' + part + '"]');
      await press('[data-socket="' + socket + '"]');
    };
    const test = async (phase) => {
      await press('#run');
      try {
        await page.waitForFunction(
          () => ['miss', 'won'].includes(document.querySelector('#pilot').dataset.state),
          { timeout: 18000 },
        );
        const seen = await page.$eval('#pilot', (el) => el.dataset.state);
        if (seen !== phase) throw new Error('Expected ' + phase + ', observed ' + seen);
      } catch (error) {
        const detail = await page.evaluate(() =>
          Object.fromEntries(
            ['machine-title', 'pilot', 'status', 'counter', 'open-sandbox'].map((id) => [
              id,
              document.getElementById(id).href || document.getElementById(id).textContent,
            ]),
          ),
        );
        await shot(page, device + '-failed-run.png');
        throw new Error(error.message + ' ' + JSON.stringify(detail));
      }
    };
    const status = () => page.$eval('#status', (el) => el.textContent);
    record(
      device + '-real-entry',
      (await page.title()) === 'The last bell · One Part Missing',
      await page.title(),
    );
    await shot(page, device + '-01-ready.png');
    await test('miss');
    record(device + '-unrepaired-miss', (await status()).includes('missed'), await status());
    await shot(page, device + '-02-missed.png');
    await page.focus('#scrubber');
    await page.keyboard.press('Home');
    record(
      device + '-inspect-start',
      (await page.$eval('#film-time', (el) => el.value)) === '0.00 s',
      await page.$eval('#film-time', (el) => el.value),
    );
    await fit('chute', 0);
    await test('miss');
    record(device + '-wrong-part-misses', (await status()).includes('another part'), await status());
    if (!mobile) {
      const from = await page.$('[data-part="bridge"]'),
        to = await page.$('[data-socket="0"]');
      await from.scrollIntoView();
      const a = await from.boundingBox(),
        b = await to.boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
      await page.mouse.up();
    } else await fit('bridge', 0);
    record(device + '-fitted', (await status()).includes('Bridge fitted'), await status());
    await test('won');
    record(device + '-bell-contact', (await status()).includes('bell rang'), await status());
    await shot(page, device + '-03-repaired.png');
    await page.reload({ waitUntil: 'networkidle0' });
    await press('#replay');
    await wait('won');
    record(
      device + '-replay-after-reload',
      (await status()).includes('Replay complete'),
      await status(),
    );
    const workbench = await popup(page, () => press('#open-sandbox'));
    await workbench.setViewport(view);
    await workbench.waitForFunction(() =>
      document.querySelector('#btn-pause')?.textContent.includes('PLAY'),
    );
    const observe = () =>
      workbench.evaluate(() =>
        Composite.allBodies(world)
          .filter((body) => body.render.type === 'machine-part')
          .map((body) => body.render.machineShape.kind),
      );
    const imported = await observe();
    record(
      device + '-editable-machine',
      imported.includes('bridge') && imported.includes('rocker') && imported.includes('bell'),
      imported,
    );
    await workbench.click('[data-tool="block"]');
    await workbench.click('#game');
    const count = await workbench.evaluate(
      () => Composite.allBodies(world).filter((b) => b.render.type === 'block').length,
    );
    record(device + '-sandbox-extra-part', count > 0, count);
    await workbench.click('#btn-save');
    if (await workbench.$eval('#save-confirm', (el) => el.open)) await workbench.click('#save-accept');
    await workbench.waitForFunction(() =>
      document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'),
    );
    await workbench.goto(url, { waitUntil: 'networkidle0' });
    await workbench.click('#btn-load');
    await workbench.click('#save-accept');
    const loaded = await observe();
    record(
      device + '-sandbox-save-roundtrip',
      loaded.includes('bell') && loaded.includes('bridge') && loaded.length === imported.length,
      loaded,
    );
    await workbench.close();
    await page.bringToFront();
    await openLevel('domino-post');
    await page.waitForFunction(
      () => document.querySelector('#machine-title').textContent === 'Special delivery',
    );
    await fit('domino', 0);
    const dominoBench = await popup(page, () => press('#open-sandbox'));
    await dominoBench.setViewport(view);
    await dominoBench.waitForFunction(() =>
      document.querySelector('#btn-pause').textContent.includes('PLAY'),
    );
    if (mobile) await dominoBench.tap('#btn-pause');
    else await dominoBench.click('#btn-pause');
    await dominoBench.waitForFunction(
      () =>
        Composite.allBodies(world).some((b) => b.label === 'flag' && Number.isFinite(b.render.struckAt)),
      { timeout: 18000 },
    );
    const delivery = await dominoBench.evaluate(() => ({
      width: canvas.width,
      height: canvas.height,
      flag: Composite.allBodies(world).find((b) => b.label === 'flag').render.struckAt,
    }));
    record(
      device + '-sandbox-domino-delivery',
      delivery.width === 720 && delivery.height === 400 && delivery.flag > 0,
      delivery,
    );
    await dominoBench.close();
    await page.bringToFront();
    if (!mobile) {
      const repairs = [
        ['bumper', 1],
        ['bumper', 0],
        ['weight', 1],
        ['domino', 0],
        ['bridge', 1],
      ];
      for (const [i, [part, socket]] of repairs.entries()) {
        const m = machines[i + 1];
        await openLevel(m.id);
        await page.waitForFunction(
          (title) => document.querySelector('#machine-title').textContent === title,
          {},
          m.title,
        );
        await page.focus('[data-part="' + part + '"]');
        await page.keyboard.press('Enter');
        await page.focus('[data-socket="' + socket + '"]');
        await page.keyboard.press('Space');
        await page.waitForFunction(() =>
          document.querySelector('#status').textContent.includes('fitted'),
        );
        await test('won');
        record('desktop-' + m.id + '-contact', (await status()).includes(m.success), await status());
      }
      record(
        'desktop-six-repaired',
        (await page.$eval('#progress', (el) => el.textContent)) === '6 of 100 repaired',
        await page.$eval('#progress', (el) => el.textContent),
      );
      await shot(page, 'desktop-04-six-repaired.png');
    }
    await press('#generate');
    await page.waitForSelector('#proof:not([hidden])');
    const printed = page.url(),
      id = new URL(printed).hash.slice(1);
    const certified = certify(Matter, resolveMachine(Matter, id));
    await press('#proof summary');
    record(
      device + '-certificate',
      certified.length > 0 &&
        (await page.$eval('#proof-text', (e) => e.textContent.includes('three release points'))),
      certified,
    );
    await press('#share');
    await page.waitForFunction(
      () =>
        !document.querySelector('#copy-fallback').hidden ||
        document.querySelector('#status').textContent.includes('link copied'),
    );
    let shared;
    if (await page.$eval('#copy-fallback', (el) => !el.hidden))
      shared = await page.$eval('#share-url', (el) => el.value);
    else {
      await page
        .browserContext()
        .overridePermissions(new URL(printed).origin, ['clipboard-read', 'clipboard-write']);
      shared = await page.evaluate(() => navigator.clipboard.readText());
    }
    record(device + '-link-has-starting-setup', shared === printed, shared);
    await page.goto(shared, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#proof:not([hidden])');
    await fit(certified[0].part, certified[0].socket);
    await test('won');
    await shot(page, device + '-05-printed-machine.png');
    const saved = await page.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage)
          .filter((key) => key.startsWith('chaos.one-part-missing.repair.'))
          .map((key) => [
            key.slice('chaos.one-part-missing.repair.'.length),
            JSON.parse(localStorage.getItem(key)),
          ]),
      ),
    );
    record(device + '-shared-machine-repaired', saved[id]?.part === certified[0].part, saved[id]);
    await openLevel('last-bell');
    await page.waitForFunction(
      () => document.querySelector('#machine-title').textContent === 'The last bell',
    );
    await press('#maker summary');
    await page.focus('#target-x');
    await page.keyboard.press('End');
    await press('#prove');
    await page.waitForFunction(() =>
      document.querySelector('#maker-result').textContent.includes('No fitting'),
    );
    record(
      device + '-rejects-impossible-print',
      !page.url().includes('~'),
      await page.$eval('#maker-result', (el) => el.textContent),
    );
    await page.focus('#target-x');
    await page.keyboard.press('Home');
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await press('#prove');
    await page.waitForFunction(
      () => document.querySelector('#machine-title').textContent === 'The last bell · remix',
    );
    const remix = page.url();
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction(
      () => document.querySelector('#machine-title').textContent === 'The last bell · remix',
    );
    await fit('bridge', 0);
    await test('won');
    record(
      device + '-remix-roundtrip',
      remix.endsWith('#last-bell~-1.0') && (await status()).includes('bell rang'),
      remix,
    );
    if (!mobile) {
      // Use the actual browser download, then prove the file with HTTP disabled.
      await openLevel('last-bell');
      await page.waitForFunction(
        () => document.querySelector('#machine-title').textContent === 'The last bell',
      );
      const downloads = await page.createCDPSession();
      await downloads.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
      await press('#download');
      await page.waitForFunction(() =>
        document.querySelector('#status').textContent.includes('Playable copy ready'),
      );
      const file = path.join(outDir, 'one-part-missing-last-bell.html');
      for (let n = 0; n < 50 && !fs.existsSync(file); n++) await delay(100);
      const offline = await page.browser().newPage(),
        external = [];
      watch(offline);
      offline.on('request', (r) => {
        if (/^https?:/.test(r.url())) external.push(r.url());
      });
      await offline.setOfflineMode(true);
      await offline.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await offline.waitForSelector('[data-part="bridge"]');
      await offline.click('[data-part="bridge"]');
      await offline.click('[data-socket="0"]');
      await offline.click('#run');
      await offline.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
        timeout: 18000,
      });
      record('offline-download-played', external.length === 0, {
        bytes: fs.statSync(file).size,
        external,
        feedback: await offline.$eval('#status', (el) => el.textContent),
      });
      await offline.close();
      await openLevel('switchback');
      await page.waitForFunction(
        () => document.querySelector('#machine-title').textContent === 'Wrong-way freight',
      );
      await press('#save-replay');
      await page.waitForFunction(() =>
        document.querySelector('#status').textContent.includes('Replay file ready'),
      );
      const replayFile = path.join(outDir, 'one-part-missing-switchback-replay.html');
      for (let n = 0; n < 50 && !fs.existsSync(replayFile); n++) await delay(100);
      const replayPage = await page.browser().newPage();
      watch(replayPage);
      await replayPage.setOfflineMode(true);
      await replayPage.goto(pathToFileURL(replayFile).href);
      await replayPage.waitForSelector('#replay', { visible: true });
      await replayPage.click('#replay');
      await replayPage.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won', {
        timeout: 18000,
      });
      const replayInfo = await replayPage.evaluate(() => ({
        move: JSON.parse(document.body.dataset.repair),
        status: document.querySelector('#status').textContent,
      }));
      record(
        'offline-recorded-alternate-repair',
        replayInfo.move.part === 'bumper' &&
          replayInfo.move.socket === 1 &&
          replayInfo.status.includes('Replay complete'),
        replayInfo,
      );
      await replayPage.close();
      await downloads.detach();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    record(device + '-viewport-fits', !overflow, view);
    states.push({ device, printed, repairs: saved, imported, loaded });
    await page.close();
    await home.bringToFront();
  }
  fs.writeFileSync(path.join(outDir, 'puzzle-roundtrips.json'), JSON.stringify(states, null, 2));
  record('puzzle-runtime-errors', runtimeErrors.length === 0, runtimeErrors);
}

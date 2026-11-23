import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { orders } from '../../one-part-missing/work-orders.js';
import { benchmarks } from './work-order-benchmarks.mjs';

// Read the GIF block boundaries independently of the exporter. Chrome then
// decodes the file in a fresh profile without network access.
function inspectGif(bytes) {
  if (bytes.toString('ascii', 0, 6) !== 'GIF89a') throw Error('Invalid GIF signature');
  let at = 13,
    frames = 0,
    delays = [],
    loop = false;
  if (bytes[10] & 128) at += 3 * (2 << (bytes[10] & 7));
  const blocks = () => {
    while (at < bytes.length) {
      const n = bytes[at++];
      if (!n) return;
      at += n;
    }
    throw Error('Truncated GIF');
  };
  while (at < bytes.length) {
    const id = bytes[at++];
    if (id === 0x3b)
      return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8), frames, delays, loop };
    if (id === 0x21) {
      const label = bytes[at++];
      if (label === 0xf9) delays.push(bytes.readUInt16LE(at + 2));
      if (label === 0xff && bytes.toString('ascii', at + 1, at + 12) === 'NETSCAPE2.0') loop = true;
      blocks();
    } else if (id === 0x2c) {
      const flags = bytes[at + 8];
      at += 9;
      if (flags & 128) at += 3 * (2 << (flags & 7));
      at++;
      blocks();
      frames++;
    } else throw Error('Unknown GIF block');
  }
  throw Error('Missing GIF trailer');
}
export async function verifyReplayClips(home, { url, record, shot, outDir }) {
  const open = new Promise((resolve) => home.once('popup', resolve));
  await home.goto(url);
  await home.click('#puzzle-launcher');
  const p = await open;
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const m = orders[0];
  await p.click('#map-link');
  await p.click('#order-map summary');
  await p.click('#order-list a[href="#' + m.id + '"]');
  await p.waitForFunction(
    (t) => document.querySelector('#machine-title').textContent === t,
    {},
    m.title,
  );
  const run = async (fit) => {
    for (const f of [fit, fit.second].filter(Boolean)) {
      await p.click('[data-part="' + f.part + '"]');
      await p.click('[data-socket="' + f.socket + '"]');
    }
    await p.select('#playback-rate', '4');
    await p.click('#run');
    await p.waitForFunction(() => document.querySelector('#pilot').dataset.state === 'won');
  };
  await run(benchmarks[0][0]);
  await p.click('#race-pass');
  await p.waitForSelector('#race-target:not([hidden])');
  await run(benchmarks[0][1]);
  await p.click('#race-watch');
  await p.waitForSelector('#attempt-film[open]');
  const make = '#compare-clip [data-clip-make]',
    save = '#compare-clip [data-clip-save]';
  await p.click(make);
  await p.waitForFunction(
    () => document.querySelector('#compare-clip [data-clip-make]').textContent === 'Cancel GIF',
  );
  await p.keyboard.press('Escape');
  await p.click('#race-watch');
  record(
    'closed-export-drops-stale-download',
    await p.$eval(save, (e) => e.hidden && !e.hasAttribute('href')),
  );
  await p.click(make);
  await p.waitForSelector(save, { visible: true });
  const cdp = await p.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir });
  await shot(p, 'race-film-ready.png');
  await p.click(save);
  const file = path.join(outDir, 'challenge-' + m.id + '.gif');
  for (let i = 0; i < 100 && !fs.existsSync(file); i++) await wait(100);
  const bytes = fs.readFileSync(file),
    info = inspectGif(bytes);
  record(
    'real-looping-film',
    info.width === 576 &&
      info.height === 424 &&
      info.frames >= 24 &&
      info.frames === info.delays.length &&
      info.loop &&
      info.delays.at(-1) === 95,
    { ...info, bytes: bytes.length },
  );
  const guest = await p.browser().createBrowserContext(),
    fresh = await guest.newPage();
  await fresh.setOfflineMode(true);
  await fresh.goto('file://' + encodeURI(file));
  const decoded = await fresh.$eval('img', async (img) => {
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  record(
    'offline-browser-decodes-gif',
    decoded[0] === info.width && decoded[1] === info.height,
    decoded,
  );
  await guest.close();
  await p.bringToFront();
  await p.keyboard.press('Escape');
  await p.click('#race-watch');
  await p.click(make);
  await p.waitForSelector(save, { visible: true });
  record('repeated-export-ready', await p.$eval(save, (e) => e.download.endsWith('.gif')));
  fs.writeFileSync(path.join(outDir, 'gif-structure.json'), JSON.stringify(info, null, 2));
  record('no-page-errors', errors.length === 0, errors);
  await p.close();
}

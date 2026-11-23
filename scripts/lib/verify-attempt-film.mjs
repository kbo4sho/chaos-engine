import M from 'matter-js';
import { certify } from '../../one-part-missing/certify.js';
import { campaign } from '../../one-part-missing/campaign.js';
export async function verifyFilm(home, { url, record, shot }) {
  const errors = [];
  await home.goto(url);
  const opening = new Promise((ok) => home.once('popup', ok));
  await home.click('#puzzle-launcher');
  const p = await opening;
  p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport({ width: 390, height: 664, isMobile: true, hasTouch: true });
  await p.bringToFront();
  const stage = () =>
    p.$eval('#stage-port', (e) => ({
      client: e.clientWidth,
      scroll: e.scrollWidth,
      left: e.scrollLeft,
      width: innerWidth,
      page: document.documentElement.scrollWidth,
    }));
  const phase = (state) =>
    p.waitForFunction(
      (s) => document.querySelector('#pilot').dataset.state === s,
      { timeout: 18000 },
      state,
    );
  await p.tap('#focus-open');
  await p.waitForSelector('#focus-view[open]');
  await p.tap('#focus-in');
  await p.tap('#focus-in');
  const zoom = await stage();
  record(
    'phone-zoom-stays-inside-dialog',
    zoom.scroll >= zoom.client * 1.9 && zoom.page <= zoom.width,
    zoom,
  );
  // Focus a physical socket with the keyboard so the scrollport must reveal its real position.
  await p.focus('[data-socket="1"]');
  const socket = await p.$eval('[data-socket="1"]', (b) => {
    const r = b.getBoundingClientRect(),
      port = document.querySelector('#stage-port').getBoundingClientRect();
    return { x: r.x + r.width / 2, left: port.x, right: port.right };
  });
  record('zoomed-socket-reachable', socket.x >= socket.left && socket.x <= socket.right, socket);
  await p.tap('#focus-fit');
  await p.select('#playback-rate', '4');
  await p.tap('#run');
  await phase('miss');
  record('first-run-keeps-comparison-hidden', await p.$eval('#compare-attempts', (b) => b.hidden));
  const first = certify(M, campaign[0])[0];
  await p.tap('[data-part="' + first.part + '"]');
  await p.tap('[data-socket="' + first.socket + '"]');
  await p.tap('#run');
  await phase('won');
  const cue = await p.$eval('#cues button', (e) => e.textContent);
  record('classic-bridge-collision', cue.startsWith('Bridge'), cue);
  await p.tap('#compare-attempts');
  await p.waitForSelector('#attempt-film[open]');
  const summary = await p.evaluate(() => ({
    label: document.querySelector('#compare-latest').textContent,
    old: document.querySelector('#compare-previous').textContent,
    finding: document.querySelector('#compare-findings').textContent,
    t: Number(document.querySelector('#compare-frame').value),
    contact: document.querySelector('#compare-contact').textContent,
  }));
  record(
    'two-genuine-releases-aligned',
    summary.label.includes('Bridge') &&
      summary.old.includes('Empty machine') &&
      summary.finding.includes('one radius') &&
      summary.t > 1 &&
      summary.contact.includes('Bridge'),
    summary,
  );
  await p.tap('#compare-contact');
  const contactTime = await p.$eval('#compare-time', (e) => e.value);
  record('inspect-earlier-contact', summary.contact.endsWith(contactTime), contactTime);
  await p.tap('#compare-change');
  await p.tap('#compare-back');
  const earlier = await p.$eval('#compare-frame', (e) => Number(e.value));
  await p.tap('#compare-forward');
  record(
    'step-one-recorded-frame',
    earlier === summary.t - 1 && (await p.$eval('#compare-frame', (e) => Number(e.value))) === summary.t,
    earlier,
  );
  await p.select('#compare-hardware', 'previous');
  await shot(p, 'bridge-comparison-mobile.png');
  await p.tap('#compare-close');
  record('nested-comparison-returns-to-bench', await p.$eval('#focus-view', (d) => d.open));
  await p.tap('#replay');
  await phase('won');
  await p.tap('#compare-attempts');
  record(
    'replay-retains-distinct-miss',
    await p.$eval('#compare-previous', (e) => e.textContent.includes('Empty machine')),
  );
  await p.tap('#compare-close');
  await p.tap('#open-lab');
  await p.tap('#lab-close');
  await p.tap('#focus-close');
  record(
    'original-run-resumes-in-original-cabinet',
    await p.evaluate(
      () =>
        document.querySelector('.bench > .cabinet #pilot').dataset.state === 'won' &&
        document.querySelector('#focus-open') === document.activeElement,
    ),
  );
  await p.tap('#next');
  await p.waitForFunction(
    () => document.querySelector('#machine-title').textContent !== 'The last bell',
  );
  record('new-level-clears-comparison', await p.$eval('#compare-attempts', (b) => b.hidden));
  await p.setViewport({ width: 850, height: 390, isMobile: true, hasTouch: true });
  await p.tap('#focus-open');
  await p.tap('#focus-in');
  await shot(p, 'expanded-landscape.png');
  record(
    'landscape-page-fits',
    await p.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector('#focus-view').scrollWidth <= innerWidth,
    ),
  );
  await p.tap('#focus-close');
  await p.setViewport({ width: 1280, height: 800 });
  await p.click('#map-link');
  await p.select('#chapter', '19');
  await p.click('#shelf a[href="#works-last-parcel"]');
  await p.select('#playback-rate', '4');
  await p.click('#run');
  await phase('miss');
  const fit = certify(M, campaign[199])[0];
  await p.click('[data-part="' + fit.part + '"]');
  await p.click('[data-socket="' + fit.socket + '"]');
  await p.click('#run');
  await phase('won');
  await p.click('#compare-attempts');
  const cargo = await p.evaluate(() => ({
    message: document.querySelector('#compare-findings').textContent,
    distance: document.querySelector('#compare-distance').textContent,
  }));
  record(
    'separate-blue-parcel-measurement',
    cargo.message.startsWith('The parcel') &&
      cargo.distance.includes('Parcel') &&
      cargo.distance.includes('Marble 0 units'),
    cargo,
  );
  await shot(p, 'parcel-comparison-desktop.png');
  await p.keyboard.press('Escape');
  record('keyboard-dismisses-comparison', !(await p.$eval('#attempt-film', (d) => d.open)));
  await p.close();
  record('runtime-errors', !errors.length, errors);
}

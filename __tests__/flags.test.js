import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import {
  FLAG_DEFAULTS,
  FLAGS_STORAGE_KEY,
  applyFeatureFlags,
  guardPage,
  parseFlagList,
  readFlags,
  syncOfflineWorker,
} from '../flags.js';

const root = new URL('../', import.meta.url);
const opmHtml = readFileSync(new URL('one-part-missing/index.html', root), 'utf8');
const sandboxHtml = readFileSync(new URL('index.html', root), 'utf8');
const flagsSrc = readFileSync(new URL('flags.js', root), 'utf8');

const GATED_REVEAL = {
  'rig-entry': 'course-rig',
  'pair-entry': 'course-pair',
  'drive-entry': 'course-drive',
  'qualification-entry': 'course-qualification',
  'grand-entry': 'course-grand',
  'field-entry': 'course-field',
  'assembly-entry': 'course-assembly',
  'fault-entry': 'fault-desk',
  'batch-entry': 'test-bay',
  'operator-entry': 'control-room',
  'flight-entry': 'course-flight',
  'sort-entry': 'course-sort',
  'discovery-entry': 'course-discovery',
  'match-map': 'match-cards',
  'offline-workshop': 'offline-workshop',
  'double-entry': 'double-exposures',
};

const GATED_LOCK = {
  'repair-transfer': 'repair-transfer',
  'race-files': 'offline-races',
  'match-panel': 'match-cards',
  'double-maker': 'shutter-sheets',
};

const PAGE_GATES = {
  'one-part-missing/control-room/index.html': 'control-room',
  'one-part-missing/test-bay/index.html': 'test-bay',
  'one-part-missing/fault-desk/index.html': 'fault-desk',
  'one-part-missing/discovery/double.html': 'double-exposures',
};

function mount(html, url, extra = {}) {
  const dom = new JSDOM(html, { url });
  const { flags, worker } = applyFeatureFlags({
    document: dom.window.document,
    search: new URL(url).search,
    storage: extra.storage === undefined ? dom.window.localStorage : extra.storage,
    serviceWorker: extra.serviceWorker ?? null,
  });
  return { window: dom.window, flags, worker };
}

describe('flags.js defaults and overrides', () => {
  it('defaults every extra desk off and keeps the two foundational courses on', () => {
    expect(FLAG_DEFAULTS['course-tool']).toBe(true);
    expect(FLAG_DEFAULTS['course-clock']).toBe(true);
    const extras = Object.entries(FLAG_DEFAULTS).filter(([name]) => !['course-tool', 'course-clock'].includes(name));
    expect(extras.length).toBeGreaterThan(10);
    expect(extras.every(([, on]) => on === false)).toBe(true);
    expect(readFlags({ search: null, storage: null })).toEqual({ ...FLAG_DEFAULTS });
  });

  it('applies URL and localStorage lists, with the query winning, and ignores unknown names', () => {
    expect(parseFlagList('match-cards, unknown-flag, -course-tool,')).toEqual({
      'match-cards': true,
      'course-tool': false,
    });
    const storage = {
      getItem: (key) => (key === FLAGS_STORAGE_KEY ? 'offline-workshop,match-cards,-course-clock' : null),
    };
    expect(
      readFlags({
        search: '?flags=course-clock,-match-cards,not-a-flag',
        storage,
      }),
    ).toMatchObject({
      'offline-workshop': true,
      'match-cards': false,
      'course-clock': true,
      'course-tool': true,
    });
    expect(readFlags({ search: 'fault-desk', storage: null })['fault-desk']).toBe(true);
  });

  it('has no imports so the sandbox graph only grows by this file', () => {
    expect(flagsSrc).not.toMatch(/^import /m);
    expect(sandboxHtml).toContain("import { applyFeatureFlags } from './flags.js'");
    expect(sandboxHtml).toContain("import {installBench} from './one-part-missing/sandbox.js'");
    const flagsScript = sandboxHtml.slice(
      sandboxHtml.indexOf("import { applyFeatureFlags } from './flags.js'"),
      sandboxHtml.indexOf("import {installBench} from './one-part-missing/sandbox.js'"),
    );
    expect(flagsScript).not.toContain('sandbox.js');
    expect(flagsScript).not.toContain('one-part-missing/');
  });
});

describe('gated entry points', () => {
  it('hides each extra entry by default and shows it when its flag is on', () => {
    const off = mount(opmHtml, 'https://example.test/one-part-missing/');
    expect(off.window.document.getElementById('tool-entry').hidden).toBe(false);
    expect(off.window.document.getElementById('clock-entry').hidden).toBe(false);
    for (const [id, flag] of Object.entries(GATED_REVEAL)) {
      if (id === 'double-entry') continue;
      const node = off.window.document.getElementById(id);
      expect(node, id).toBeTruthy();
      expect(node.hidden, id).toBe(true);
      expect(node.getAttribute('data-flag'), id).toBe(flag);
    }
    for (const [id, flag] of Object.entries(GATED_LOCK)) {
      if (id === 'double-maker') continue;
      const node = off.window.document.getElementById(id);
      expect(node, id).toBeTruthy();
      expect(node.hidden, id).toBe(true);
      expect(node.hasAttribute('data-flag-off'), id).toBe(true);
      expect(node.getAttribute('data-flag'), id).toBe(flag);
    }
    off.window.close();

    const names = Object.values({ ...GATED_REVEAL, ...GATED_LOCK }).filter((n) => n !== 'double-exposures' && n !== 'shutter-sheets');
    const on = mount(
      opmHtml,
      'https://example.test/one-part-missing/?flags=' + [...new Set(names)].join(','),
    );
    expect(on.window.document.getElementById('tool-entry').hidden).toBe(false);
    for (const id of Object.keys(GATED_REVEAL)) {
      if (id === 'double-entry') continue;
      expect(on.window.document.getElementById(id).hidden, id).toBe(false);
      expect(on.window.document.getElementById(id).hasAttribute('data-flag-off'), id).toBe(false);
    }
    expect(on.window.document.getElementById('repair-transfer').hasAttribute('data-flag-off')).toBe(false);
    expect(on.window.document.getElementById('race-files').hasAttribute('data-flag-off')).toBe(false);
    on.window.close();
  });

  it('hides Original track press unless press-registration is on', () => {
    const html = opmHtml.replace(
      '<select id="press-style"></select',
      '<select id="press-style"><option value="any">Any</option><option value="classic">Original track press</option></select',
    );
    const off = mount(html, 'https://example.test/one-part-missing/');
    const classic = off.window.document.querySelector('#press-style option[value="classic"]');
    expect(classic.hidden).toBe(true);
    off.window.close();
    const on = mount(html, 'https://example.test/one-part-missing/?flags=press-registration');
    const shown = on.window.document.querySelector('#press-style option[value="classic"]');
    expect(shown.hidden).toBe(false);
    on.window.close();
  });

  it('hides double exposures and shutter sheets until their flags are on', () => {
    const discovery = readFileSync(new URL('one-part-missing/discovery/index.html', root), 'utf8');
    const double = readFileSync(new URL('one-part-missing/discovery/double.html', root), 'utf8');
    const offDesk = mount(discovery, 'https://example.test/one-part-missing/discovery/');
    expect(offDesk.window.document.getElementById('double-entry').hidden).toBe(true);
    offDesk.window.close();
    const onDesk = mount(discovery, 'https://example.test/one-part-missing/discovery/?flags=double-exposures');
    expect(onDesk.window.document.getElementById('double-entry').hidden).toBe(false);
    onDesk.window.close();
    const offSheet = mount(double, 'https://example.test/one-part-missing/discovery/double.html');
    expect(offSheet.window.document.getElementById('double-maker').hasAttribute('data-flag-off')).toBe(true);
    offSheet.window.close();
    const onSheet = mount(
      double,
      'https://example.test/one-part-missing/discovery/double.html?flags=double-exposures,shutter-sheets',
    );
    expect(onSheet.window.document.getElementById('double-maker').hasAttribute('data-flag-off')).toBe(false);
    onSheet.window.close();
  });

  it.each(Object.entries(PAGE_GATES))(
    '%s is unavailable until %s is on',
    (path, flag) => {
      const html = readFileSync(new URL(path, root), 'utf8');
      expect(html).toContain("import { guardPage } from '../../flags.js'");
      const off = new JSDOM(html, { url: 'https://example.test/' + path.replace(/index\.html$/, '') });
      expect(guardPage(flag, '../', { document: off.window.document, search: '', storage: null })).toBe(false);
      const note = off.window.document.getElementById('feature-unavailable');
      expect(note.textContent).toContain('Not available yet.');
      expect(note.querySelector('a').getAttribute('href')).toBe('../');
      off.window.close();
      const on = new JSDOM(html, {
        url: 'https://example.test/' + path.replace(/index\.html$/, '') + '?flags=' + flag,
      });
      expect(
        guardPage(flag, '../', {
          document: on.window.document,
          search: on.window.location.search,
          storage: null,
        }),
      ).toBe(true);
      expect(on.window.document.getElementById('feature-unavailable')).toBeNull();
      on.window.close();
    },
  );
});

describe('offline worker kill switch', () => {
  it('unregisters leftover puzzle-offline-worker registrations when the flag is off', async () => {
    const unregistered = [];
    const leftover = {
      active: { scriptURL: 'https://example.test/puzzle-offline-worker.js' },
      waiting: null,
      installing: null,
      async unregister() {
        unregistered.push('offline');
        return true;
      },
    };
    const other = {
      active: { scriptURL: 'https://example.test/unrelated-sw.js' },
      async unregister() {
        unregistered.push('other');
        return true;
      },
    };
    const sw = { getRegistrations: async () => [leftover, other] };
    const off = await syncOfflineWorker({ ...FLAG_DEFAULTS }, sw);
    expect(off).toEqual({ action: 'unregister', count: 1 });
    expect(unregistered).toEqual(['offline']);
    const on = await syncOfflineWorker({ ...FLAG_DEFAULTS, 'offline-workshop': true }, sw);
    expect(on).toEqual({ action: 'allow', count: 0 });
    expect(unregistered).toEqual(['offline']);
  });
});

/**
 * Feature switches for Chaos Engine and One Part Missing.
 *
 * Defaults hide extra desks and courses so the repair bench stays the spine.
 * Testers can turn a switch on or off with a URL query and localStorage:
 *
 *   ?flags=match-cards,offline-workshop,-course-tool
 *   localStorage['chaos-engine-flags'] = 'match-cards,-course-tool'
 *
 * URL tokens override localStorage, which overrides the typed defaults.
 * Unknown names are ignored. This module has no imports, so the sandbox can
 * load it without growing its eager graph beyond this file.
 */

export const FLAGS_STORAGE_KEY = 'chaos-engine-flags';

export const FLAG_DEFAULTS = Object.freeze({
  'offline-workshop': false,
  'double-exposures': false,
  'shutter-sheets': false,
  'offline-races': false,
  'match-cards': false,
  'control-room': false,
  'test-bay': false,
  'fault-desk': false,
  'repair-transfer': false,
  'press-registration': false,
  'course-tool': true,
  'course-clock': true,
  'course-rig': false,
  'course-pair': false,
  'course-drive': false,
  'course-qualification': false,
  'course-grand': false,
  'course-field': false,
  'course-assembly': false,
  'course-flight': false,
  'course-sort': false,
  'course-discovery': false,
});

/** @typedef {keyof typeof FLAG_DEFAULTS} FlagName */
/** @typedef {{ [K in FlagName]: boolean }} FlagMap */

const WORKER_FILE = 'puzzle-offline-worker.js';

/**
 * @param {string | null | undefined} text
 * @returns {Partial<FlagMap>}
 */
export function parseFlagList(text) {
  /** @type {Partial<FlagMap>} */
  const out = {};
  if (typeof text !== 'string' || !text.trim()) return out;
  for (const raw of text.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const off = token.startsWith('-');
    const name = off ? token.slice(1).trim() : token;
    if (!Object.hasOwn(FLAG_DEFAULTS, name)) continue;
    out[/** @type {FlagName} */ (name)] = !off;
  }
  return out;
}

/**
 * @param {string | URLSearchParams | null | undefined} search
 * @returns {string | null}
 */
function flagsQuery(search) {
  if (search == null || search === '') return null;
  if (typeof URLSearchParams !== 'undefined' && search instanceof URLSearchParams)
    return search.get('flags');
  if (typeof search !== 'string') return null;
  if (search.startsWith('?') || /(?:^|&)flags=/.test(search)) {
    const query = search.startsWith('?') ? search : '?' + search;
    return new URLSearchParams(query).get('flags');
  }
  return search;
}

/**
 * @param {{
 *   search?: string | URLSearchParams | null,
 *   storage?: Pick<Storage, 'getItem'> | null,
 * }} [input]
 * @returns {FlagMap}
 */
export function readFlags(input = {}) {
  /** @type {FlagMap} */
  const flags = { ...FLAG_DEFAULTS };
  const storage =
    input.storage === undefined
      ? typeof localStorage === 'undefined'
        ? null
        : localStorage
      : input.storage;
  try {
    Object.assign(flags, parseFlagList(storage?.getItem?.(FLAGS_STORAGE_KEY)));
  } catch {
    /* private mode still uses defaults plus the URL */
  }
  const search =
    input.search === undefined
      ? typeof location === 'undefined'
        ? null
        : location.search
      : input.search;
  Object.assign(flags, parseFlagList(flagsQuery(search)));
  return flags;
}

/**
 * @param {FlagName} name
 * @param {FlagMap} [flags]
 */
export function isEnabled(name, flags = readFlags()) {
  return Boolean(flags[name]);
}

/**
 * @param {Document | null | undefined} doc
 * @param {FlagMap} flags
 */
export function applyDom(doc, flags) {
  if (!doc) return;
  for (const node of doc.querySelectorAll('[data-flag]')) {
    const name = node.getAttribute('data-flag');
    if (!name || !Object.hasOwn(FLAG_DEFAULTS, name)) continue;
    const on = flags[/** @type {FlagName} */ (name)];
    node.toggleAttribute('data-flag-off', !on);
    if (!on) node.hidden = true;
    else if (node.hasAttribute('data-flag-reveal')) node.hidden = false;
  }
  const press = doc.getElementById('press-style');
  if (press) {
    for (const opt of press.options) {
      if (opt.value !== 'classic') continue;
      opt.hidden = !flags['press-registration'];
      if (!flags['press-registration'] && press.value === 'classic') press.value = 'any';
    }
  }
}

/**
 * Kill switch for leftover offline workers. Old releases could leave one
 * registered at this origin even after the panel is hidden.
 *
 * @param {FlagMap} flags
 * @param {Pick<ServiceWorkerContainer, 'getRegistrations'> | null | undefined} [serviceWorker]
 */
export async function syncOfflineWorker(flags, serviceWorker) {
  const sw =
    serviceWorker === undefined ? globalThis.navigator?.serviceWorker : serviceWorker;
  if (!sw?.getRegistrations) return { action: 'skip', count: 0 };
  if (flags['offline-workshop']) return { action: 'allow', count: 0 };
  const regs = await sw.getRegistrations();
  let count = 0;
  for (const reg of regs) {
    const scripts = [reg.active, reg.waiting, reg.installing]
      .map((worker) => worker?.scriptURL || '')
      .join(' ');
    if (!scripts.includes(WORKER_FILE)) continue;
    await reg.unregister();
    count++;
  }
  return { action: 'unregister', count };
}

/**
 * @param {{
 *   search?: string | URLSearchParams | null,
 *   storage?: Pick<Storage, 'getItem'> | null,
 *   document?: Document | null,
 *   serviceWorker?: Pick<ServiceWorkerContainer, 'getRegistrations'> | null,
 * }} [input]
 */
export function applyFeatureFlags(input = {}) {
  const flags = readFlags(input);
  const doc = input.document === undefined ? (typeof document === 'undefined' ? null : document) : input.document;
  applyDom(doc, flags);
  const worker = syncOfflineWorker(
    flags,
    input.serviceWorker === undefined ? undefined : input.serviceWorker,
  );
  return { flags, worker };
}

/**
 * @param {Document} doc
 * @param {string} benchHref
 */
function showUnavailable(doc, benchHref) {
  const main = doc.createElement('main');
  main.id = 'feature-unavailable';
  const note = doc.createElement('p');
  note.textContent = 'Not available yet.';
  const nav = doc.createElement('p');
  const link = doc.createElement('a');
  link.href = benchHref;
  link.textContent = 'Back to the repair bench';
  nav.append(link);
  main.append(note, nav);
  doc.body.replaceChildren(main);
}

/**
 * @param {FlagName} name
 * @param {string} [benchHref]
 * @param {Parameters<typeof applyFeatureFlags>[0]} [input]
 */
export function guardPage(name, benchHref = '../', input = {}) {
  const { flags } = applyFeatureFlags(input);
  if (flags[name]) return true;
  const doc =
    input.document === undefined ? (typeof document === 'undefined' ? null : document) : input.document;
  if (doc) showUnavailable(doc, benchHref);
  return false;
}

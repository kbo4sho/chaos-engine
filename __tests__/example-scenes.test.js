import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const codec = fs.readFileSync(new URL('../save-codec.js', import.meta.url), 'utf8');
const examples = fs.readFileSync(new URL('../examples/chaos-examples.js', import.meta.url), 'utf8');
const matter = fs.readFileSync(createRequire(import.meta.url).resolve('matter-js'), 'utf8');
const liveHarnesses = [];

function gameHarness(stored = {}, size = { width: 1024, height: 600 }) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url:'http://localhost', runScripts:'outside-only', virtualConsole });
  const { window } = dom;
  window.eval(matter);
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get:(_, key) => key.startsWith('create') ? () => gradient : () => {} });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get:() => size.width });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get:() => size.height });
  window.setTimeout = (callback, ms = 0) => {
    if (typeof callback === 'function' && !ms) callback();
    return 1;
  };
  window.clearTimeout = () => {};
  window.setInterval = () => 1;
  window.requestAnimationFrame = () => 1;
  window.HTMLDialogElement.prototype.showModal = function () {
    if (this.open) throw new window.DOMException('already open', 'InvalidStateError');
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  window.eval(examples);
  window.eval(codec);
  window.eval(script + '\nwindow.__runGame = code => eval(code);');
  const run = code => window.__runGame(code);
  const click = id => window.document.getElementById(id).click();
  const feedback = () => window.document.getElementById('save-feedback').textContent;
  const api = { window, run, click, feedback, errors };
  liveHarnesses.push(api);
  return api;
}

afterEach(() => {
  while (liveHarnesses.length) liveHarnesses.pop().window.close();
});

function optionValues(api) {
  return [...api.window.document.getElementById('save-slot').options].map(option => option.value);
}

describe('Built-in example scenes', () => {
  it('lists the three immutable examples beside the user slots', () => {
    const api = gameHarness();
    const values = optionValues(api);
    expect(api.window.ChaosExamples.catalog.map(example => example.id)).toEqual([
      'kinetic-cascade', 'halo-garden', 'wreck-deck'
    ]);
    expect(values).toEqual([
      'example:kinetic-cascade', 'example:halo-garden', 'example:wreck-deck', '1', '2', '3'
    ]);
    expect(api.window.document.getElementById('save-slot').value).toBe('1');
    expect(api.window.document.querySelector('#save-slot optgroup[label="Examples"]').childElementCount).toBe(3);
  });

  it.each([
    ['kinetic-cascade', 'Kinetic Cascade', ['ramp', 'domino', 'pinwheel']],
    ['halo-garden', 'Halo Garden', ['star', 'balloon', 'magnet']],
    ['wreck-deck', 'Wreck Deck', ['jenga', 'wrecking-ball', 'bomb']]
  ])('loads %s through the save codec without writing user slots', (id, name, types) => {
    const existing = JSON.stringify({ version:1, savedAt:'2026-01-01T00:00:00.000Z', checksum:'abc', graph:{ entry:null, nodes:[] } });
    const api = gameHarness({ 'chaos-engine-save-1': existing });
    api.window.document.getElementById('save-slot').value = `example:${id}`;
    api.window.document.getElementById('save-slot').dispatchEvent(new api.window.Event('change'));
    const hint = api.window.ChaosExamples.catalog.find(example => example.id === id).description;
    expect(api.window.document.getElementById('save-slot-hint').textContent).toContain(hint);
    api.click('btn-load');
    expect(api.window.document.getElementById('save-confirm-title').textContent).toBe(`Load ${name}?`);
    expect(api.window.document.getElementById('save-confirm-description').textContent).toContain('Your saved slots stay as they are');
    const before = api.window.localStorage.getItem('chaos-engine-save-1');
    api.click('save-accept');
    expect(api.feedback()).toContain(`LOADED ${name.toUpperCase()}`);
    const rendered = api.run('captureGameState().bodies.map(body => body.render.type)');
    for (const type of types) expect(rendered).toContain(type);
    expect(api.run('captureGameState().bodies.length')).toBeGreaterThan(5);
    expect(() => api.run('Engine.update(engine, 1000 / 60)')).not.toThrow();
    expect(api.window.localStorage.getItem('chaos-engine-save-1')).toBe(before);
    expect(api.window.localStorage.getItem('chaos-engine-save-2')).toBeNull();
    expect(optionValues(api).filter(value => value.startsWith('example:'))).toHaveLength(3);
    expect(api.errors).toEqual([]);
  });

  it('refuses to save over an example and leaves user storage untouched', () => {
    const api = gameHarness();
    api.window.document.getElementById('save-slot').value = 'example:wreck-deck';
    api.click('btn-save');
    expect(api.feedback()).toContain('PICK SLOT 1–3');
    expect(api.window.localStorage.getItem('chaos-engine-save-1')).toBeNull();
    expect([...Array(api.window.localStorage.length)].map((_, i) => api.window.localStorage.key(i))
      .filter(key => key && key.startsWith('chaos-engine-save-'))).toEqual([]);
  });

  it('encodes each example as a versioned save graph', () => {
    const api = gameHarness();
    for (const example of api.window.ChaosExamples.catalog) {
      const raw = api.run(`snapshotExample('${example.id}')`);
      const save = JSON.parse(raw);
      expect(save.version).toBe(1);
      expect(save.graph.nodes.length).toBeGreaterThan(10);
      expect(save.checksum).toBe(api.run(`ChaosSaveCodec.checksum(${JSON.stringify(save.graph)})`));
      expect(save.example.id).toBe(example.id);
      expect(() => api.run(`readGameSave(${JSON.stringify(raw)})`)).not.toThrow();
    }
  });

  it('starts the load confirm when an example is chosen, without pressing LOAD', () => {
    const api = gameHarness();
    const slot = api.window.document.getElementById('save-slot');
    slot.value = 'example:halo-garden';
    slot.dispatchEvent(new api.window.Event('change', { bubbles: true }));
    expect(api.window.document.getElementById('save-confirm').open).toBe(true);
    expect(api.window.document.getElementById('save-confirm-title').textContent).toBe('Load Halo Garden?');
    expect(api.window.document.getElementById('obj-count').textContent).toBe('0');
    api.click('save-accept');
    expect(api.feedback()).toContain('LOADED HALO GARDEN');
    expect(Number(api.window.document.getElementById('obj-count').textContent)).toBeGreaterThan(5);
    expect(api.window.document.getElementById('planet-name').textContent).toBe('MOON');
  });

  it.each([
    ['kinetic-cascade', 'Kinetic Cascade'],
    ['halo-garden', 'Halo Garden'],
    ['wreck-deck', 'Wreck Deck']
  ])('loads %s on a phone-sized canvas', (id, name) => {
    const api = gameHarness({}, { width: 390, height: 664 });
    expect(api.run('canvas.width')).toBe(390);
    expect(api.run('canvas.height')).toBe(664);
    const slot = api.window.document.getElementById('save-slot');
    slot.value = `example:${id}`;
    slot.dispatchEvent(new api.window.Event('change', { bubbles: true }));
    api.click('save-accept');
    expect(api.feedback()).toContain(`LOADED ${name.toUpperCase()}`);
    expect(api.run('captureGameState().bodies.length')).toBeGreaterThan(5);
    expect(() => api.run('Engine.update(engine, 1000 / 60)')).not.toThrow();
    expect(api.errors).toEqual([]);
  });

  it('keeps the save cluster out of the pan-x chaos scroller', () => {
    const api = gameHarness();
    const cluster = api.window.document.getElementById('save-cluster');
    const actions = api.window.document.getElementById('chaos-actions');
    expect(cluster.contains(api.window.document.getElementById('save-slot'))).toBe(true);
    expect(cluster.contains(api.window.document.getElementById('btn-load'))).toBe(true);
    expect(actions.contains(api.window.document.getElementById('btn-explode'))).toBe(true);
    expect(actions.contains(api.window.document.getElementById('btn-load'))).toBe(false);
    expect(html).toContain('#save-cluster .chaos-btn, #save-cluster #save-slot { touch-action:manipulation; }');
    expect(html).toContain('#toolbar, #chaos-actions');
    expect(html).toContain('grid-template-areas:');
    expect(html).toContain('-webkit-line-clamp:2');
    expect(html).not.toContain('#save-slot-hint { max-width:120px');
    expect(html).toMatch(/#save-confirm \{[\s\S]*position:fixed/);
  });
});

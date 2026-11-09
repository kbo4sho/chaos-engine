#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const journey = arg('--journey');
const url = arg('--url');
const origin = arg('--origin', 'branch');
const runId = arg('--run-id');
const chromeBin = arg('--chrome-bin', '/usr/bin/google-chrome');
const userDataDir = arg('--user-data-dir');
const outDir = arg('--out-dir');

if (!journey || !url || !runId || !outDir) {
  console.error('chaos-verify-drive: missing --journey --url --run-id --out-dir');
  process.exit(2);
}

let puppeteer;
let KnownDevices;
try {
  puppeteer = await import('puppeteer-core');
  KnownDevices = puppeteer.KnownDevices || puppeteer.default?.KnownDevices;
  if (!KnownDevices) ({ KnownDevices } = puppeteer);
} catch (error) {
  console.error('puppeteer-core is required. From the repo root run: npm install');
  console.error(error.message);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const consoleLines = [];
const result = {
  journey,
  origin,
  runId,
  url,
  startedAt: new Date().toISOString(),
  passed: false,
  steps: [],
  failures: []
};

function record(step, ok, detail) {
  result.steps.push({ step, ok, detail, at: new Date().toISOString() });
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`${tag} ${step}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  if (!ok) result.failures.push({ step, detail });
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function canvasWorldPoint(page, fx = 0.42, fy = 0.42) {
  // Aim inside the authored logical world. Fixed canvas fractions land in letterbox
  // margins on tall phone viewports and are rejected by isWorldPoint.
  return page.$eval('#game', (canvas, fx, fy) => {
    const rect = canvas.getBoundingClientRect();
    if (typeof worldToScreen === 'function' && typeof worldBounds !== 'undefined') {
      const world = {
        x: worldBounds.x + worldBounds.width * fx,
        y: worldBounds.y + worldBounds.height * fy
      };
      const screen = worldToScreen(world);
      const sx = rect.left + screen.x * (rect.width / Math.max(1, canvas.width));
      const sy = rect.top + screen.y * (rect.height / Math.max(1, canvas.height));
      return { x: sx, y: sy, width: rect.width, height: rect.height, world };
    }
    return { x: rect.x + rect.width * fx, y: rect.y + rect.height * 0.32, width: rect.width, height: rect.height };
  }, fx, fy);
}

async function clickCanvas(page) {
  const box = await canvasWorldPoint(page);
  await page.mouse.click(box.x, box.y);
  return box;
}

async function tapCanvas(page) {
  const box = await canvasWorldPoint(page);
  await page.touchscreen.tap(box.x, box.y);
  return box;
}

async function tapEl(page, selector) {
  await page.$eval(selector, el => el.scrollIntoView({ inline: 'center', block: 'nearest' }));
  await page.tap(selector);
}

async function closeDialogIfOpen(page) {
  const open = await page.$eval('#save-confirm', dialog => Boolean(dialog?.open)).catch(() => false);
  if (open) await page.tap('#save-cancel').catch(async () => page.click('#save-cancel'));
}

function controlLayout(page) {
  return page.evaluate(() => {
    const box = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height,
        inView: r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight, touchPoints: navigator.maxTouchPoints },
      slot: box('save-slot'),
      load: box('btn-load'),
      save: box('btn-save'),
      cluster: box('save-cluster'),
      actions: box('chaos-actions')
    };
  });
}

async function readUi(page) {
  return page.evaluate(() => {
    const feedback = document.getElementById('save-feedback')?.textContent || '';
    const objCount = document.getElementById('obj-count')?.textContent || '';
    const planet = document.getElementById('planet-name')?.textContent || '';
    const slot = document.getElementById('save-slot');
    const dialog = document.getElementById('save-confirm');
    const storage = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chaos-engine-save-')) storage[key] = localStorage.getItem(key);
    }
    let host = null;
    try { host = window.ChaosEngine?.getState?.() || null; } catch (error) {
      host = { error: String(error) };
    }
    return {
      title: document.querySelector('#topbar .title')?.textContent || '',
      feedback,
      objCount,
      planet,
      slotLabel: slot?.selectedOptions?.[0]?.textContent || '',
      slotValue: slot?.value || '',
      slotValues: [...(slot?.options || [])].map(option => option.value),
      hint: document.getElementById('save-slot-hint')?.textContent || '',
      dialogOpen: Boolean(dialog?.open),
      dialogTitle: document.getElementById('save-confirm-title')?.textContent || '',
      hasCodec: Boolean(window.ChaosSaveCodec),
      hasHost: Boolean(window.ChaosEngine),
      storageKeys: Object.keys(storage),
      storage,
      host
    };
  });
}

function parseSave(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return { unreadable: true, length: raw.length }; }
}

function misleadingStorageError(feedback) {
  return /FREE BROWSER STORAGE|ALLOW SITE DATA/.test(feedback);
}

async function driveSaveLoad(page) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#game', { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.ChaosEngine) && Boolean(document.getElementById('btn-save')), { timeout: 15000 });

  let ui = await readUi(page);
  await shot(page, '01-start.png');
  record('start', ui.title.includes('CHAOS ENGINE') && ui.hasHost, ui);

  await page.click('[data-tool="ball"]');
  await clickCanvas(page);
  await page.waitForFunction(() => Number(document.getElementById('obj-count')?.textContent) > 0, { timeout: 8000 });
  ui = await readUi(page);
  await shot(page, '02-scene-built.png');
  record('scene-built', Number(ui.objCount) > 0, { objCount: ui.objCount });

  const lesson = await page.evaluate(() => window.ChaosEngine.loadLesson({
    id: 'sample-lesson',
    hideControls: false,
    setup() {},
    onTick() {},
    simulation: {
      gravity: 'earth',
      goals: [{ type: 'count-placed', target: 1 }],
      fixtures: [{ type: 'rectangle', x: 400, y: 320, width: 220, height: 18, label: 'sample-platform' }],
      spawnObjects: [{ type: 'circle', x: 220, y: 140, count: 1, label: 'sample-ball' }]
    }
  }));
  await page.waitForFunction(() => window.ChaosEngine.getState().lessonId === 'sample-lesson' && window.ChaosEngine.getState().objectCount > 0, { timeout: 8000 });
  ui = await readUi(page);
  await shot(page, '03-lesson-started.png');
  record('lesson-started', ui.host?.lessonId === 'sample-lesson' && Number(ui.objCount) > 0, { lesson, host: ui.host, objCount: ui.objCount });

  await page.select('#save-slot', '1');
  await page.click('#btn-save');
  await new Promise(resolve => setTimeout(resolve, 200));
  ui = await readUi(page);
  if (ui.dialogOpen) {
    await page.click('#save-accept');
    await new Promise(resolve => setTimeout(resolve, 250));
    ui = await readUi(page);
  }
  await shot(page, '04-after-save.png');
  const savedRaw = ui.storage['chaos-engine-save-1'];
  const saved = parseSave(savedRaw);
  const savedOk = ui.feedback.includes('SAVED TO SLOT') && Boolean(saved?.graph) && saved?.version === 1 && !misleadingStorageError(ui.feedback);
  record('save', savedOk, {
    feedback: ui.feedback,
    slotLabel: ui.slotLabel,
    hasPayload: Boolean(saved?.graph),
    version: saved?.version || null
  });

  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#btn-load', { timeout: 15000 });
  ui = await readUi(page);
  await shot(page, '05-after-reload.png');
  const persistOk = Boolean(parseSave(ui.storage['chaos-engine-save-1'])?.graph);
  record('reload-persist', persistOk, {
    slotLabel: ui.slotLabel,
    storageKeys: ui.storageKeys,
    persisted: persistOk
  });

  await page.click('#btn-load');
  await new Promise(resolve => setTimeout(resolve, 200));
  ui = await readUi(page);
  await shot(page, '06-load-confirm.png');
  if (ui.dialogOpen) {
    await page.click('#save-accept');
    await new Promise(resolve => setTimeout(resolve, 300));
    ui = await readUi(page);
  }
  await shot(page, '07-after-load.png');
  const loadedOk = ui.feedback.includes('LOADED SLOT') && ui.host?.lessonId === 'sample-lesson' && Number(ui.objCount) > 0;
  record('load', loadedOk, {
    feedback: ui.feedback,
    dialogTitle: ui.dialogTitle,
    host: ui.host,
    objCount: ui.objCount
  });

  fs.writeFileSync(path.join(outDir, 'localStorage.json'), JSON.stringify({
    keys: ui.storageKeys,
    slot1: saved || parseSave(ui.storage['chaos-engine-save-1']),
    slot1Chars: (ui.storage['chaos-engine-save-1'] || '').length
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify(ui, null, 2));

  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'save after a callback lesson persists and reloads without a storage error';
}

async function driveExampleScenes(page) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#save-slot', { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.ChaosExamples) && Boolean(document.getElementById('btn-load')), { timeout: 15000 });

  let ui = await readUi(page);
  const listed = ['example:kinetic-cascade', 'example:halo-garden', 'example:wreck-deck', '1', '2', '3']
    .every(value => ui.slotValues.includes(value));
  await page.select('#save-slot', 'example:kinetic-cascade');
  await page.evaluate(() => {
    const slot = document.getElementById('save-slot');
    slot.dispatchEvent(new Event('change'));
    slot.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
  ui = await readUi(page);
  await shot(page, '01-menu.png');
  record('menu', listed && ui.slotValue === 'example:kinetic-cascade' && /Rube Goldberg|Kinetic/i.test(ui.hint), {
    slotValues: ui.slotValues,
    slotValue: ui.slotValue,
    hint: ui.hint
  });
  await closeDialogIfOpen(page);

  await page.evaluate(() => localStorage.clear());
  await page.select('#save-slot', '1');
  await page.click('[data-tool="ball"]');
  await clickCanvas(page);
  await page.waitForFunction(() => Number(document.getElementById('obj-count')?.textContent) > 0, { timeout: 8000 });
  await page.click('#btn-save');
  await new Promise(resolve => setTimeout(resolve, 200));
  ui = await readUi(page);
  if (ui.dialogOpen) {
    await page.click('#save-accept');
    await new Promise(resolve => setTimeout(resolve, 250));
    ui = await readUi(page);
  }
  const userSave = ui.storage['chaos-engine-save-1'];
  record('user-slot-saved', Boolean(parseSave(userSave)?.graph) && ui.feedback.includes('SAVED TO SLOT'), {
    feedback: ui.feedback,
    chars: (userSave || '').length
  });

  const scenes = [
    { id: 'kinetic-cascade', file: '02-kinetic-cascade.png', name: 'KINETIC CASCADE', planet: 'EARTH' },
    { id: 'halo-garden', file: '03-halo-garden.png', name: 'HALO GARDEN', planet: 'MOON' },
    { id: 'wreck-deck', file: '04-wreck-deck.png', name: 'WRECK DECK', planet: 'EARTH' }
  ];
  for (const scene of scenes) {
    await page.select('#save-slot', `example:${scene.id}`);
    await page.click('#btn-load');
    await new Promise(resolve => setTimeout(resolve, 200));
    ui = await readUi(page);
    if (ui.dialogOpen) {
      await page.click('#save-accept');
      await new Promise(resolve => setTimeout(resolve, 900));
      ui = await readUi(page);
    }
    await shot(page, scene.file);
    record(`load-${scene.id}`, ui.feedback.includes(`LOADED ${scene.name}`) && Number(ui.objCount) > 5 && ui.planet === scene.planet, {
      feedback: ui.feedback,
      objCount: ui.objCount,
      planet: ui.planet,
      hint: ui.hint
    });
  }

  ui = await readUi(page);
  const slotsSafe = ui.storage['chaos-engine-save-1'] === userSave
    && !ui.storage['chaos-engine-save-2']
    && !ui.storage['chaos-engine-save-3']
    && ['example:kinetic-cascade', 'example:halo-garden', 'example:wreck-deck'].every(value => ui.slotValues.includes(value));
  record('slots-untouched', slotsSafe, {
    sameUserSlot: ui.storage['chaos-engine-save-1'] === userSave,
    storageKeys: ui.storageKeys,
    slotValues: ui.slotValues
  });

  fs.writeFileSync(path.join(outDir, 'localStorage.json'), JSON.stringify({
    keys: ui.storageKeys,
    userSlotUnchanged: ui.storage['chaos-engine-save-1'] === userSave,
    slot1Chars: (ui.storage['chaos-engine-save-1'] || '').length
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify(ui, null, 2));
  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'three built-in examples load through the menu without writing user slots';
}

const MOBILE_DEVICES = ['iPhone 13', 'Pixel 5'];

async function driveExampleScenesOnDevice(page, deviceName, KnownDevices) {
  const device = KnownDevices[deviceName];
  if (!device) throw new Error(`Unknown mobile device profile: ${deviceName}`);
  await page.emulate(device);
  const prefix = deviceName.toLowerCase().replace(/\s+/g, '-') + '-';

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#save-slot', { timeout: 15000 });
  await page.waitForFunction(() => Boolean(window.ChaosExamples) && Boolean(document.getElementById('btn-load')), { timeout: 15000 });

  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const layout = await controlLayout(page);
  const inView = Boolean(layout.slot?.inView && layout.load?.inView && layout.save?.inView);
  await shot(page, `${prefix}01-menu.png`);
  record(`${prefix}controls-in-view`, touch && inView, { device: deviceName, touch, layout });

  let ui = await readUi(page);
  const listed = ['example:kinetic-cascade', 'example:halo-garden', 'example:wreck-deck', '1', '2', '3']
    .every(value => ui.slotValues.includes(value));
  record(`${prefix}menu`, listed, { slotValues: ui.slotValues });

  await page.evaluate(() => localStorage.clear());
  await page.select('#save-slot', '1');
  await tapEl(page, '[data-tool="ball"]');
  await tapCanvas(page);
  await page.waitForFunction(() => Number(document.getElementById('obj-count')?.textContent) > 0, { timeout: 8000 });
  await tapEl(page, '#btn-save');
  await new Promise(resolve => setTimeout(resolve, 250));
  ui = await readUi(page);
  if (ui.dialogOpen) {
    await tapEl(page, '#save-accept');
    await new Promise(resolve => setTimeout(resolve, 250));
    ui = await readUi(page);
  }
  const userSave = ui.storage['chaos-engine-save-1'];
  record(`${prefix}user-slot-saved`, Boolean(parseSave(userSave)?.graph) && ui.feedback.includes('SAVED TO SLOT'), {
    feedback: ui.feedback,
    chars: (userSave || '').length
  });

  const scenes = [
    { id: 'kinetic-cascade', file: `${prefix}02-kinetic-cascade.png`, name: 'KINETIC CASCADE', planet: 'EARTH' },
    { id: 'halo-garden', file: `${prefix}03-halo-garden.png`, name: 'HALO GARDEN', planet: 'MOON' },
    { id: 'wreck-deck', file: `${prefix}04-wreck-deck.png`, name: 'WRECK DECK', planet: 'EARTH' }
  ];
  for (const scene of scenes) {
    await closeDialogIfOpen(page);
    await page.select('#save-slot', `example:${scene.id}`);
    try {
      await page.waitForFunction(() => document.getElementById('save-confirm')?.open, { timeout: 4000 });
    } catch {
      ui = await readUi(page);
      record(`${prefix}tap-example-${scene.id}`, false, {
        dialogOpen: ui.dialogOpen,
        dialogTitle: ui.dialogTitle,
        error: 'confirm did not open after selecting the example'
      });
      continue;
    }
    ui = await readUi(page);
    record(`${prefix}tap-example-${scene.id}`, ui.dialogOpen && /Load (Kinetic Cascade|Halo Garden|Wreck Deck)\?/.test(ui.dialogTitle) && ui.dialogTitle.toUpperCase().includes(scene.name), {
      dialogOpen: ui.dialogOpen,
      dialogTitle: ui.dialogTitle
    });
    await tapEl(page, '#save-accept');
    await new Promise(resolve => setTimeout(resolve, 900));
    ui = await readUi(page);
    await shot(page, scene.file);
    record(`${prefix}load-${scene.id}`, ui.feedback.includes(`LOADED ${scene.name}`) && Number(ui.objCount) > 5 && ui.planet === scene.planet, {
      feedback: ui.feedback,
      objCount: ui.objCount,
      planet: ui.planet
    });
  }

  await closeDialogIfOpen(page);
  await page.select('#save-slot', '1');
  await tapEl(page, '#btn-load');
  await page.waitForFunction(() => document.getElementById('save-confirm')?.open, { timeout: 4000 });
  await tapEl(page, '#save-accept');
  await new Promise(resolve => setTimeout(resolve, 600));
  ui = await readUi(page);
  record(`${prefix}load-user-slot`, ui.feedback.includes('LOADED SLOT') && Number(ui.objCount) > 0, {
    feedback: ui.feedback,
    objCount: ui.objCount
  });

  const slotsSafe = ui.storage['chaos-engine-save-1'] === userSave
    && !ui.storage['chaos-engine-save-2']
    && !ui.storage['chaos-engine-save-3']
    && ['example:kinetic-cascade', 'example:halo-garden', 'example:wreck-deck'].every(value => ui.slotValues.includes(value));
  record(`${prefix}slots-untouched`, slotsSafe, {
    sameUserSlot: ui.storage['chaos-engine-save-1'] === userSave,
    storageKeys: ui.storageKeys
  });

  return { ui, userSave, prefix };
}

async function driveExampleScenesMobile(page, KnownDevices) {
  let last = null;
  for (const deviceName of MOBILE_DEVICES) {
    last = await driveExampleScenesOnDevice(page, deviceName, KnownDevices);
  }
  const ui = last.ui;
  fs.writeFileSync(path.join(outDir, 'localStorage.json'), JSON.stringify({
    keys: ui.storageKeys,
    userSlotUnchanged: ui.storage['chaos-engine-save-1'] === last.userSave,
    slot1Chars: (ui.storage['chaos-engine-save-1'] || '').length
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify(ui, null, 2));
  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'iPhone and Pixel tap journeys load each example and the user slots';
}

const LAYOUT_HINT_MIN_WIDTH = 200;
const LAYOUT_HINT_MAX_LINES = 2;
const LAYOUT_SLOT_MIN_WIDTH = 180;
const LAYOUT_VIEWPORTS = [
  { name: 'mobile', width: 390, height: 664, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
];

function inspectSaveLayout() {
  const box = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const overlap = (a, b) => a && b && a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  const inView = r => r && r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
  const hint = document.getElementById('save-slot-hint');
  const slot = document.getElementById('save-slot');
  const hintBox = box(hint);
  const slotBox = box(slot);
  const style = hint ? getComputedStyle(hint) : null;
  const lineHeight = style ? (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2) : 0;
  const lines = hint && lineHeight ? hint.scrollHeight / lineHeight : 0;
  const controls = ['btn-save', 'btn-load', 'btn-clear', 'btn-pause'].map(id => {
    const el = document.getElementById(id);
    return { id, box: box(el), inView: inView(box(el)) };
  });
  const overlaps = controls.filter(control => overlap(hintBox, control.box)).map(control => control.id);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    hint: {
      text: hint?.textContent || '',
      box: hintBox,
      lines,
      overflowX: hint ? hint.scrollWidth > hint.clientWidth + 1 : false,
      overflowY: hint ? hint.scrollHeight > hint.clientHeight + 2 : false
    },
    slot: { box: slotBox, overflowX: slot ? slot.scrollWidth > slot.clientWidth + 1 : false },
    cluster: box(document.getElementById('save-cluster')),
    controls,
    overlaps,
    saveInView: inView(box(document.getElementById('btn-save'))),
    loadInView: inView(box(document.getElementById('btn-load'))),
    slotInView: inView(slotBox)
  };
}

async function driveUiLayout(page) {
  const reports = [];
  for (const viewport of LAYOUT_VIEWPORTS) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#save-slot', { timeout: 15000 });
    await page.waitForFunction(() => Boolean(document.getElementById('save-slot-hint')), { timeout: 8000 });

    const rest = await controlLayout(page);
    record(`${viewport.name}-controls-in-view`, Boolean(rest.slot?.inView && rest.load?.inView && rest.save?.inView), {
      viewport: { width: viewport.width, height: viewport.height },
      layout: rest
    });

    await page.select('#save-slot', 'example:kinetic-cascade');
    await new Promise(resolve => setTimeout(resolve, 150));
    await closeDialogIfOpen(page);
    await page.evaluate(() => {
      const dialog = document.getElementById('save-confirm');
      if (dialog?.open) {
        try { dialog.close(); } catch { dialog.removeAttribute('open'); }
      }
    });

    const measured = await page.evaluate(inspectSaveLayout);
    const hintWide = (measured.hint.box?.width || 0) >= LAYOUT_HINT_MIN_WIDTH;
    const hintLines = measured.hint.lines <= LAYOUT_HINT_MAX_LINES + 0.2;
    const slotWide = (measured.slot.box?.width || 0) >= LAYOUT_SLOT_MIN_WIDTH;
    const noOverlap = measured.overlaps.length === 0;
    const noOverflow = !measured.hint.overflowX;
    const visible = measured.saveInView && measured.loadInView && measured.slotInView;
    await shot(page, `ui-layout-${viewport.name}.png`);
    record(`${viewport.name}-hint-layout`, hintWide && hintLines && slotWide && noOverlap && noOverflow && visible && /Rube Goldberg|Kinetic/i.test(measured.hint.text), {
      limits: { minHintWidth: LAYOUT_HINT_MIN_WIDTH, maxHintLines: LAYOUT_HINT_MAX_LINES, minSlotWidth: LAYOUT_SLOT_MIN_WIDTH },
      measured
    });
    reports.push({ viewport: viewport.name, measured });
  }

  fs.writeFileSync(path.join(outDir, 'layout.json'), JSON.stringify(reports, null, 2));
  fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify(reports[0], null, 2));
  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'save-slot hint stays readable on 390px and 1280px without overlapping SAVE/LOAD';
}

async function driveDeflect(page) {
  for (const viewport of [{name:'mobile',width:390,height:664,isMobile:true,hasTouch:true}, {name:'desktop',width:1280,height:800}]) {
    await page.setViewport(viewport);
    await page.goto(url, {waitUntil:'networkidle0'});
    const tap = async selector => {
      await page.$eval(selector, element => element.scrollIntoView({block:'nearest',inline:'center'}));
      if (viewport.hasTouch) await page.tap(selector); else await page.click(selector);
    };
    const point = async (x,y) => viewport.hasTouch ? page.touchscreen.tap(x,y) : page.mouse.click(x,y);
    await tap('#btn-pause');
    await tap('[data-tool="ball"]');
    const rect=await page.$eval('#game',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
    const x=rect.x+rect.w*0.45,y=rect.y+rect.h*0.4;
    await point(x,y);
    const observe=()=>page.evaluate(()=>{
      const body=Composite.allBodies(world).find(b=>b.label!=='wall'&&!b.isStatic);
      return body ? {id:body.id,x:body.position.x,y:body.position.y,vx:body.velocity.x,vy:body.velocity.y,spin:body.angularVelocity,angle:body.angle} : null;
    });
    record(viewport.name+'-existing-ball',Boolean(await observe()),await observe());
    await tap('[data-tool="launch"]'); await point(x,y); await point(x+70,y);
    const before=await observe();
    await tap('[data-tool="draw"]');
    await tap('[data-tool="deflect"]');
    const placement=await page.$eval('#toolbar',el=>({last:el.lastElementChild.dataset.tool,order:el.querySelector('[data-tool=deflect]').previousElementSibling.dataset.tool==='clutch',active:el.querySelector('[data-tool=deflect]').classList.contains('active'),visible:(()=>{const r=el.querySelector('[data-tool=deflect]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
    record(viewport.name+'-selected-deflect-after-clutch',placement.order&&placement.active&&placement.visible,placement);
    await shot(page,viewport.name+'-01-selected.png');
    await point(x,y);
    const after=await observe();
    const feedback=await page.$eval('#deflect-feedback',el=>el.textContent);
    record(viewport.name+'-quarter-turn',Math.hypot(before.vx,before.vy)>0.12 && Math.abs(after.vx+before.vy)<1e-8 && Math.abs(after.vy-before.vx)<1e-8 && after.spin===before.spin && after.angle===before.angle && /90/.test(feedback),{before,after,feedback});
    await shot(page,viewport.name+'-02-deflected.png');
    await tap('#btn-pause');
    await new Promise(resolve=>setTimeout(resolve,180));
    await tap('#btn-pause');
    const moved=await observe();
    record(viewport.name+'-canvas-motion',moved.y>after.y+2,{after,moved});
    await shot(page,viewport.name+'-03-motion.png');
    await tap('#btn-clear');
    await page.waitForFunction(()=>!clearAnimating);
    const cleanup=await page.evaluate(()=>({count:document.querySelector('#obj-count').textContent,feedback:document.querySelector('#deflect-feedback').textContent,bodies:Composite.allBodies(world).filter(b=>b.label!=='wall').length,storage:{...localStorage}}));
    record(viewport.name+'-clear-cleanup',cleanup.bodies===0&&cleanup.feedback==='',cleanup);
    await shot(page,viewport.name+'-04-clear.png');
    fs.writeFileSync(path.join(outDir,viewport.name+'-state.json'),JSON.stringify({before,after,moved,cleanup},null,2));
  }
  record('no-runtime-errors',!consoleLines.some(line=>/^\[(error|pageerror)\]/.test(line)),consoleLines);
  result.passed=result.failures.length===0;
}

async function driveTrim(page) {
  for (const viewport of [{name:'mobile',width:390,height:664,isMobile:true,hasTouch:true}, {name:'desktop',width:1280,height:800}]) {
    await page.setViewport(viewport);
    await page.goto(url, {waitUntil:'networkidle0'});
    const tap = async selector => {
      await page.$eval(selector, element => element.scrollIntoView({block:'nearest',inline:'center'}));
      if (viewport.hasTouch) await page.tap(selector); else await page.click(selector);
    };
    const point = async (x,y) => viewport.hasTouch ? page.touchscreen.tap(x,y) : page.mouse.click(x,y);
    await tap('#btn-pause');
    await tap('[data-tool="ball"]');
    const rect=await page.$eval('#game',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
    const x=rect.x+rect.w*0.45,y=rect.y+rect.h*0.4;
    await point(x,y);
    const observe=()=>page.evaluate(()=>{
      const body=Composite.allBodies(world).find(b=>b.label!=='wall'&&!b.isStatic);
      return body ? {id:body.id,x:body.position.x,y:body.position.y,vx:body.velocity.x,vy:body.velocity.y,spin:body.angularVelocity,angle:body.angle} : null;
    });
    record(viewport.name+'-existing-ball',Boolean(await observe()),await observe());
    await tap('[data-tool="launch"]'); await point(x,y); await point(x+70,y);
    const before=await observe();
    await tap('[data-tool="draw"]');
    if (viewport.hasTouch) {
      await tap('[data-tool="trim"]');
    } else {
      await page.$eval('[data-tool=trim]',el=>el.scrollIntoView({block:'nearest',inline:'center'}));
      await page.focus('[data-tool=trim]');
      await page.keyboard.press('Enter');
    }
    const placement=await page.$eval('#toolbar',el=>({last:el.lastElementChild.dataset.tool,previous:el.lastElementChild.previousElementSibling.dataset.tool,drawMode,active:el.querySelector('[data-tool=trim]').classList.contains('active'),visible:(()=>{const r=el.querySelector('[data-tool=trim]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
    record(viewport.name+'-final-selected-button',placement.last==='trim'&&placement.previous==='deflect'&&!placement.drawMode&&placement.active&&placement.visible,placement);
    await shot(page,viewport.name+'-01-selected.png');
    await point(x,y);
    const after=await observe();
    const feedback=await page.$eval('#trim-feedback',el=>el.textContent);
    record(viewport.name+'-spin-trim',Math.abs(before.spin)>0.0001 && after.vx===before.vx && after.vy===before.vy && after.spin===0 && after.angle===before.angle && /SPIN STOPPED/.test(feedback),{before,after,feedback});
    await shot(page,viewport.name+'-02-trimmed.png');
    await tap('#btn-pause');
    await new Promise(resolve=>setTimeout(resolve,180));
    await tap('#btn-pause');
    const moved=await observe();
    record(viewport.name+'-canvas-motion',Math.hypot(moved.x-after.x,moved.y-after.y)>2,{after,moved});
    await shot(page,viewport.name+'-03-motion.png');
    await tap('#btn-clear');
    await page.waitForFunction(()=>!clearAnimating);
    const cleanup=await page.evaluate(()=>({count:document.querySelector('#obj-count').textContent,feedback:document.querySelector('#trim-feedback').textContent,bodies:Composite.allBodies(world).filter(b=>b.label!=='wall').length,storage:{...localStorage}}));
    record(viewport.name+'-clear-cleanup',cleanup.bodies===0&&cleanup.feedback==='',cleanup);
    await shot(page,viewport.name+'-04-clear.png');
    fs.writeFileSync(path.join(outDir,viewport.name+'-state.json'),JSON.stringify({before,after,moved,cleanup},null,2));
    record(viewport.name+'-no-runtime-errors',!consoleLines.some(line=>/^\[(error|pageerror)\]/.test(line)),consoleLines);
  }
  result.passed=result.failures.length===0;
}

async function driveLogicalWorld(page) {
  const views=[{name:'phone',width:390,height:844},{name:'ipad',width:820,height:1180},{name:'desktop',width:1280,height:800}];
  const observe=()=>page.evaluate(()=>({bounds:{...worldBounds},camera:{...camera},
    graph:JSON.stringify({
      bodies:captureGameState().bodies.map(b=>({id:b.id,label:b.label,type:b.render?.type,position:{...b.position},velocity:{...b.velocity},angle:b.angle,isStatic:b.isStatic})),
      constraints:captureGameState().constraints.map(c=>({label:c.label,length:c.length,pointA:{...c.pointA},pointB:{...c.pointB},bodyA:c.bodyA?.id,bodyB:c.bodyB?.id}))
    }),
    portals:portals.map(p=>({x:p.x,y:p.y,radius:p.radius,partner:p.partner,color:p.color})),
    orbits:[...orbitingBodies].map(([b,o])=>({bodyId:b.id,position:{...b.position},center:{...o.center},radius:o.radius,direction:o.direction})),
    storageKeys:Object.keys(localStorage)}));
  let expected;
  for(const view of views) {
    await page.setViewport(view); await page.goto(url,{waitUntil:'networkidle0'});
    await page.select('#save-slot','example:halo-garden'); await page.click('#btn-load');
    if(await page.$eval('#save-confirm',d=>d.open)) await page.click('#save-accept');
    await page.click('#btn-pause');
    // Reload the saved paused snapshot via actual SAVE/LOAD to freeze the graph
    // before comparing orientation changes (never call a state setter).
    await page.select('#save-slot','1'); await page.click('#btn-save');
    if(await page.$eval('#save-confirm',d=>d.open)) await page.click('#save-accept');
    const state=await observe();
    record(view.name+'-halo-geometry',Math.abs(state.portals[1].x-state.portals[0].x-300)<1e-8 && Math.abs(Math.hypot(state.portals[0].x-state.bounds.width/2,state.portals[0].y-state.bounds.height*0.46)-150)<1e-6,state);
    await shot(page,view.name+'-halo.png');
    const before=await observe();
    await page.setViewport(view.name==='desktop'?views[0]:views[2]);
    await page.evaluate(()=>{window.dispatchEvent(new Event('resize')); if (typeof resize==='function') resize();});
    await new Promise(r=>setTimeout(r,50));
    const after=await observe();
    record(view.name+'-resize-continuity',
      before.graph===after.graph &&
      JSON.stringify(before.portals)===JSON.stringify(after.portals) &&
      JSON.stringify(before.orbits)===JSON.stringify(after.orbits) &&
      JSON.stringify(before.bounds)===JSON.stringify(after.bounds) &&
      JSON.stringify(before.camera)!==JSON.stringify(after.camera),
      {before:{bounds:before.bounds,camera:before.camera,graph:before.graph,portals:before.portals,orbits:before.orbits},
       after:{bounds:after.bounds,camera:after.camera,graph:after.graph,portals:after.portals,orbits:after.orbits}});
  }
  // Prove actual portal entry (teleport), not decorative overlap, at each device size.
  for(const view of views) {
    await page.setViewport(view); await page.goto(url,{waitUntil:'networkidle0'});
    await page.select('#save-slot','example:halo-garden'); await page.click('#btn-load');
    if(await page.$eval('#save-confirm',d=>d.open)) await page.click('#save-accept');
    const proof=await page.evaluate(async()=>{
      const star=[...orbitingBodies].find(([b,o])=>Math.abs(o.radius-150)<1e-6);
      if(!star) return {ok:false,reason:'missing-star'};
      const body=star[0];
      const left={x:portals[0].x,y:portals[0].y};
      const right={x:portals[1].x,y:portals[1].y};
      const onPath=Math.abs(Math.hypot(right.x-worldBounds.width/2,right.y-worldBounds.height*0.46)-150)<1e-6
        && Math.abs(Math.hypot(left.x-worldBounds.width/2,left.y-worldBounds.height*0.46)-150)<1e-6;
      if(!onPath) return {ok:false,reason:'portals-off-path',left,right,bounds:worldBounds};
      paused=false;
      let after=null;
      for(let i=0;i<90;i++){
        await new Promise(r=>requestAnimationFrame(r));
        after={x:body.position.x,y:body.position.y,cd:portalCooldowns.has(body.id)};
        if(after.cd && Math.hypot(after.x-left.x,after.y-left.y)<40) break;
      }
      paused=true;
      return {ok:!!(after&&after.cd&&Math.hypot(after.x-left.x,after.y-left.y)<40), after, left, right, star:{x:star[0].position.x,y:star[0].position.y,r:star[1].radius}, bounds:{...worldBounds}};
    });
    record(view.name+'-halo-portal-entry',proof.ok,proof);
    await shot(page,view.name+'-halo-entry.png');
  }
  await page.goto(url,{waitUntil:'networkidle0'}); await page.click('#btn-pause');
  await page.click('[data-tool=ball]'); await clickCanvas(page);
  await page.select('#save-slot','2'); await page.click('#btn-save');
  if(await page.$eval('#save-confirm',d=>d.open)) await page.click('#save-accept');
  expected=await observe(); await shot(page,'user-world-saved.png');
  for(const view of views) {
    await page.setViewport(view); await page.reload({waitUntil:'networkidle0'});
    await page.select('#save-slot','2'); await page.click('#btn-load');
    if(await page.$eval('#save-confirm',d=>d.open)) await page.click('#save-accept');
    const state=await observe();
    record(view.name+'-user-roundtrip',state.graph===expected.graph&&JSON.stringify(state.bounds)===JSON.stringify(expected.bounds),state);
    await shot(page,view.name+'-user-loaded.png');
  }
  fs.writeFileSync(path.join(outDir,'logical-world.json'),JSON.stringify(result.steps,null,2));
  record('unfiltered-runtime-errors',!consoleLines.some(line=>/^\[(error|pageerror)\]/.test(line)),consoleLines);
  result.passed=result.failures.length===0;
}

const journeys = {
  'logical-world': driveLogicalWorld,
  'trim': driveTrim,
  'deflect': driveDeflect,
  'save-load': driveSaveLoad,
  'example-scenes': driveExampleScenes,
  'example-scenes-mobile': driveExampleScenesMobile,
  'ui-layout': driveUiLayout
};
if (!journeys[journey]) {
  console.error(`unknown journey: ${journey}`);
  process.exit(2);
}

const launch = puppeteer.launch || puppeteer.default?.launch;
const browser = await launch({
  executablePath: chromeBin,
  headless: 'new',
  userDataDir,
  args: [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,800'
  ]
});

try {
  const page = await browser.newPage();
  if (journey !== 'example-scenes-mobile' && journey !== 'ui-layout') await page.setViewport({ width: 1280, height: 800 });
  page.on('console', message => {
    consoleLines.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', error => {
    consoleLines.push(`[pageerror] ${error.message}`);
  });
  await journeys[journey](page, KnownDevices);
} finally {
  fs.writeFileSync(path.join(outDir, 'console.log'), consoleLines.join('\n') + '\n');
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.passed) {
  console.error(`drive ${journey} failed on origin=${origin}; see ${outDir}/result.json`);
  process.exit(1);
}
console.log(`drive ${journey} passed on origin=${origin}; evidence ${outDir}`);

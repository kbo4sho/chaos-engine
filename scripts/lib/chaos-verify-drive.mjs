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

async function clickCanvas(page) {
  const box = await page.$eval('#game', canvas => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x + rect.width * 0.42, y: rect.y + rect.height * 0.32, width: rect.width, height: rect.height };
  });
  await page.mouse.click(box.x, box.y);
  return box;
}

async function tapCanvas(page) {
  const box = await page.$eval('#game', canvas => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x + rect.width * 0.42, y: rect.y + rect.height * 0.32, width: rect.width, height: rect.height };
  });
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
    const placement=await page.$eval('#toolbar',el=>({last:el.querySelector('[data-tool=trim]').dataset.tool,previous:el.querySelector('[data-tool=trim]').previousElementSibling.dataset.tool,drawMode,active:el.querySelector('[data-tool=trim]').classList.contains('active'),visible:(()=>{const r=el.querySelector('[data-tool=trim]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
    record(viewport.name+'-selected-after-deflect',placement.last==='trim'&&placement.previous==='deflect'&&!placement.drawMode&&placement.active&&placement.visible,placement);
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

async function driveBank(page) {
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
    await tap('[data-tool="launch"]'); await point(x,y); await point(x+60,y+45);
    const before=await observe();
    await tap('[data-tool="draw"]');
    if (viewport.hasTouch) {
      await tap('[data-tool="bank"]');
    } else {
      await page.$eval('[data-tool=bank]',el=>el.scrollIntoView({block:'nearest',inline:'center'}));
      await page.focus('[data-tool=bank]');
      await page.keyboard.press('Enter');
    }
    const placement=await page.$eval('#toolbar',el=>({last:el.lastElementChild.dataset.tool,previous:el.lastElementChild.previousElementSibling.dataset.tool,drawMode,active:el.querySelector('[data-tool=bank]').classList.contains('active'),visible:(()=>{const r=el.querySelector('[data-tool=bank]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
    record(viewport.name+'-final-selected-button',placement.last==='bank'&&placement.previous==='trim'&&!placement.drawMode&&placement.active&&placement.visible,placement);
    await shot(page,viewport.name+'-01-selected.png');
    await point(x,y);
    const after=await observe();
    const feedback=await page.$eval('#bank-feedback',el=>el.textContent);
    record(viewport.name+'-axis-reflection',Math.hypot(after.vx-before.vx,after.vy-before.vy)>0.1 && Math.abs(Math.hypot(after.vx,after.vy)-Math.hypot(before.vx,before.vy))<1e-8 && Math.abs(before.spin)>0.0001 && Math.abs(after.vx-(Math.cos(2*before.angle)*before.vx+Math.sin(2*before.angle)*before.vy))<1e-8 && Math.abs(after.vy-(Math.sin(2*before.angle)*before.vx-Math.cos(2*before.angle)*before.vy))<1e-8 && Math.abs(after.spin-before.spin)<1e-9 && after.angle===before.angle && /TRAVEL BANKED/.test(feedback),{before,after,feedback});
    await shot(page,viewport.name+'-02-banked.png');
    await tap('#btn-pause');
    await new Promise(resolve=>setTimeout(resolve,180));
    await tap('#btn-pause');
    const moved=await observe();
    record(viewport.name+'-canvas-motion',Math.hypot(moved.x-after.x,moved.y-after.y)>2,{after,moved});
    await shot(page,viewport.name+'-03-motion.png');
    await tap('#btn-clear');
    await page.waitForFunction(()=>!clearAnimating);
    const cleanup=await page.evaluate(()=>({count:document.querySelector('#obj-count').textContent,feedback:document.querySelector('#bank-feedback').textContent,bodies:Composite.allBodies(world).filter(b=>b.label!=='wall').length,storage:{...localStorage}}));
    record(viewport.name+'-clear-cleanup',cleanup.bodies===0&&cleanup.feedback==='',cleanup);
    await shot(page,viewport.name+'-04-clear.png');
    fs.writeFileSync(path.join(outDir,viewport.name+'-state.json'),JSON.stringify({before,after,moved,cleanup},null,2));
    record(viewport.name+'-no-runtime-errors',!consoleLines.some(line=>/^\[(error|pageerror)\]/.test(line)),consoleLines);
  }
  result.passed=result.failures.length===0;
}

async function driveDino(page) {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 664, isMobile: true, hasTouch: true }
  ]) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#game', { timeout: 15000 });
    await page.waitForFunction(() => Boolean(window.ChaosEngine) && Boolean(document.querySelector('[data-tool="dino"]')), { timeout: 15000 });

    const tap = async selector => {
      await page.$eval(selector, element => element.scrollIntoView({ block: 'nearest', inline: 'center' }));
      if (viewport.hasTouch) await page.tap(selector); else await page.click(selector);
    };
    const point = async (x, y) => viewport.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    const dinoButton = () => page.$eval('[data-tool="dino"]', el => {
      const box = el.getBoundingClientRect();
      return {
        active: el.classList.contains('active'),
        label: el.querySelector('.dino-label')?.textContent || '',
        icon: el.querySelector('.dino-icon')?.textContent || '',
        aria: el.getAttribute('aria-label') || '',
        visible: box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= innerWidth + 1
      };
    });
    const kinds = () => page.evaluate(() => Composite.allBodies(world)
      .filter(body => body.render?.type === 'dino')
      .map(body => body.render.dinoKind));

    await tap('#btn-pause');
    await tap('[data-tool="dino"]');
    let button = await dinoButton();
    record(`${viewport.name}-select-rex`, button.active && button.label === 'REX' && button.visible && /T\. rex/i.test(button.aria), button);

    const rect = await page.$eval('#game', canvas => {
      const box = canvas.getBoundingClientRect();
      return { x: box.x, y: box.y, w: box.width, h: box.height };
    });
    const mid = { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.30 };
    const portraits = [
      { kind: 'trex', label: 'REX', file: '01-trex.png', clicks: 0 },
      { kind: 'triceratops', label: 'TRI', file: '02-triceratops.png', clicks: 1 },
      { kind: 'sauropod', label: 'LONG', file: '03-sauropod.png', clicks: 2 }
    ];

    for (const portrait of portraits) {
      for (let n = 0; n < portrait.clicks; n++) await tap('[data-tool="dino"]');
      button = await dinoButton();
      record(`${viewport.name}-cycle-${portrait.kind}`, button.active && button.label === portrait.label, button);
      await point(mid.x, mid.y);
      await page.waitForFunction(() => Number(document.getElementById('obj-count')?.textContent) >= 1, { timeout: 8000 });
      await new Promise(resolve => setTimeout(resolve, 220));
      const only = await kinds();
      record(`${viewport.name}-spawn-${portrait.kind}`, only.length === 1 && only[0] === portrait.kind, { only });
      await shot(page, `${viewport.name}-${portrait.file}`);
      await tap('#btn-clear');
      await page.waitForFunction(() => !clearAnimating, { timeout: 8000 });
    }

    const spots = [
      { kind: 'trex', label: 'REX', x: rect.x + rect.w * 0.28, y: rect.y + rect.h * 0.30 },
      { kind: 'triceratops', label: 'TRI', x: rect.x + rect.w * 0.50, y: rect.y + rect.h * 0.30 },
      { kind: 'sauropod', label: 'LONG', x: rect.x + rect.w * 0.72, y: rect.y + rect.h * 0.30 }
    ];
    for (let index = 0; index < spots.length; index++) {
      const spot = spots[index];
      if (index > 0) await tap('[data-tool="dino"]');
      button = await dinoButton();
      record(`${viewport.name}-scene-cycle-${spot.kind}`, button.active && button.label === spot.label, button);
      await point(spot.x, spot.y);
      await page.waitForFunction(count => Number(document.getElementById('obj-count')?.textContent) >= count, { timeout: 8000 }, index + 1);
    }

    const placed = await kinds();
    const ui = await readUi(page);
    record(`${viewport.name}-three-kinds`, placed.length === 3 && placed[0] === 'trex' && placed[1] === 'triceratops' && placed[2] === 'sauropod' && Number(ui.objCount) >= 3, { placed, objCount: ui.objCount });

    if (viewport.name === 'desktop') {
      await page.select('#save-slot', '1');
      await tap('#btn-save');
      await new Promise(resolve => setTimeout(resolve, 200));
      let saveUi = await readUi(page);
      if (saveUi.dialogOpen) {
        await tap('#save-accept');
        await new Promise(resolve => setTimeout(resolve, 250));
        saveUi = await readUi(page);
      }
      const saved = parseSave(saveUi.storage['chaos-engine-save-1']);
      record('desktop-save', saveUi.feedback.includes('SAVED TO SLOT') && Boolean(saved?.graph) && saved?.version === 1 && !misleadingStorageError(saveUi.feedback), {
        feedback: saveUi.feedback,
        version: saved?.version || null
      });

      await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForSelector('#btn-load', { timeout: 15000 });
      const persistOk = Boolean(parseSave((await readUi(page)).storage['chaos-engine-save-1'])?.graph);
      record('desktop-reload-persist', persistOk, { persistOk });

      await tap('#btn-load');
      await new Promise(resolve => setTimeout(resolve, 200));
      let loadUi = await readUi(page);
      if (loadUi.dialogOpen) {
        await tap('#save-accept');
        await new Promise(resolve => setTimeout(resolve, 300));
        loadUi = await readUi(page);
      }
      const loadedKinds = await kinds();
      await shot(page, 'desktop-04-after-load.png');
      record('desktop-load-kinds', loadUi.feedback.includes('LOADED SLOT') && Number(loadUi.objCount) >= 3 &&
        loadedKinds[0] === 'trex' && loadedKinds[1] === 'triceratops' && loadedKinds[2] === 'sauropod', {
        feedback: loadUi.feedback,
        objCount: loadUi.objCount,
        loadedKinds
      });
      fs.writeFileSync(path.join(outDir, 'localStorage.json'), JSON.stringify({
        keys: loadUi.storageKeys,
        slot1Chars: (loadUi.storage['chaos-engine-save-1'] || '').length
      }, null, 2));
      fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify({ ...loadUi, loadedKinds }, null, 2));
    } else {
      await shot(page, 'mobile-01-cycle.png');
    }

    await tap('#btn-clear');
    await page.waitForFunction(() => !clearAnimating, { timeout: 8000 });
    const cleanup = await page.evaluate(() => ({
      count: document.getElementById('obj-count')?.textContent,
      label: document.querySelector('[data-tool="dino"] .dino-label')?.textContent,
      bodies: Composite.allBodies(world).filter(body => body.label !== 'wall').length,
      dinoKind
    }));
    record(`${viewport.name}-clear`, cleanup.bodies === 0 && cleanup.label === 'REX' && cleanup.dinoKind === 'trex', cleanup);
    await shot(page, `${viewport.name}-05-clear.png`);
    record(`${viewport.name}-no-runtime-errors`, !consoleLines.some(line => /^\[(error|pageerror)\]/.test(line)), consoleLines.slice(-8));
  }
  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'three dinosaur types spawn, persist through save/load, and clear on desktop and phone';
}

async function driveCarRocket(page) {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 664, isMobile: true, hasTouch: true }
  ]) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#game', { timeout: 15000 });
    await page.waitForFunction(() => Boolean(window.ChaosEngine) && Boolean(document.querySelector('[data-tool="car"]')) && Boolean(document.querySelector('[data-tool="rocket"]')), { timeout: 15000 });

    const tap = async selector => {
      await page.$eval(selector, element => element.scrollIntoView({ block: 'nearest', inline: 'center' }));
      if (viewport.hasTouch) await page.tap(selector); else await page.click(selector);
    };
    const point = async (x, y) => viewport.hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    const toolButton = (tool, labelSel) => page.$eval(`[data-tool="${tool}"]`, (el, labelSel) => {
      const box = el.getBoundingClientRect();
      return {
        active: el.classList.contains('active'),
        label: el.querySelector(labelSel)?.textContent || '',
        icon: el.querySelector('.icon')?.textContent || '',
        aria: el.getAttribute('aria-label') || '',
        visible: box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= innerWidth + 1
      };
    }, labelSel);
    const carKinds = () => page.evaluate(() => Composite.allBodies(world)
      .filter(body => body.render?.type === 'car-body')
      .map(body => body.render.carKind));
    const rocketKinds = () => page.evaluate(() => Composite.allBodies(world)
      .filter(body => body.render?.type === 'rocket')
      .map(body => body.render.rocketKind));

    await tap('#btn-pause');
    await tap('[data-tool="car"]');
    let button = await toolButton('car', '.car-label');
    record(`${viewport.name}-select-sports`, button.active && button.label === 'SPORT' && button.icon === '🚗' && button.visible && /sports car/i.test(button.aria), button);

    const rect = await page.$eval('#game', canvas => {
      const box = canvas.getBoundingClientRect();
      return { x: box.x, y: box.y, w: box.width, h: box.height };
    });
    const mid = { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.30 };
    const carPortraits = [
      { kind: 'sports', label: 'SPORT', file: '01-sports.png', clicks: 0, minCount: 3 },
      { kind: 'pickup', label: 'TRUCK', file: '02-pickup.png', clicks: 1, minCount: 3 },
      { kind: 'bus', label: 'BUS', file: '03-bus.png', clicks: 2, minCount: 3 }
    ];

    for (const portrait of carPortraits) {
      for (let n = 0; n < portrait.clicks; n++) await tap('[data-tool="car"]');
      button = await toolButton('car', '.car-label');
      record(`${viewport.name}-cycle-${portrait.kind}`, button.active && button.label === portrait.label && button.icon === '🚗', button);
      await point(mid.x, mid.y);
      await page.waitForFunction(count => Number(document.getElementById('obj-count')?.textContent) >= count, { timeout: 8000 }, portrait.minCount);
      await new Promise(resolve => setTimeout(resolve, 220));
      const only = await carKinds();
      record(`${viewport.name}-spawn-${portrait.kind}`, only.length === 1 && only[0] === portrait.kind, { only });
      await shot(page, `${viewport.name}-${portrait.file}`);
      await tap('#btn-clear');
      await page.waitForFunction(() => !clearAnimating && Number(document.getElementById('obj-count')?.textContent) === 0, { timeout: 8000 });
    }

    await tap('[data-tool="rocket"]');
    button = await toolButton('rocket', '.rocket-label');
    record(`${viewport.name}-select-classic`, button.active && button.label === 'FIN' && button.icon === '🚀' && button.visible && /finned rocket/i.test(button.aria), button);
    const rocketPortraits = [
      { kind: 'classic', label: 'FIN', file: '04-classic.png', clicks: 0 },
      { kind: 'shuttle', label: 'SHUT', file: '05-shuttle.png', clicks: 1 },
      { kind: 'firework', label: 'SPARK', file: '06-firework.png', clicks: 2 }
    ];
    for (const portrait of rocketPortraits) {
      for (let n = 0; n < portrait.clicks; n++) await tap('[data-tool="rocket"]');
      button = await toolButton('rocket', '.rocket-label');
      record(`${viewport.name}-cycle-${portrait.kind}`, button.active && button.label === portrait.label && button.icon === '🚀', button);
      await point(mid.x, mid.y);
      await page.waitForFunction(() => Number(document.getElementById('obj-count')?.textContent) >= 1, { timeout: 8000 });
      await new Promise(resolve => setTimeout(resolve, 220));
      const only = await rocketKinds();
      record(`${viewport.name}-spawn-${portrait.kind}`, only.length === 1 && only[0] === portrait.kind, { only });
      await shot(page, `${viewport.name}-${portrait.file}`);
      await tap('#btn-clear');
      await page.waitForFunction(() => !clearAnimating && Number(document.getElementById('obj-count')?.textContent) === 0, { timeout: 8000 });
    }

    const carSpots = [
      { kind: 'sports', label: 'SPORT', x: rect.x + rect.w * 0.22, y: rect.y + rect.h * 0.20 },
      { kind: 'pickup', label: 'TRUCK', x: rect.x + rect.w * 0.50, y: rect.y + rect.h * 0.20 },
      { kind: 'bus', label: 'BUS', x: rect.x + rect.w * 0.78, y: rect.y + rect.h * 0.20 }
    ];
    await tap('[data-tool="car"]');
    for (let index = 0; index < carSpots.length; index++) {
      const spot = carSpots[index];
      if (index > 0) await tap('[data-tool="car"]');
      button = await toolButton('car', '.car-label');
      record(`${viewport.name}-scene-cycle-${spot.kind}`, button.active && button.label === spot.label && button.icon === '🚗', button);
      await point(spot.x, spot.y);
      await page.waitForFunction(count => Number(document.getElementById('obj-count')?.textContent) >= count, { timeout: 8000 }, (index + 1) * 3);
    }

    const rocketSpots = [
      { kind: 'classic', label: 'FIN', x: rect.x + rect.w * 0.28, y: rect.y + rect.h * 0.34 },
      { kind: 'shuttle', label: 'SHUT', x: rect.x + rect.w * 0.50, y: rect.y + rect.h * 0.34 },
      { kind: 'firework', label: 'SPARK', x: rect.x + rect.w * 0.72, y: rect.y + rect.h * 0.34 }
    ];
    await tap('[data-tool="rocket"]');
    for (let index = 0; index < rocketSpots.length; index++) {
      const spot = rocketSpots[index];
      if (index > 0) await tap('[data-tool="rocket"]');
      button = await toolButton('rocket', '.rocket-label');
      record(`${viewport.name}-scene-cycle-${spot.kind}`, button.active && button.label === spot.label && button.icon === '🚀', button);
      await point(spot.x, spot.y);
      await page.waitForFunction(count => Number(document.getElementById('obj-count')?.textContent) >= count, { timeout: 8000 }, 9 + index + 1);
    }

    const placedCars = await carKinds();
    const placedRockets = await rocketKinds();
    const ui = await readUi(page);
    record(`${viewport.name}-three-car-kinds`, placedCars.length === 3 && placedCars[0] === 'sports' && placedCars[1] === 'pickup' && placedCars[2] === 'bus' && Number(ui.objCount) >= 12, { placedCars, objCount: ui.objCount });
    record(`${viewport.name}-three-rocket-kinds`, placedRockets.length === 3 && placedRockets[0] === 'classic' && placedRockets[1] === 'shuttle' && placedRockets[2] === 'firework', { placedRockets, objCount: ui.objCount });

    if (viewport.name === 'desktop') {
      await page.select('#save-slot', '1');
      await tap('#btn-save');
      await new Promise(resolve => setTimeout(resolve, 200));
      let saveUi = await readUi(page);
      if (saveUi.dialogOpen) {
        await tap('#save-accept');
        await new Promise(resolve => setTimeout(resolve, 250));
        saveUi = await readUi(page);
      }
      const saved = parseSave(saveUi.storage['chaos-engine-save-1']);
      record('desktop-save', saveUi.feedback.includes('SAVED TO SLOT') && Boolean(saved?.graph) && saved?.version === 1 && !misleadingStorageError(saveUi.feedback), {
        feedback: saveUi.feedback,
        version: saved?.version || null
      });

      await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForSelector('#btn-load', { timeout: 15000 });
      const persistOk = Boolean(parseSave((await readUi(page)).storage['chaos-engine-save-1'])?.graph);
      record('desktop-reload-persist', persistOk, { persistOk });

      await tap('#btn-load');
      await new Promise(resolve => setTimeout(resolve, 200));
      let loadUi = await readUi(page);
      if (loadUi.dialogOpen) {
        await tap('#save-accept');
        await new Promise(resolve => setTimeout(resolve, 300));
        loadUi = await readUi(page);
      }
      const loadedCars = await carKinds();
      const loadedRockets = await rocketKinds();
      await shot(page, 'desktop-07-after-load.png');
      record('desktop-load-kinds', loadUi.feedback.includes('LOADED SLOT') && Number(loadUi.objCount) >= 12 &&
        loadedCars[0] === 'sports' && loadedCars[1] === 'pickup' && loadedCars[2] === 'bus' &&
        loadedRockets[0] === 'classic' && loadedRockets[1] === 'shuttle' && loadedRockets[2] === 'firework', {
        feedback: loadUi.feedback,
        objCount: loadUi.objCount,
        loadedCars,
        loadedRockets
      });
      fs.writeFileSync(path.join(outDir, 'localStorage.json'), JSON.stringify({
        keys: loadUi.storageKeys,
        slot1Chars: (loadUi.storage['chaos-engine-save-1'] || '').length
      }, null, 2));
      fs.writeFileSync(path.join(outDir, 'page-state.json'), JSON.stringify({ ...loadUi, loadedCars, loadedRockets }, null, 2));
    } else {
      await shot(page, 'mobile-01-cycle.png');
    }

    await tap('#btn-clear');
    await page.waitForFunction(() => !clearAnimating && Number(document.getElementById('obj-count')?.textContent) === 0, { timeout: 8000 });
    const cleanup = await page.evaluate(() => ({
      count: document.getElementById('obj-count')?.textContent,
      carLabel: document.querySelector('[data-tool="car"] .car-label')?.textContent,
      rocketLabel: document.querySelector('[data-tool="rocket"] .rocket-label')?.textContent,
      carIcon: document.querySelector('[data-tool="car"] .icon')?.textContent,
      rocketIcon: document.querySelector('[data-tool="rocket"] .icon')?.textContent,
      bodies: Composite.allBodies(world).filter(body => body.label !== 'wall').length,
      carKind,
      rocketKind
    }));
    record(`${viewport.name}-clear`, cleanup.bodies === 0 && cleanup.carLabel === 'SPORT' && cleanup.rocketLabel === 'FIN' && cleanup.carKind === 'sports' && cleanup.rocketKind === 'classic' && cleanup.carIcon === '🚗' && cleanup.rocketIcon === '🚀', cleanup);
    await shot(page, `${viewport.name}-08-clear.png`);
    record(`${viewport.name}-no-runtime-errors`, !consoleLines.some(line => /^\[(error|pageerror)\]/.test(line)), consoleLines.slice(-8));
  }
  result.passed = result.failures.length === 0 && result.steps.every(step => step.ok);
  result.expected = 'three car types and three rocket types spawn, persist through save/load, and clear on desktop and phone';
}

const journeys = {
  'offline-workshop': async page => {
    const {verifyOfflineWorkshop} = await import('./verify-offline-workshop.mjs');
    await verifyOfflineWorkshop(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'machine-diagram': async page => {
    const {verifyMachineDiagram} = await import('./verify-machine-diagram.mjs');
    await verifyMachineDiagram(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'pair-training': async page => {
    const {verifyPairTraining} = await import('./verify-pair-training.mjs');
    await verifyPairTraining(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'repair-transfer': async page => {
    const {verifyRepairTransfer} = await import('./verify-repair-transfer.mjs');
    await verifyRepairTransfer(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'phone-startup': async page => {
    const {verifyPhoneStartup} = await import('./verify-phone-startup.mjs');
    await verifyPhoneStartup(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'qualification-course': async page => {
    const {verifyQualifications} = await import('./verify-qualification-course.mjs');
    await verifyQualifications(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'tool-notebook': async page => {
    const {verifyToolNotebook} = await import('./verify-tool-notebook.mjs');
    await verifyToolNotebook(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'unfinished-repairs': async page => {
    const {verifyUnfinished} = await import('./verify-unfinished-repairs.mjs');
    await verifyUnfinished(page, {url, record, shot, outDir});
    result.passed = result.failures.length === 0;
  },
  'experiment-exchange': async page => {
    const {verifyExperimentExchange} = await import('./verify-experiment-exchange.mjs');
    await verifyExperimentExchange(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'path-reader': async page => {
    const {verifyPathReader} = await import('./verify-path-reader.mjs');
    await verifyPathReader(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'match-cards': async page => {
    const {verifyMatchCards} = await import('./verify-match-cards.mjs');
    await verifyMatchCards(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'offline-races': async page => {
    const {verifyOfflineRaces} = await import('./verify-offline-races.mjs');
    await verifyOfflineRaces(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'shutter-sheets': async page => {
    const {verifyShutterSheets} = await import('./verify-shutter-sheets.mjs');
    await verifyShutterSheets(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'double-exposures': async page => {
    const {verifyDoubleExposures} = await import('./verify-double-exposures.mjs');
    await verifyDoubleExposures(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'replay-clips': async page => {
    const {verifyReplayClips} = await import('./verify-replay-clips.mjs');
    await verifyReplayClips(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'discovery': async page => {
    const {verifyDiscovery} = await import('./verify-discovery.mjs');
    await verifyDiscovery(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'friend-races': async page => {
    const {verifyFriendRaces} = await import('./verify-friend-races.mjs');
    await verifyFriendRaces(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'phone-bench': async page => {
    const {verifyPhoneBench} = await import('./verify-phone-bench.mjs');
    await verifyPhoneBench(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'spare-study': async page => {
    const {verifySpareStudy} = await import('./verify-spare-study.mjs');
    await verifySpareStudy(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'fault-desk': async page => {
    const {verifyFaultDesk} = await import('./verify-fault-desk.mjs');
    await verifyFaultDesk(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'grand-relays': async page => {
    const {verifyGrandRelays} = await import('./verify-grand-relays.mjs');
    await verifyGrandRelays(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'test-bay': async page => {
    const {verifyTestBay} = await import('./verify-test-bay.mjs');
    await verifyTestBay(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'field-course': async page => {
    const {verifyFieldCourse} = await import('./verify-field-course.mjs');
    await verifyFieldCourse(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'assembly-course': async page => {
    const {verifyAssembly} = await import('./verify-assembly-course.mjs');
    await verifyAssembly(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'operator-room': async page => {
    const {verifyOperatorRoom} = await import('./verify-operator-room.mjs');
    await verifyOperatorRoom(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'repair-coach': async page => {
    const {verifyRepairCoach} = await import('./verify-repair-coach.mjs');
    await verifyRepairCoach(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'flight-course': async page => {
    const {verifyFlight} = await import('./verify-flight-course.mjs');
    await verifyFlight(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'release-trials': async page => {
    const {verifyReleaseTrials} = await import('./verify-release-trials.mjs');
    await verifyReleaseTrials(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'drawing-exchange': async page => {
    const {verifyDrawingExchange} = await import('./verify-drawing-exchange.mjs');
    await verifyDrawingExchange(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'compound-designer': async page => {
    const {verifyCompoundDesigner} = await import('./verify-compound-designer.mjs');
    await verifyCompoundDesigner(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'design-bench': async page => {
    const {verifyDesignBench} = await import('./verify-design-bench.mjs');
    await verifyDesignBench(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'prediction-lab': async page => {
    const {verifyPredictions} = await import('./verify-prediction-lab.mjs');
    await verifyPredictions(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'sorting-course': async page => {
    const {verifySorting} = await import('./verify-sorting-course.mjs');
    await verifySorting(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'puzzle-library': async page => {
    const {verifyLibrary} = await import('./verify-puzzle-library.mjs');
    await verifyLibrary(page,{url,record,shot});
    result.passed = result.failures.length === 0;
  },
  'work-orders': async page => {
    const {verifyWorkOrders} = await import('./verify-work-orders.mjs');
    await verifyWorkOrders(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'drive-course': async page => {
    const {verifyDrives} = await import('./verify-drive-course.mjs');
    await verifyDrives(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'attempt-film': async page => {
    const {verifyFilm} = await import('./verify-attempt-film.mjs');
    await verifyFilm(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'paired-repairs': async page => {
    const {verifyPairs} = await import('./verify-paired-repairs.mjs');
    await verifyPairs(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'rigging-course': async page => {
    const {verifyRigging} = await import('./verify-rigging-course.mjs');
    await verifyRigging(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'tool-press': async page => {
    const {verifyToolPress} = await import('./verify-tool-press.mjs');
    await verifyToolPress(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'tool-lessons': async page => {
    const {verifyLessons} = await import('./verify-tool-lessons.mjs');
    await verifyLessons(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'clockwork-course': async page => {
    const {verifyClockwork} = await import('./verify-clockwork-course.mjs');
    await verifyClockwork(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'tool-course': async page => {
    const {verifyToolCourse} = await import('./verify-tool-course.mjs');
    await verifyToolCourse(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'puzzle-campaign': async page => {
    const {verifyCampaign} = await import('./verify-puzzle-campaign.mjs');
    await verifyCampaign(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'one-part-missing': async page => {
    const {verifyPuzzles} = await import('./verify-one-part-missing.mjs');
    await verifyPuzzles(page,{url,record,shot,outDir});
    result.passed = result.failures.length === 0;
  },
  'repair-celebration': async page => {
    const {verifyRepairCelebration} = await import('./verify-repair-celebration.mjs');
    await verifyRepairCelebration(page, {url,record,outDir});
    result.passed = result.failures.length === 0;
  },
  'bank': driveBank,
  'trim': driveTrim,
  'deflect': driveDeflect,
  'dino': driveDino,
  'car-rocket': driveCarRocket,
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
// Some Chrome sessions leave protocol timers on Node's event loop after the browser closes.
await new Promise(resolve => process.stdout.write(`drive ${journey} passed on origin=${origin}; evidence ${outDir}\n`, resolve));
process.exit(0);

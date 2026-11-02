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
try {
  puppeteer = await import('puppeteer-core');
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

const journeys = {
  'save-load': driveSaveLoad,
  'example-scenes': driveExampleScenes
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
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,800'
  ]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('console', message => {
    consoleLines.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', error => {
    consoleLines.push(`[pageerror] ${error.message}`);
  });
  await journeys[journey](page);
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

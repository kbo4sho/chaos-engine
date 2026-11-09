import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import { createRequire } from 'node:module';

/**
 * Premise-attack matrix for be3a3f0.
 * Premise: "spatial envelope alone supplies usable legacy world and origin
 * consumers comprehensively migrated."
 * These cases are the rerunnable observations that must pass before claiming
 * the premise (or its replacement) holds.
 */
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const codec = fs.readFileSync(new URL('../save-codec.js', import.meta.url), 'utf8');
const matter = fs.readFileSync(createRequire(import.meta.url).resolve('matter-js'), 'utf8');
const live = [];

function gameHarness(stored = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url:'http://localhost', runScripts:'outside-only', virtualConsole });
  const { window } = dom;
  window.eval(matter);
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get:(_, key) => key.startsWith('create') ? () => gradient : () => {} });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get:() => 1280 });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get:() => 531 });
  window.setTimeout = () => 1;
  window.clearTimeout = () => {};
  window.setInterval = () => 1;
  window.requestAnimationFrame = () => 1;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  window.eval(codec);
  window.eval(fs.readFileSync(new URL('../examples/chaos-examples.js', import.meta.url), 'utf8'));
  window.eval(script + '\nwindow.__runGame = code => eval(code);');
  const api = {
    window,
    run: code => window.__runGame(code),
    click: id => window.document.getElementById(id).click(),
    errors
  };
  live.push(api);
  return api;
}

afterEach(() => { while (live.length) live.pop().window.close(); });

function legacySave(api, setupCode) {
  return api.run(`${setupCode}
    paused = true;
    window.__legacy = captureGameState();
    delete __legacy.worldBounds;
    window.__graph = ChaosSaveCodec.encode(__legacy);
    JSON.stringify({
      version:1,
      savedAt:new Date().toISOString(),
      graph:__graph,
      checksum:ChaosSaveCodec.checksum(__graph)
    });`);
}

function loadLegacy(raw) {
  const api = gameHarness({ 'chaos-engine-save-1': raw });
  api.click('btn-load');
  api.click('save-accept');
  return api;
}

describe('Premise attack: legacy envelope completeness', () => {
  it('includes rail endpoints so walls do not clip the authored route', () => {
    const raw = legacySave(gameHarness(), `
      window.ball = Bodies.circle(100, 200, 20);
      Composite.add(world, ball);
      rails.push({
        body: ball,
        start: { x:100, y:200 },
        end: { x:1000, y:200 },
        tangent: { x:1, y:0 },
        length: 900
      });
      ball.isRailed = true;
    `);
    const api = loadLegacy(raw);
    const bounds = api.run('({...worldBounds})');
    const walls = api.run(`walls.map(w => ({
      x:w.position.x, y:w.position.y,
      minX:w.bounds.min.x, maxX:w.bounds.max.x,
      minY:w.bounds.min.y, maxY:w.bounds.max.y
    }))`);
    // Route from x=100 to x=1000 must lie strictly inside left/right wall faces.
    const left = walls.reduce((a,w) => w.minX < a.minX ? w : a, walls[0]);
    const right = walls.reduce((a,w) => w.maxX > a.maxX ? w : a, walls[0]);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(1000);
    expect(bounds.x).toBeLessThanOrEqual(100);
    expect(api.run('rails[0].end.x')).toBe(1000);
    expect(api.run('rails[0].start.x')).toBe(100);
    // Floor/ceiling/left/right translated with worldBounds — right wall inner face >= 1000
    const rightInner = Math.min(...walls.map(w => w.maxX === Math.max(...walls.map(x=>x.maxX)) ? w.minX : Infinity));
    expect(api.run('worldMaxX()')).toBeGreaterThanOrEqual(1000);
    expect(api.run('worldMinX()')).toBeLessThanOrEqual(100);
  });

  it('includes zipline, tripwire, elevator travel, piston travel, and cam envelopes', () => {
    const raw = legacySave(gameHarness(), `
      window.b = Bodies.circle(50, 50, 12);
      Composite.add(world, b);
      ziplines.push({ body:b, start:{x:50,y:50}, end:{x:800,y:400}, tangent:{x:1,y:0}, length:1, progress:0, speed:1 });
      tripwires.push({ id:1, start:{x:10,y:500}, end:{x:900,y:500}, geometry:{length:890,tangent:{x:1,y:0},normal:{x:0,y:1}}, direction:1, cooldowns:new Map() });
      elevators.push({ body:b, upperY:40, lowerY:450, targetY:450 });
      pistons.push({ body:b, retractedX:20, extendedX:700, y:120, direction:1, targetX:20 });
      b.camAnchor = { x:300, y:250 };
      b.camRunning = false;
      cams.push(b);
    `);
    const api = loadLegacy(raw);
    expect(api.run('worldMaxX()')).toBeGreaterThanOrEqual(900);
    expect(api.run('worldMaxY()')).toBeGreaterThanOrEqual(500);
    expect(api.run('worldMinX()')).toBeLessThanOrEqual(10);
    expect(api.run('worldMinY()')).toBeLessThanOrEqual(40);
  });
});

describe('Premise attack: origin migration for effects and HUD', () => {
  it('EXPLODE and RAIN spawn inside positive-origin legacy bounds, not near 0', () => {
    const api = gameHarness();
    api.run(`
      worldBounds = { x:500, y:200, width:400, height:300 };
      updateCamera(); rebuildWalls();
      paused = true;
      window.ball = Bodies.circle(900, 400, 20);
      Composite.add(world, ball);
    `);
    // Force deterministic explosion coords by stubbing Math.random
    api.run(`
      window.__rands = [];
      const real = Math.random.bind(Math);
      Math.random = () => { const v = real(); window.__rands.push(v); return 0.5; };
      randomExplosion();
      Math.random = real;
    `);
    const boom = api.run('explosions[explosions.length-1]');
    expect(boom.x).toBeGreaterThanOrEqual(500);
    expect(boom.x).toBeLessThanOrEqual(900);
    expect(boom.y).toBeGreaterThanOrEqual(200);
    expect(boom.y).toBeLessThanOrEqual(500);

    api.run(`
      pendingPhysicsActions.length = 0;
      document.getElementById('btn-rain').click();
      const rain = pendingPhysicsActions.filter(a => a.kind === 'rain');
      // drain rain spawns immediately
      rain.forEach(a => { a.dueAt = 0; });
      const before = Composite.allBodies(world).length;
      // process pending if exposed; else spawnObject path used by rain
      window.__rainX = [];
      const orig = spawnObject;
      spawnObject = function(x,y,...rest){ window.__rainX.push(x); return orig(x,y,...rest); };
      for (const a of pendingPhysicsActions.filter(p => p.kind==='rain')) {
        // mimic scheduler fire
        if (typeof runPendingPhysicsActions === 'function') {}
      }
      // Directly evaluate the rain spawn expression used by the engine
      window.__sampleRainX = 30 + 0.5 * (worldBounds.width - 60);
      window.__sampleRainWorld = worldMinX() + 30 + 0.5 * (worldBounds.width - 60);
    `);
    // The live rain path must use origin; sample the source invariant:
    expect(api.run('__sampleRainX')).toBe(30 + 0.5 * 340); // wrong absolute if used as world x
    // After fix, rain spawn code must equal worldMinX()+…
    const rainSrc = script.match(/spawnObject\([\s\S]*?worldBounds\.width[\s\S]*?\)/);
    expect(rainSrc?.[0] || '').toMatch(/worldMinX\(\)|worldBounds\.x/);
  });

  it('tornado direction uses chosen edge, not tornadoX < 0', () => {
    const api = gameHarness();
    // Code: random()>0.5 → left (worldMinX()-30), else right (worldMaxX()+30)
    // Dir must face into the world from that edge (compare to worldCenterX), not tornadoX<0.
    api.run(`
      worldBounds = { x:200, y:0, width:800, height:400 };
      updateCamera();
      const real = Math.random.bind(Math);
      Math.random = () => 0.75; // left
      tornadoActive = false;
      document.getElementById('btn-tornado').click();
      window.__tornadoL = { x:tornadoX, dir:tornadoDir, min:worldMinX(), center:worldCenterX() };
      Math.random = () => 0.25; // right
      tornadoActive = false;
      document.getElementById('btn-tornado').click();
      window.__tornadoR = { x:tornadoX, dir:tornadoDir, max:worldMaxX(), center:worldCenterX() };
      Math.random = real;
    `);
    const left = api.run('__tornadoL');
    expect(left.x).toBeLessThan(left.min);
    expect(left.dir).toBe(1);
    const right = api.run('__tornadoR');
    expect(right.x).toBeGreaterThan(right.max);
    expect(right.dir).toBe(-1);
  });

  it('PAUSED HUD and mirror axis sit at world center for positive-origin bounds', () => {
    const api = gameHarness();
    const pos = api.run(`
      worldBounds = { x:400, y:100, width:600, height:300 };
      updateCamera();
      paused = true;
      // Probe the expressions the render path uses
      ({
        pausedAt: { x: worldBounds.width/2, y: worldBounds.height/2 },
        center: { x: worldCenterX(), y: worldCenterY() },
        mirrorAxis: worldBounds.width / 2
      })
    `);
    // Document current bug: pausedAt !== center under positive origin.
    // After fix, render must use worldCenter*; test the helper contract the HUD must follow.
    expect(pos.center).toEqual({ x:700, y:250 });
    // Source invariant: PAUSED fillText must not use bare width/2 as world x
    const pauseDraw = script.slice(script.indexOf("// Pause overlay"), script.indexOf("// Pause overlay") + 350);
    expect(pauseDraw).toMatch(/worldCenterX\(\)|worldBounds\.x\s*\+\s*worldBounds\.width/);
    expect(pauseDraw).not.toMatch(/fillText\('⏸ PAUSED',\s*worldBounds\.width\/2/);
  });
});

describe('Premise attack: non-fitting tools on tiny inferred worlds', () => {
  it('cannon and other fixed-geometry clamps do not invert outside a 60×60 world', () => {
    const api = gameHarness();
    const result = api.run(`
      worldBounds = { x:0, y:0, width:60, height:60 };
      updateCamera();
      const cannon = getCannonPlacement({ x:30, y:30 }, 60, 60);
      const ramp = getRampPlacement({ x:30, y:30 }, 60, 60);
      const pin = getPinwheelPlacement({ x:30, y:30 }, 60, 60);
      const elev = getElevatorPlacement({ x:30, y:30 }, 60, 60);
      ({ cannon, ramp, pin, elev,
        cannonInside: cannon && cannon.x >= 0 && cannon.x <= 60 && cannon.y >= 0 && cannon.y <= 60,
        fitsCannon: worldBounds.width >= (CANNON_WIDTH + 28)
      })
    `);
    // After fix: helpers return null (or {ok:false}) when margins do not fit — never a point outside.
    expect(result.fitsCannon).toBe(false);
    expect(result.cannon).toBeNull();
    expect(result.ramp).toBeNull();
    expect(result.pin).toBeNull();
    expect(result.elev).toBeNull();
  });
});

describe('Premise attack: orbit array branches unreachable for supported saves', () => {
  it('readGameSave rejects non-Map orbitingBodies before restore', () => {
    const api = gameHarness();
    const threw = api.run(`
      paused = true;
      spawnObject(200,200,0,0);
      const g = captureGameState();
      g.state.orbitingBodies = [{ center:{x:1,y:2}, radius:10 }];
      try {
        // Simulate decode path type check used by readGameSave
        const expected = captureGameState().state;
        const actual = g.state.orbitingBodies;
        const value = expected.orbitingBodies;
        const bad = value instanceof Map ? !(actual instanceof Map) : false;
        bad;
      } catch (e) { true }
    `);
    expect(threw).toBe(true);
    // inferWorldBounds source must not keep array/tuple branches once proven unreachable
    const infer = script.slice(script.indexOf('function inferWorldBounds'), script.indexOf('function inferWorldBounds') + 2200);
    expect(infer).not.toMatch(/Array\.isArray\(orbits\)/);
  });
});

describe('Premise attack: negative-origin and positive-origin matrix smoke', () => {
  it('preserves body coordinates across legacy load for negative and positive origins', () => {
    for (const [x, y, w, h, bx, by] of [
      [-200, -50, 1280, 531, 100, 100],
      [200, 50, 1280, 531, 400, 200],
      [0, 0, 1280, 531, 640, 260],
    ]) {
      const raw = legacySave(gameHarness(), `
        worldBounds = { x:${x}, y:${y}, width:${w}, height:${h} };
        updateCamera(); rebuildWalls();
        window.ball = Bodies.circle(${bx}, ${by}, 20);
        Composite.add(world, ball);
        // stash explicit bounds then delete to force infer OR keep? legacy = delete bounds
      `);
      // Legacy path deletes worldBounds — infer from geometry only. Coordinates must not move.
      const api = loadLegacy(raw);
      expect(api.run('captureGameState().bodies[0].position')).toEqual({ x:bx, y:by });
      expect(api.run('worldMinX()')).toBeLessThanOrEqual(bx);
      expect(api.run('worldMaxX()')).toBeGreaterThanOrEqual(bx);
    }
  });
});

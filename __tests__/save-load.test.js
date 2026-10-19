import { describe, it, expect, vi } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const codec = fs.readFileSync(new URL('../save-codec.js', import.meta.url), 'utf8');
const matter = fs.readFileSync(createRequire(import.meta.url).resolve('matter-js'), 'utf8');

// Execute the real game with Matter 0.20.0. Only browser rendering, audio and
// scheduling are stubbed; bodies, constraints, registries and storage are real.
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
  Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get:() => 1024 });
  Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get:() => 600 });
  const timers = [];
  window.setTimeout = callback => { timers.push(callback); return timers.length; };
  window.clearTimeout = () => {};
  window.setInterval = () => 1;
  window.requestAnimationFrame = () => 1;
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  window.eval(codec);
  window.eval(script + '\nwindow.__runGame = code => eval(code);');
  const run = code => window.__runGame(code);
  const click = id => window.document.getElementById(id).click();
  const feedback = () => window.document.getElementById('save-feedback').textContent;
  return { window, run, click, feedback, errors, timers };
}

const key = 'chaos-engine-save-1';

describe('Pulley tool with real Matter.js', () => {
  function setup() {
    const api = gameHarness();
    api.run(`
      paused = true;
      window.a = Bodies.circle(300,200,14,{frictionAir:0});
      window.b = Bodies.circle(300,400,14,{frictionAir:0});
      Composite.add(world,[a,b]); engine.gravity.y = 0;
    `);
    const select = tool => api.window.document.querySelector('[data-tool="' + tool + '"]').click();
    const join = () => api.run('pulleyAt(a.position); pulleyAt(b.position); window.link = pulleyAt({x:300,y:50}); link;');
    return {...api, select, join};
  }

  it('appends one final button, selects it, and routes all three real canvas taps', () => {
    const api = setup();
    const button = api.window.document.querySelector('#toolbar > :last-child');
    expect(button.dataset.tool).toBe('pulley');
    expect(button.previousElementSibling.dataset.tool).toBe('damper');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(93);
    expect(button.getAttribute('aria-label')).toContain('counterweight pulley');
    expect(button.title).toContain('Snip');
    api.select('pulley');
    expect(api.run('currentTool')).toBe('pulley');
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=ball]').classList.contains('active')).toBe(false);
    const canvas = api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({left:0,top:0,width:canvas.width,height:canvas.height});
    for (const y of [200,400,50]) canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:300,clientY:y,bubbles:true}));
    expect(api.run('[pulleys.length, pulleySelection.length, pointerDown]')).toEqual([1,0,false]);
    expect(api.window.document.getElementById('pulley-feedback').getAttribute('role')).toBe('status');
    expect(api.errors).toEqual([]);
  });

  it('creates one inert world constraint with routed cable geometry and no placement kick', () => {
    const api = setup();
    api.join();
    expect(api.run('[link.length, link.stiffness, link.damping]')).toEqual([500,0,0]);
    expect(api.run('link.pulleyAnchor')).toEqual({x:300,y:50});
    expect(api.run('Composite.allConstraints(world)[0] === link')).toBe(true);
    expect(api.run('[a.position.y,b.position.y,a.speed,b.speed]')).toEqual([200,400,0,0]);
  });

  it('shares radial motion by inverse mass, lifts the other end, and dissipates energy', () => {
    const api = setup();
    api.join();
    api.run('Body.setMass(a,2); Body.setMass(b,6); Body.setVelocity(b,{x:0,y:12}); updatePulleys()');
    expect(api.run('a.velocity.y')).toBeCloseTo(-9,8);
    expect(api.run('b.velocity.y')).toBeCloseTo(9,8);
    expect(api.run('a.velocity.y + b.velocity.y')).toBeCloseTo(0,8);
    expect(api.run('0.5*a.mass*a.speed**2 + 0.5*b.mass*b.speed**2')).toBeLessThan(432);
  });

  it('lets gravity lower a heavy counterweight and lift the lighter real body', () => {
    const api = setup();
    api.join();
    api.run('Body.setMass(a,1); Body.setMass(b,4); engine.gravity.y = 1; for(let i=0;i<15;i++) Engine.update(engine,1000/60)');
    expect(api.run('a.position.y')).toBeLessThan(190);
    expect(api.run('b.position.y')).toBeGreaterThan(410);
    expect(api.run('a.position.y+b.position.y-100')).toBeCloseTo(500,7);
    expect(api.run('a.velocity.y')).toBeLessThan(0);
    expect(api.run('b.velocity.y')).toBeGreaterThan(0);
  });

  it('preserves tangential travel and spin without driving resting parts', () => {
    const api = setup();
    api.join();
    api.run('Body.setVelocity(a,{x:7,y:0}); Body.setVelocity(b,{x:-3,y:0}); Body.setAngularVelocity(a,0.2); Body.setAngularVelocity(b,-0.1); updatePulleys()');
    expect(api.run('[a.velocity.x,b.velocity.x,a.angularVelocity,b.angularVelocity]')).toEqual([7,-3,0.2,-0.1]);
    api.run('Body.setVelocity(a,{x:0,y:0}); Body.setVelocity(b,{x:0,y:0}); for(let i=0;i<5;i++) Engine.update(engine,1000/60)');
    expect(api.run('[a.position.y,b.position.y,a.velocity.y,b.velocity.y]')).toEqual([200,400,0,0]);
  });

  it('permits slack and inward motion instead of pushing the endpoints apart', () => {
    const api = setup();
    api.join();
    api.run('Body.setPosition(a,{x:300,y:150}); Body.setPosition(b,{x:300,y:300}); Body.setVelocity(a,{x:0,y:-5}); Body.setVelocity(b,{x:0,y:4}); updatePulleys()');
    expect(api.run('[a.position.y,b.position.y,a.velocity.y,b.velocity.y]')).toEqual([150,300,-5,4]);
    api.run('Body.setPosition(a,{x:300,y:200}); Body.setPosition(b,{x:300,y:400}); Body.setVelocity(b,{x:0,y:-4}); updatePulleys()');
    expect(api.run('[a.velocity.y,b.velocity.y]')).toEqual([-5,-4]);
  });

  it('supports an anchored end, suspends safely when both ends are anchored, and stays finite at the wheel', () => {
    const api = setup();
    api.join();
    api.run('Body.setStatic(a,true); Body.setVelocity(b,{x:0,y:12}); Engine.update(engine,1000/60)');
    expect(api.run('[a.position.y,b.position.y,b.velocity.y]')).toEqual([200,400,0]);
    api.run('Body.setStatic(b,true); updatePulleys(); Body.setStatic(b,false); Body.setPosition(b,link.pulleyAnchor); updatePulleys()');
    expect(api.run('[a.position.x,a.position.y,b.position.x,b.position.y,b.velocity.y].every(Number.isFinite)')).toBe(true);
  });

  it('tightens extreme extension without projecting a short leg through the wheel', () => {
    const api = setup(); api.join();
    api.run('Body.setMass(a,0.1); Body.setMass(b,100); Body.setPosition(a,{x:300,y:60}); Body.setPosition(b,{x:300,y:1000}); updatePulleys()');
    expect(api.run('a.position.y')).toBeGreaterThanOrEqual(50);
    expect(api.run('Math.abs(a.position.y-50)+Math.abs(b.position.y-50)')).toBeCloseTo(500,7);
    api.run('Body.setPosition(b,{x:300,y:1000}); updatePulleys()');
    expect(api.run('b.position.y')).toBeCloseTo(550,7);
  });

  it('guards empty taps, duplicate endpoints, shared attachments, short legs, and static pairs', () => {
    const api = setup();
    expect(api.run('pulleyAt({x:50,y:50})')).toBe(false);
    api.run('pulleyAt(a.position)');
    expect(api.run('pulleyAt(a.position)')).toBe('cancelled');
    expect(api.run('pulleySelection.length')).toBe(0);
    api.run('pulleyAt({x:340,y:200}); pulleyAt(b.position)'); // 40px touch fallback
    expect(api.run('pulleySelection.length')).toBe(2);
    expect(api.run('pulleyAt({x:300,y:447})')).toBe(false);
    expect(api.window.document.getElementById('pulley-feedback').textContent).toContain('AWAY');
    api.run('window.link = pulleyAt({x:300,y:50})');
    expect(api.run('pulleyAt(a.position)')).toBe(false);
    expect(api.run('pulleySelection.length')).toBe(0);
    api.run('snipConstraintAt({x:300,y:100}); Body.setStatic(a,true); a.isAnchored=true; Body.setStatic(b,true); b.isAnchored=true; pulleyAt(a.position)');
    expect(api.run('pulleyAt(b.position)')).toBe(false);
    expect(api.run('pulleySelection.length')).toBe(1);
  });

  it('clamps the wheel inside the canvas', () => {
    const api = setup();
    api.run('pulleyAt(a.position); pulleyAt(b.position); window.link = pulleyAt({x:-100,y:9000})');
    expect(api.run('link.pulleyAnchor')).toEqual({x:24,y:576});
  });

  it.each(['A','B'])('Snip cuts routed leg %s while preserving both payloads', side => {
    const api = setup();
    api.run('Body.setPosition(a,{x:200,y:300}); Body.setPosition(b,{x:500,y:300})');
    api.join();
    const point = api.run(`({x:(link.body${side}.position.x+link.pulleyAnchor.x)/2,y:(link.body${side}.position.y+link.pulleyAnchor.y)/2})`);
    expect(api.run('findSnippableConstraintAt({x:350,y:300})')).toBe(null); // no phantom straight cable
    expect(api.run(`snipConstraintAt(${JSON.stringify(point)})`)).toBe(true);
    expect(api.run('[pulleys.length,Composite.allConstraints(world).length,captureGameState().bodies.length]')).toEqual([0,0,2]);
  });

  it('cancels pending state on tool changes including Draw and keeps installed cables', () => {
    const api = setup();
    api.join();
    api.run('window.c = Bodies.circle(600,300,14); Composite.add(world,c)');
    for (const tool of ['block','draw']) {
      api.select('pulley'); api.run('pulleyAt(c.position)'); api.select(tool);
      expect(api.run('pulleySelection.length')).toBe(0);
      expect(api.window.document.getElementById('pulley-feedback').textContent).toBe('');
      expect(api.run('pulleys.length')).toBe(1);
    }
  });

  it('cleans removed endpoints, externally cut cables, Eraser, pending selections and Clear', () => {
    const api = setup();
    api.join();
    api.run('Composite.remove(world,link); prunePulleys()');
    expect(api.run('pulleys.length')).toBe(0);
    api.join(); api.run('eraseBodyAt(a.position)');
    expect(api.run('[pulleys.length,Composite.allConstraints(world).length]')).toEqual([0,0]);
    api.run('window.a = Bodies.circle(300,200,14); Composite.add(world,a)'); api.join();
    api.run('Composite.remove(world,a); prunePulleys()');
    expect(api.run('[pulleys.length,Composite.allConstraints(world).length]')).toEqual([0,0]);
    api.run('pulleyAt(b.position); Composite.remove(world,b); prunePulleys()');
    expect(api.run('pulleySelection.length')).toBe(0);
    api.run('finishClear(false)');
    expect(api.run('[pulleys.length,pulleySelection.length,captureGameState().bodies.length]')).toEqual([0,0,0]);
    expect(api.window.document.getElementById('pulley-feedback').textContent).toBe('');
  });

  it('restores pulley identity, anchor, cable length, selection and real motion after save/load', () => {
    const api = setup(); api.select('pulley'); api.join();
    api.run('restoreGameState(readGameSave(serializeGameState()))');
    expect(api.run('Composite.allConstraints(world)[0] === pulleys[0]')).toBe(true);
    expect(api.run('pulleys[0].bodyA === captureGameState().bodies[0]')).toBe(true);
    expect(api.run('[currentTool,pulleys[0].length,pulleys[0].stiffness]')).toEqual(['pulley',500,0]);
    expect(api.run('pulleys[0].pulleyAnchor')).toEqual({x:300,y:50});
    api.run('Body.setVelocity(pulleys[0].bodyB,{x:0,y:12}); Engine.update(engine,1000/60)');
    expect(api.run('pulleys[0].bodyA.velocity.y')).toBeLessThan(0);
    expect(api.errors).toEqual([]);
  });

  it('migrates old saves and rejects malformed cable state before replacing the game', () => {
    const api = setup();
    api.run(`const game=captureGameState(); delete game.state.pulleys; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})));
      window.a=captureGameState().bodies[0]; window.b=captureGameState().bodies[1];`);
    expect(api.run('pulleys.length')).toBe(0);
    api.join();
    for (const mutation of ['link.pulleyAnchor.x=NaN','link.pulleyAnchor.x=300; link.length=20','link.length=500; link.stiffness=1','link.stiffness=0; pulleys.push(link)']) {
      api.run(mutation);
      expect(() => api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved pulley');
      expect(api.run('captureGameState().bodies.length')).toBe(2);
    }
  });

  it('renders both selected endpoints, taut, slack and coincident wheel states', () => {
    const api = setup(); api.select('pulley');
    api.run('pulleyAt(a.position); drawPulleys(); pulleyAt(b.position); drawPulleys(); pulleyAt({x:300,y:50}); drawPulleys(); Body.setPosition(b,{x:300,y:250}); drawPulleys(); Body.setPosition(a,pulleys[0].pulleyAnchor); updatePulleys(); drawPulleys()');
    expect(api.errors).toEqual([]);
  });
});

describe('Damper tool with real Matter.js', () => {
  function setup() {
    const api = gameHarness();
    api.run(`
      paused = true;
      window.a = Bodies.circle(200, 200, 14, { frictionAir:0 });
      window.b = Bodies.circle(400, 200, 14, { frictionAir:0 });
      Composite.add(world, [a, b]);
      engine.gravity.y = 0;
    `);
    const select = tool => api.window.document.querySelector('[data-tool="' + tool + '"]').click();
    const join = () => api.run('dampBodiesAt(a.position); window.link = dampBodiesAt(b.position); link;');
    return { ...api, select, join };
  }

  it('selects Damper and connects through the real canvas input handler', () => {
    const api = setup();
    const button = api.window.document.querySelector('[data-tool=damper]');
    expect(button.dataset.tool).toBe('damper');
    expect(button.previousElementSibling.dataset.tool).toBe('breaklink');
    expect(button.getAttribute('aria-label')).toContain('shock absorber');
    expect(button.title).toContain('Snip');
    api.select('damper');
    expect(api.run('currentTool')).toBe('damper');
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool="ball"]').classList.contains('active')).toBe(false);
    const canvas = api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left:0, top:0, width:canvas.width, height:canvas.height });
    for (const x of [200, 400]) canvas.dispatchEvent(new api.window.MouseEvent('mousedown', { clientX:x, clientY:200, bubbles:true }));
    expect(api.run('dampers.length')).toBe(1);
    expect(api.run('[damperSelection, pointerDown]')).toEqual([null, false]);
    expect(api.window.document.getElementById('damper-feedback').getAttribute('role')).toBe('status');
    expect(api.errors).toEqual([]);
  });

  it('creates a passive zero-stiffness joint without changing position or velocity', () => {
    const api = setup();
    const link = api.join();
    expect(link.bodyA).toBe(api.window.a);
    expect(link.bodyB).toBe(api.window.b);
    expect(link.length).toBe(200);
    expect(link.stiffness).toBe(0); // Matter.create otherwise defaults falsy stiffness to 1.
    expect(link.damping).toBe(0.18);
    expect(api.run('Composite.allConstraints(world).includes(link)')).toBe(true);
    expect(api.run('[a.position.x, b.position.x, a.speed, b.speed]')).toEqual([200, 400, 0, 0]);
  });

  it.each([12, -12])('dissipates relative axial motion (%s) and conserves total momentum', speed => {
    const api = setup();
    api.join();
    api.run(`
      Body.setMass(a, 2); Body.setMass(b, 5);
      Body.setAngularVelocity(a, 0.1); Body.setAngularVelocity(b, -0.2);
      Body.setVelocity(a, {x:${speed}, y:0}); Body.setVelocity(b, {x:0, y:0});
      window.energyBefore = 0.5 * a.mass * a.speed ** 2;
      Engine.update(engine, 1000 / 60);
    `);
    expect(Math.abs(api.run('a.velocity.x - b.velocity.x'))).toBeLessThan(Math.abs(speed) * 0.7);
    expect(api.run('a.mass * a.velocity.x + b.mass * b.velocity.x')).toBeCloseTo(2 * speed, 8);
    expect(api.run('0.5 * a.mass * a.speed ** 2 + 0.5 * b.mass * b.speed ** 2')).toBeLessThan(api.window.energyBefore);
    expect(api.run('[a.angularVelocity, b.angularVelocity]')).toEqual([0.1, -0.2]);
    expect(api.run('captureGameState().bodies.length')).toBe(2);
  });

  it('adds no restoring force after extension or compression at rest', () => {
    const api = setup();
    api.join();
    for (const x of [280, 600]) {
      api.run(`Body.setPosition(b, {x:${x}, y:200}); for (let i = 0; i < 60; i++) Engine.update(engine, 1000 / 60)`);
      expect(api.run('[a.position.x, b.position.x, a.speed, b.speed]')).toEqual([200, x, 0, 0]);
    }
  });

  it('leaves tangential velocity and common translation free', () => {
    const api = setup();
    api.join();
    // The integrated line is horizontal: tangential travel must not be damped.
    api.run(`
      Body.setPosition(a, {x:200, y:196}); Body.setPosition(b, {x:400, y:204});
      Body.setVelocity(a, {x:3, y:4}); Body.setVelocity(b, {x:3, y:-4});
      Engine.update(engine, 1000 / 60);
    `);
    expect(api.run('[a.velocity.x, b.velocity.x, a.velocity.y, b.velocity.y]')).toEqual([3, 3, 4, -4]);
  });

  it('supports a static anchor and releases motion when Snip cuts the damper', () => {
    const api = setup();
    api.run('Body.setStatic(a, true); a.isAnchored = true; anchoredBodies.add(a)');
    api.join();
    api.run('Body.setVelocity(b, {x:12, y:0}); Engine.update(engine, 1000 / 60)');
    expect(api.run('b.velocity.x')).toBeLessThan(8);
    expect(api.run('a.position.x')).toBe(200);
    expect(api.run('snipConstraintAt({x:(a.position.x + b.position.x)/2, y:200})')).toBe(true);
    expect(api.run('[dampers.length, Composite.allConstraints(world).length]')).toEqual([0, 0]);
    api.run('Body.setVelocity(b, {x:12, y:0}); Engine.update(engine, 1000 / 60)');
    expect(api.run('b.velocity.x')).toBeCloseTo(12, 8);
  });

  it('uses touch targeting, cancellation, duplicate guards and clear failure feedback', () => {
    const api = setup();
    expect(api.run('dampBodiesAt({x:50, y:50})')).toBe(false);
    expect(api.window.document.getElementById('damper-feedback').textContent).toBe('DAMPER: TAP A PART');
    expect(api.run('dampBodiesAt({x:240, y:200})')).toBe('selected');
    expect(api.run('dampBodiesAt(a.position)')).toBe('cancelled');
    api.join();
    api.run('dampBodiesAt(b.position)');
    expect(api.run('dampBodiesAt(a.position)')).toBe(false);
    expect(api.run('dampers.length')).toBe(1);
    expect(api.run('damperSelection')).toBe(null);
    api.run('Body.setPosition(b, {x:225, y:200}); dampBodiesAt(a.position)');
    expect(api.run('dampBodiesAt(b.position)')).toBe(false);
    // Use fresh bodies to test short spacing independently of duplicate guarding.
    api.run('finishClear(false); window.a = Bodies.circle(200,200,5); window.b = Bodies.circle(225,200,5); Composite.add(world,[a,b]); dampBodiesAt(a.position)');
    expect(api.run('dampBodiesAt(b.position)')).toBe(false);
    expect(api.window.document.getElementById('damper-feedback').textContent).toBe('DAMPER: PARTS TOO CLOSE');
    api.run('Body.setPosition(b,{x:400,y:200}); Body.setStatic(a,true); Body.setStatic(b,true); a.isAnchored = b.isAnchored = true');
    expect(api.run('dampBodiesAt(b.position)')).toBe(false);
    expect(api.window.document.getElementById('damper-feedback').textContent).toBe('DAMPER: ONE PART MUST MOVE');
  });

  it('cancels pending selection on tool changes including Draw while retaining installed dampers', () => {
    const api = setup();
    api.select('damper');
    api.join();
    for (const tool of ['block', 'draw']) {
      api.select('damper');
      api.run('dampBodiesAt(a.position)');
      api.select(tool);
      expect(api.run('damperSelection')).toBe(null);
      expect(api.window.document.getElementById('damper-feedback').textContent).toBe('');
      expect(api.run('dampers.length')).toBe(1);
    }
  });

  it('cleans up Eraser, removed bodies, removed constraints, pending parts and Clear', () => {
    const api = setup();
    api.join();
    api.run('dampBodiesAt(a.position); eraseBodyAt(a.position)');
    expect(api.run('[dampers.length, damperSelection, Composite.allConstraints(world).length]')).toEqual([0, null, 0]);
    api.run('window.a = Bodies.circle(200,200,14); Composite.add(world,a)');
    api.join();
    api.run('Composite.remove(world,link); pruneDampers()');
    expect(api.run('dampers.length')).toBe(0);
    api.join();
    api.run('dampBodiesAt(a.position); Composite.remove(world,a); pruneDampers()');
    expect(api.run('[dampers.length, damperSelection, Composite.allConstraints(world).length]')).toEqual([0, null, 0]);
    api.run('dampBodiesAt(b.position); finishClear(false)');
    expect(api.run('[dampers.length, damperSelection, captureGameState().bodies.length]')).toEqual([0, null, 0]);
    expect(api.window.document.getElementById('damper-feedback').textContent).toBe('');
  });

  it('round-trips constraint identity and passive physics through save/load', () => {
    const api = setup();
    api.join();
    api.run('restoreGameState(readGameSave(serializeGameState()))');
    expect(api.run('Composite.allConstraints(world)[0] === dampers[0]')).toBe(true);
    expect(api.run('dampers[0].bodyA === captureGameState().bodies[0]')).toBe(true);
    expect(api.run('[dampers[0].stiffness, dampers[0].damping]')).toEqual([0, 0.18]);
    api.run('Body.setVelocity(dampers[0].bodyB,{x:12,y:0}); Engine.update(engine,1000/60)');
    expect(Math.abs(api.run('dampers[0].bodyB.velocity.x - dampers[0].bodyA.velocity.x'))).toBeLessThan(8);
    expect(api.errors).toEqual([]);
  });

  it('migrates earlier saves and rejects active or malformed dampers before changing the world', () => {
    const api = setup();
    api.run(`
      const game = captureGameState(); delete game.state.dampers;
      const graph = ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})));
      window.a = captureGameState().bodies[0]; window.b = captureGameState().bodies[1];
    `);
    expect(api.run('dampers.length')).toBe(0);
    api.join();
    for (const mutation of ['link.stiffness = 0.5', 'link.stiffness = 0; link.damping = -1', 'link.damping = 0.18; link.bodyB = link.bodyA']) {
      api.run(mutation);
      expect(() => api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved damper');
      expect(api.run('captureGameState().bodies.length')).toBe(2);
    }
  });

  it('renders selected, stationary, moving and coincident states without runtime errors', () => {
    const api = setup();
    api.select('damper');
    api.run('dampBodiesAt(a.position); drawDampers(); dampBodiesAt(b.position); drawDampers()');
    api.run('Body.setVelocity(b,{x:12,y:0}); drawDampers(); Body.setPosition(b,a.position); drawDampers()');
    expect(api.errors).toEqual([]);
  });
});

describe('Breaklink tool with real Matter.js', () => {
  function setup() {
    const api = gameHarness();
    api.run(`
      paused = true;
      window.a = Bodies.circle(200, 200, 14, { frictionAir:0 });
      window.b = Bodies.circle(380, 200, 14, { frictionAir:0 });
      Composite.add(world, [a, b]);
      engine.gravity.y = 0;
    `);
    const select = tool => api.window.document.querySelector('[data-tool="' + tool + '"]').click();
    const join = () => api.run('breaklinkBodiesAt(a.position); window.link = breaklinkBodiesAt(b.position); link;');
    return { ...api, select, join };
  }

  it('selects Breaklink through the shared listener and connects through canvas events', () => {
    const api = setup();
    const button = api.window.document.querySelector('[data-tool="breaklink"]');
    expect(button.dataset.tool).toBe('breaklink');
    expect(button.previousElementSibling.dataset.tool).toBe('ratchet');
    expect(button.getAttribute('aria-label')).toContain('snaps under tension');
    expect(button.title).toContain('Snip');
    api.select('breaklink');
    expect(api.run('currentTool')).toBe('breaklink');
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool="ball"]').classList.contains('active')).toBe(false);
    const canvas = api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left:0, top:0, width:canvas.width, height:canvas.height });
    for (const x of [200, 380]) canvas.dispatchEvent(new api.window.MouseEvent('mousedown', { clientX:x, clientY:200, bubbles:true }));
    expect(api.run('breaklinks.length')).toBe(1);
    expect(api.run('[breaklinkSelection, pointerDown]')).toEqual([null, false]);
    expect(api.run('captureGameState().bodies.length')).toBe(2);
    expect(api.window.document.getElementById('breaklink-feedback').getAttribute('role')).toBe('status');
    expect(api.errors).toEqual([]);
  });

  it('creates a real constraint with a fixed threshold without moving either body', () => {
    const api = setup();
    const link = api.join();
    expect(link.bodyA).toBe(api.window.a);
    expect(link.bodyB).toBe(api.window.b);
    expect(link.length).toBe(180);
    expect(link.breakDistance).toBe(234);
    expect(link.stiffness).toBe(0.006);
    expect(api.run('Composite.allConstraints(world).includes(link)')).toBe(true);
    expect(api.run('[a.position.x, b.position.x, a.speed, b.speed]')).toEqual([200, 380, 0, 0]);
    expect(api.run('getBreaklinkLimit(36)')).toBe(64);
    expect(api.run('getBreaklinkStrain(link)')).toBe(0);
    api.run('Body.setPosition(b, {x:407, y:200})');
    expect(api.run('getBreaklinkStrain(link)')).toBe(0.5);
  });

  it('holds at rest and under compression through actual physics steps', () => {
    const api = setup();
    api.join();
    api.run('for (let i = 0; i < 120; i++) Engine.update(engine, 1000 / 60)');
    expect(api.run('breaklinks.length')).toBe(1);
    expect(api.run('getStrutLength(a, b)')).toBeCloseTo(180, 8);
    api.run('Body.setPosition(b, {x:320, y:200}); updateBreaklinks()');
    expect(api.run('getBreaklinkStrain(link)')).toBe(0);
    expect(api.run('breaklinks.length')).toBe(1);
  });

  it('snaps from real integrated movement before solving and keeps both payloads alive', () => {
    const api = setup();
    api.join();
    api.run('Body.setVelocity(b, {x:70, y:0}); Engine.update(engine, 1000 / 60)');
    expect(api.run('breaklinks.length')).toBe(0);
    expect(api.run('Composite.allConstraints(world).length')).toBe(0);
    expect(api.run('captureGameState().bodies.length')).toBe(2);
    expect(api.run('b.velocity.x')).toBeCloseTo(70, 8);
    expect(api.run('link.stiffness')).toBe(0); // Disable the cached solver entry in the snap frame.
    expect(api.window.document.getElementById('breaklink-feedback').textContent).toBe('BREAKLINK SNAPPED!');
    expect(api.run('particles.length > 0 && explosions.length > 0')).toBe(true);
  });

  it('keeps the link below its limit and snaps at the exact extension threshold', () => {
    const api = setup();
    api.join();
    api.run('Body.setPosition(b, {x:433.99, y:200}); updateBreaklinks()');
    expect(api.run('breaklinks.length')).toBe(1);
    api.run('Body.setPosition(b, {x:434, y:200}); updateBreaklinks()');
    expect(api.run('breaklinks.length')).toBe(0);
  });

  it('supports 46px touch targeting, cancellation, empty taps and duplicate prevention', () => {
    const api = setup();
    expect(api.run('breaklinkBodiesAt({x:155, y:200})')).toBe('selected');
    expect(api.run('breaklinkSelection === a')).toBe(true);
    expect(api.run('breaklinkBodiesAt({x:700, y:400})')).toBe(false);
    expect(api.run('breaklinkSelection === a')).toBe(true);
    expect(api.run('breaklinkBodiesAt(a.position)')).toBe('cancelled');
    expect(api.run('breaklinkBodiesAt({x:153, y:200})')).toBe(false);
    api.join();
    expect(api.run('breaklinkBodiesAt(b.position); breaklinkBodiesAt(a.position)')).toBe(false);
    expect(api.run('breaklinks.length')).toBe(1);
  });

  it('rejects walls and too-close parts while keeping a recoverable selection', () => {
    const api = setup();
    api.run('breaklinkBodiesAt({x:0, y:0})');
    expect(api.run('breaklinkSelection')).toBeNull();
    api.run('Body.setPosition(b, {x:230, y:200}); breaklinkBodiesAt(a.position)');
    expect(api.run('breaklinkBodiesAt(b.position)')).toBe(false);
    expect(api.run('breaklinkSelection === a')).toBe(true);
    api.run('Body.setPosition(b, {x:380, y:200}); breaklinkBodiesAt(b.position)');
    expect(api.run('breaklinks.length')).toBe(1);
  });

  it('reuses anchored build parts and clears pending state on tool changes while retaining links', () => {
    const api = setup();
    api.run('toggleAnchorAt(a.position)');
    expect(api.window.a.isStatic).toBe(true);
    api.join();
    api.select('breaklink');
    api.run('breaklinkBodiesAt(a.position)');
    api.select('block');
    expect(api.run('breaklinkSelection')).toBeNull();
    expect(api.run('breaklinks.length')).toBe(1);
    expect(api.window.document.getElementById('breaklink-feedback').textContent).toBe('');
    api.select('breaklink');
    api.run('breaklinkBodiesAt(b.position)');
    api.select('draw');
    expect(api.run('breaklinkSelection')).toBeNull();
  });

  it('supports Snip, Eraser, missing-body pruning and Clear cleanup', () => {
    const api = setup();
    api.join();
    expect(api.run('snipConstraintAt({x:290, y:200})')).toBe(true);
    expect(api.run('breaklinks.length')).toBe(0);
    api.join();
    api.run('eraseBodyAt(a.position)');
    expect(api.run('breaklinks.length')).toBe(0);
    expect(api.run('Composite.allConstraints(world).length')).toBe(0);
    api.run('window.a = Bodies.circle(200, 200, 14); Composite.add(world, a)');
    api.join();
    api.run('breaklinkBodiesAt(a.position); Composite.remove(world, a); pruneBreaklinks()');
    expect(api.run('[breaklinks.length, breaklinkSelection, Composite.allConstraints(world).length]')).toEqual([0, null, 0]);
    api.run('breaklinkBodiesAt(b.position); finishClear(false)');
    expect(api.run('[breaklinks.length, breaklinkSelection, captureGameState().bodies.length]')).toEqual([0, null, 0]);
    expect(api.window.document.getElementById('breaklink-feedback').textContent).toBe('');
  });

  it('round-trips live constraint identity and threshold through save/load then still snaps', () => {
    const api = setup();
    api.join();
    api.run('window.saved = serializeGameState(); restoreGameState(readGameSave(window.saved))');
    expect(api.run('Composite.allConstraints(world)[0] === breaklinks[0]')).toBe(true);
    expect(api.run('breaklinks[0].bodyA === captureGameState().bodies[0]')).toBe(true);
    expect(api.run('breaklinks[0].breakDistance')).toBe(234);
    api.run('Body.setPosition(breaklinks[0].bodyB, {x:440, y:200}); Engine.update(engine, 1000 / 60)');
    expect(api.run('breaklinks.length')).toBe(0);
    expect(api.errors).toEqual([]);
  });

  it('migrates earlier version 1 saves without Breaklink and rejects invalid thresholds', () => {
    const api = setup();
    api.run(`
      const game = captureGameState();
      delete game.state.breaklinks;
      const graph = ChaosSaveCodec.encode(game);
      window.oldSave = JSON.stringify({version:1, savedAt:new Date().toISOString(), graph, checksum:ChaosSaveCodec.checksum(graph)});
      restoreGameState(readGameSave(window.oldSave));
    `);
    expect(api.run('breaklinks.length')).toBe(0);
    expect(api.run('captureGameState().bodies.length')).toBe(2);
    api.run('const bodies = captureGameState().bodies; breaklinkBodiesAt(bodies[0].position); breaklinkBodiesAt(bodies[1].position); breaklinks[0].breakDistance = 0;');
    expect(() => api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved breaklink');
    expect(api.run('captureGameState().bodies.length')).toBe(2);
  });

  it('renders selection, low/high strain and snapped states without runtime errors', () => {
    const api = setup();
    api.select('breaklink');
    api.run('breaklinkBodiesAt(a.position); drawBreaklinks()');
    api.run('breaklinkBodiesAt(b.position); drawBreaklinks(); Body.setPosition(b, {x:430, y:200}); drawBreaklinks()');
    api.run('Body.setPosition(b, {x:450, y:200}); updateBreaklinks(); drawBreaklinks()');
    expect(api.errors).toEqual([]);
  });
});

describe('Game save and load', () => {
  it('round-trips actual Matter bodies, compound geometry, nested composites and constraints', () => {
    const api = gameHarness();
    api.run(`
      paused = true;
      for (const tool of ['ball','block','car','ragdoll','basket','seesaw','wrecking','ramp','draw','magnet','rocket']) {
        currentTool = tool;
        spawnObject(300, 200, 2, -3);
      }
      Body.setAngle(Composite.allBodies(world).find(b => !b.isStatic), 0.7);
      window.before = captureGameState();
      window.saved = serializeGameState();
      restoreGameState(readGameSave(window.saved));
    `);
    const before = api.window.before;
    const after = api.run('captureGameState()');
    expect(after.bodies.length).toBe(before.bodies.length);
    expect(after.constraints.length).toBe(before.constraints.length);
    expect(after.bodies.map(b => [b.id, b.position.x, b.position.y, b.angle, b.velocity.x, b.velocity.y, b.render.type]))
      .toEqual(before.bodies.map(b => [b.id, b.position.x, b.position.y, b.angle, b.velocity.x, b.velocity.y, b.render.type]));
    const parts = new Set(after.bodies.flatMap(b => b.parts));
    for (const body of after.bodies) {
      expect(body.parent).toBe(body);
      for (const part of body.parts) {
        expect(parts.has(part.parent)).toBe(true);
        for (const vertex of part.vertices) expect(vertex.body).toBe(part);
      }
    }
    for (const connection of after.constraints) {
      if (connection.bodyA) expect(parts.has(connection.bodyA)).toBe(true);
      if (connection.bodyB) expect(parts.has(connection.bodyB)).toBe(true);
    }
    expect(api.run('walls.length')).toBe(4);
    expect(api.run('new Set(Composite.allBodies(world).flatMap(b => b.parts).map(b => b.id)).size')).toBe(parts.size + 4);
    expect(() => api.run('Engine.update(engine, 1000 / 60)')).not.toThrow();
    expect(api.errors).toEqual([]);
  });

  it('preserves tool Map/Set identity, portal links, gravity, pause, slow motion and score', () => {
    const api = gameHarness();
    api.run(`
      currentTool = 'ball'; const savedBall = spawnObject(200, 200);
      motorizedBodies.set(savedBall, -1);
      ratchetBodies.set(savedBall, { direction:-1, stopAngle:0, blockedUntil:0 });
      thrusterBodies.add(savedBall);
      anchoredBodies.add(savedBall);
      Body.setStatic(savedBall, true);
      placePortal(200, 100); placePortal(700, 100);
      paused = true; sloMoActive = true; gravityTarget = 0.38;
      engine.gravity.x = 0.38; engine.gravity.y = 0; gravityAngle = 1;
      destructionMeter = 1234; comboBest = 15; targetScore = 42;
      window.saved = serializeGameState();
      finishClear(false);
      restoreGameState(readGameSave(window.saved));
    `);
    expect(api.run('motorizedBodies.has(Composite.allBodies(world).find(b => b.render.type === "ball"))')).toBe(true);
    expect(api.run('[...thrusterBodies][0] === [...anchoredBodies][0]')).toBe(true);
    expect(api.run('ratchetBodies.has([...thrusterBodies][0])')).toBe(true);
    expect(api.run('portals[0].partner === 1 && portals[1].partner === 0')).toBe(true);
    expect(api.run('[paused, sloMoActive, gravityTarget, gravityAngle, destructionMeter, comboBest, targetScore]')).toEqual([true, true, 0.38, 1, 1234, 15, 42]);
    expect(api.run('[engine.gravity.x, engine.gravity.y]')).toEqual([0.38, 0]);
    expect(api.window.document.getElementById('btn-pause').textContent).toContain('PLAY');
  });

  it('keeps three independent saves across a fresh page and can save an empty game', () => {
    const api = gameHarness();
    api.click('btn-save');
    const empty = api.window.localStorage.getItem(key);
    api.run("currentTool = 'ball'; spawnObject(200, 200); paused = true;");
    api.window.document.getElementById('save-slot').value = '2';
    api.click('btn-save');
    const populated = api.window.localStorage.getItem('chaos-engine-save-2');
    expect(api.window.localStorage.getItem(key)).toBe(empty);
    const fresh = gameHarness({ [key]:empty, 'chaos-engine-save-2':populated });
    fresh.window.document.getElementById('save-slot').value = '2';
    fresh.click('btn-load'); fresh.click('save-accept');
    expect(fresh.run('captureGameState().bodies.length')).toBe(1);
    expect(fresh.run('paused')).toBe(true);
    fresh.window.document.getElementById('save-slot').value = '1';
    fresh.click('btn-load'); fresh.click('save-accept');
    expect(fresh.run('captureGameState().bodies.length')).toBe(0);
    expect(fresh.run('walls.length')).toBe(4);
  });

  it('requires confirmation before replacing a save or the current game, and cancel preserves both', () => {
    const api = gameHarness();
    api.click('btn-save');
    const first = api.window.localStorage.getItem(key);
    api.run('spawnObject(250, 200);');
    api.click('btn-save');
    expect(api.window.document.getElementById('save-confirm').open).toBe(true);
    api.click('save-cancel');
    expect(api.window.localStorage.getItem(key)).toBe(first);
    api.click('btn-load'); api.click('save-cancel');
    expect(api.run('captureGameState().bodies.length')).toBe(1);
    api.click('btn-save'); api.click('save-accept');
    expect(api.window.localStorage.getItem(key)).not.toBe(first);
    expect(api.feedback()).toContain('SAVED TO SLOT 1');
  });

  it('handles empty slots, unavailable storage and quota failures without losing the world or previous save', () => {
    const api = gameHarness();
    api.run('spawnObject(200, 200);');
    api.click('btn-load');
    expect(api.feedback()).toContain('IS EMPTY');
    api.click('btn-save');
    const previous = api.window.localStorage.getItem(key);
    const spy = vi.spyOn(api.window.Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    api.click('btn-save'); api.click('save-accept');
    expect(api.feedback()).toContain('SAVE FAILED');
    expect(api.window.localStorage.getItem(key)).toBe(previous);
    spy.mockRestore();
    const getSpy = vi.spyOn(api.window.Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    api.click('btn-load');
    expect(api.feedback()).toContain('LOAD FAILED');
    getSpy.mockRestore();
    expect(api.run('captureGameState().bodies.length')).toBe(1);
    expect(api.errors).toEqual([]);
  });

  it('rejects corrupt and future saves before changing the running game', () => {
    const api = gameHarness();
    api.run('spawnObject(200, 200);');
    for (const raw of ['not json', '{}', '{"version":999}', '{"version":1,"savedAt":"2026-10-16T12:00:00Z","graph":{"entry":{"ref":999},"nodes":[]}}']) {
      api.window.localStorage.setItem(key, raw);
      api.click('btn-load');
      expect(api.feedback()).toContain('CANNOT BE LOADED');
      expect(api.run('captureGameState().bodies.length')).toBe(1);
    }
    expect(api.errors).toEqual([]);
  });

  it('rejects damaged payloads, invalid connections and unsafe graph keys without mutating the game', () => {
    const api = gameHarness();
    api.run('spawnObject(200, 200);');
    api.click('btn-save');
    const saved = api.window.localStorage.getItem(key);
    const damaged = JSON.parse(saved);
    damaged.graph.nodes.pop();
    api.window.localStorage.setItem(key, JSON.stringify(damaged));
    api.click('btn-load');
    expect(api.feedback()).toContain('CANNOT BE LOADED');
    expect(api.run('captureGameState().bodies.length')).toBe(1);
    expect(() => api.run(`ChaosSaveCodec.decode({entry:{ref:0}, nodes:[{kind:'object',values:[['__proto__', null]]}]})`)).toThrow('Invalid save key');
    api.run(`
      const invalid = captureGameState();
      invalid.constraints.push({ type:'constraint', bodyA:{}, pointA:{x:0,y:0}, pointB:{x:0,y:0}, length:5, stiffness:1 });
      const graph = ChaosSaveCodec.encode(invalid);
      window.invalidSave = JSON.stringify({version:1, savedAt:new Date().toISOString(), graph, checksum:ChaosSaveCodec.checksum(graph)});
    `);
    expect(() => api.run('readGameSave(window.invalidSave)')).toThrow('Invalid saved connection');
    expect(api.run('captureGameState().bodies.length')).toBe(1);
  });

  it('restores reusable machines and keeps their registries linked to live bodies', () => {
    const api = gameHarness();
    api.run(`
      for (const place of [placeOrTipBasketAt, placeOrFlipRampAt, placeOrKickPinwheelAt,
        placeOrFireCannonAt, placeOrToggleElevatorAt, placeOrEjectRecyclerAt,
        placeOrToggleHatchAt, placeOrTogglePistonAt, placeOrReverseSawAt,
        placeOrRotateFunnelAt, placeOrFireCatapultAt, placeOrTogglePressAt, placeOrCycleSieveAt]) {
        place({ x:300, y:250 });
      }
      window.saved = serializeGameState();
      restoreGameState(readGameSave(window.saved));
    `);
    expect(api.run('[baskets, ramps, pinwheels, cannons, elevators, recyclers, hatches, pistons, saws, funnels, catapults, presses, sieves].every(list => list.length > 0)')).toBe(true);
    expect(api.run('[...baskets, ...ramps, ...cannons].every(body => Composite.get(world, body.id, "body") === body)')).toBe(true);
    expect(() => api.run('loop(performance.now() + 16)')).not.toThrow();
    expect(api.errors).toEqual([]);
  });

  it('restores in-flight rain and delayed bomb work and discards work from the replaced scene', () => {
    const api = gameHarness();
    api.click('btn-rain');
    api.run(`
      currentTool = 'bomb'; const bomb = spawnObject(200, 200);
      schedulePhysicsAction('bomb', { body:bomb }, 500);
      window.saved = serializeGameState();
      finishClear(false);
      schedulePhysicsAction('rain', {}, 10000);
      restoreGameState(readGameSave(window.saved));
    `);
    expect(api.run('pendingPhysicsActions.length')).toBe(21);
    expect(api.run('pendingPhysicsActions.find(a => a.kind === "bomb").body === captureGameState().bodies[0]')).toBe(true);
    api.run('runPendingPhysicsActions(performance.now() + 2000)');
    expect(api.run('pendingPhysicsActions.length')).toBe(0);
    expect(api.run('captureGameState().bodies.length')).toBe(20);
    expect(api.errors).toEqual([]);
  });

  it('blocks saving during Clear and stops the world and shortcuts while confirming', () => {
    const api = gameHarness();
    api.run('spawnObject(200, 200);');
    api.click('btn-save'); api.click('btn-clear'); api.click('btn-save');
    expect(api.feedback()).toContain('WAIT BEFORE SAVING');
    api.run('finishClear(false)');
    api.click('btn-load');
    const state = api.run('[paused, destructionMeter, engine.timing.timestamp]');
    api.run('loop(performance.now() + 1000)');
    expect(api.run('captureGameState().bodies.length')).toBe(0);
    api.window.document.dispatchEvent(new api.window.KeyboardEvent('keydown', { key:'e', bubbles:true }));
    expect(api.run('explosions.length')).toBe(0);
    api.click('save-cancel');
    expect(api.window.document.getElementById('save-confirm').open).toBe(false);
    expect(api.run('[paused, destructionMeter, engine.timing.timestamp]')).toEqual(state);
  });
});

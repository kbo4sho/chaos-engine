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

describe('Cam tool with real Matter.js', () => {
  function setup() {
    const api=gameHarness(); api.run('paused=true; engine.gravity.y=0;');
    const select=tool=>api.window.document.querySelector('[data-tool="'+tool+'"]').click();
    const step=(count=1)=>api.run(`for(let i=0;i<${count};i++) Engine.update(engine,1000/60)`);
    return {...api,select,step};
  }

  it('appends one accessible final button, exits Draw and routes actual canvas taps', () => {
    const api=setup(), button=api.window.document.querySelector('#toolbar > :last-child');
    expect(button.dataset.tool).toBe('cam');
    expect(button.previousElementSibling.dataset.tool).toBe('keel');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
    expect(button.getAttribute('aria-label')).toContain('eccentric cam');
    expect(button.title).toContain('stop or resume');
    api.select('draw'); button.click();
    expect(api.run('[currentTool,drawMode]')).toEqual(['cam',false]);
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=draw]').classList.contains('active')).toBe(false);
    const canvas=api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    const tap=()=>canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:300,clientY:300,bubbles:true}));
    tap(); expect(api.run('[cams.length,pointerDown,captureGameState().bodies.length]')).toEqual([1,false,1]);
    const feedback=api.window.document.getElementById('cam-feedback');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.textContent).toContain('CAM ON');
    tap(); expect(api.run('[cams.length,cams[0].camRunning]')).toEqual([1,false]);
    expect(feedback.textContent).toContain('CAM STOPPED');
    tap(); expect(api.run('cams[0].camRunning')).toBe(true);
    api.run('drawBody(cams[0]); drawCamLabels()'); expect(api.errors).toEqual([]);
  });

  it.each([[0,0],[1024,600],[-100,-100],[2000,2000]])('clamps the entire swept rim and label at %s,%s', (x,y) => {
    const api=setup(); api.run(`window.cam=placeOrToggleCamAt({x:${x},y:${y}})`);
    const a=api.run('cam.camAnchor');
    expect(a.x-62).toBeGreaterThanOrEqual(12); expect(a.x+62).toBeLessThanOrEqual(1012);
    expect(a.y-62).toBeGreaterThanOrEqual(12); expect(a.y+78).toBeLessThanOrEqual(590);
  });

  it('keeps a fixed eccentric axle through complete cycles with solid collision geometry', () => {
    const api=setup(); api.run('window.cam=placeOrToggleCamAt({x:300,y:300})');
    const start=api.run('cam.angle'); api.step(280);
    expect(api.run('[cam.isStatic,cam.isSensor,cam.collisionFilter.mask!==0,cam.circleRadius]')).toEqual([true,false,true,42]);
    expect(api.run('cam.angle')).toBeCloseTo((start+280*0.025)%(2*Math.PI),9);
    expect(api.run('Math.hypot(cam.position.x-cam.camAnchor.x,cam.position.y-cam.camAnchor.y)')).toBeCloseTo(20,9);
    expect(api.run('cam.camAnchor')).toEqual({x:300,y:300});
    expect(api.run('cam.velocity')).toEqual({x:0,y:0});
  });

  it('scales rotation with physics time and zero delta does not move', () => {
    const api=setup(); api.run(`window.cam=placeOrToggleCamAt({x:300,y:300}); window.start=cam.angle;
      updateCams({delta:0}); window.zero=cam.angle;
      updateCams({delta:1000/30}); window.double=cam.angle-start;
      Body.setAngle(cam,start); Body.setPosition(cam,getCamPosition(cam.camAnchor,start));
      updateCams({delta:1000/60}); updateCams({delta:1000/60});`);
    expect(api.run('zero')).toBe(api.run('start'));
    expect(api.run('double')).toBeCloseTo(0.05,10);
    expect(api.run('cam.angle-start')).toBeCloseTo(0.05,10);
  });

  it('physically lifts a free follower by the eccentric stroke and lets it descend', () => {
    const api=setup(); api.run(`engine.gravity.y=1; window.cam=placeOrToggleCamAt({x:300,y:300});
      window.load=Bodies.rectangle(300,266,120,20,{friction:0,frictionStatic:0,restitution:0,inertia:Infinity});
      Composite.add(world,load);`);
    api.step(126);
    expect(api.run('load.position.y')).toBeLessThan(235);
    expect(api.run('load.isStatic')).toBe(false);
    expect(api.run('load.position.x')).toBeCloseTo(300,1);
    api.step(126); expect(api.run('load.position.y')).toBeGreaterThan(260);
    expect(api.run('cam.camAnchor')).toEqual({x:300,y:300});
  });

  it('stops at the current pose and resumes without jumping phase or duplicating', () => {
    const api=setup(); api.run('window.cam=placeOrToggleCamAt({x:300,y:300})'); api.step(30);
    api.run('placeOrToggleCamAt(cam.camAnchor); window.angle=cam.angle; window.pos={...cam.position}'); api.step(60);
    expect(api.run('[cam.angle,cam.position,cams.length]')).toEqual([api.run('angle'),api.run('pos'),1]);
    api.run('placeOrToggleCamAt(cam.camAnchor)'); api.step();
    expect(api.run('cam.angle-angle')).toBeCloseTo(0.025,10);
  });

  it('uses the full rim and stationary axle as touch targets at every phase', () => {
    const api=setup(); api.run('window.cam=placeOrToggleCamAt({x:300,y:300})');
    for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
      api.run(`Body.setAngle(cam,${angle}); Body.setPosition(cam,getCamPosition(cam.camAnchor,cam.angle));
        placeOrToggleCamAt(cam.camAnchor); placeOrToggleCamAt({x:cam.position.x+35,y:cam.position.y});`);
      expect(api.run('[cams.length,cam.camRunning]')).toEqual([1,true]);
    }
  });

  it('wakes a sleeping nearby load but preserves sleepers away from the mechanism', () => {
    const api=setup(); api.run(`window.cam=placeOrToggleCamAt({x:300,y:300});
      window.load=Bodies.rectangle(300,270,20,20); window.far=Bodies.circle(700,100,10);
      Composite.add(world,[load,far]); Matter.Sleeping.set(load,true); Matter.Sleeping.set(far,true);
      updateCams({delta:1000/60});`);
    expect(api.run('[load.isSleeping,far.isSleeping]')).toEqual([false,true]);
  });

  it('does not wake phased or sensor loads', () => {
    const api=setup(); api.run(`window.cam=placeOrToggleCamAt({x:300,y:300});
      window.load=Bodies.rectangle(300,270,20,20); Composite.add(world,load);
      phaseBodies.set(load,{}); Matter.Sleeping.set(load,true); updateCams({delta:1000/60});`);
    expect(api.run('load.isSleeping')).toBe(true);
    api.run('phaseBodies.delete(load); load.isSensor=true; updateCams({delta:1000/60})');
    expect(api.run('load.isSleeping')).toBe(true);
  });

  it('Eraser removes the mechanism and retains an independent payload', () => {
    const api=setup(); api.run(`window.cam=placeOrToggleCamAt({x:300,y:300});
      window.load=Bodies.circle(600,100,10); Composite.add(world,load); eraseBodyAt(cam.camAnchor);`);
    expect(api.run('[cams.length,Composite.allBodies(world).includes(cam),Composite.allBodies(world).includes(load)]')).toEqual([0,false,true]);
  });

  it('prunes externally removed cams and clears feedback on tool changes and Clear', () => {
    const api=setup(); api.run('window.cam=placeOrToggleCamAt({x:300,y:300}); Composite.remove(world,cam)'); api.step();
    expect(api.run('cams.length')).toBe(0);
    api.select('ball'); expect(api.window.document.getElementById('cam-feedback').textContent).toBe('');
    api.select('cam'); api.run('placeOrToggleCamAt({x:300,y:300})'); api.select('draw');
    expect(api.window.document.getElementById('cam-feedback').textContent).toBe('');
    api.run('finishClear(false)'); expect(api.run('cams.length')).toBe(0);
    expect(api.window.document.getElementById('cam-feedback').textContent).toBe('');
  });

  it('restores the running/stopped state, phase, axle, selected tool and body identity', () => {
    const api=setup(); api.select('cam'); api.run('placeOrToggleCamAt({x:300,y:300}); placeOrToggleCamAt({x:600,y:300})'); api.step(30);
    api.run(`placeOrToggleCamAt(cams[1].camAnchor); window.angle=cams[0].angle;
      restoreGameState(readGameSave(serializeGameState()));`);
    expect(api.run('[currentTool,cams.length,cams[0].camRunning,cams[1].camRunning]')).toEqual(['cam',2,true,false]);
    expect(api.run('cams.every(body=>Composite.allBodies(world).includes(body))')).toBe(true);
    expect(api.run('cams[0].angle')).toBe(api.run('angle'));
    api.step(); expect(api.run('cams[0].angle-angle')).toBeCloseTo(0.025,10);
    expect(api.run('cams[1].angle')).toBe(api.run('angle'));
  });

  it('migrates older saves with no Cam registry', () => {
    const api=setup(); api.run(`const game=captureGameState(); delete game.state.cams; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})))`);
    expect(api.run('cams')).toEqual([]);
  });

  it.each(['cams.push(cam)','cams.push({})','cam.isStatic=false','cam.isSensor=true',
    'cam.camRunning=1','cam.camAnchor.x=NaN','cam.render.radius=5','cam.position.x+=100'])('rejects invalid saves before modifying the world: %s', mutation => {
    const api=setup(); api.run('window.cam=placeOrToggleCamAt({x:300,y:300})'); api.run(mutation);
    expect(()=>api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved cam');
    expect(api.run('Composite.allBodies(world).includes(cam)')).toBe(true);
  });
});

describe('Keel tool with real Matter.js', () => {
  function setup() {
    const api=gameHarness();
    api.run(`paused=true; engine.gravity.y=0;
      window.payload=Bodies.rectangle(300,300,24,36,{frictionAir:0}); Composite.add(world,payload);`);
    const select=tool=>api.window.document.querySelector('[data-tool="'+tool+'"]').click();
    const step=(count=1)=>api.run(`for(let i=0;i<${count};i++) Engine.update(engine,1000/60)`);
    return {...api,select,step};
  }

  it('keeps its accessible button, exits Draw and handles real canvas taps without spawning', () => {
    const api=setup(), button=api.window.document.querySelector('[data-tool=keel]');
    expect(button.dataset.tool).toBe('keel');
    expect(button.previousElementSibling.dataset.tool).toBe('syrup');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
    expect(button.getAttribute('aria-label')).toContain('keel');
    expect(button.title).toContain('sideways');
    api.select('draw'); button.click();
    expect(api.run('[currentTool,drawMode]')).toEqual(['keel',false]);
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=draw]').classList.contains('active')).toBe(false);
    const canvas=api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    const tap=()=>canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:300,clientY:300,bubbles:true}));
    tap();
    expect(api.run('[keelBodies.has(payload),pointerDown,captureGameState().bodies.length]')).toEqual([true,false,1]);
    const feedback=api.window.document.getElementById('keel-feedback');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.textContent).toContain('KEEL ON');
    api.run('drawKeelMarkers()');
    tap(); expect(api.run('keelBodies.size')).toBe(0);
    expect(feedback.textContent).toContain('KEEL OFF');
    expect(api.errors).toEqual([]);
  });

  it('damps sideways velocity while preserving axial speed, spin, mass and material', () => {
    const api=setup();
    api.run(`toggleKeelAt(payload.position); window.mass=payload.mass;
      Body.setVelocity(payload,{x:6,y:8}); Body.setAngularVelocity(payload,0.2);
      updateKeels({delta:1000/60});`);
    expect(api.run('payload.velocity.x')).toBeCloseTo(6,10);
    expect(api.run('payload.velocity.y')).toBeCloseTo(8*Math.exp(-0.24),10);
    expect(api.run('[payload.mass===mass,payload.frictionAir,payload.isStatic]')).toEqual([true,0,false]);
    expect(api.run('payload.angularVelocity')).toBeCloseTo(0.2,10);
    api.run('Body.setAngularVelocity(payload,0)'); api.step(20);
    expect(api.run('payload.velocity.x')).toBeCloseTo(6,10);
    expect(api.run('payload.velocity.y')).toBeLessThan(0.06);
  });

  it.each([0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.7])('uses the rotating body axis and dissipates energy at angle %s', angle => {
    const api=setup();
    api.run(`window.result=getKeelVelocity({x:6,y:-8},${angle},1000/60)`);
    const v=api.run('result'), t={x:Math.cos(angle),y:Math.sin(angle)};
    expect(v.x*t.x+v.y*t.y).toBeCloseTo(6*t.x-8*t.y,10);
    expect(Math.hypot(v.x,v.y)).toBeLessThanOrEqual(10+1e-10);
    api.run(`toggleKeelAt(payload.position); Body.setAngle(payload,${angle}); Body.setVelocity(payload,{x:6,y:-8}); updateKeels({delta:1000/60})`);
    expect(api.run('payload.velocity.x')).toBeCloseTo(v.x,10);
    expect(api.run('payload.velocity.y')).toBeCloseTo(v.y,10);
  });

  it('rotates the grip axis immediately when the part is turned', () => {
    const api=setup(); api.run(`toggleKeelAt(payload.position); Body.setAngle(payload,Math.PI/2);
      Body.setVelocity(payload,{x:8,y:-6}); updateKeels({delta:1000/60})`);
    expect(api.run('payload.velocity.x')).toBeCloseTo(8*Math.exp(-0.24),10);
    expect(api.run('payload.velocity.y')).toBeCloseTo(-6,10);
  });

  it('scales grip by time, bounds long frames and leaves zero time unchanged', () => {
    const api=setup();
    expect(api.run('getKeelVelocity({x:4,y:9},0,0)')).toEqual({x:4,y:9});
    expect(api.run('getKeelVelocity({x:4,y:9},0,-20)')).toEqual({x:4,y:9});
    api.run(`window.half=getKeelVelocity({x:4,y:9},0,1000/120);
      window.twice=getKeelVelocity(half,0,1000/120);`);
    expect(api.run('twice.y')).toBeCloseTo(api.run('getKeelVelocity({x:4,y:9},0,1000/60).y'),10);
    expect(api.run('getKeelVelocity({x:4,y:9},0,100000).y')).toBeCloseTo(9*Math.exp(-0.72),10);
  });

  it('never creates thrust at rest and lets gravity carry a part downward', () => {
    const api=setup(); api.run('toggleKeelAt(payload.position); updateKeels({delta:1000/60})');
    expect(api.run('[payload.velocity.x,payload.velocity.y]')).toEqual([0,0]);
    api.run('engine.gravity.y=1'); api.step(20);
    expect(api.run('payload.position.y')).toBeGreaterThan(310);
    expect(api.run('payload.velocity.y')).toBeGreaterThan(0.5);
    expect(api.run('engine.gravity.y')).toBe(1);
  });

  it('removes the fin without changing current motion and restores free sideways travel', () => {
    const api=setup(); api.run(`toggleKeelAt(payload.position); Body.setVelocity(payload,{x:0,y:7});
      Body.setAngularVelocity(payload,0.2); toggleKeelAt(payload.position)`);
    expect(api.run('[keelBodies.size,payload.velocity.y,payload.angularVelocity]')).toEqual([0,7,0.2]);
    api.step(5); expect(api.run('payload.velocity.y')).toBeCloseTo(7,10);
  });

  it('suspends grip while phased or anchored, resumes after release, and can detach while anchored', () => {
    const api=setup(); api.run(`toggleKeelAt(payload.position); Body.setVelocity(payload,{x:0,y:8}); phaseBodies.set(payload,{}); updateKeels({delta:1000/60})`);
    expect(api.run('payload.velocity.y')).toBe(8);
    api.run('phaseBodies.delete(payload); updateKeels({delta:1000/60})');
    expect(api.run('payload.velocity.y')).toBeCloseTo(8*Math.exp(-0.24),10);
    api.run('Body.setStatic(payload,true); updateKeels({delta:1000/60}); drawKeelMarkers()');
    expect(api.run('keelBodies.has(payload)')).toBe(true);
    api.run('Body.setStatic(payload,false); Body.setVelocity(payload,{x:0,y:8}); updateKeels({delta:1000/60})');
    expect(api.run('payload.velocity.y')).toBeCloseTo(8*Math.exp(-0.24),10);
    api.run('Body.setStatic(payload,true)');
    expect(api.run('toggleKeelAt(payload.position)')).toBe('removed');
    expect(api.errors).toEqual([]);
  });

  it('ignores sleeping and sensor bodies during simulation', () => {
    const api=setup(); api.run('toggleKeelAt(payload.position); Matter.Sleeping.set(payload,true); updateKeels({delta:1000/60})');
    expect(api.run('payload.isSleeping')).toBe(true);
    api.run('Matter.Sleeping.set(payload,false); payload.isSensor=true; Body.setVelocity(payload,{x:0,y:8}); updateKeels({delta:1000/60})');
    expect(api.run('payload.velocity.y')).toBe(8);
  });

  it('gives empty guidance and ignores walls, targets, fixed scenery and sensors', () => {
    const api=setup(); api.run('Composite.remove(world,payload)');
    expect(api.run('toggleKeelAt({x:300,y:300})')).toBe(false);
    expect(api.window.document.getElementById('keel-feedback').textContent).toContain('TAP A MOVABLE PART');
    api.run(`window.fixed=Bodies.rectangle(300,300,20,20,{isStatic:true});
      window.sensor=Bodies.circle(400,300,15,{isSensor:true});
      window.target=Bodies.circle(500,300,15); target.isTarget=true;
      window.wall=Bodies.circle(600,300,15,{label:'wall'}); Composite.add(world,[fixed,sensor,target,wall])`);
    for(const x of [300,400,500,600]) expect(api.run(`toggleKeelAt({x:${x},y:300})`)).toBe(false);
    expect(api.run('keelBodies.size')).toBe(0);
  });

  it('offers 46px touch targeting and applies grip once to a compound parent', () => {
    const api=setup(); expect(api.run('toggleKeelAt({x:344,y:300})')).toBe('attached');
    api.run(`finishClear(false); window.compound=Body.create({parts:[Bodies.rectangle(300,300,20,20),Bodies.rectangle(330,300,20,20)],frictionAir:0});
      Composite.add(world,compound); toggleKeelAt({x:330,y:300}); Body.setVelocity(compound,{x:5,y:8}); updateKeels({delta:1000/60})`);
    expect(api.run('[keelBodies.size,keelBodies.has(compound)]')).toEqual([1,true]);
    expect(api.run('compound.velocity.y')).toBeCloseTo(8*Math.exp(-0.24),10);
  });

  it.each(['ball','draw'])('clears feedback but keeps an installed fin when switching to %s', tool => {
    const api=setup(); api.select('keel'); api.run('toggleKeelAt(payload.position)'); api.select(tool);
    expect(api.run('keelBodies.size')).toBe(1);
    expect(api.window.document.getElementById('keel-feedback').textContent).toBe('');
  });

  it('cleans Eraser, external body removal and Clear without stale attachments', () => {
    const api=setup(); api.run('toggleKeelAt(payload.position); eraseBodyAt(payload.position)');
    expect(api.run('keelBodies.size')).toBe(0);
    api.run('Composite.add(world,payload); toggleKeelAt(payload.position); Composite.remove(world,payload); updateKeels({delta:1000/60})');
    expect(api.run('keelBodies.size')).toBe(0);
    api.run('Composite.add(world,payload); toggleKeelAt(payload.position); finishClear(false)');
    expect(api.run('[keelBodies.size,captureGameState().bodies.length]')).toEqual([0,0]);
    expect(api.window.document.getElementById('keel-feedback').textContent).toBe('');
  });

  it('does not remove Keel when an independent Ratchet is switched off', () => {
    const api=setup(); api.run('toggleKeelAt(payload.position); cycleRatchetAt(payload.position)');
    api.run('cycleRatchetAt(payload.position); cycleRatchetAt(payload.position)');
    expect(api.run('keelBodies.has(payload)')).toBe(true);
  });

  it('restores selection, body identity and sideways grip through save/load', () => {
    const api=setup(); api.select('keel'); api.run(`toggleKeelAt(payload.position); Body.setAngle(payload,Math.PI/2);
      Body.setVelocity(payload,{x:8,y:6}); restoreGameState(readGameSave(serializeGameState())); window.payload=[...keelBodies][0]`);
    expect(api.run('[currentTool,keelBodies.size,Composite.allBodies(world).includes(payload)]')).toEqual(['keel',1,true]);
    expect(api.window.document.querySelector('[data-tool=keel]').classList.contains('active')).toBe(true);
    api.step(); expect(api.run('payload.velocity.x')).toBeCloseTo(8*Math.exp(-0.24),10);
    expect(api.run('payload.velocity.y')).toBeCloseTo(6,10);
    api.run('drawKeelMarkers()'); expect(api.errors).toEqual([]);
  });

  it('migrates old saves with no fin registry', () => {
    const api=setup(); api.run(`const game=captureGameState(); delete game.state.keelBodies; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})))`);
    expect(api.run('keelBodies.size')).toBe(0);
  });

  it.each(['keelBodies.add({})','payload.isTarget=true','payload.label="wall"','keelBodies.add(payload.parts[1])'])('rejects malformed attachment saves: %s', mutation => {
    const api=setup(); api.run('toggleKeelAt(payload.position)'); api.run(mutation);
    expect(()=>api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved keel');
    expect(api.run('Composite.allBodies(world).includes(payload)')).toBe(true);
  });
});

describe('Syrup tool with real Matter.js', () => {
  function setup() {
    const api=gameHarness();
    api.run(`paused=true; engine.gravity.y=0;
      window.pool=placeOrDrainSyrupAt({x:300,y:300});
      window.payload=Bodies.rectangle(300,300,20,30,{frictionAir:0}); Composite.add(world,payload);`);
    const select=tool=>api.window.document.querySelector('[data-tool="'+tool+'"]').click();
    const step=(count=1)=>api.run(`for(let i=0;i<${count};i++) Engine.update(engine,1000/60)`);
    return {...api,select,step};
  }

  it('keeps the Syrup button after Torsion, selects through Draw and routes real canvas taps', () => {
    const api=gameHarness(),button=api.window.document.querySelector('[data-tool=syrup]');
    expect(button.dataset.tool).toBe('syrup');
    expect(button.previousElementSibling.dataset.tool).toBe('torsion');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
    expect(button.getAttribute('aria-label')).toContain('syrup pool');
    expect(button.title).toContain('drain');
    api.window.document.querySelector('[data-tool=draw]').click(); button.click();
    expect(api.run('[currentTool,drawMode]')).toEqual(['syrup',false]);
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=draw]').classList.contains('active')).toBe(false);
    const canvas=api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:300,clientY:300,bubbles:true}));
    expect(api.run('[syrupPools.length,pointerDown]')).toEqual([1,false]);
    const feedback=api.window.document.getElementById('syrup-feedback');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.textContent).toContain('POURED');
    canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:370,clientY:300,bubbles:true}));
    expect(api.run('syrupPools.length')).toBe(0);
    expect(feedback.textContent).toContain('DRAINED');
    expect(api.errors).toEqual([]);
  });

  it('places a non-solid pool and clamps it into desktop and small canvases', () => {
    const api=setup();
    expect(api.run('[pool.isStatic,pool.isSensor,pool.collisionFilter.mask,pool.render.radius]')).toEqual([true,true,0,74]);
    api.run('window.edge=placeOrDrainSyrupAt({x:-100,y:-100})');
    expect(api.run('[edge.position.x,edge.position.y]')).toEqual([84,84]);
    api.run('finishClear(false); canvas.width=100; canvas.height=90; window.small=placeOrDrainSyrupAt({x:500,y:500})');
    expect(api.run('[small.render.radius,small.position.x,small.position.y]')).toEqual([35,55,45]);
  });

  it('dissipates linear and angular energy without changing direction, mass or friction', () => {
    const api=setup();
    api.run('window.mass=payload.mass; Body.setVelocity(payload,{x:6,y:8}); Body.setAngularVelocity(payload,0.3); updateSyrupPools({delta:1000/60})');
    expect(api.run('payload.velocity.x')).toBeCloseTo(6*Math.exp(-0.2),10);
    expect(api.run('payload.velocity.y')).toBeCloseTo(8*Math.exp(-0.2),10);
    expect(api.run('payload.angularVelocity')).toBeCloseTo(0.3*Math.exp(-0.2),10);
    expect(api.run('[payload.mass===mass,payload.frictionAir,engine.gravity.y]')).toEqual([true,0,0]);
    api.step(20);
    expect(api.run('payload.speed')).toBeLessThan(0.3);
    expect(api.run('Math.abs(payload.angularVelocity)')).toBeLessThan(0.01);
  });

  it('has a smooth rim and leaves outside parts untouched', () => {
    const api=setup();
    api.run('Body.setPosition(payload,{x:364,y:300}); Body.setVelocity(payload,{x:10,y:0}); updateSyrupPools({delta:1000/60})');
    expect(api.run('payload.velocity.x')).toBeCloseTo(10*Math.exp(-0.1),10);
    api.run('Body.setPosition(payload,{x:375,y:300}); Body.setVelocity(payload,{x:10,y:0}); updateSyrupPools({delta:1000/60})');
    expect(api.run('payload.velocity.x')).toBe(10);
  });

  it('lets gravity carry parts through the pool without a solid collision or freezing them', () => {
    const api=setup(); api.run('engine.gravity.y=1'); api.step(20);
    expect(api.run('payload.position.y')).toBeGreaterThan(315);
    expect(api.run('payload.velocity.y')).toBeGreaterThan(1);
    expect(api.run('payload.velocity.y')).toBeLessThan(2);
    expect(api.run('engine.pairs.list.length')).toBe(0);
    expect(api.run('[payload.isStatic,payload.isSleeping]')).toEqual([false,false]);
  });

  it('restores free motion immediately on drainage while preserving the payload', () => {
    const api=setup();
    expect(api.run('placeOrDrainSyrupAt(pool.position)')).toBe('drained');
    api.run('Body.setVelocity(payload,{x:5,y:0}); Body.setAngularVelocity(payload,0.2)'); api.step(10);
    expect(api.run('payload.velocity.x')).toBeCloseTo(5,10);
    expect(api.run('payload.angularVelocity')).toBeCloseTo(0.2,10);
    expect(api.run('[syrupPools.length,captureGameState().bodies.length]')).toEqual([0,1]);
  });

  it('uses timestep-scaled drag, with zero delta leaving motion intact', () => {
    const api=setup();
    api.run('Body.setVelocity(payload,{x:10,y:0}); updateSyrupPools({delta:0})');
    expect(api.run('payload.velocity.x')).toBe(10);
    api.run('updateSyrupPools({delta:1000/120}); updateSyrupPools({delta:1000/120})');
    expect(api.run('payload.velocity.x')).toBeCloseTo(10*Math.exp(-0.2),10);
  });

  it('uses the strongest overlapping pool once instead of compounding drag', () => {
    const api=setup();
    api.run('placeOrDrainSyrupAt({x:390,y:300}); Body.setPosition(payload,{x:345,y:300}); Body.setVelocity(payload,{x:10,y:0}); updateSyrupPools({delta:1000/60})');
    expect(api.run('syrupPools.length')).toBe(2);
    expect(api.run('payload.velocity.x')).toBeCloseTo(10*Math.exp(-0.2),10);
  });

  it.each(['payload.isSensor=true','togglePhaseAt(payload.position)','toggleAnchorAt(payload.position)'])('respects immovable or intangible parts: %s', prepare => {
    const api=setup(); api.run('Body.setVelocity(payload,{x:5,y:0}); Body.setAngularVelocity(payload,0.2); '+prepare);
    const before=api.run('[payload.velocity.x,payload.angularVelocity]');
    api.run('updateSyrupPools({delta:1000/60})');
    expect(api.run('[payload.velocity.x,payload.angularVelocity]')).toEqual(before);
  });

  it.each(['ball','draw'])('clears feedback on switching to %s and retains placed pools', tool => {
    const api=setup(); api.select('syrup'); api.select(tool);
    expect(api.window.document.getElementById('syrup-feedback').textContent).toBe('');
    expect(api.run('syrupPools.length')).toBe(1);
  });

  it('cleans Eraser, externally removed pools and Clear without retaining drag', () => {
    const api=setup(); api.run('eraseBodyAt({x:350,y:300})');
    expect(api.run('[syrupPools.length,captureGameState().bodies.length]')).toEqual([0,1]);
    api.run('window.pool=placeOrDrainSyrupAt({x:300,y:300}); Composite.remove(world,pool); updateSyrupPools({delta:1000/60})');
    expect(api.run('syrupPools.length')).toBe(0);
    api.run('placeOrDrainSyrupAt({x:300,y:300}); finishClear(false)');
    expect(api.run('[syrupPools.length,captureGameState().bodies.length]')).toEqual([0,0]);
    expect(api.window.document.getElementById('syrup-feedback').textContent).toBe('');
  });

  it('restores pool identity, tool selection and working drag through save/load', () => {
    const api=setup(); api.select('syrup');
    api.run('Body.setVelocity(payload,{x:5,y:0}); restoreGameState(readGameSave(serializeGameState())); window.payload=captureGameState().bodies.find(b=>!b.isStatic)');
    expect(api.run('[currentTool,syrupPools.length,Composite.allBodies(world).includes(syrupPools[0])]')).toEqual(['syrup',1,true]);
    expect(api.window.document.querySelector('[data-tool=syrup]').classList.contains('active')).toBe(true);
    api.step(); expect(api.run('payload.velocity.x')).toBeCloseTo(5*Math.exp(-0.2),10);
    api.run('drawBody(syrupPools[0])'); expect(api.errors).toEqual([]);
  });

  it('migrates older saves with no syrup registry', () => {
    const api=gameHarness();
    api.run(`const game=captureGameState(); delete game.state.syrupPools; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})))`);
    expect(api.run('syrupPools.length')).toBe(0);
  });

  it.each(['pool.render.radius=NaN','pool.render.radius=1000','pool.isSensor=false','pool.isStatic=false','pool.collisionFilter.mask=1','syrupPools.push(pool)','syrupPools.push(payload)'])('rejects malformed saves before touching the live world: %s', mutation => {
    const api=setup(); api.run(mutation);
    expect(()=>api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved syrup pool');
    expect(api.run('captureGameState().bodies.length')).toBe(2);
  });
});

describe('Torsion tool with real Matter.js', () => {
  function setup() {
    const api = gameHarness();
    api.run(`paused=true; engine.gravity.y=0;
      window.a=Bodies.rectangle(200,200,24,40,{frictionAir:0});
      window.b=Bodies.rectangle(400,200,30,50,{frictionAir:0});
      Composite.add(world,[a,b]);`);
    const select = tool => api.window.document.querySelector('[data-tool="'+tool+'"]').click();
    const join = () => api.run('torsionAt(a.position); window.link=torsionAt(b.position); link');
    const step = (count=1,delta=1000/60) => api.run(`for(let i=0;i<${count};i++) Engine.update(engine,${delta})`);
    return {...api, select, join, step};
  }

  it('keeps Torsion after One-way, selects by the shared handler and routes real canvas taps', () => {
    const api=setup(),button=api.window.document.querySelector('[data-tool=torsion]');
    expect(button.dataset.tool).toBe('torsion');
    expect(button.previousElementSibling.dataset.tool).toBe('oneway');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
    expect(button.getAttribute('aria-label')).toContain('torsion spring');
    expect(button.title).toContain('Snip');
    api.select('draw'); button.click();
    expect(api.run('[currentTool,drawMode]')).toEqual(['torsion',false]);
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=draw]').classList.contains('active')).toBe(false);
    const canvas=api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    for(const x of [200,400]) canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:x,clientY:200,bubbles:true}));
    expect(api.run('[torsions.length,torsionSelection,pointerDown]')).toEqual([1,null,false]);
    expect(api.window.document.getElementById('torsion-feedback').getAttribute('role')).toBe('status');
    expect(api.window.document.getElementById('torsion-feedback').textContent).toContain('TWIST EITHER END');
    expect(api.errors).toEqual([]);
  });

  it('records arbitrary starting relative angle without a placement impulse or positional coupling', () => {
    const api=setup();
    api.run('Body.setAngle(a,0.3); Body.setAngle(b,1.2)'); api.join(); api.step(12);
    expect(api.run('link.torsionRestAngle')).toBeCloseTo(0.9,10);
    expect(api.run('[link.stiffness,link.damping,link.length,link.render.type]')).toEqual([0,0,200,'torsion']);
    expect(api.run('[a.angularVelocity,b.angularVelocity,a.position.x,b.position.x]')).toEqual([0,0,200,400]);
    api.run('Body.setPosition(b,{x:600,y:300}); Body.setVelocity(b,{x:3,y:4})'); api.step();
    expect(api.run('[a.position.x,a.position.y,b.velocity.x,b.velocity.y]')).toEqual([200,200,3,4]);
  });

  it('uses equal and opposite angular impulses weighted by real inertia', () => {
    const api=setup(); api.join();
    api.run('Body.setAngle(b,1); updateTorsions({delta:1000/60})');
    expect(api.run('a.angularVelocity')).toBeGreaterThan(0);
    expect(api.run('b.angularVelocity')).toBeLessThan(0);
    expect(api.run('a.inertia*a.angularVelocity+b.inertia*b.angularVelocity')).toBeCloseTo(0,10);
    expect(api.run('a.angularVelocity-b.angularVelocity')).toBeCloseTo(0.012,10);
    expect(api.run('[a.velocity.x,a.velocity.y,b.velocity.x,b.velocity.y]')).toEqual([0,0,0,0]);
  });

  it('winds under the existing Twist tool, oscillates and settles at the original relative angle', () => {
    const api=setup(); api.join(); api.select('twist');
    api.run('twistBodyAt(b.position)');
    const initial=api.run('b.angularVelocity'); expect(initial).toBeGreaterThan(0);
    api.step(16);
    expect(api.run('Math.abs(b.angle-a.angle-link.torsionRestAngle)')).toBeGreaterThan(0.2);
    expect(api.run('a.angularVelocity')).toBeGreaterThan(0);
    api.step(300);
    expect(api.run('Math.abs(b.angle-a.angle-link.torsionRestAngle)')).toBeLessThan(0.001);
    expect(api.run('Math.abs(b.angularVelocity-a.angularVelocity)')).toBeLessThan(0.001);
    expect(api.run('(a.inertia*a.angularVelocity+b.inertia*b.angularVelocity)/(a.inertia+b.inertia)')).toBeCloseTo(initial*api.run('b.inertia/(a.inertia+b.inertia)'),7);
  });

  it('supports an anchored end and returns a displaced angle instead of rigidly locking it', () => {
    const api=setup(); api.run('toggleAnchorAt(a.position)'); api.join();
    api.run('Body.setAngle(b,1)'); api.step(5);
    expect(api.run('b.angle')).toBeGreaterThan(0.5);
    expect(api.run('b.angle')).toBeLessThan(1);
    expect(api.run('[a.angle,a.angularVelocity,a.position.x,a.position.y]')).toEqual([0,0,200,200]);
    api.step(300); expect(api.run('Math.abs(b.angle)')).toBeLessThan(0.001);
  });

  it('retains multiple turns of winding and bounds extreme angular correction', () => {
    const api=setup(); api.join();
    api.run('Body.setAngle(b,Math.PI*8); updateTorsions({delta:1000/60})');
    expect(api.run('a.angularVelocity-b.angularVelocity')).toBeCloseTo(0.045,10);
    api.step(180); expect(api.run('b.angle-a.angle')).toBeLessThan(Math.PI*8-1);
    expect(api.run('[a.angle,b.angle,a.angularVelocity,b.angularVelocity].every(Number.isFinite)')).toBe(true);
  });

  it('scales the spring impulse with the physics timestep and does nothing at zero delta', () => {
    const api=setup(); api.join();
    api.run('Body.setAngle(b,0.5); updateTorsions({delta:0})');
    expect(api.run('[a.angularVelocity,b.angularVelocity]')).toEqual([0,0]);
    api.run('updateTorsions({delta:1000/120})');
    expect(api.run('a.angularVelocity-b.angularVelocity')).toBeCloseTo(0.003,10);
  });

  it('wakes sleeping endpoints when the spring is wound', () => {
    const api=setup(); api.join();
    api.run('Body.setAngle(b,1); Matter.Sleeping.set(a,true); Matter.Sleeping.set(b,true); updateTorsions({delta:1000/60})');
    expect(api.run('[a.isSleeping,b.isSleeping]')).toEqual([false,false]);
  });

  it('offers empty guidance, fingertip targeting, same-part cancellation and duplicate protection', () => {
    const api=setup();
    expect(api.run('torsionAt({x:900,y:500})')).toBe(false);
    expect(api.window.document.getElementById('torsion-feedback').textContent).toContain('TAP A PART');
    expect(api.run('torsionAt({x:240,y:200})')).toBe('selected');
    expect(api.run('torsionSelection===a')).toBe(true);
    expect(api.run('torsionAt(a.position)')).toBe('cancelled');
    api.join();
    api.run('torsionAt(b.position)'); expect(api.run('torsionAt(a.position)')).toBe(false);
    expect(api.run('[torsions.length,torsionSelection]')).toEqual([1,null]);
  });

  it('rejects walls, short links and pairs with no rotational freedom', () => {
    const api=setup();
    expect(api.run('torsionAt({x:5,y:5})')).toBe(false);
    api.run('Body.setPosition(b,{x:230,y:200}); torsionAt(a.position)');
    expect(api.run('torsionAt(b.position)')).toBe(false);
    api.run('Body.setPosition(b,{x:400,y:200}); toggleAnchorAt(a.position); toggleAnchorAt(b.position)');
    expect(api.run('torsionAt(b.position)')).toBe(false);
    expect(api.run('torsions.length')).toBe(0);
    expect(api.window.document.getElementById('torsion-feedback').textContent).toContain('ONE PART MUST TURN');
  });

  it.each(['ball','draw'])('clears pending selection and feedback when switching to %s', tool => {
    const api=setup(); api.select('torsion'); api.run('torsionAt(a.position)'); api.select(tool);
    expect(api.run('torsionSelection')).toBe(null);
    expect(api.window.document.getElementById('torsion-feedback').textContent).toBe('');
  });

  it('Snip disconnects angular coupling and keeps both payloads', () => {
    const api=setup(); api.join(); api.run('snipConstraintAt({x:300,y:200}); Body.setAngle(b,1)'); api.step();
    expect(api.run('[torsions.length,Composite.allConstraints(world).length,captureGameState().bodies.length]')).toEqual([0,0,2]);
    expect(api.run('[a.angularVelocity,b.angularVelocity]')).toEqual([0,0]);
  });

  it('cleans Eraser, removed bodies or constraints, pending selection, and Clear', () => {
    const api=setup(); api.join(); api.run('eraseBodyAt(a.position)');
    expect(api.run('[torsions.length,Composite.allConstraints(world).length,captureGameState().bodies.length]')).toEqual([0,0,1]);
    const other=setup(); other.join(); other.run('Composite.remove(world,link); pruneTorsions()');
    expect(other.run('torsions.length')).toBe(0);
    other.join(); other.run('Composite.remove(world,a); updateTorsions({delta:1000/60})');
    expect(other.run('[torsions.length,Composite.allConstraints(world).length]')).toEqual([0,0]);
    other.run('torsionAt(b.position); Composite.remove(world,b); pruneTorsions()');
    expect(other.run('torsionSelection')).toBe(null);
    const clear=setup(); clear.join(); clear.run('torsionAt(a.position); finishClear(false)');
    expect(clear.run('[torsions.length,torsionSelection,captureGameState().bodies.length]')).toEqual([0,null,0]);
    expect(clear.window.document.getElementById('torsion-feedback').textContent).toBe('');
  });

  it('restores constraint identity, winding, selected tool and angular spring physics', () => {
    const api=setup(); api.join(); api.select('torsion');
    api.run(`Body.setAngle(b,1); restoreGameState(readGameSave(serializeGameState()));
      window.link=torsions[0]; window.a=link.bodyA; window.b=link.bodyB;`);
    expect(api.run('[currentTool,link.torsionRestAngle,b.angle,torsionSelection]')).toEqual(['torsion',0,1,null]);
    expect(api.run('Composite.allConstraints(world).includes(link)&&Composite.allBodies(world).includes(a)&&Composite.allBodies(world).includes(b)')).toBe(true);
    api.step(); expect(api.run('a.angularVelocity')).toBeGreaterThan(0);
    expect(api.run('b.angularVelocity')).toBeLessThan(0);
    expect(api.errors).toEqual([]);
  });

  it('migrates older version 1 saves with an empty torsion registry', () => {
    const api=setup();
    api.run(`const game=captureGameState(); delete game.state.torsions; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})))`);
    expect(api.run('torsions.length')).toBe(0);
    expect(api.run('captureGameState().bodies.length')).toBe(2);
  });

  it.each(['link.torsionRestAngle=NaN','link.stiffness=1','link.bodyB=link.bodyA','torsions.push(link)','link.pointA.x=1'])('rejects malformed saves before replacing the running world: %s', mutation => {
    const api=setup(); api.join(); api.run(mutation);
    expect(()=>api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved torsion');
    expect(api.run('captureGameState().bodies.length')).toBe(2);
  });

  it('renders the pending part, coil, winding readout and endpoint spokes', () => {
    const api=setup(); api.select('torsion');
    api.run('torsionAt(a.position); drawTorsions(); torsionAt(b.position); drawTorsions(); Body.setAngle(b,1); drawTorsions(); drawConstraints()');
    expect(api.errors).toEqual([]);
  });
});

describe('One-way gate with real Matter.js', () => {
  function setup(bodyCode = 'Bodies.rectangle(300,200,20,20,{frictionAir:0})') {
    const api = gameHarness();
    api.run(`paused=true; engine.gravity.y=0;
      window.gate=placeOrReverseOnewayAt({x:300,y:300});
      window.payload=${bodyCode}; Composite.add(world,payload);`);
    const select = tool => api.window.document.querySelector('[data-tool="'+tool+'"]').click();
    const step = (count=1) => api.run(`for(let i=0;i<${count};i++) Engine.update(engine,1000/60)`);
    return {...api, select, step};
  }

  it('keeps One-way after Pulley and routes real canvas taps through shared selection', () => {
    const api=gameHarness(), button=api.window.document.querySelector('[data-tool=oneway]');
    expect(button.dataset.tool).toBe('oneway');
    expect(button.previousElementSibling.dataset.tool).toBe('pulley');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
    expect(button.getAttribute('aria-label')).toContain('one-way gate');
    expect(button.title).toContain('reverse');
    button.click();
    expect(api.run('[currentTool,drawMode]')).toEqual(['oneway',false]);
    expect(button.classList.contains('active')).toBe(true);
    expect(api.window.document.querySelector('[data-tool=ball]').classList.contains('active')).toBe(false);
    const canvas=api.window.document.querySelector('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:300,clientY:300,bubbles:true}));
    expect(api.run('[onewayGates.length,onewayGates[0].onewayDirection,pointerDown]')).toEqual([1,-1,false]);
    canvas.dispatchEvent(new api.window.MouseEvent('mousedown',{clientX:365,clientY:325,bubbles:true}));
    expect(api.run('[onewayGates.length,onewayGates[0].onewayDirection]')).toEqual([1,1]);
    const status=api.window.document.getElementById('oneway-feedback');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('PASS DOWN');
    expect(api.errors).toEqual([]);
  });

  it('creates clamped static gates, including on a narrow canvas', () => {
    const api=setup();
    api.run('window.edge=placeOrReverseOnewayAt({x:-500,y:9000})');
    expect(api.run('[edge.position.x,edge.position.y,edge.render.width]')).toEqual([86,556,156]);
    expect(api.run('[edge.isStatic,edge.isSensor,edge.collisionFilter.mask]')).toEqual([true,true,0]);
    api.run('canvas.width=120; window.narrow=placeOrReverseOnewayAt({x:800,y:-100})');
    expect(api.run('[narrow.position.x,narrow.position.y,narrow.render.width]')).toEqual([68,44,88]);
  });

  it('passes upward through a gate and later settles on its top under real gravity', () => {
    const api=setup();
    api.run('Body.setPosition(payload,{x:300,y:350}); Body.setVelocity(payload,{x:0,y:-13}); engine.gravity.y=1');
    api.step(17);
    expect(api.run('getOnewayBounds(payload).maxY')).toBeLessThan(300);
    api.step(100);
    expect(api.run('getOnewayBounds(payload).maxY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
    expect(api.run('onewayGates.length')).toBe(1);
  });

  it('stops only blocked vertical motion, preserving horizontal speed and spin', () => {
    const api=setup();
    api.run('Body.setPosition(payload,{x:300,y:280}); Body.setVelocity(payload,{x:3,y:20}); Body.setAngularVelocity(payload,0.2)');
    api.step();
    expect(api.run('getOnewayBounds(payload).maxY')).toBeCloseTo(300,7);
    expect(api.run('[payload.velocity.x,payload.velocity.y]')).toEqual([3,0]);
    expect(api.run('payload.angularVelocity')).toBeCloseTo(0.2,8);
    expect(api.run('payload.position.x')).toBe(303);
    expect(api.run('gate.onewayHitUntil')).toBeGreaterThan(0);
  });

  it('reverses to catch upward motion while letting downward travel pass', () => {
    const api=setup();
    api.run('placeOrReverseOnewayAt({x:370,y:325}); Body.setPosition(payload,{x:300,y:330}); Body.setVelocity(payload,{x:0,y:-30})');
    api.step();
    expect(api.run('getOnewayBounds(payload).minY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
    api.run('Body.setPosition(payload,{x:300,y:260}); Body.setVelocity(payload,{x:0,y:60})');
    api.step();
    expect(api.run('payload.position.y')).toBeCloseTo(320,7);
    expect(api.run('payload.velocity.y')).toBeCloseTo(60,7);
  });

  it('supports a reversed gate under inverted gravity', () => {
    const api=setup();
    api.run('placeOrReverseOnewayAt(gate.position); Body.setPosition(payload,{x:300,y:400}); engine.gravity.y=-1');
    api.step(90);
    expect(api.run('getOnewayBounds(payload).minY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
  });

  it.each(['reverse','erase','external removal'])('wakes a resting payload after gate %s', action => {
    const api=setup();
    api.run('engine.gravity.y=1'); api.step(180);
    expect(api.run('payload.isSleeping')).toBe(true);
    expect(api.run('getOnewayBounds(payload).maxY')).toBeCloseTo(300,7);
    if(action==='reverse') api.run('placeOrReverseOnewayAt(gate.position)');
    else if(action==='erase') api.run('eraseBodyAt({x:370,y:300})');
    else api.run('Composite.remove(world,gate); pruneOnewayGates()');
    expect(api.run('payload.isSleeping')).toBe(false);
    api.step(20);
    expect(api.run('payload.position.y')).toBeGreaterThan(310);
  });

  it('catches fast crossings with a swept geometry check', () => {
    const api=setup();
    api.run('Body.setVelocity(payload,{x:0,y:160})');
    api.step();
    expect(api.run('getOnewayBounds(payload).maxY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
  });

  it('lets parts miss either end and does not pull a straddling part onto the gate', () => {
    const api=setup();
    api.run('Body.setPosition(payload,{x:500,y:200}); Body.setVelocity(payload,{x:0,y:160})');
    api.step();
    expect(api.run('payload.position.y')).toBe(360);
    api.run('Body.setPosition(payload,{x:300,y:300}); Body.setVelocity(payload,{x:0,y:10})');
    api.step();
    expect(api.run('payload.position.y')).toBe(310);
  });

  it('tests horizontal overlap at the crossing rather than at the end of the step', () => {
    const api=setup();
    api.run('Body.setPosition(payload,{x:150,y:260}); Body.setVelocity(payload,{x:120,y:80})');
    api.step();
    expect(api.run('payload.velocity.y')).toBe(80); // entered the span only after crossing
    api.run('Body.setPosition(payload,{x:300,y:260}); Body.setVelocity(payload,{x:160,y:80})');
    api.step();
    expect(api.run('payload.velocity.y')).toBe(0); // crossed before leaving the span
  });

  it.each(['payload.isPhased=true','payload.isSensor=true'])('respects non-colliding payload state: %s', state => {
    const api=setup();
    api.run(state+'; Body.setVelocity(payload,{x:0,y:160})');
    api.step();
    expect(api.run('payload.position.y')).toBe(360);
    expect(api.run('payload.velocity.y')).toBe(160);
  });

  it('supports real compound collision geometry', () => {
    const api=setup('Body.create({parts:[Bodies.rectangle(290,200,20,20),Bodies.rectangle(310,215,20,20)],frictionAir:0})');
    api.run('Body.setVelocity(payload,{x:0,y:120})'); api.step();
    expect(api.run('getOnewayBounds(payload).maxY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
  });

  it('clears feedback on tool changes while preserving gates and supports Eraser, pruning and Clear', () => {
    const api=setup();
    for(const tool of ['ball','draw']) {
      api.select('oneway'); api.run('showOnewayFeedback(gate)'); api.select(tool);
      expect(api.window.document.getElementById('oneway-feedback').textContent).toBe('');
      expect(api.run('onewayGates.length')).toBe(1);
    }
    api.run('eraseBodyAt(gate.position)');
    expect(api.run('onewayGates.length')).toBe(0);
    expect(api.run('Composite.allBodies(world).includes(payload)')).toBe(true);
    api.run('window.gate=placeOrReverseOnewayAt({x:300,y:300}); Composite.remove(world,gate); pruneOnewayGates()');
    expect(api.run('onewayGates.length')).toBe(0);
    api.run('placeOrReverseOnewayAt({x:300,y:300}); sampleOnewayBodies(); finishClear(false)');
    expect(api.run('[onewayGates.length,onewayPreviousBounds.size,captureGameState().bodies.length]')).toEqual([0,0,0]);
    expect(api.window.document.getElementById('oneway-feedback').textContent).toBe('');
  });

  it('restores gate identity, direction and physics with save/load', () => {
    const api=setup(); api.select('oneway');
    api.run('placeOrReverseOnewayAt(gate.position); restoreGameState(readGameSave(serializeGameState())); window.gate=onewayGates[0]; window.payload=captureGameState().bodies.find(b=>!b.isStatic)');
    expect(api.run('[currentTool,gate.onewayDirection,onewayPreviousBounds.size]')).toEqual(['oneway',1,0]);
    expect(api.run('Composite.allBodies(world).includes(gate)')).toBe(true);
    api.run('Body.setPosition(payload,{x:300,y:330}); Body.setVelocity(payload,{x:0,y:-40})'); api.step();
    expect(api.run('getOnewayBounds(payload).minY')).toBeCloseTo(300,7);
    expect(api.run('payload.velocity.y')).toBe(0);
  });

  it('migrates older saves and rejects malformed gates without replacing the world', () => {
    const api=gameHarness();
    api.run(`const game=captureGameState(); delete game.state.onewayGates; const graph=ChaosSaveCodec.encode(game);
      restoreGameState(readGameSave(JSON.stringify({version:1,savedAt:new Date().toISOString(),graph,checksum:ChaosSaveCodec.checksum(graph)})))`);
    expect(api.run('onewayGates.length')).toBe(0);
    api.run('window.gate=placeOrReverseOnewayAt({x:300,y:300})');
    for(const mutation of ['gate.onewayDirection=0','gate.onewayDirection=-1; gate.render.width=NaN','gate.render.width=156; gate.isStatic=false','gate.isStatic=true; onewayGates.push(gate)']) {
      api.run(mutation);
      expect(()=>api.run('readGameSave(serializeGameState())')).toThrow('Invalid saved one-way gate');
      expect(api.run('captureGameState().bodies.length')).toBe(1);
    }
  });

  it('renders both arrow directions and contact feedback', () => {
    const api=setup();
    api.run('drawBody(gate); gate.onewayHitUntil=performance.now()+180; drawBody(gate); placeOrReverseOnewayAt(gate.position); drawBody(gate)');
    expect(api.errors).toEqual([]);
  });
});

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

  it('keeps Pulley after Damper, selects it, and routes all three real canvas taps', () => {
    const api = setup();
    const button = api.window.document.querySelector('[data-tool=pulley]');
    expect(button.dataset.tool).toBe('pulley');
    expect(button.previousElementSibling.dataset.tool).toBe('damper');
    expect(api.window.document.querySelectorAll('#toolbar .tool-btn')).toHaveLength(98);
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

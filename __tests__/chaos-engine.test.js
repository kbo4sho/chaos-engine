/**
 * Chaos Engine Test Suite
 * Tests DOM structure, button existence, and code patterns
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

let dom, document, html, scriptContent;

beforeAll(() => {
  const htmlPath = path.join(process.cwd(), 'index.html');
  html = fs.readFileSync(htmlPath, 'utf-8');
  dom = new JSDOM(html, { url: 'http://localhost' });
  document = dom.window.document;
  
  // Extract script content for code analysis
  scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
});

// ============================================
// TOOL BUTTON EXISTENCE TESTS
// ============================================

describe('Tool Button Existence', () => {
  const allTools = [
    'ball', 'block', 'rocket', 'car', 'dino', 'bomb', 'star', 'balloon',
    'portal', 'bumper', 'beachball', 'duck', 'domino', 'anvil', 'ragdoll',
    'trampoline', 'conveyor-left', 'conveyor-right', 'wrecking', 'ice', 'fan',
    'magnet', 'pin', 'seesaw', 'rope', 'chain-link', 'draw', 'slomo', 'grab'
  ];

  allTools.forEach(tool => {
    it(`should have button for ${tool} tool`, () => {
      const btn = document.querySelector(`[data-tool="${tool}"]`);
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('tool-btn')).toBe(true);
    });
  });

  it('should have exactly 29 tool buttons', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    expect(buttons.length).toBe(29);
  });

  it('should have ball as default active tool', () => {
    const ballBtn = document.querySelector('[data-tool="ball"]');
    expect(ballBtn.classList.contains('active')).toBe(true);
  });

  it('should have draw button with special class', () => {
    const drawBtn = document.querySelector('[data-tool="draw"]');
    expect(drawBtn.classList.contains('draw-btn')).toBe(true);
  });
});

// ============================================
// CHAOS BUTTON EXISTENCE TESTS
// ============================================

describe('Chaos Button Existence', () => {
  const chaosIds = [
    'btn-explode', 'btn-quake', 'btn-wind', 'btn-blackhole', 'btn-antigrav',
    'btn-timewarp', 'btn-rain', 'btn-gravflip', 'btn-megabounce', 'btn-vortex',
    'btn-tornado', 'btn-freeze', 'btn-popcorn', 'btn-shuffle', 'btn-target',
    'btn-ocean', 'btn-jenga', 'btn-ambient', 'btn-screenshot', 'btn-clear', 'btn-pause'
  ];

  chaosIds.forEach(id => {
    it(`should have chaos button with id '${id}'`, () => {
      const btn = document.getElementById(id);
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('chaos-btn')).toBe(true);
    });
  });

  it('should have exactly 21 chaos buttons', () => {
    const buttons = document.querySelectorAll('.chaos-btn');
    expect(buttons.length).toBe(21);
  });

  it('should have clear and pause as safe buttons', () => {
    const clearBtn = document.getElementById('btn-clear');
    const pauseBtn = document.getElementById('btn-pause');
    expect(clearBtn.classList.contains('safe')).toBe(true);
    expect(pauseBtn.classList.contains('safe')).toBe(true);
  });
});

// ============================================
// GRAVITY/PLANET BUTTON TESTS
// ============================================

describe('Gravity/Planet Selection', () => {
  const planets = [
    { gravity: '1', name: 'Earth', emoji: '🌍' },
    { gravity: '0.166', name: 'Moon', emoji: '🌙' },
    { gravity: '0.38', name: 'Mars', emoji: '🔴' },
    { gravity: '2.53', name: 'Jupiter', emoji: '🟠' },
    { gravity: '0', name: 'Space', emoji: '🚀' },
  ];

  planets.forEach(({ gravity, name }) => {
    it(`should have ${name} button with gravity ${gravity}`, () => {
      const btn = document.querySelector(`[data-gravity="${gravity}"]`);
      expect(btn).not.toBeNull();
      expect(btn.dataset.name).toBe(name);
      expect(btn.classList.contains('planet-btn')).toBe(true);
    });
  });

  it('should have exactly 5 planet buttons', () => {
    const buttons = document.querySelectorAll('.planet-btn');
    expect(buttons.length).toBe(5);
  });

  it('should have Earth selected by default', () => {
    const earthBtn = document.querySelector('[data-gravity="1"]');
    expect(earthBtn.classList.contains('active')).toBe(true);
  });
});

// ============================================
// UI ELEMENT TESTS
// ============================================

describe('UI Elements', () => {
  it('should have canvas element with id "game"', () => {
    const canvas = document.getElementById('game');
    expect(canvas).not.toBeNull();
    expect(canvas.tagName.toLowerCase()).toBe('canvas');
  });

  it('should have object count display', () => {
    const objCount = document.getElementById('obj-count');
    expect(objCount).not.toBeNull();
    expect(objCount.textContent).toBe('0');
  });

  it('should have planet name display', () => {
    const planetName = document.getElementById('planet-name');
    expect(planetName).not.toBeNull();
    expect(planetName.textContent).toBe('EARTH');
  });

  it('should have toolbar toggle button', () => {
    const toggle = document.getElementById('toggle-toolbar');
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toContain('OBJECTS');
  });

  it('should have chaos bar toggle button', () => {
    const toggle = document.getElementById('toggle-chaos');
    expect(toggle).not.toBeNull();
    expect(toggle.textContent).toContain('CHAOS');
  });

  it('should have app container', () => {
    const app = document.getElementById('app');
    expect(app).not.toBeNull();
  });

  it('should have canvas wrap', () => {
    const wrap = document.getElementById('canvas-wrap');
    expect(wrap).not.toBeNull();
  });

  it('should have topbar', () => {
    const topbar = document.getElementById('topbar');
    expect(topbar).not.toBeNull();
  });

  it('should have toolbar', () => {
    const toolbar = document.getElementById('toolbar');
    expect(toolbar).not.toBeNull();
  });

  it('should have chaos-bar', () => {
    const chaosBar = document.getElementById('chaos-bar');
    expect(chaosBar).not.toBeNull();
  });

  it('should have gravity panel', () => {
    const gravPanel = document.getElementById('gravity-panel');
    expect(gravPanel).not.toBeNull();
  });
});

// ============================================
// CODE PATTERN TESTS (Static Analysis)
// ============================================

describe('Code Structure - spawnObject Function', () => {
  it('should have spawnObject function defined', () => {
    expect(scriptContent).toContain('function spawnObject(');
  });

  it('should have switch statement on currentTool', () => {
    expect(scriptContent).toContain('switch(currentTool)');
  });

  it('should have case for ball', () => {
    expect(scriptContent).toContain("case 'ball':");
  });

  it('should have case for block', () => {
    expect(scriptContent).toContain("case 'block':");
  });

  it('should have case for rocket', () => {
    expect(scriptContent).toContain("case 'rocket':");
  });

  it('should have case for car', () => {
    expect(scriptContent).toContain("case 'car':");
  });

  it('should have case for dino', () => {
    expect(scriptContent).toContain("case 'dino':");
  });

  it('should have case for bomb', () => {
    expect(scriptContent).toContain("case 'bomb':");
  });

  it('should have case for star', () => {
    expect(scriptContent).toContain("case 'star':");
  });

  it('should have case for balloon', () => {
    expect(scriptContent).toContain("case 'balloon':");
  });

  it('should have case for beachball', () => {
    expect(scriptContent).toContain("case 'beachball':");
  });

  it('should have case for duck', () => {
    expect(scriptContent).toContain("case 'duck':");
  });

  it('should have case for domino', () => {
    expect(scriptContent).toContain("case 'domino':");
  });

  it('should have case for anvil', () => {
    expect(scriptContent).toContain("case 'anvil':");
  });

  it('should have case for ragdoll', () => {
    expect(scriptContent).toContain("case 'ragdoll':");
  });

  it('should have case for trampoline', () => {
    expect(scriptContent).toContain("case 'trampoline':");
  });

  it('should have case for bumper', () => {
    expect(scriptContent).toContain("case 'bumper':");
  });

  it('should have case for wrecking', () => {
    expect(scriptContent).toContain("case 'wrecking':");
  });

  it('should have case for conveyor-left', () => {
    expect(scriptContent).toContain("case 'conveyor-left':");
  });

  it('should have case for conveyor-right', () => {
    expect(scriptContent).toContain("case 'conveyor-right':");
  });

  it('should have case for ice', () => {
    expect(scriptContent).toContain("case 'ice':");
  });

  it('should have case for fan', () => {
    expect(scriptContent).toContain("case 'fan':");
  });

  it('should have case for chain-link', () => {
    expect(scriptContent).toContain("case 'chain-link':");
  });
});

// ============================================
// CONVEYOR BUG FIX VERIFICATION
// ============================================

describe('Conveyor Bug Fix', () => {
  it('should use currentTool for conveyor direction check (BUG FIX)', () => {
    // The bug was: `const dir = tool === 'conveyor-right' ? 1 : -1;`
    // Fixed to: `const dir = currentTool === 'conveyor-right' ? 1 : -1;`
    
    // Check that the correct pattern exists
    expect(scriptContent).toContain("currentTool === 'conveyor-right'");
    
    // Make sure the buggy pattern is NOT present
    // The buggy line would have `tool ===` in the conveyor case
    const conveyorCaseMatch = scriptContent.match(
      /case 'conveyor-left':[\s\S]*?case 'conveyor-right':[\s\S]*?{[\s\S]*?const dir = (.*?);/
    );
    
    expect(conveyorCaseMatch).not.toBeNull();
    if (conveyorCaseMatch) {
      // The direction assignment should use currentTool, not tool
      expect(conveyorCaseMatch[1]).toContain('currentTool');
      expect(conveyorCaseMatch[1]).not.toMatch(/^tool\s*===/);
    }
  });

  it('should set conveyor dir to -1 for conveyor-left', () => {
    // Verify the logic: if currentTool is NOT 'conveyor-right', dir = -1
    expect(scriptContent).toContain("currentTool === 'conveyor-right' ? 1 : -1");
  });

  it('should have conveyor body properties', () => {
    expect(scriptContent).toContain('isStatic: true');
    expect(scriptContent).toContain("label: 'conveyor'");
    expect(scriptContent).toContain("type:'conveyor'");
    expect(scriptContent).toContain('body.isConveyor = true');
    expect(scriptContent).toContain('body.conveyorDir = dir');
    expect(scriptContent).toContain('body.conveyorSpeed = 3');
    expect(scriptContent).toContain('conveyors.push(body)');
  });
});

// ============================================
// OBJECT PROPERTIES TESTS (Code Analysis)
// ============================================

describe('Object Properties in Code', () => {
  it('should set bomb isBomb flag', () => {
    expect(scriptContent).toContain('body.isBomb = true');
  });

  it('should set balloon isBalloon flag', () => {
    expect(scriptContent).toContain('body.isBalloon = true');
  });

  it('should set duck isDuck flag', () => {
    expect(scriptContent).toContain('body.isDuck = true');
  });

  it('should set bumper isBumper flag', () => {
    expect(scriptContent).toContain('body.isBumper = true');
  });

  it('should set trampoline isTrampoline flag', () => {
    expect(scriptContent).toContain('body.isTrampoline = true');
  });

  it('should track rocket bodies', () => {
    expect(scriptContent).toContain('rocketBodies.push(body)');
  });

  it('should track bumpers', () => {
    expect(scriptContent).toContain('bumpers.push(body)');
  });

  it('should track wrecking balls', () => {
    expect(scriptContent).toContain('wreckingBalls.push(');
  });

  it('should set balloon density very low', () => {
    expect(scriptContent).toContain('density: 0.0002');
  });

  it('should set anvil density high', () => {
    expect(scriptContent).toContain('density: 0.02');
  });

  it('should set trampoline restitution to 2.0', () => {
    expect(scriptContent).toContain('restitution: 2.0');
  });

  it('should set bumper restitution to 1.5', () => {
    expect(scriptContent).toContain('restitution: 1.5');
  });

  it('should create and track chain links', () => {
    expect(scriptContent).toContain('let chainLinks = []');
    expect(scriptContent).toContain("label: 'chain-link'");
    expect(scriptContent).toContain("type:'chain-link'");
    expect(scriptContent).toContain('body.chainConnections = 0');
    expect(scriptContent).toContain('chainLinks.push(body)');
  });
});

// ============================================
// CHAOS FUNCTION TESTS (Code Analysis)
// ============================================

describe('Chaos Functions in Code', () => {
  it('should have randomExplosion function', () => {
    expect(scriptContent).toContain('function randomExplosion()');
  });

  it('should have explodeBomb function', () => {
    expect(scriptContent).toContain('function explodeBomb(');
  });

  it('should have placePortal function', () => {
    expect(scriptContent).toContain('function placePortal(');
  });

  it('should have createCar function', () => {
    expect(scriptContent).toContain('function createCar(');
  });

  it('should have createDino function', () => {
    expect(scriptContent).toContain('function createDino(');
  });

  it('should have createRagdoll function', () => {
    expect(scriptContent).toContain('function createRagdoll(');
  });

  it('should have connectChainLink function', () => {
    expect(scriptContent).toContain('function connectChainLink(');
    expect(scriptContent).toContain("render: { type:'chain-link-constraint' }");
    expect(scriptContent).toContain('Composite.add(world, constraint)');
  });

  it('should have wind force handling', () => {
    expect(scriptContent).toContain('windForce');
    expect(scriptContent).toContain('windTimer');
  });

  it('should have black hole handling', () => {
    expect(scriptContent).toContain('blackHoleActive');
    expect(scriptContent).toContain('blackHoleTimer');
    expect(scriptContent).toContain('blackHolePos');
  });

  it('should have anti-gravity handling', () => {
    expect(scriptContent).toContain('antiGravActive');
    expect(scriptContent).toContain('antiGravTimer');
  });

  it('should have time warp handling', () => {
    expect(scriptContent).toContain('timeWarpActive');
    expect(scriptContent).toContain('timeWarpTimer');
  });

  it('should have tornado handling', () => {
    expect(scriptContent).toContain('tornadoActive');
    expect(scriptContent).toContain('tornadoTimer');
  });

  it('should have freeze handling', () => {
    expect(scriptContent).toContain('freezeActive');
    expect(scriptContent).toContain('freezeTimer');
  });

  it('should have vortex handling', () => {
    expect(scriptContent).toContain('vortexActive');
    expect(scriptContent).toContain('vortexTimer');
  });

  it('should have mega bounce handling', () => {
    expect(scriptContent).toContain('megaBounceActive');
    expect(scriptContent).toContain('megaBounceTimer');
  });

  it('should have popcorn handling', () => {
    expect(scriptContent).toContain('popcornActive');
    expect(scriptContent).toContain('popcornTimer');
  });
});

// ============================================
// RENDERING TESTS (Code Analysis)
// ============================================

describe('Rendering Types in Code', () => {
  const renderTypes = [
    'ball', 'block', 'rocket', 'bomb', 'balloon', 'star', 'beachball',
    'duck', 'domino', 'anvil', 'trampoline', 'conveyor', 'bumper',
    'dino', 'car-body', 'wheel', 'drawn', 'wrecking-anchor', 'wrecking-ball',
    'ragdoll-head', 'ragdoll-torso', 'ragdoll-limb', 'ice', 'fan', 'chain-link'
  ];

  renderTypes.forEach(type => {
    it(`should have render case for '${type}'`, () => {
      expect(scriptContent).toContain(`case '${type}':`);
    });
  });
});

// ============================================
// EVENT HANDLER TESTS (Code Analysis)
// ============================================

describe('Event Handlers in Code', () => {
  it('should have tool button click handlers', () => {
    expect(scriptContent).toContain("document.querySelectorAll('.tool-btn')");
    expect(scriptContent).toContain("addEventListener('click'");
  });

  it('should have planet button click handlers', () => {
    expect(scriptContent).toContain("document.querySelectorAll('.planet-btn')");
  });

  it('should have canvas mouse/touch handlers', () => {
    expect(scriptContent).toContain("canvas.addEventListener('mousedown'");
    expect(scriptContent).toContain("canvas.addEventListener('mousemove'");
    expect(scriptContent).toContain("canvas.addEventListener('mouseup'");
    expect(scriptContent).toContain("canvas.addEventListener('touchstart'");
    expect(scriptContent).toContain("canvas.addEventListener('touchmove'");
    expect(scriptContent).toContain("canvas.addEventListener('touchend'");
  });

  it('should have resize handler', () => {
    expect(scriptContent).toContain("window.addEventListener('resize'");
  });

  it('should have collision event handler', () => {
    expect(scriptContent).toContain("Events.on(engine, 'collisionStart'");
  });
});

// ============================================
// PHYSICS ENGINE SETUP TESTS
// ============================================

describe('Physics Engine Setup', () => {
  it('should create Matter.js engine', () => {
    expect(scriptContent).toContain('Engine.create(');
  });

  it('should set up walls', () => {
    expect(scriptContent).toContain('function rebuildWalls()');
    expect(scriptContent).toContain('walls = [');
  });

  it('should have main loop', () => {
    expect(scriptContent).toContain('function loop(');
    expect(scriptContent).toContain('requestAnimationFrame(loop)');
  });

  it('should update physics engine', () => {
    expect(scriptContent).toContain('Engine.update(engine');
  });

  it('should have gravity direction support', () => {
    expect(scriptContent).toContain('gravityAngle');
    expect(scriptContent).toContain('gravityTarget');
  });
});

// ============================================
// AUDIO TESTS (Code Analysis)
// ============================================

describe('Audio Functions', () => {
  it('should have playSound function', () => {
    expect(scriptContent).toContain('function playSound(');
  });

  it('should have playBoom function', () => {
    expect(scriptContent).toContain('function playBoom()');
  });

  it('should have playBounce function', () => {
    expect(scriptContent).toContain('function playBounce()');
  });

  it('should have playSqueak function', () => {
    expect(scriptContent).toContain('function playSqueak()');
  });

  it('should have playSpawn function', () => {
    expect(scriptContent).toContain('function playSpawn()');
  });

  it('should quantize collision audio to pentatonic notes', () => {
    expect(scriptContent).toContain('const PENTATONIC_IMPACT_SCALE = [');
    expect(scriptContent).toContain('130.81, 146.83, 164.81, 196.00, 220.00');
    expect(scriptContent).toContain('523.25, 587.33, 659.25, 783.99, 880.00');
    expect(scriptContent).toContain('const IMPACT_MATERIAL_OCTAVES = {');
    expect(scriptContent).toContain('function randomPentatonicNote(');
    expect(scriptContent).toContain('function musicalImpactFreq(');
    expect(scriptContent).toContain('function musicalImpactHarmony(');
    expect(scriptContent).toContain('playSound(randomPentatonicNote(5), 0.08');
    expect(scriptContent).toContain("const freq = musicalImpactFreq('metal', intensity)");
    expect(scriptContent).toContain("const freq = musicalImpactFreq('rubber', intensity)");
    expect(scriptContent).toContain("const freq = musicalImpactFreq('wood', intensity)");
    expect(scriptContent).toContain("const freq = musicalImpactFreq('plastic', intensity)");
    expect(scriptContent).toContain("playSound(musicalImpactFreq('default', intensity), 0.08");
  });
});

// ============================================
// HAPTIC FEEDBACK TESTS (Code Analysis)
// ============================================

describe('Haptic Feedback', () => {
  it('should define safe haptic helpers', () => {
    expect(scriptContent).toContain('let lastHapticTime = -Infinity');
    expect(scriptContent).toContain('function haptic(pattern)');
    expect(scriptContent).toContain("typeof navigator !== 'undefined'");
    expect(scriptContent).toContain('navigator.vibrate(pattern)');
    expect(scriptContent).toContain('function hapticThrottled(pattern, minInterval = 50)');
    expect(scriptContent).toContain('performance.now()');
  });

  it('should add haptic pulses to tactile user actions', () => {
    const expectedPatterns = [
      'haptic([30, 20, 60])',
      'haptic([50, 30, 80])',
      'haptic([20, 10, 20, 10, 40, 10, 60])',
      'haptic([10, 5, 10, 5, 10, 5, 30])',
      'haptic([25])',
      'haptic([20, 10, 40])',
      'haptic([10, 10, 10, 10, 10])',
      'haptic([15])',
    ];

    expectedPatterns.forEach(pattern => {
      expect(scriptContent).toContain(pattern);
    });
  });

  it('should throttle hard collision haptics', () => {
    expect(scriptContent).toContain('if (relVel > 8)');
    expect(scriptContent).toContain('hapticThrottled([10])');
  });
});

// ============================================
// DRAWING MODE TESTS (Code Analysis)
// ============================================

describe('Drawing Mode', () => {
  it('should track draw mode state', () => {
    expect(scriptContent).toContain('let drawMode = false');
    expect(scriptContent).toContain('let drawPoints = []');
  });

  it('should have simplifyPath function', () => {
    expect(scriptContent).toContain('function simplifyPath(');
  });

  it('should create static bodies from drawn paths', () => {
    expect(scriptContent).toContain("label: 'drawn'");
  });
});

// ============================================
// SLINGSHOT TESTS (Code Analysis)
// ============================================

describe('Slingshot Mechanics', () => {
  it('should track sling start position', () => {
    expect(scriptContent).toContain('let slingStart = null');
    expect(scriptContent).toContain('let slingCurrent = null');
  });

  it('should have getPointerPos function', () => {
    expect(scriptContent).toContain('function getPointerPos(');
  });

  it('should have drawSlingshot function', () => {
    expect(scriptContent).toContain('function drawSlingshot()');
  });

  it('should calculate launch power from drag distance', () => {
    // Power calculation: const power = Math.min(dist / 15, 25);
    expect(scriptContent).toContain('Math.min(dist / 15, 25)');
  });
});

// ============================================
// PORTAL SYSTEM TESTS (Code Analysis)
// ============================================

describe('Portal System', () => {
  it('should track portals array', () => {
    expect(scriptContent).toContain('let portals = []');
  });

  it('should track portal cooldowns', () => {
    expect(scriptContent).toContain('let portalCooldowns = new Map()');
  });

  it('should link portal pairs', () => {
    expect(scriptContent).toContain('portals[0].partner = 1');
    expect(scriptContent).toContain('portals[1].partner = 0');
  });

  it('should teleport bodies between portals', () => {
    expect(scriptContent).toContain('Body.setPosition(b,');
    expect(scriptContent).toContain('portalCooldowns.set(b.id');
  });
});

// ============================================
// VISUAL EFFECTS TESTS (Code Analysis)
// ============================================

describe('Visual Effects', () => {
  it('should track particles', () => {
    expect(scriptContent).toContain('let particles = []');
  });

  it('should track explosions', () => {
    expect(scriptContent).toContain('let explosions = []');
  });

  it('should track trails', () => {
    expect(scriptContent).toContain('let trails = []');
  });

  it('should track tap ripples', () => {
    expect(scriptContent).toContain('let ripples = []');
  });

  it('should have screen shake', () => {
    expect(scriptContent).toContain('let shakeIntensity = 0');
    expect(scriptContent).toContain('shakeOffset');
  });

  it('should have chromatic aberration', () => {
    expect(scriptContent).toContain('let chromaticAberration = 0');
  });

  it('should have destruction meter', () => {
    expect(scriptContent).toContain('let destructionMeter = 0');
    expect(scriptContent).toContain('let destructionFlash = 0');
  });

  it('should draw particles', () => {
    expect(scriptContent).toContain('function drawParticles(');
  });

  it('should add and draw tap ripples', () => {
    expect(scriptContent).toContain('function addRipple(');
    expect(scriptContent).toContain('function drawRipples(');
    expect(scriptContent).toContain('addRipple(pos.x, pos.y)');
    expect(scriptContent).toContain('drawRipples(dt)');
  });

  it('should animate spawned bodies with a pop scale-in', () => {
    expect(scriptContent).toContain('const SPAWN_POP_MS = 150');
    expect(scriptContent).toContain('function getSpawnPopScale(');
    expect(scriptContent).toContain('function markSpawnPop(');
    expect(scriptContent).toContain('function updateSpawnPopAnimations(');
    expect(scriptContent).toContain('b.spawnTime = now');
    expect(scriptContent).toContain('b.spawnScale = 0.05');
    expect(scriptContent).toContain('b.spawnScale = getSpawnPopScale(elapsed)');
    expect(scriptContent).toContain('ctx.scale(spawnScale, spawnScale)');
  });

  it('should mark simple and composite spawns for pop animation', () => {
    expect(scriptContent).toContain('markSpawnPop(body)');
    expect(scriptContent).toContain('markSpawnPop([anchor, wBall])');
    expect(scriptContent).toContain('markSpawnPop([plank, pivot])');
  });

  it('should draw explosions', () => {
    expect(scriptContent).toContain('function drawExplosions(');
  });

  it('should draw grid', () => {
    expect(scriptContent).toContain('function drawGrid()');
  });

  it('should draw walls', () => {
    expect(scriptContent).toContain('function drawWalls()');
  });

  it('should draw bodies', () => {
    expect(scriptContent).toContain('function drawBody(');
  });

  it('should draw constraints', () => {
    expect(scriptContent).toContain('function drawConstraints()');
  });

  it('should draw chain-link constraints as chain links', () => {
    expect(scriptContent).toContain("c.render?.type === 'chain-link-constraint'");
    expect(scriptContent).toContain('#99ccff');
  });
});

// ============================================
// KONAMI CODE EASTER EGG TEST
// ============================================

describe('Easter Eggs', () => {
  it('should have Konami code buffer', () => {
    expect(scriptContent).toContain('konamiBuffer');
  });

  it('should have Konami code sequence', () => {
    expect(scriptContent).toContain('konamiCode');
    expect(scriptContent).toContain('ArrowUp');
    expect(scriptContent).toContain('ArrowDown');
    expect(scriptContent).toContain('ArrowLeft');
    expect(scriptContent).toContain('ArrowRight');
  });

  it('should have ultra chaos mode', () => {
    expect(scriptContent).toContain('ultraChaosActive');
    expect(scriptContent).toContain('ultraChaosTimer');
  });
});

// ============================================
// STYLE VERIFICATION
// ============================================

describe('CSS Styles', () => {
  it('should include VT323 font', () => {
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('VT323');
  });

  it('should have CRT aesthetic (scanline overlay)', () => {
    // The CSS has a SCANLINE OVERLAY comment and repeating-linear-gradient for scan lines
    expect(html).toContain('SCANLINE OVERLAY');
    expect(html).toContain('repeating-linear-gradient');
  });

  it('should have mobile responsive styles', () => {
    expect(html).toContain('@media(max-width:600px)');
  });

  it('should have tablet responsive styles', () => {
    expect(html).toContain('@media(min-width:601px)');
  });
});

// ============================================
// MATTER.JS INTEGRATION
// ============================================

describe('Matter.js Integration', () => {
  it('should load Matter.js from CDN', () => {
    expect(html).toContain('cdnjs.cloudflare.com/ajax/libs/matter-js');
  });

  it('should destructure Matter components', () => {
    expect(scriptContent).toContain('const { Engine, World, Bodies, Body, Composite, Events, Mouse, Vector, Constraint } = Matter');
  });
});

// ============================================
// LESSON MODE API TESTS (Code Analysis)
// ============================================

describe('Lesson Mode API', () => {
  it('should expose window.ChaosEngine', () => {
    expect(scriptContent).toContain('window.ChaosEngine = {');
  });

  it('should have loadLesson method', () => {
    expect(scriptContent).toContain('loadLesson(config)');
  });

  it('should have onEvent method', () => {
    expect(scriptContent).toContain('onEvent(callback)');
  });

  it('should have getState method', () => {
    expect(scriptContent).toContain('getState()');
  });

  it('should have endLesson method', () => {
    expect(scriptContent).toContain('endLesson()');
  });

  it('should have checkGoals method', () => {
    expect(scriptContent).toContain('checkGoals:');
  });

  it('should have setPaused method', () => {
    expect(scriptContent).toContain('setPaused(val)');
  });

  it('should have version property', () => {
    expect(scriptContent).toContain("version: '1.1.0-lesson-api'");
  });

  it('should have gravity presets', () => {
    expect(scriptContent).toContain('const gravityPresets = {');
    expect(scriptContent).toContain('earth: 1');
    expect(scriptContent).toContain('moon: 0.166');
    expect(scriptContent).toContain('mars: 0.38');
    expect(scriptContent).toContain('jupiter: 2.53');
    expect(scriptContent).toContain('space: 0');
  });

  it('should track lesson state', () => {
    expect(scriptContent).toContain('const lessonState = {');
    expect(scriptContent).toContain('active: false');
    expect(scriptContent).toContain('config: null');
    expect(scriptContent).toContain('goals: []');
  });

  it('should emit lesson events', () => {
    expect(scriptContent).toContain('function emitLessonEvent(');
    expect(scriptContent).toContain("emitLessonEvent('lesson-loaded'");
    expect(scriptContent).toContain("emitLessonEvent('goal-reached'");
    expect(scriptContent).toContain("emitLessonEvent('all-goals-reached'");
    expect(scriptContent).toContain("emitLessonEvent('collision'");
  });

  it('should check lesson goals', () => {
    expect(scriptContent).toContain('function checkLessonGoals()');
  });

  it('should support goal types', () => {
    expect(scriptContent).toContain("case 'count-placed':");
    expect(scriptContent).toContain("case 'count-exact':");
    expect(scriptContent).toContain("case 'height-reached':");
    expect(scriptContent).toContain("case 'all-objects-below':");
    expect(scriptContent).toContain("case 'collision-count':");
  });

  it('should spawn fixtures from config', () => {
    expect(scriptContent).toContain("config.simulation?.fixtures");
  });

  it('should spawn objects from config', () => {
    expect(scriptContent).toContain("config.simulation?.spawnObjects");
  });

  it('should support hiding controls in lesson mode', () => {
    expect(scriptContent).toContain('config.hideControls');
  });
});

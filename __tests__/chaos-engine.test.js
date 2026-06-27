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
    'magnet', 'pin', 'seesaw', 'rope', 'chain-link', 'eraser', 'draw', 'slomo', 'grab'
  ];

  allTools.forEach(tool => {
    it(`should have button for ${tool} tool`, () => {
      const btn = document.querySelector(`[data-tool="${tool}"]`);
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('tool-btn')).toBe(true);
    });
  });

  it('should have exactly 30 tool buttons', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    expect(buttons.length).toBe(30);
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
// BALLOON POPPING TESTS
// ============================================

describe('Balloon Popping', () => {
  function extractSection(startText, endText) {
    const start = scriptContent.indexOf(startText);
    expect(start).toBeGreaterThan(-1);
    const end = scriptContent.indexOf(endText, start);
    expect(end).toBeGreaterThan(start);
    return scriptContent.slice(start, end);
  }

  it('should define balloon pop threshold and feedback constants', () => {
    expect(scriptContent).toContain('const BALLOON_POP_REL_VELOCITY = 5');
    expect(scriptContent).toContain('const BALLOON_POP_BURST_PARTICLES = 18');
    expect(scriptContent).toContain('const BALLOON_POP_STRING_PARTICLES = 4');
    expect(scriptContent).toContain('const BALLOON_POP_DESTRUCTION_BONUS = 50');
  });

  it('should pop balloons with color-matched confetti, string remnants, and sound', () => {
    const popSection = extractSection('function popBalloon(', '// ── WALLS ──');
    expect(popSection).toContain('balloonBody.balloonPopped = true');
    expect(popSection).toContain('balloonBody.render?.color');
    expect(popSection).toContain('i < BALLOON_POP_BURST_PARTICLES');
    expect(popSection).toContain('isConfetti: true');
    expect(popSection).toContain('i < BALLOON_POP_STRING_PARTICLES');
    expect(popSection).toContain('isBalloonString: true');
    expect(popSection).toContain('playSound(1200 + Math.random() * 400');
    expect(popSection).toContain('playSound(300, 0.04');
    expect(popSection).toContain('hapticThrottled([8], 40)');
    expect(popSection).toContain('destructionMeter += BALLOON_POP_DESTRUCTION_BONUS');
  });

  it('should remove popped balloons and clean related interaction state', () => {
    const popSection = extractSection('function popBalloon(', '// ── WALLS ──');
    expect(popSection).toContain('Composite.allConstraints(world).forEach');
    expect(popSection).toContain('connectedConstraints.add(c)');
    expect(popSection).toContain('Composite.remove(world, c)');
    expect(popSection).toContain('Composite.remove(world, balloonBody)');
    expect(popSection).toContain('bodyTrails.delete(balloonBody.id)');
    expect(popSection).toContain('shatterDebounce.delete(balloonBody.id)');
    expect(popSection).toContain('portalCooldowns.delete(balloonBody.id)');
    expect(popSection).toContain('megaBounceOriginal.delete(balloonBody.id)');
    expect(popSection).toContain('ropes = ropes.filter');
    expect(popSection).toContain('if (grabBody === balloonBody)');
  });

  it('should trigger balloon pops only from hard non-static collisions', () => {
    const collisionSection = extractSection('// Balloon pop on hard impact', '// Pixel dust cloud on hard wall/floor impact');
    expect(collisionSection).toContain('const balloonBody = pair.bodyA.isBalloon');
    expect(collisionSection).toContain('!balloonHitter.isStatic');
    expect(collisionSection).toContain('const balloonRelVel = getRelativeVelocity(balloonBody, balloonHitter)');
    expect(collisionSection).toContain('balloonRelVel > BALLOON_POP_REL_VELOCITY');
    expect(collisionSection).toContain('popBalloon(balloonBody, balloonRelVel)');
    expect(collisionSection).toContain('return;');
  });

  it('should pop balloons caught in bomb blasts', () => {
    const bombSection = extractSection('// Apply force to nearby bodies', '// Chain reaction: check for nearby bombs and trigger them with stagger');
    expect(bombSection).toContain('if (b.isBalloon && popBalloon(b, BALLOON_POP_REL_VELOCITY + 3)) return;');
  });

  it('should draw balloon string particles as falling curls', () => {
    expect(scriptContent).toContain('} else if (p.isBalloonString) {');
    expect(scriptContent).toContain('ctx.quadraticCurveTo(p.size, 0, 0, p.size * 3)');
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
// COLLISION HEATMAP TESTS
// ============================================

describe('Collision Heatmap Overlay', () => {
  it('should define heatmap grid state and constants', () => {
    expect(scriptContent).toContain('const HEAT_CELL = 24');
    expect(scriptContent).toContain('const HEAT_DECAY_PER_FRAME = 0.992');
    expect(scriptContent).toContain('let heatGrid = []');
    expect(scriptContent).toContain('let heatCanvas = null');
  });

  it('should initialize heatmap dimensions on resize', () => {
    expect(scriptContent).toContain('function initCollisionHeatmap()');
    expect(scriptContent).toContain('initCollisionHeatmap();');
    expect(scriptContent).toContain('new Float32Array(heatCols)');
  });

  it('should record collision heat from relative velocity impacts', () => {
    expect(scriptContent).toContain('function recordCollisionHeat(');
    expect(scriptContent).toContain('recordCollisionHeat(px, py, relVel)');
    expect(scriptContent).toContain('heatGrid[row][col] = Math.min(1');
  });

  it('should draw the heatmap under objects in the render loop', () => {
    expect(scriptContent).toContain('function drawCollisionHeatmap(dt)');
    expect(scriptContent).toContain("ctx.globalCompositeOperation = 'screen'");
    expect(scriptContent).toContain("ctx.filter = 'blur(10px)'");
    expect(scriptContent).toMatch(/drawGrid\(\);[\s\S]*drawCollisionHeatmap\(dt\);[\s\S]*drawRipples\(dt\);/);
  });

  it('should clear heatmap state during scene reset', () => {
    expect(scriptContent).toContain('function resetCollisionHeatmap()');
    expect(scriptContent).toContain('resetCollisionHeatmap();');
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
// KEYBOARD SHORTCUT TESTS
// ============================================

describe('Keyboard Shortcuts', () => {
  it('should define desktop shortcut maps for tools and chaos actions', () => {
    expect(scriptContent).toContain('const TOOL_SHORTCUTS = {');
    expect(scriptContent).toContain("'1': 'ball'");
    expect(scriptContent).toContain("'2': 'block'");
    expect(scriptContent).toContain("'3': 'bomb'");
    expect(scriptContent).toContain("d: 'draw'");
    expect(scriptContent).toContain("g: 'grab'");
    expect(scriptContent).toContain("y: 'chain-link'");
    expect(scriptContent).toContain("delete: 'eraser'");
    expect(scriptContent).toContain('const CHAOS_SHORTCUTS = {');
    expect(scriptContent).toContain("e: 'btn-explode'");
    expect(scriptContent).toContain("q: 'btn-quake'");
    expect(scriptContent).toContain("x: 'btn-blackhole'");
    expect(scriptContent).toContain("z: 'btn-freeze'");
    expect(scriptContent).toContain("l: 'btn-rain'");
  });

  it('should route shortcuts through existing buttons with flash feedback', () => {
    expect(scriptContent).toContain('function isEditableShortcutTarget(');
    expect(scriptContent).toContain('function flashShortcutButton(');
    expect(scriptContent).toContain('function triggerShortcutButton(');
    expect(scriptContent).toContain('function handleKeyboardShortcut(');
    expect(scriptContent).toContain('btn.click()');
    expect(scriptContent).toContain("btn.classList.add('shortcut-flash')");
    expect(scriptContent).toContain("document.querySelector(`.tool-btn[data-tool=\"${tool}\"]`)");
    expect(scriptContent).toContain("document.getElementById('btn-pause')");
    expect(scriptContent).toContain("document.getElementById('btn-clear')");
  });

  it('should ignore editable targets and preserve the Konami listener', () => {
    const shortcutIdx = scriptContent.indexOf('function handleKeyboardShortcut(');
    const konamiIdx = scriptContent.indexOf('konamiBuffer.push(e.key)');
    const shortcutCallIdx = scriptContent.lastIndexOf('handleKeyboardShortcut(e)');
    expect(shortcutIdx).toBeGreaterThan(-1);
    expect(konamiIdx).toBeGreaterThan(-1);
    expect(shortcutCallIdx).toBeGreaterThan(konamiIdx);
    expect(scriptContent).toContain("tag === 'INPUT'");
    expect(scriptContent).toContain("tag === 'TEXTAREA'");
    expect(scriptContent).toContain("tag === 'SELECT'");
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
// ERASER TOOL TESTS (Code Analysis)
// ============================================

describe('Eraser Tool', () => {
  it('should have eraser tool button', () => {
    const eraserBtn = document.querySelector('[data-tool="eraser"]');
    expect(eraserBtn).not.toBeNull();
    expect(eraserBtn.textContent).toContain('Erase');
  });

  it('should include eraser accent color for tap feedback', () => {
    expect(scriptContent).toContain("eraser: '#ff4444'");
  });

  it('should define eraser helpers', () => {
    expect(scriptContent).toContain('function isErasableBody(');
    expect(scriptContent).toContain('function addErasePoof(');
    expect(scriptContent).toContain('function eraseBodyAt(');
  });

  it('should not erase boundary walls or target-practice targets', () => {
    expect(scriptContent).toContain("b.label !== 'wall'");
    expect(scriptContent).toContain('!b.isTarget');
  });

  it('should remove connected constraints and cleanup tracked state', () => {
    expect(scriptContent).toContain('Composite.allConstraints(world).forEach');
    expect(scriptContent).toContain('constraintsToRemove.add(c)');
    expect(scriptContent).toContain('Composite.remove(world, c)');
    expect(scriptContent).toContain('Composite.remove(world, b)');
    expect(scriptContent).toContain('rocketBodies = rocketBodies.filter');
    expect(scriptContent).toContain('bumpers = bumpers.filter');
    expect(scriptContent).toContain('conveyors = conveyors.filter');
    expect(scriptContent).toContain('magnets = magnets.filter');
    expect(scriptContent).toContain('chainLinks = chainLinks.filter');
    expect(scriptContent).toContain('bodyTrails.delete(b.id)');
  });

  it('should route eraser taps before bomb click handling', () => {
    const eraserIdx = scriptContent.indexOf("currentTool === 'eraser'");
    const bombClickIdx = scriptContent.indexOf('// Check if clicking a bomb');
    expect(eraserIdx).toBeGreaterThan(-1);
    expect(bombClickIdx).toBeGreaterThan(-1);
    expect(eraserIdx).toBeLessThan(bombClickIdx);
  });

  it('should give eraser visual, audio, and haptic feedback', () => {
    expect(scriptContent).toContain('particles.push({');
    expect(scriptContent).toContain('haptic([8])');
    expect(scriptContent).toContain("playSound(650, 0.1, 'sine', 0.08)");
    expect(scriptContent).toContain("playSound(280, 0.08, 'triangle', 0.05)");
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

  it('should draw a gravity-aware trajectory preview while aiming', () => {
    expect(scriptContent).toContain('const TRAJECTORY_DOT_COUNT = 12');
    expect(scriptContent).toContain('const TRAJECTORY_STEP_FRAMES = 6');
    expect(scriptContent).toContain('function getSlingshotLaunch(');
    expect(scriptContent).toContain('function getTrajectoryPoint(');
    expect(scriptContent).toContain('function drawTrajectoryPreview(');
    expect(scriptContent).toContain('engine.gravity.x || 0');
    expect(scriptContent).toContain('engine.gravity.y || 0');
    expect(scriptContent).toContain('drawTrajectoryPreview(slingStart, launch)');
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

  it('should celebrate destruction meter level-ups', () => {
    expect(scriptContent).toContain('let lastDestructionLevel = 0');
    expect(scriptContent).toContain('let destructionLevelBanner = null');
    expect(scriptContent).toContain('const DESTRUCTION_LEVEL_NAMES = [');
    expect(scriptContent).toContain('function getDestructionLevel(');
    expect(scriptContent).toContain('function celebrateDestructionLevel(');
    expect(scriptContent).toContain('if (destructionLevel > lastDestructionLevel)');
    expect(scriptContent).toContain('celebrateDestructionLevel(destructionLevel)');
    expect(scriptContent).toContain("text: 'LEVEL UP: ' + DESTRUCTION_LEVEL_NAMES[level]");
    expect(scriptContent).toContain('isConfetti: true');
    expect(scriptContent).toContain('setTimeout(() => playSound(baseFreq * 1.25');
    expect(scriptContent).toContain('lastDestructionLevel = 0');
    expect(scriptContent).toContain('destructionLevelBanner = null');
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
    expect(scriptContent).toContain('ctx.scale(spawnScale * clearScale, spawnScale * clearScale)');
  });

  it('should mark simple and composite spawns for pop animation', () => {
    expect(scriptContent).toContain('markSpawnPop(body)');
    expect(scriptContent).toContain('markSpawnPop([anchor, wBall])');
    expect(scriptContent).toContain('markSpawnPop([plank, pivot])');
  });

  it('should animate scene clearing with a vortex drain', () => {
    expect(scriptContent).toContain('const CLEAR_VORTEX_MS = 600');
    expect(scriptContent).toContain('let clearAnimating = false');
    expect(scriptContent).toContain('let clearVortex = null');
    expect(scriptContent).toContain('function startClearVortex(');
    expect(scriptContent).toContain('function updateClearVortex(');
    expect(scriptContent).toContain('function drawClearVortex(');
    expect(scriptContent).toContain('function finishClear(playFeedback = true)');
    expect(scriptContent).toContain('playClearVortexSound()');
    expect(scriptContent).toContain('r.clearScale || 1');
    expect(scriptContent).toContain('ctx.scale(spawnScale * clearScale, spawnScale * clearScale)');
    expect(scriptContent).toContain('updateClearVortex(timestamp)');
    expect(scriptContent).toContain('drawClearVortex(timestamp)');
  });

  it('should guard interactions and support force-completing clear animation', () => {
    expect(scriptContent).toContain('if (clearAnimating) return;');
    expect(scriptContent).toContain('if (clearAnimating) {\n    finishClear();');
    expect(scriptContent).toContain('startClearVortex(bodiesToClear)');
    expect(scriptContent).toContain('if (t >= 1) finishClear(false)');
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

  it('should clear synchronously before loading lesson fixtures', () => {
    const loadLessonMatch = scriptContent.match(/loadLesson\(config\) \{[\s\S]*?lessonState\.active = true;/);
    expect(loadLessonMatch).not.toBeNull();
    expect(loadLessonMatch?.[0]).toContain('finishClear(false)');
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

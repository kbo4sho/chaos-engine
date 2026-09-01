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
    'magnet', 'pin', 'seesaw', 'rope', 'chain-link', 'eraser', 'draw', 'slomo', 'grab', 'anchor', 'resize', 'clone', 'motor', 'flipper', 'swap', 'snip', 'fission', 'alchemy', 'strut', 'rotate', 'fusion', 'hinge', 'spring', 'launch', 'float', 'pivot', 'reverse'
  ];

  allTools.forEach(tool => {
    it(`should have button for ${tool} tool`, () => {
      const btn = document.querySelector(`[data-tool="${tool}"]`);
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('tool-btn')).toBe(true);
    });
  });

  it('should have exactly 48 tool buttons', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    expect(buttons.length).toBe(48);
  });

  it('should append Reverse after Pivot at the end of the object toolbar', () => {
    const toolbar = document.getElementById('toolbar');
    expect(toolbar.lastElementChild?.dataset.tool).toBe('reverse');
    expect(toolbar.lastElementChild?.textContent).toContain('Reverse');
    expect(toolbar.lastElementChild?.previousElementSibling?.dataset.tool).toBe('pivot');
    expect(toolbar.lastElementChild?.previousElementSibling?.previousElementSibling?.dataset.tool).toBe('float');
    expect(html).toMatch(/#toolbar\s*\{[\s\S]*?justify-content:flex-start/);
    expect(html).toMatch(/@media\(max-width:600px\)[\s\S]*?\.tool-btn\s*\{ min-width:52px; height:50px/);
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
// REVERSE TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Reverse Tool', () => {
  it('should expose Reverse as the final selectable toolbar tool', () => {
    const reverseBtn = document.querySelector('[data-tool="reverse"]');
    expect(reverseBtn).not.toBeNull();
    expect(reverseBtn?.getAttribute('aria-label')).toContain('linear and angular motion');
    expect(document.getElementById('toolbar')?.lastElementChild).toBe(reverseBtn);
    expect(reverseBtn?.previousElementSibling?.dataset.tool).toBe('pivot');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'reverse'");
    expect(scriptContent).toContain('reverseBodyAt(pos)');
  });

  it('should invert linear and angular velocity exactly', () => {
    const source = scriptContent.match(/function getReversedMotion\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getReversedMotion = new Function(`${source}; return getReversedMotion;`)();

    expect(getReversedMotion({ velocity:{ x:7.5, y:-3 }, angularVelocity:0.24 }))
      .toEqual({ velocity:{ x:-7.5, y:3 }, angularVelocity:-0.24 });
  });

  it('should target dynamic parts with a touch-friendly fallback and wake them', () => {
    expect(scriptContent).toContain('function isReversibleBody(body)');
    expect(scriptContent).toContain("body.label !== 'wall'");
    expect(scriptContent).toContain('!body.isStatic');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('Matter.Sleeping.set(target, false)');
    expect(scriptContent).toContain('Body.setVelocity(target, motion.velocity)');
    expect(scriptContent).toContain('Body.setAngularVelocity(target, motion.angularVelocity)');
  });

  it('should provide visible feedback and clean transient state on Eraser or Clear', () => {
    expect(document.getElementById('reverse-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("showReverseFeedback('MOTION REVERSED')");
    expect(scriptContent).toContain("showReverseFeedback('REVERSE: NO OBJECT'");
    expect(scriptContent).toContain('function drawReverseFlash(timestamp)');
    expect(scriptContent).toContain('drawReverseFlash(timestamp)');
    expect(scriptContent).toContain('if (reverseFlash && removedBodyIds.has(reverseFlash.body.id)) reverseFlash = null');
    expect(scriptContent).toContain("document.getElementById('reverse-feedback').textContent = ''");
    expect(scriptContent).toContain("reverse: '#ff6bff'");
  });
});

// ============================================
// PIVOT TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Pivot Tool', () => {
  it('should keep Pivot selectable immediately before Reverse', () => {
    const pivotBtn = document.querySelector('[data-tool="pivot"]');
    expect(pivotBtn).not.toBeNull();
    expect(pivotBtn?.getAttribute('aria-label')).toContain('rotating world pivot');
    expect(pivotBtn?.nextElementSibling?.dataset.tool).toBe('reverse');
    expect(pivotBtn?.previousElementSibling?.dataset.tool).toBe('float');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'pivot'");
    expect(scriptContent).toContain('togglePivotAt(pos)');
  });

  it('should convert the exact tapped world point into body-local coordinates', () => {
    const source = scriptContent.match(/function getPivotLocalPoint\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getPivotLocalPoint = new Function(`${source}; return getPivotLocalPoint;`)();
    const point = getPivotLocalPoint(
      { position:{ x:100, y:80 }, angle:Math.PI / 2 },
      { x:100, y:100 }
    );
    expect(point.x).toBeCloseTo(20);
    expect(point.y).toBeCloseTo(0);
  });

  it('should target dynamic build parts with a touch-friendly fallback', () => {
    expect(scriptContent).toContain('function isPivotableBody(body)');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain("showPivotFeedback('PIVOT: NO OBJECT'");
    expect(scriptContent).toContain("return Boolean(getPivotForBody(body)) || !body.isStatic");
  });

  it('should create and toggle a zero-length world pivot without freezing rotation', () => {
    expect(scriptContent).toContain('const constraint = Constraint.create({');
    expect(scriptContent).toContain('pointA:worldPoint');
    expect(scriptContent).toContain('bodyB:hit.body');
    expect(scriptContent).toContain('pointB:localPoint');
    expect(scriptContent).toContain('length:0');
    expect(scriptContent).toContain('stiffness:1');
    expect(scriptContent).toContain("render:{ visible:false, type:'pivot' }");
    expect(scriptContent).toContain("showPivotFeedback('PIVOT PINNED')");
    expect(scriptContent).toContain("return 'released'");
    expect(scriptContent).not.toContain('Body.setStatic(hit.body, true)');
  });

  it('should render and clean Pivot state across Eraser and Clear', () => {
    expect(document.getElementById('pivot-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function drawPivotMarkers(timestamp)');
    expect(scriptContent).toContain('drawPivotMarkers(timestamp)');
    expect(scriptContent).toContain('function prunePivots()');
    expect(scriptContent).toContain('prunePivots()');
    expect(scriptContent).toContain('pivots = pivots.filter(pivot => !constraintsToRemove.has(pivot.constraint))');
    expect(scriptContent).toContain('pivots = []');
    expect(scriptContent).toContain("document.getElementById('pivot-feedback').textContent = ''");
    expect(scriptContent).toContain("pivot: '#ffd166'");
  });
});

// ============================================
// FLOAT TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Float Tool', () => {
  it('should keep Float selectable immediately before Pivot', () => {
    const floatBtn = document.querySelector('[data-tool="float"]');
    expect(floatBtn).not.toBeNull();
    expect(floatBtn?.getAttribute('aria-label')).toContain('local zero gravity');
    expect(floatBtn?.nextElementSibling?.dataset.tool).toBe('pivot');
    expect(floatBtn?.previousElementSibling?.dataset.tool).toBe('launch');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'float'");
    expect(scriptContent).toContain('toggleFloatAt(pos)');
  });

  it('should calculate exact gravity cancellation for any gravity direction', () => {
    const source = scriptContent.match(/function getFloatCounterForce\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getFloatCounterForce = new Function(`${source}; return getFloatCounterForce;`)();

    expect(getFloatCounterForce({ mass:4 }, { x:0, y:1 }, 0.001))
      .toEqual({ x:-0, y:-0.004 });
    expect(getFloatCounterForce({ mass:2 }, { x:-0.5, y:0.25 }, 0.002))
      .toEqual({ x:0.002, y:-0.001 });
  });

  it('should toggle only standalone dynamic bodies with touch-friendly targeting', () => {
    expect(scriptContent).toContain('function isFloatableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('Composite.allConstraints(world).some(c => c.bodyA === b || c.bodyB === b)');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('target.isFloating = !target.isFloating');
    expect(scriptContent).toContain("return target.isFloating ? 'floating' : 'gravity'");
  });

  it('should apply counter-force during physics and show persistent zero-g feedback', () => {
    expect(document.getElementById('float-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('Body.applyForce(b, b.position, getFloatCounterForce(b, engine.gravity, engine.gravity.scale))');
    expect(scriptContent).toContain('applyFloatForces();\n    Engine.update(engine');
    expect(scriptContent).toContain('function drawFloatMarkers(timestamp)');
    expect(scriptContent).toContain('drawFloatMarkers(timestamp)');
    expect(scriptContent).toContain("ctx.fillText('0G'");
    expect(scriptContent).toContain('clone.isFloating = Boolean(source.isFloating)');
    expect(scriptContent).toContain("float: '#7df9ff'");
    expect(scriptContent).toContain("document.getElementById('float-feedback').textContent = ''");
  });
});

// ============================================
// LAUNCH TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Launch Tool', () => {
  it('should keep Launch selectable immediately before Float', () => {
    const launchBtn = document.querySelector('[data-tool="launch"]');
    expect(launchBtn).not.toBeNull();
    expect(launchBtn?.getAttribute('aria-label')).toContain('tapped destination');
    expect(launchBtn?.nextElementSibling?.dataset.tool).toBe('float');
    expect(launchBtn?.previousElementSibling?.dataset.tool).toBe('spring');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'launch'");
    expect(scriptContent).toContain('launchBodyAt(pos)');
  });

  it('should calculate a bounded velocity toward the chosen destination', () => {
    const source = scriptContent.match(/function getLaunchVelocity\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getLaunchVelocity = new Function(`
      const LAUNCH_MIN_DISTANCE = 36;
      const LAUNCH_MIN_SPEED = 8;
      const LAUNCH_MAX_SPEED = 24;
      const LAUNCH_DISTANCE_PER_SPEED = 12;
      ${source};
      return getLaunchVelocity;
    `)();

    expect(getLaunchVelocity({ x:0, y:0 }, { x:120, y:0 }))
      .toMatchObject({ x:10, y:0, speed:10, distance:120 });
    expect(getLaunchVelocity({ x:0, y:0 }, { x:30, y:0 }).speed).toBe(0);
    expect(getLaunchVelocity({ x:0, y:0 }, { x:300, y:0 }).speed).toBe(24);
  });

  it('should select dynamic bodies with touch-friendly fallback targeting', () => {
    expect(scriptContent).toContain('function isLaunchableBody(b)');
    expect(scriptContent).toContain("b.label !== 'chain-link'");
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('launchBody = target');
    expect(scriptContent).toContain("showLaunchFeedback('LAUNCH: TAP TARGET')");
  });

  it('should launch the selected body and show visible vector feedback', () => {
    expect(scriptContent).toContain('const velocity = getLaunchVelocity(selected.position, pos)');
    expect(scriptContent).toContain('Body.setVelocity(selected, { x:velocity.x, y:velocity.y })');
    expect(scriptContent).toContain('launchFlash = { from, to:{ x:pos.x, y:pos.y }, startedAt:performance.now() }');
    expect(scriptContent).toContain('function drawLaunchMarker(timestamp)');
    expect(scriptContent).toContain('drawLaunchMarker(timestamp)');
    expect(scriptContent).toContain('LAUNCHED PWR');
  });

  it('should cancel short vectors and clean selection across tool changes, Eraser, and Clear', () => {
    expect(document.getElementById('launch-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("showLaunchFeedback('LAUNCH CANCELLED'");
    expect(scriptContent).toContain("if (tool !== 'launch') resetLaunchSelection(true)");
    expect(scriptContent).toContain('if (launchBody && removedBodyIds.has(launchBody.id)) resetLaunchSelection(true)');
    expect(scriptContent).toContain('launchBody = null');
    expect(scriptContent).toContain('launchAimPoint = null');
    expect(scriptContent).toContain('launchFlash = null');
    expect(scriptContent).toContain("launch: '#ff5c8a'");
  });
});

// ============================================
// SPRING TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Spring Tool', () => {
  it('should keep Spring selectable immediately before Launch', () => {
    const springBtn = document.querySelector('[data-tool="spring"]');
    expect(springBtn).not.toBeNull();
    expect(springBtn?.getAttribute('aria-label')).toContain('elastic connection');
    expect(springBtn?.nextElementSibling?.dataset.tool).toBe('launch');
    expect(springBtn?.previousElementSibling?.dataset.tool).toBe('hinge');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'spring'");
    expect(scriptContent).toContain('springBodiesAt(pos)');
  });

  it('should calculate a shortened, safely bounded rest length', () => {
    const source = scriptContent.match(/function getSpringRestLength\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getSpringRestLength = new Function(`
      const SPRING_REST_RATIO = 0.72;
      const SPRING_MIN_LENGTH = 32;
      const SPRING_MAX_LENGTH = 220;
      ${source};
      return getSpringRestLength;
    `)();

    expect(getSpringRestLength(200)).toBeCloseTo(144);
    expect(getSpringRestLength(20)).toBe(32);
    expect(getSpringRestLength(400)).toBe(220);
  });

  it('should select two touch-friendly parts and create an elastic constraint', () => {
    expect(scriptContent).toContain('function isSpringableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('springFirstBody = target');
    expect(scriptContent).toContain('const spring = Constraint.create({');
    expect(scriptContent).toContain('length:getSpringRestLength(distance)');
    expect(scriptContent).toContain('stiffness:0.01');
    expect(scriptContent).toContain('damping:0.08');
    expect(scriptContent).toContain("render:{ type:'spring' }");
    expect(scriptContent).toContain('springs.push(spring)');
  });

  it('should reject duplicates and allow tapping A again to cancel', () => {
    expect(scriptContent).toContain('function hasSpringBetween(bodyA, bodyB)');
    expect(scriptContent).toContain('target === springFirstBody');
    expect(scriptContent).toContain("showSpringFeedback('SPRING CANCELLED'");
    expect(scriptContent).toContain("showSpringFeedback('ALREADY SPRUNG'");
  });

  it('should render and clean spring state across tool changes, Snip, Eraser, and Clear', () => {
    expect(document.getElementById('spring-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("c.render?.type === 'spring'");
    expect(scriptContent).toContain('function drawSpringMarker(timestamp)');
    expect(scriptContent).toContain('drawSpringMarker(timestamp)');
    expect(scriptContent).toContain("if (tool !== 'spring') resetSpringSelection(true)");
    expect(scriptContent).toContain('springs = springs.filter(spring => !constraintsToRemove.has(spring))');
    expect(scriptContent).toContain('springs = springs.filter(spring => spring !== constraint)');
    expect(scriptContent).toContain('function pruneSprings()');
    expect(scriptContent).toContain('pruneSprings()');
    expect(scriptContent).toContain('springs = []');
    expect(scriptContent).toContain('resetSpringSelection(true)');
    expect(scriptContent).toContain("spring: '#b6ff4a'");
  });
});

// ============================================
// HINGE TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Hinge Tool', () => {
  it('should keep Hinge selectable immediately before Spring', () => {
    const hingeBtn = document.querySelector('[data-tool="hinge"]');
    expect(hingeBtn).not.toBeNull();
    expect(hingeBtn?.getAttribute('aria-label')).toContain('Hinge two build parts');
    expect(hingeBtn?.nextElementSibling?.dataset.tool).toBe('spring');
    expect(hingeBtn?.previousElementSibling?.dataset.tool).toBe('fusion');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'hinge'");
    expect(scriptContent).toContain('hingeBodiesAt(pos)');
  });

  it('should convert a tapped world pivot into stable body-local coordinates', () => {
    const source = scriptContent.match(/function getHingeLocalPoint\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getHingeLocalPoint = new Function(`${source}; return getHingeLocalPoint;`)();

    expect(getHingeLocalPoint({ position:{ x:10, y:20 }, angle:0 }, { x:14, y:27 }))
      .toEqual({ x:4, y:7 });
    const rotated = getHingeLocalPoint({ position:{ x:10, y:20 }, angle:Math.PI / 2 }, { x:10, y:30 });
    expect(rotated.x).toBeCloseTo(10);
    expect(rotated.y).toBeCloseTo(0);
  });

  it('should select two touch-friendly parts and create a true pin joint', () => {
    expect(scriptContent).toContain('function isHingeableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('hingeSelection = { body:target, point:getHingeLocalPoint(target, pos) }');
    expect(scriptContent).toContain('const hinge = Constraint.create({');
    expect(scriptContent).toContain('pointA:first.point');
    expect(scriptContent).toContain('pointB:getHingeLocalPoint(target, pos)');
    expect(scriptContent).toContain('length:0');
    expect(scriptContent).toContain('stiffness:1');
    expect(scriptContent).toContain("render:{ type:'hinge' }");
    expect(scriptContent).toContain('hinges.push(hinge)');
  });

  it('should reject duplicate hinges and allow tapping A again to cancel', () => {
    expect(scriptContent).toContain('function hasHingeBetween(bodyA, bodyB)');
    expect(scriptContent).toContain('target === hingeSelection.body');
    expect(scriptContent).toContain("showHingeFeedback('HINGE CANCELLED'");
    expect(scriptContent).toContain("showHingeFeedback('ALREADY HINGED'");
  });

  it('should render persistent joint and selection feedback with complete cleanup', () => {
    expect(document.getElementById('hinge-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("c.render?.type === 'hinge'");
    expect(scriptContent).toContain('function drawHingeMarker(timestamp)');
    expect(scriptContent).toContain('drawHingeMarker(timestamp)');
    expect(scriptContent).toContain("if (tool !== 'hinge') resetHingeSelection(true)");
    expect(scriptContent).toContain('hinges = hinges.filter(hinge => !constraintsToRemove.has(hinge))');
    expect(scriptContent).toContain('hinges = hinges.filter(hinge => hinge !== constraint)');
    expect(scriptContent).toContain('function pruneHinges()');
    expect(scriptContent).toContain('pruneHinges()');
    expect(scriptContent).toContain('hinges = []');
    expect(scriptContent).toContain('resetHingeSelection(true)');
    expect(scriptContent).toContain("hinge: '#ffcc66'");
  });
});

// ============================================
// FUSION TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Fusion Tool', () => {
  it('should keep Fusion selectable immediately before Hinge', () => {
    const fusionBtn = document.querySelector('[data-tool="fusion"]');
    expect(fusionBtn).not.toBeNull();
    expect(fusionBtn?.getAttribute('aria-label')).toContain('Fuse two standalone objects');
    expect(fusionBtn?.nextElementSibling?.dataset.tool).toBe('hinge');
    expect(fusionBtn?.previousElementSibling?.dataset.tool).toBe('rotate');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'fusion'");
    expect(scriptContent).toContain('fuseBodiesAt(pos)');
  });

  it('should conserve mass-weighted position and momentum in a canvas-safe core', () => {
    const source = scriptContent.match(/function getFusionKinematics\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getFusionKinematics = new Function(`${source}; return getFusionKinematics;`)();
    const a = { mass:2, area:Math.PI * 100, position:{ x:20, y:40 }, velocity:{ x:6, y:0 }, angularVelocity:0.3 };
    const b = { mass:1, area:Math.PI * 300, position:{ x:80, y:70 }, velocity:{ x:0, y:9 }, angularVelocity:-0.3 };
    const result = getFusionKinematics(a, b, 500, 300);

    expect(result.mass).toBe(3);
    expect(result.radius).toBeCloseTo(20);
    expect(result.position).toEqual({ x:40, y:50 });
    expect(result.velocity).toEqual({ x:4, y:3 });
    expect(result.angularVelocity).toBeCloseTo(0.1);
  });

  it('should target two standalone bodies with forgiving touch support', () => {
    expect(scriptContent).toContain('function isFusionableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isStatic || b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('fusionFirstBody = target');
    expect(scriptContent).toContain("return 'selected'");
  });

  it('should replace two bodies with one visibly distinct fusion core', () => {
    expect(document.getElementById('fusion-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("label:'fusion-core'");
    expect(scriptContent).toContain("render:{ type:'fusion-core'");
    expect(scriptContent).toContain('Body.setMass(fusionCore, kinematics.mass)');
    expect(scriptContent).toContain('Body.setVelocity(fusionCore, kinematics.velocity)');
    expect(scriptContent).toContain('megaBounceOriginal.has(first.id)');
    expect(scriptContent).toContain('megaBounceOriginal.set(fusionCore.id, restitution)');
    expect(scriptContent).toContain('Composite.remove(world, first, true)');
    expect(scriptContent).toContain('Composite.remove(world, target, true)');
    expect(scriptContent).toContain('Composite.add(world, fusionCore)');
    expect(scriptContent).toContain("case 'fusion-core':");
    expect(scriptContent).toContain("showFusionFeedback('FUSION COMPLETE')");
  });

  it('should render selection feedback and clean state on tool change, Eraser, or Clear', () => {
    expect(scriptContent).toContain('function drawFusionMarker(timestamp)');
    expect(scriptContent).toContain('drawFusionMarker(timestamp)');
    expect(scriptContent).toContain("if (tool !== 'fusion') resetFusionSelection(true)");
    expect(scriptContent).toContain('if (fusionFirstBody && removedBodyIds.has(fusionFirstBody.id)) fusionFirstBody = null');
    expect(scriptContent).toContain('resetFusionSelection(true)');
    expect(scriptContent).toContain("fusion: '#ff66ff'");
  });
});

// ============================================
// ROTATE TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Rotate Tool', () => {
  it('should keep Rotate selectable immediately before Fusion', () => {
    const rotateBtn = document.querySelector('[data-tool="rotate"]');
    expect(rotateBtn).not.toBeNull();
    expect(rotateBtn?.getAttribute('aria-label')).toContain('90 degrees clockwise');
    expect(rotateBtn?.nextElementSibling?.dataset.tool).toBe('fusion');
    expect(rotateBtn?.previousElementSibling?.dataset.tool).toBe('strut');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'rotate'");
    expect(scriptContent).toContain('rotateBodyAt(pos)');
  });

  it('should toggle clockwise and counter-clockwise modes on reselection', () => {
    const source = scriptContent.match(/function getNextRotateDirection\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getNextRotateDirection = new Function(`${source}; return getNextRotateDirection;`)();

    expect(getNextRotateDirection()).toBe(-1);
    expect(getNextRotateDirection(-1)).toBe(1);
    expect(scriptContent).toContain("tool === 'rotate' && currentTool === 'rotate'");
    expect(scriptContent).toContain('rotateDirection = getNextRotateDirection(rotateDirection)');
    expect(scriptContent).toContain("btn.querySelector('.rotate-label').textContent = clockwise ? 'TURN CW' : 'TURN CCW'");
  });

  it('should calculate exact quarter turns and canvas-safe positions', () => {
    const angleSource = scriptContent.match(/function getQuarterTurnAngle\([\s\S]*?\n\}/)?.[0];
    const positionSource = scriptContent.match(/function getCanvasSafeBodyPosition\([\s\S]*?\n\}/)?.[0];
    expect(angleSource).toBeTruthy();
    expect(positionSource).toBeTruthy();
    const getQuarterTurnAngle = new Function(`const ROTATE_STEP = Math.PI / 2; ${angleSource}; return getQuarterTurnAngle;`)();
    const getCanvasSafeBodyPosition = new Function(`${positionSource}; return getCanvasSafeBodyPosition;`)();

    expect(getQuarterTurnAngle(0, 1)).toBeCloseTo(Math.PI / 2);
    expect(getQuarterTurnAngle(Math.PI / 2, -1)).toBeCloseTo(0);
    const body = {
      position:{ x:495, y:295 },
      bounds:{ min:{ x:455, y:265 }, max:{ x:535, y:325 } }
    };
    expect(getCanvasSafeBodyPosition(body, 500, 300)).toEqual({ x:452, y:242 });
  });

  it('should target only standalone build parts with forgiving touch support', () => {
    expect(scriptContent).toContain('function isRotatableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('b.isStatic && !b.isAnchored');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
  });

  it('should apply one snapped turn with visible feedback and complete cleanup', () => {
    expect(document.getElementById('rotate-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('Body.setAngle(target, getQuarterTurnAngle(target.angle, direction))');
    expect(scriptContent).toContain('Body.setPosition(target, getCanvasSafeBodyPosition(target, canvas.width, canvas.height))');
    expect(scriptContent).toContain('Body.setAngularVelocity(target, 0)');
    expect(scriptContent).toContain('function addRotateBurst(body, direction)');
    expect(scriptContent).toContain('function drawRotateFlash(timestamp)');
    expect(scriptContent).toContain('drawRotateFlash(timestamp)');
    expect(scriptContent).toContain("showRotateFeedback('NO TURN', '#888888')");
    expect(scriptContent).toContain('resetRotateTool(true)');
    expect(scriptContent).toContain('if (rotateFlash && removedBodyIds.has(rotateFlash.body.id)) rotateFlash = null');
    expect(scriptContent).toContain("rotate: '#ff99ff'");
  });
});

// ============================================
// STRUT TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Strut Tool', () => {
  it('should keep Strut selectable immediately before Rotate', () => {
    const strutBtn = document.querySelector('[data-tool="strut"]');
    expect(strutBtn).not.toBeNull();
    expect(strutBtn?.getAttribute('aria-label')).toContain('stiff structural strut');
    expect(strutBtn?.nextElementSibling?.dataset.tool).toBe('rotate');
    expect(strutBtn?.previousElementSibling?.dataset.tool).toBe('alchemy');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'strut'");
    expect(scriptContent).toContain('strutBodiesAt(pos)');
  });

  it('should preserve the selected bodies current distance as the brace length', () => {
    const source = scriptContent.match(/function getStrutLength\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getStrutLength = new Function(`${source}; return getStrutLength;`)();
    const a = { position:{ x:10, y:20 } };
    const b = { position:{ x:40, y:60 } };

    expect(getStrutLength(a, b)).toBe(50);
    expect(getStrutLength(b, a)).toBe(50);
  });

  it('should select two touch-friendly build parts and create one stiff constraint', () => {
    expect(scriptContent).toContain('function isStruttableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('return !b.isStatic || b.isAnchored');
    expect(scriptContent).toContain('Matter.Query.point(candidates, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('strutFirstBody = target');
    expect(scriptContent).toContain('const strut = Constraint.create({');
    expect(scriptContent).toContain('length:getStrutLength(first, target)');
    expect(scriptContent).toContain('stiffness:0.92');
    expect(scriptContent).toContain("render:{ type:'strut' }");
    expect(scriptContent).toContain('struts.push(strut)');
  });

  it('should reject duplicate braces and allow tapping A again to cancel', () => {
    expect(scriptContent).toContain('function hasStrutBetween(bodyA, bodyB)');
    expect(scriptContent).toContain('target === strutFirstBody');
    expect(scriptContent).toContain("showStrutFeedback('STRUT CANCELLED'");
    expect(scriptContent).toContain("showStrutFeedback('ALREADY BRACED'");
  });

  it('should render persistent brace and selection feedback with complete cleanup', () => {
    expect(document.getElementById('strut-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("c.render?.type === 'strut'");
    expect(scriptContent).toContain('function drawStrutMarker(timestamp)');
    expect(scriptContent).toContain('drawStrutMarker(timestamp)');
    expect(scriptContent).toContain("if (tool !== 'strut') resetStrutSelection(true)");
    expect(scriptContent).toContain('struts = struts.filter(strut => !constraintsToRemove.has(strut))');
    expect(scriptContent).toContain('struts = struts.filter(strut => strut !== constraint)');
    expect(scriptContent).toContain('function pruneStruts()');
    expect(scriptContent).toContain('liveBodies.has(strut.bodyA) && liveBodies.has(strut.bodyB)');
    expect(scriptContent).toContain('if (inWorld && !hasBothEnds) Composite.remove(world, strut, true)');
    expect(scriptContent).toContain('pruneStruts()');
    expect(scriptContent).toContain('struts = []');
    expect(scriptContent).toContain('clearTimeout(strutFeedbackTimer)');
    expect(scriptContent).toContain("document.getElementById('strut-feedback').textContent = ''");
    expect(scriptContent).toContain("strut: '#66ffff'");
  });
});

// ============================================
// ALCHEMY TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Alchemy Tool', () => {
  it('should keep Alchemy selectable immediately before Strut', () => {
    const alchemyBtn = document.querySelector('[data-tool="alchemy"]');
    expect(alchemyBtn).not.toBeNull();
    expect(alchemyBtn?.getAttribute('aria-label')).toContain("object's physics");
    expect(alchemyBtn?.nextElementSibling?.dataset.tool).toBe('strut');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'alchemy'");
    expect(scriptContent).toContain('transmuteBodyAt(pos)');
  });

  it('should cycle bouncy, heavy, slippery, then normal', () => {
    const source = scriptContent.match(/function getNextAlchemyMode\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getNextAlchemyMode = new Function(`${source}; return getNextAlchemyMode;`)();

    expect(getNextAlchemyMode()).toBe('bouncy');
    expect(getNextAlchemyMode('bouncy')).toBe('heavy');
    expect(getNextAlchemyMode('heavy')).toBe('slippery');
    expect(getNextAlchemyMode('slippery')).toBe('normal');
  });

  it('should alter real physics and restore the original material values', () => {
    const source = scriptContent.match(/function getAlchemyPhysics\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getAlchemyPhysics = new Function(`${source}; return getAlchemyPhysics;`)();
    const original = { density:0.001, restitution:0.5, friction:0.3, frictionStatic:0.5, frictionAir:0.01 };

    const bouncy = getAlchemyPhysics('bouncy', original);
    const heavy = getAlchemyPhysics('heavy', original);
    const slippery = getAlchemyPhysics('slippery', original);
    expect(bouncy.density).toBeCloseTo(0.00072);
    expect(bouncy).toMatchObject({ restitution:1.05, friction:0.04 });
    expect(heavy.density).toBeCloseTo(0.0032);
    expect(heavy).toMatchObject({ restitution:0.06, friction:0.9 });
    expect(slippery.density).toBeCloseTo(0.0009);
    expect(slippery).toMatchObject({ restitution:0.16, friction:0.001 });
    expect(getAlchemyPhysics('normal', original)).toEqual(original);
    expect(scriptContent).toContain('function getAlchemyOriginal(body)');
    expect(scriptContent).toContain('function getAlchemyPhysics(mode, original)');
    expect(scriptContent).toContain("restitution:1.05");
    expect(scriptContent).toContain('density:original.density * 3.2');
    expect(scriptContent).toContain('friction:0.001');
    expect(scriptContent).toContain('function applyAlchemyMode(body, mode)');
    expect(scriptContent).toContain('Body.setDensity(body, physics.density)');
    expect(scriptContent).toContain('body.friction = physics.friction');
    expect(scriptContent).toContain("if (mode === 'normal')");
    expect(scriptContent).toContain('delete body.alchemyOriginal');
  });

  it('should protect assemblies while keeping touch targeting forgiving', () => {
    expect(scriptContent).toContain('function isAlchemyBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isStatic || b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('Matter.Query.point(alchemyBodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
  });

  it('should render persistent state and clear transient feedback on reset', () => {
    expect(document.getElementById('alchemy-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function addAlchemyBurst(body, mode)');
    expect(scriptContent).toContain('function drawAlchemyMarkers(timestamp)');
    expect(scriptContent).toContain('drawAlchemyMarkers(timestamp)');
    expect(scriptContent).toContain("showAlchemyFeedback('normal', 'NO SUBJECT')");
    expect(scriptContent).toContain('clearTimeout(alchemyFeedbackTimer)');
    expect(scriptContent).toContain("document.getElementById('alchemy-feedback').textContent = ''");
    expect(scriptContent).toContain("alchemy: '#44ffcc'");
  });
});

// ============================================
// FISSION TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Fission Tool', () => {
  it('should keep Fission selectable immediately before Alchemy', () => {
    const fissionBtn = document.querySelector('[data-tool="fission"]');
    expect(fissionBtn).not.toBeNull();
    expect(fissionBtn?.getAttribute('aria-label')).toContain('two smaller twins');
    expect(fissionBtn?.nextElementSibling?.dataset.tool).toBe('alchemy');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'fission'");
    expect(scriptContent).toContain('fissionBodyAt(pos)');
  });

  it('should calculate separated, canvas-safe twin positions', () => {
    const source = scriptContent.match(/function getFissionLayout\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getFissionLayout = new Function(`${source}; return getFissionLayout;`)();
    const body = {
      angle: 0,
      position: { x: 100, y: 100 },
      bounds: { min: { x: 80, y: 90 }, max: { x: 120, y: 110 } }
    };
    const layout = getFissionLayout(body, 500, 300, Math.SQRT1_2);

    expect(layout.first.x).toBeCloseTo(83.2);
    expect(layout.second.x).toBeCloseTo(116.8);
    expect(layout.first.y).toBe(100);
    expect(layout.second.y).toBe(100);
    expect(layout.direction.x).toBe(1);
    expect(layout.direction.y).toBe(0);
  });

  it('should protect assemblies and tiny descendants while supporting touch targeting', () => {
    expect(scriptContent).toContain('function isFissionableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isStatic || b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('Math.min(width, height) < 12');
    expect(scriptContent).toContain('(b.fissionDepth || 0) >= MAX_FISSION_DEPTH');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('Matter.Query.point(fissionableBodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
  });

  it('should replace one body with two mass-conserving, outward-moving twins', () => {
    expect(scriptContent).toContain('const FISSION_SCALE = Math.SQRT1_2');
    expect(scriptContent).toContain('const halves = [layout.first, layout.second].map');
    expect(scriptContent).toContain('const half = createBodyClone(source, position)');
    expect(scriptContent).toContain('Body.scale(half, FISSION_SCALE, FISSION_SCALE)');
    expect(scriptContent).toContain('half.resizeScale = (source.resizeScale || 1) * FISSION_SCALE');
    expect(scriptContent).toContain('half.fissionDepth = sourceDepth + 1');
    expect(scriptContent).toContain('Body.setVelocity(half, {');
    expect(scriptContent).toContain('Composite.remove(world, source, true)');
    expect(scriptContent).toContain('Composite.add(world, halves)');
    expect(scriptContent).toContain("if (source.render?.type === 'rocket') rocketBodies.push(...halves)");
  });

  it('should provide visible feedback and reset transient state on Clear', () => {
    expect(document.getElementById('fission-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function addFissionBurst(position, color)');
    expect(scriptContent).toContain("showFissionFeedback('NO SPLIT', '#888888')");
    expect(scriptContent).toContain("message = 'FISSION ×2'");
    expect(scriptContent).toContain('clearTimeout(fissionFeedbackTimer)');
    expect(scriptContent).toContain("document.getElementById('fission-feedback').textContent = ''");
    expect(scriptContent).toContain("fission: '#b266ff'");
  });
});

// ============================================
// SNIP TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Snip Tool', () => {
  it('should expose Snip as the final selectable toolbar tool', () => {
    const snipBtn = document.querySelector('[data-tool="snip"]');
    expect(snipBtn).not.toBeNull();
    expect(snipBtn?.getAttribute('aria-label')).toContain('physical connection');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'snip'");
    expect(scriptContent).toContain('snipConstraintAt(pos)');
  });

  it('should measure taps against a connection segment', () => {
    const source = scriptContent.match(/function distancePointToSegment\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const distancePointToSegment = new Function(`${source}; return distancePointToSegment;`)();

    expect(distancePointToSegment({ x:50, y:20 }, { x:0, y:0 }, { x:100, y:0 })).toBe(20);
    expect(distancePointToSegment({ x:-10, y:0 }, { x:0, y:0 }, { x:100, y:0 })).toBe(10);
    expect(distancePointToSegment({ x:3, y:4 }, { x:0, y:0 }, { x:0, y:0 })).toBe(5);
  });

  it('should find only visible body-to-body constraints with forgiving touch targeting', () => {
    expect(scriptContent).toContain('function isSnippableConstraint(constraint)');
    expect(scriptContent).toContain('constraint.bodyA &&');
    expect(scriptContent).toContain('constraint.bodyB &&');
    expect(scriptContent).toContain("constraint.render?.visible !== false");
    expect(scriptContent).toContain("constraint.render?.type !== 'flipper-pin'");
    expect(scriptContent).toContain('function findSnippableConstraintAt(pos, maxDistance = 28)');
    expect(scriptContent).toContain('Composite.allConstraints(world).forEach');
    expect(scriptContent).toContain('distancePointToSegment(pos, start, end)');
  });

  it('should remove only the tapped constraint and clean its tracked connection state', () => {
    expect(scriptContent).toContain('function snipConstraintAt(pos)');
    expect(scriptContent).toContain('Composite.remove(world, constraint, true)');
    expect(scriptContent).toContain('ropes = ropes.filter(rope => rope !== constraint)');
    expect(scriptContent).toContain('wreckingBalls = wreckingBalls.filter');
    expect(scriptContent).toContain('body.chainConnections = Math.max(0, body.chainConnections - 1)');
    expect(scriptContent).not.toContain('Composite.remove(world, constraint.bodyA)');
    expect(scriptContent).not.toContain('Composite.remove(world, constraint.bodyB)');
  });

  it('should render feedback and clear transient state on scene reset', () => {
    expect(document.getElementById('snip-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function addSnipBurst(point)');
    expect(scriptContent).toContain("showSnipFeedback('CONNECTION CUT!')");
    expect(scriptContent).toContain("showSnipFeedback('NO LINK', '#888888')");
    expect(scriptContent).toContain('clearTimeout(snipFeedbackTimer)');
    expect(scriptContent).toContain("document.getElementById('snip-feedback').textContent = ''");
    expect(scriptContent).toContain("snip: '#ffdd55'");
  });
});

// ============================================
// SWAP TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Swap Tool', () => {
  it('should expose Swap as the final selectable toolbar tool', () => {
    const swapBtn = document.querySelector('[data-tool="swap"]');
    expect(swapBtn).not.toBeNull();
    expect(swapBtn?.getAttribute('aria-label')).toContain('two standalone objects');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'swap'");
    expect(scriptContent).toContain('swapBodiesAt(pos)');
  });

  it('should clamp differently sized bodies to canvas-safe destinations', () => {
    const source = scriptContent.match(/function getSafeSwapPosition\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getSafeSwapPosition = new Function(`${source}; return getSafeSwapPosition;`)();
    const body = { bounds: { min: { x: 0, y: 0 }, max: { x: 80, y: 60 } } };

    expect(getSafeSwapPosition(body, { x: 5, y: 5 }, 500, 300)).toEqual({ x: 50, y: 40 });
    expect(getSafeSwapPosition(body, { x: 495, y: 295 }, 500, 300)).toEqual({ x: 450, y: 242 });
    expect(getSafeSwapPosition(body, { x: 250, y: 140 }, 500, 300)).toEqual({ x: 250, y: 140 });
  });

  it('should select two standalone dynamic bodies and exchange their positions', () => {
    expect(scriptContent).toContain('function isSwappableBody(b)');
    expect(scriptContent).toContain("b.label === 'wall'");
    expect(scriptContent).toContain('b.isStatic || b.isFragment || b.parent !== b');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('Matter.Query.point(swappableBodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('swapFirstBody = target');
    expect(scriptContent).toContain('Body.setPosition(first, firstDestination)');
    expect(scriptContent).toContain('Body.setPosition(target, secondDestination)');
    expect(scriptContent).toContain("return 'swapped'");
  });

  it('should render selection feedback and clean state on tool change, Eraser, or Clear', () => {
    expect(document.getElementById('swap-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function drawSwapMarker(timestamp)');
    expect(scriptContent).toContain('drawSwapMarker(timestamp)');
    expect(scriptContent).toContain("if (tool !== 'swap') resetSwapSelection(true)");
    expect(scriptContent).toContain('if (swapFirstBody && removedBodyIds.has(swapFirstBody.id)) swapFirstBody = null');
    expect(scriptContent).toContain("document.getElementById('swap-feedback').textContent = ''");
    expect(scriptContent).toContain("swap: '#00ffee'");
  });
});

// ============================================
// FLIPPER TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Flipper Tool', () => {
  it('should expose Flipper as the final selectable toolbar tool', () => {
    const flipperBtn = document.querySelector('[data-tool="flipper"]');
    expect(flipperBtn).not.toBeNull();
    expect(flipperBtn?.getAttribute('aria-label')).toContain('pinball flipper');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'flipper'");
    expect(scriptContent).toContain('placeOrActivateFlipperAt(pos)');
  });

  it('should alternate left and right placement with mirrored target angles', () => {
    const nextSource = scriptContent.match(/function getNextFlipperSide\([\s\S]*?\n\}/)?.[0];
    const angleSource = scriptContent.match(/function getFlipperAngles\([\s\S]*?\n\}/)?.[0];
    expect(nextSource).toBeTruthy();
    expect(angleSource).toBeTruthy();
    const getNextFlipperSide = new Function(`${nextSource}; return getNextFlipperSide;`)();
    const getFlipperAngles = new Function(`${angleSource}; return getFlipperAngles;`)();

    expect(getNextFlipperSide('left')).toBe('right');
    expect(getNextFlipperSide('right')).toBe('left');
    expect(getFlipperAngles('left')).toEqual({ rest: 0.18, active: -0.78 });
    expect(getFlipperAngles('right')).toEqual({ rest: -0.18, active: 0.78 });
  });

  it('should create a pinned paddle and fire it with touch-friendly targeting', () => {
    expect(scriptContent).toContain('function createFlipperAssembly(x, y, side)');
    expect(scriptContent).toContain("label: 'flipper'");
    expect(scriptContent).toContain("label: 'flipper-pivot'");
    expect(scriptContent).toContain('Constraint.create({');
    expect(scriptContent).toContain("type:'flipper-pin'");
    expect(scriptContent).toContain('let nextFlipperSide = \'left\'');
    expect(scriptContent).toContain('function activateFlipperAt(pos)');
    expect(scriptContent).toContain('Matter.Query.point(bodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('flipper.activeFrames = FLIPPER_ACTIVE_FRAMES');
    expect(scriptContent).toContain('getFlipperAngularVelocity(flipper.side, flipper.body.angle, true)');
  });

  it('should spring back, render feedback, and clean up through Eraser or Clear', () => {
    expect(document.getElementById('flipper-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain("case 'flipper':");
    expect(scriptContent).toContain("case 'flipper-pivot':");
    expect(scriptContent).toContain('const active = f.activeFrames > 0');
    expect(scriptContent).toContain('Body.setAngularVelocity(f.body, targetVelocity)');
    expect(scriptContent).toContain('if (f.body === target || f.pivot === target)');
    expect(scriptContent).toContain('flippers = [];');
    expect(scriptContent).toContain("nextFlipperSide = 'left';");
    expect(scriptContent).toContain("flipper: '#ff8800'");
  });
});

// ============================================
// MOTOR TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Motor Tool', () => {
  it('should expose Motor as the final selectable toolbar tool', () => {
    const motorBtn = document.querySelector('[data-tool="motor"]');
    expect(motorBtn).not.toBeNull();
    expect(motorBtn?.getAttribute('aria-label')).toContain('Motorize');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'motor'");
    expect(scriptContent).toContain('toggleMotorAt(pos)');
  });

  it('should cycle a motor clockwise, counter-clockwise, then off', () => {
    const source = scriptContent.match(/function getNextMotorDirection\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getNextMotorDirection = new Function(`${source}; return getNextMotorDirection;`)();

    expect(getNextMotorDirection(0)).toBe(1);
    expect(getNextMotorDirection(1)).toBe(-1);
    expect(getNextMotorDirection(-1)).toBe(0);
  });

  it('should motorize dynamic top-level bodies with touch-friendly targeting', () => {
    expect(scriptContent).toContain('let motorizedBodies = new Map()');
    expect(scriptContent).toContain('function isMotorableBody(b)');
    expect(scriptContent).toContain('!b.isStatic && b.parent === b');
    expect(scriptContent).toContain('Matter.Query.point(motorableBodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('motorizedBodies.set(target, direction)');
    expect(scriptContent).toContain('Body.setAngularVelocity(target, direction * 0.24)');
    expect(scriptContent).toContain('const targetSpeed = direction * 0.24');
  });

  it('should render motor state, announce changes, and clean up on erase or Clear', () => {
    expect(document.getElementById('motor-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('function drawMotorMarkers(timestamp)');
    expect(scriptContent).toContain('drawMotorMarkers(timestamp)');
    expect(scriptContent).toContain("direction === 1 ? '↻' : '↺'");
    expect(scriptContent).toContain('motorizedBodies.delete(b)');
    expect(scriptContent).toContain('motorizedBodies.clear()');
    expect(scriptContent).toContain("motor: '#ff66cc'");
  });
});

// ============================================
// CLONE TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Clone Tool', () => {
  it('should expose Clone as the final selectable toolbar tool', () => {
    const cloneBtn = document.querySelector('[data-tool="clone"]');
    expect(cloneBtn).not.toBeNull();
    expect(cloneBtn?.getAttribute('aria-label')).toContain('Clone');
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'clone'");
    expect(scriptContent).toContain('cloneBodyAt(pos)');
  });

  it('should choose a bounded duplicate position on either side of the canvas', () => {
    const source = scriptContent.match(/function getClonePosition\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getClonePosition = new Function(`${source}; return getClonePosition;`)();
    const leftBody = { position: { x: 80, y: 100 }, bounds: { min: { x: 60, y: 80 }, max: { x: 100, y: 120 } } };
    const rightBody = { position: { x: 470, y: 285 }, bounds: { min: { x: 450, y: 265 }, max: { x: 490, y: 305 } } };

    expect(getClonePosition(leftBody, 500, 300)).toEqual({ x: 126, y: 86, direction: 1 });
    expect(getClonePosition(rightBody, 500, 300)).toEqual({ x: 424, y: 252, direction: -1 });
  });

  it('should clone standalone dynamic geometry, appearance, scale, and behavior flags', () => {
    expect(scriptContent).toContain('function isCloneableBody(b)');
    expect(scriptContent).toContain("b.label === 'chain-link'");
    expect(scriptContent).toContain('b.isStatic');
    expect(scriptContent).toContain('b.parent !== b');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('function createBodyClone(source, position)');
    expect(scriptContent).toContain('Bodies.fromVertices(position.x, position.y, localVertices');
    expect(scriptContent).toContain('render: { ...source.render }');
    expect(scriptContent).toContain('clone.resizeScale = source.resizeScale || 1');
    expect(scriptContent).toContain('clone.isBomb = Boolean(source.isBomb)');
    expect(scriptContent).toContain("if (clone.render?.type === 'rocket') rocketBodies.push(clone)");
  });

  it('should provide touch targeting, visible feedback, and Clear cleanup', () => {
    expect(scriptContent).toContain('Matter.Query.point(cloneableBodies, pos)');
    expect(scriptContent).toContain('let nearestDist = 46');
    expect(scriptContent).toContain('function addCloneBurst(source, clone)');
    expect(scriptContent).toContain('function showCloneFeedback()');
    expect(document.getElementById('clone-feedback')?.getAttribute('role')).toBe('status');
    expect(scriptContent).toContain('clearTimeout(cloneFeedbackTimer)');
    expect(scriptContent).toContain("document.getElementById('clone-feedback').textContent = ''");
    expect(scriptContent).toContain("clone: '#cc99ff'");
  });
});

// ============================================
// RESIZE TOOL TESTS (Code Analysis + Pure Logic)
// ============================================

describe('Resize Tool', () => {
  it('should wire Resize through selectable tool state and a one-button mode toggle', () => {
    const resizeBtn = document.querySelector('[data-tool="resize"]');
    expect(resizeBtn).not.toBeNull();
    expect(resizeBtn?.getAttribute('aria-label')).toContain('grow mode');
    expect(scriptContent).toContain("currentTool === 'resize'");
    expect(scriptContent).toContain("resizeMode = resizeMode === 'grow' ? 'shrink' : 'grow'");
    expect(scriptContent).toContain('function updateResizeButton()');
  });

  it('should keep resize steps within safe limits in both modes', () => {
    const source = scriptContent.match(/function getResizeStep\([\s\S]*?\n\}/)?.[0];
    expect(source).toBeTruthy();
    const getResizeStep = new Function(`${source}; return getResizeStep;`)();

    expect(getResizeStep(1, 'grow').nextScale).toBeCloseTo(1.35);
    expect(getResizeStep(1, 'shrink').nextScale).toBeCloseTo(1 / 1.35);
    expect(getResizeStep(3.3, 'grow')).toBeNull();
    expect(getResizeStep(0.4, 'shrink')).toBeNull();
  });

  it('should scale only standalone dynamic bodies and provide visible feedback', () => {
    expect(scriptContent).toContain('function isResizableBody(b)');
    expect(scriptContent).toContain("b.label === 'wall'");
    expect(scriptContent).toContain('b.isStatic');
    expect(scriptContent).toContain('b.parent !== b');
    expect(scriptContent).toContain('Composite.allConstraints(world).some');
    expect(scriptContent).toContain('function resizeBodyAt(pos)');
    expect(scriptContent).toContain('Matter.Query.point(resizableBodies, pos)');
    expect(scriptContent).toContain('Body.scale(target, step.factor, step.factor)');
    expect(scriptContent).toContain('target.resizeScale = step.nextScale');
    expect(scriptContent).toContain('function addResizeBurst(body, growing)');
    expect(scriptContent).toContain('function showResizeFeedback(scale, growing)');
    expect(document.getElementById('resize-feedback')?.getAttribute('role')).toBe('status');
  });

  it('should render at the transformed size and reset mode on Clear', () => {
    expect(scriptContent).toContain('const resizeScale = b.resizeScale || 1');
    expect(scriptContent).toContain('spawnScale * clearScale * resizeScale');
    expect(scriptContent).toContain("resizeMode = 'grow';\n  updateResizeButton();");
    expect(scriptContent).toContain("document.getElementById('resize-feedback').textContent = ''");
    expect(scriptContent).toContain("resize: '#66ff99'");
  });
});

// ============================================
// ANCHOR TOOL TESTS (Code Analysis)
// ============================================

describe('Anchor Tool', () => {
  it('should wire Anchor through the shared selectable tool state', () => {
    const anchorBtn = document.querySelector('[data-tool="anchor"]');
    expect(anchorBtn).not.toBeNull();
    expect(anchorBtn?.classList.contains('tool-btn')).toBe(true);
    expect(scriptContent).toContain('currentTool = tool');
    expect(scriptContent).toContain("currentTool === 'anchor'");
  });

  it('should toggle tapped bodies between dynamic and static state', () => {
    expect(scriptContent).toContain('function toggleAnchorAt(pos)');
    expect(scriptContent).toContain('Matter.Query.point(anchorableBodies, pos)');
    expect(scriptContent).toContain('const anchored = !target.isAnchored');
    expect(scriptContent).toContain('Body.setStatic(target, true)');
    expect(scriptContent).toContain('Body.setStatic(target, false)');
    expect(scriptContent).toContain('anchoredBodies.add(target)');
    expect(scriptContent).toContain('anchoredBodies.delete(target)');
  });

  it('should provide visible feedback and reset Anchor state on Clear', () => {
    expect(scriptContent).toContain('function drawAnchorMarkers(timestamp)');
    expect(scriptContent).toContain('drawAnchorMarkers(timestamp)');
    expect(scriptContent).toContain("anchor: '#00e5ff'");
    expect(scriptContent).toContain('anchoredBodies.clear()');
    expect(scriptContent).toContain('!b.isStatic || b.isAnchored');
  });

  it('should exclude arena and static utility bodies while allowing anchored bodies to be released', () => {
    expect(scriptContent).toContain("b.label !== 'wall'");
    expect(scriptContent).toContain('(b.isAnchored || !b.isStatic)');
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
// IMPACT COMBO TESTS
// ============================================

describe('Impact Combo System', () => {
  function extractSection(startText, endText) {
    const start = scriptContent.indexOf(startText);
    expect(start).toBeGreaterThan(-1);
    const end = scriptContent.indexOf(endText, start);
    expect(end).toBeGreaterThan(start);
    return scriptContent.slice(start, end);
  }

  it('should define combo timing, threshold, and session-best state', () => {
    expect(scriptContent).toContain('const COMBO_WINDOW = 90');
    expect(scriptContent).toContain('const COMBO_MIN_REL_VELOCITY = 5');
    expect(scriptContent).toContain('const COMBO_MILESTONES = [5, 10, 20, 50]');
    expect(scriptContent).toContain('let comboCount = 0');
    expect(scriptContent).toContain('let comboTimer = 0');
    expect(scriptContent).toContain('let comboBest = 0');
    expect(scriptContent).toContain('let comboFlash = 0');
  });

  it('should register rapid hard impacts with escalating feedback', () => {
    const comboSection = extractSection('function registerImpactCombo(', 'function getRelativeVelocity(');
    expect(comboSection).toContain('if (relVel <= COMBO_MIN_REL_VELOCITY) return;');
    expect(comboSection).toContain('comboCount = comboTimer > 0 ? comboCount + 1 : 1');
    expect(comboSection).toContain('comboTimer = COMBO_WINDOW');
    expect(comboSection).toContain('comboBest = Math.max(comboBest, comboCount)');
    expect(comboSection).toContain('if (comboCount < 3) return;');
    expect(comboSection).toContain('playSound(pitch, 0.07');
    expect(comboSection).toContain('isConfetti: true');
    expect(comboSection).toContain('COMBO_MILESTONES.includes(comboCount)');
    expect(comboSection).toContain('hapticThrottled([8, 20, 8], 80)');
    expect(comboSection).toContain('playBoom()');
  });

  it('should hook combos into collision energy and decay them over time', () => {
    expect(scriptContent).toContain('registerImpactCombo(relVel, px, py)');
    expect(scriptContent).toContain('if (comboTimer > 0) {');
    expect(scriptContent).toContain('comboTimer--');
    expect(scriptContent).toContain('if (comboTimer <= 0) comboCount = 0');
    expect(scriptContent).toContain('comboFlash = Math.max(0, comboFlash - dt * 3)');
  });

  it('should render a temporary combo HUD and clear active combo state', () => {
    expect(scriptContent).toContain('if (comboCount >= 3 && comboTimer > 0)');
    expect(scriptContent).toContain("ctx.fillText(comboCount + 'x COMBO'");
    expect(scriptContent).toContain("ctx.fillText('BEST ' + comboBest + 'x'");
    expect(scriptContent).toContain('comboCount = 0');
    expect(scriptContent).toContain('comboTimer = 0');
    expect(scriptContent).toContain('comboFlash = 0');
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
    expect(scriptContent).toContain('ctx.scale(spawnScale * clearScale * resizeScale, spawnScale * clearScale * resizeScale)');
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
    expect(scriptContent).toContain('ctx.scale(spawnScale * clearScale * resizeScale, spawnScale * clearScale * resizeScale)');
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

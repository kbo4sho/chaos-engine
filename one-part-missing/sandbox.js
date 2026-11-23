import { addTransmissions, installTransmissions, acceptsReceiver } from './transmissions.js';
import { makeLinks, installRigging } from './rigging.js';
import { instruments, installDevices } from './devices.js';
import { WIDTH, HEIGHT, assembly, makeBody } from './machines.js';
import { orderById } from './work-orders.js';
import { resolveMachine } from './workshop.js';
import { driveConnection } from './drive-art.js';
import { drawSandboxRig } from './rig-art.js';
import { drawSandboxPart } from './drawing.js';

export function installBench(api) {
  const { M, engine, world } = api;
  let priorBodies,
    priorConnections,
    driveScene = { connections: [], slides: [], arms: [], windows: [] };
  const drives = () => {
    const bodies = M.Composite.allBodies(world),
      connections = M.Composite.allConstraints(world);
    if (bodies !== priorBodies || connections !== priorConnections) {
      priorBodies = bodies;
      priorConnections = connections;
      driveScene = {
        slides: bodies.filter((b) => b.plugin.benchGuide),
        arms: bodies.filter((b) => b.plugin.benchArm),
        connections: connections.filter((c) => c.drive && c.driveMarker),
        windows: bodies.filter((b) => b.render.machineShape?.window),
      };
    }
    return driveScene;
  };
  M.Events.on(engine, 'beforeUpdate', () => {
    for (const b of drives().windows) b.render.windowTick = (b.render.windowTick || 0) + 1;
  });
  let previousBodies, scene;
  installDevices(
    M,
    engine,
    () => {
      const bodies = M.Composite.allBodies(world);
      if (bodies !== previousBodies) {
        previousBodies = bodies;
        scene = { tools: [], marbles: [] };
        for (const body of bodies) {
          const shape = body.render.machineShape;
          if (shape && (instruments[shape.kind] || shape.kind === 'outlet'))
            scene.tools.push({ body, shape });
          if (
            !body.isStatic &&
            !body.isSensor &&
            (shape ? ['marble', 'cargo'].includes(shape.kind) : body.circleRadius)
          )
            scene.marbles.push(body);
        }
      }
      return scene;
    },
    (tool) => {
      tool.body.render.poweredAt = engine.timing.timestamp;
    },
  );
  // Apply fields before transmitting the resulting load through the shafts, as on the puzzle bench.
  installTransmissions(M, engine, drives);
  installRigging(
    M,
    engine,
    () => M.Composite.allConstraints(world),
    (l) => {
      l.rigMarker.render.poweredAt = engine.timing.timestamp;
    },
  );
  api.setRenderer(drawSandboxPart, (c, l) => {
    if (l.rig) drawSandboxRig(c, l);
    else driveConnection(c, l);
  });
  M.Events.on(engine, 'collisionStart', ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const target = bodyA.render.machineShape?.sensor
        ? bodyA
        : bodyB.render.machineShape?.sensor
          ? bodyB
          : null;
      if (!target) continue;
      const other = target === bodyA ? bodyB : bodyA;
      const required = target.render.machineShape.striker;
      if (
        other.isSensor ||
        other.isStatic ||
        (required && other.label !== required) ||
        !acceptsReceiver(target.render.machineShape, other, target.render.windowTick || 0)
      )
        continue;
      target.render.struckAt = engine.timing.timestamp;
      api.chime([523.25, 659.25, 783.99, 1046.5][target.render.noteIndex || 0]);
    }
  });
  const args = new URLSearchParams(location.hash.slice(1));
  if (!args.has('machine')) return;
  const machine = orderById.get(args.get('machine')) || resolveMachine(M, args.get('machine'));
  if (!machine) {
    api.status('UNKNOWN MACHINE · CHOOSE PUZZLES TO OPEN THE SHELF');
    return;
  }
  const readPlacement = (suffix) => {
    const index = args.get('socket' + suffix);
    return {
      part: args.get('part' + suffix),
      socket: /^\d$/.test(index || '') ? Number(index) : -1,
      flipped: args.get('flip' + suffix) === '1',
    };
  };
  const move = readPlacement('');
  if (args.has('part2')) move.second = readPlacement('2');
  // Keep the solver's physical units across devices. Shrinking a domino's
  // actual body changes its inertia and its ability to topple its neighbor.
  api.setMachineViewport({ width: WIDTH, height: HEIGHT });
  api.pause();
  const items = [];
  for (const s of assembly(machine, move)) {
    const { body, pivot } = makeBody(M, s);
    items.push({ shape: s, body });
    body.render.type = 'machine-part';
    body.render.machineShape = { ...s };
    body.render.machineUnits = true;
    if (s.sensor) {
      if (machine.striker && !s.striker) body.render.machineShape.striker = machine.striker;
      body.render.noteIndex = machine.goals.indexOf(s);
      body.render.noteCount = machine.goals.length;
    }
    M.Composite.add(world, pivot ? [body, pivot] : body);
  }
  makeLinks(M, world, items);
  addTransmissions(M, world, items);
  const launcher = document.getElementById('puzzle-launcher');
  launcher.href = 'one-part-missing/#' + machine.id;
  api.status(machine.title.toUpperCase() + ' · PAUSED · PRESS PLAY TO EXPERIMENT');
}

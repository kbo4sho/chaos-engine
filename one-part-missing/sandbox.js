import { installShutters } from './sandbox-shutters.js';
import { addTransmissions, installTransmissions, acceptsReceiver } from './transmissions.js';
import { makeLinks, installRigging } from './rigging.js';
import { instruments, installDevices } from './devices.js';
import { WIDTH, HEIGHT, assembly, makeBody } from './machines.js';
import { installReceivingBins } from './sorting.js';
import { orderById } from './work-orders.js';
import { resolveMachine } from './workshop.js';
import { driveConnection } from './drive-art.js';
import { drawSandboxRig } from './rig-art.js';
import { drawSandboxPart } from './drawing.js';

export async function installBench(api) {
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
          if (
            shape &&
            (instruments[shape.kind] || shape.kind === 'outlet' || shape.kind === 'electrode')
          )
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
  let binBodies, binScene;
  installReceivingBins(
    M,
    engine,
    () => {
      const bodies = M.Composite.allBodies(world);
      if (bodies !== binBodies) {
        binBodies = bodies;
        binScene = {
          bins: bodies
            .filter((b) => b.render.machineShape?.bin)
            .map((body) => ({ body, shape: body.render.machineShape })),
          actors: bodies.filter((b) => ['cargo', 'marble'].includes(b.label)),
        };
      }
      return binScene;
    },
    (bin) => {
      bin.body.render.struckAt = engine.timing.timestamp;
      api.chime(bin.shape.striker === 'cargo' ? 783.99 : 523.25);
    },
  );
  M.Events.on(engine, 'collisionStart', ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      const target = bodyA.render.machineShape?.sensor
        ? bodyA
        : bodyB.render.machineShape?.sensor
          ? bodyB
          : null;
      if (!target || target.render.machineShape.bin) continue;
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
  const launcher = document.getElementById('puzzle-launcher');
  installShutters(M, engine, world, launcher, api.status);
  const args = new URLSearchParams(location.hash.slice(1));
  let experiment, machine;
  if (args.has('machine'))
    machine = orderById.get(args.get('machine')) || resolveMachine(M, args.get('machine'));
  else if (args.has('study') || args.has('shutters')) {
    try {
      const { sandboxStudy } = await import('./discovery/sandbox-study.js');
      experiment = sandboxStudy(M, args);
      machine = experiment?.machine;
    } catch {
      api.status('EXPERIMENT COULD NOT LOAD · RELOAD TO RETRY');
      return;
    }
  } else return;
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
  const move = experiment ? null : readPlacement('');
  if (move && args.has('part2')) move.second = readPlacement('2');
  if (move && args.has('part3')) move.third = readPlacement('3');
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
    api.registerMachineCollision(body);
    if (s.kind === 'exposure') body.collisionFilter.mask = 0;
    if (s.sensor) {
      if (machine.striker && !s.striker) body.render.machineShape.striker = machine.striker;
      body.render.noteIndex = machine.goals.indexOf(s);
      body.render.noteCount = machine.goals.length;
    }
    M.Composite.add(world, pivot ? [body, pivot] : body);
  }
  makeLinks(M, world, items);
  addTransmissions(M, world, items);
  if (!experiment) launcher.href = 'one-part-missing/#' + machine.id;
  api.status(machine.title.toUpperCase() + ' · PAUSED · PRESS PLAY TO EXPERIMENT');
}

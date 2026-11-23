import { instruments, installDevices } from './devices.js';
import { WIDTH, HEIGHT, assembly, validMove, makeBody } from './machines.js';
import { resolveMachine } from './workshop.js';
import { drawSandboxPart } from './drawing.js';

export function installBench(api) {
  const { M, engine, world } = api;
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
          if (!body.isStatic && !body.isSensor && (shape?.kind === 'marble' || body.circleRadius))
            scene.marbles.push(body);
        }
      }
      return scene;
    },
    (tool) => {
      tool.body.render.poweredAt = engine.timing.timestamp;
    },
  );
  api.setRenderer(drawSandboxPart);
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
      if (other.isSensor || other.isStatic || (required && other.label !== required)) continue;
      target.render.struckAt = engine.timing.timestamp;
      api.chime([523.25, 659.25, 783.99, 1046.5][target.render.noteIndex || 0]);
    }
  });
  const args = new URLSearchParams(location.hash.slice(1));
  if (!args.has('machine')) return;
  const machine = resolveMachine(M, args.get('machine'));
  if (!machine) {
    api.status('UNKNOWN MACHINE · CHOOSE PUZZLES TO OPEN THE SHELF');
    return;
  }
  const index = args.get('socket');
  const requested = {
    part: args.get('part'),
    socket: /^\d$/.test(index || '') ? Number(index) : -1,
    flipped: args.get('flip') === '1',
  };
  const move = validMove(machine, requested) ? requested : null;
  // Keep the solver's physical units across devices. Shrinking a domino's
  // actual body changes its inertia and its ability to topple its neighbor.
  api.setMachineViewport({ width: WIDTH, height: HEIGHT });
  api.pause();
  for (const s of assembly(machine, move)) {
    const { body, pivot } = makeBody(M, s);
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
  const launcher = document.getElementById('puzzle-launcher');
  launcher.href = 'one-part-missing/#' + machine.id;
  api.status(machine.title.toUpperCase() + ' · PAUSED · PRESS PLAY TO EXPERIMENT');
}

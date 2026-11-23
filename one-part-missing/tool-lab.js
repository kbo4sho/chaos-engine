import {fieldParts,fieldExperiment,fieldInput,fieldQuestions} from './fields.js';
import { flightParts, flightInput, flightExperiment } from './flight.js';
import { createRun, advance, HEIGHT, WIDTH, parts } from './machines.js';
import { instruments, outlet } from './devices.js';
import { transmissions } from './transmissions.js';
import { driveMachine } from './drive-course.js';
import { links } from './rigging.js';
import { draw, atFrame, snapshot } from './drawing.js';

// A controlled experiment for each tool keeps the release identical in both runs.
// The reference belt/bed is an unpowered solid. Fields switch off completely.
const rigExperiments = {
  tether: ['When does a slack line first change the marble’s path?', 1.12],
  strut: ['How does a rigid rod steer a marble moving toward its peg?', 1],
  spring: ['Where does the marble turn back after stretching the coil?', 0.87],
  winch: ['How does taking in the line change the turning radius?', 1.02],
  breaklink: ['Where does the marble travel after the seam gives way?', 1.06],
  damper: ['Which part of the motion does the shock absorber slow?', 1],
  pulley: ['What happens to the blue parcel when the gold end of the cable drops?', 1],
};
const driveQuestions = {
  motor: 'How quickly can a motor bring a resting input shaft up to speed?',
  rack: 'How does the rotating input wheel move the blue carriage along its guide?',
  gearbox: 'Which direction does the output turn when two gears mesh?',
  clutch: 'How does the output accelerate while the clutch plates slip?',
  torsion: 'When does the output catch up with a wound input?',
  ratchet: 'What changes when the input shaft is held against reverse rotation?',
};
function driveExperiment(kind, offset) {
  const speed = 1 + offset / 100,
    slide = ['motor', 'rack', 'ratchet'].includes(kind),
    input = {
      x: 150,
      y: 175,
      r: 33,
      spin: (kind === 'motor' ? 0 : kind === 'ratchet' ? -0.19 : 0.19) * speed,
      density: 0.012,
    };
  const output = slide
    ? {
        mode: 'slide',
        x: 346,
        y: 204,
        guide: [245, 668],
        vx: kind === 'ratchet' ? 3 : 0,
        density: 0.003,
      }
    : { mode: 'arm', x: 523, y: 203, axle: [450, 200], density: 0.002 };
  const tools = [];
  if (kind === 'motor' || kind === 'ratchet')
    tools.push({ kind: 'rack', from: 'drive', to: 'parcel', x: 258, y: 205, pitch: 32 });
  tools.push({
    kind,
    from: 'drive',
    to: slide && kind !== 'rack' ? 'frame' : 'parcel',
    x: slide && kind !== 'rack' ? 150 : 291,
    y: 134,
    dir: 1,
    rate: 0.13 * speed,
    wind: 1.4,
    ratio: 1.4,
    pitch: 28,
    labPiece: true,
  });
  return driveMachine(
    {
      input,
      output,
      relay: null,
      tools,
      sockets: [],
      tray: [],
      goal: { kind: 'flag', x: 1600, y: 900, w: 22, h: 28 },
    },
    0,
  );
}
const sortQuestions = {
  sieve: 'Which load diameters pass through the 30-unit opening?',
  funnel: 'Which part of the load meets a sloping side before the throat?',
  basket: 'Where does a load settle when a raised side catches it?',
  ice: 'Where does the load leave a low-friction rail?',
  oneway: 'Can the same gate pass a load on the way up and hold it on the way down?',
  zipline: 'Which direction does a rider travel just after leaving the cable?',
};
function handlingExperiment(kind, offset) {
  const r = [7, 13, 21][offset / 24 + 1],
    x = 310,
    y = 177;
  const release = {
    sieve: [310, 59, 0],
    funnel: [273, 62, 0.45],
    basket: [291, 47, 0.8],
    ice: [274, 45, 1.7],
    oneway: [301, 263, 0.2, -9],
    zipline: [269, 57, 1.6],
  }[kind];
  return {
    sockets: [],
    tray: [],
    ball: { kind: 'marble', r, x: release[0], y: release[1], vx: release[2], vy: release[3] || 0 },
    fixtures: [{ ...parts[kind].shape, x, y, dir: kind === 'oneway' ? -1 : 1, gap: 30, labPiece: true }],
    goals: [{ kind: 'flag', x: 1800, y: 1800, w: 20, h: 20, sensor: true }],
  };
}
const flightQuestions = {
  float: 'After collecting the collar, does the falling load keep accelerating downward?',
  parachute: 'How does the canopy change a descent after the load has left the service ring?',
  thruster: 'Which way does the load accelerate when its nose points upward?',
  keel: 'Which component of the incoming velocity does the fin remove?',
  hopper: 'Does the foot jump at pickup, or when the load reaches the supporting rail?',
  bank: 'How does a bank reflect the incoming path across the moving load’s own axis?',
  unload: 'What happens to a floating load after it sheds the collar?',
};
const experiments = {
  ...Object.fromEntries(Object.entries(fieldQuestions).map(([k,question])=>[k,{question}])),
  ...Object.fromEntries(Object.entries(flightQuestions).map(([k, question]) => [k, { question }])),
  ...Object.fromEntries(Object.entries(sortQuestions).map(([k, question]) => [k, { question }])),
  ...Object.fromEntries(Object.entries(driveQuestions).map(([k, question]) => [k, { question }])),
  ...Object.fromEntries(
    Object.entries(rigExperiments).map(([kind, [question]]) => [
      kind,
      { question, mount: [310, 76], release: kind === 'pulley' ? [222, 141, -3] : [220, 175, 5.5] },
    ]),
  ),
  bridge: {
    mount: [300, 198],
    release: [125, 48, 5],
    question: 'How far does a shallow rail carry the marble past an open gap?',
  },
  chute: {
    mount: [312, 199],
    release: [163, 55, 4.5],
    question: 'Can a left-sloping rail turn a marble that travels right?',
  },
  bumper: {
    mount: [320, 230],
    release: [154, 47, 4.4],
    question: 'Which direction does the curved rim send the marble?',
  },
  weight: {
    mount: [386, 126],
    release: [250, 267, 0],
    question: 'What happens to the marble on the short arm when the weight drops?',
  },
  domino: {
    mount: [324, 287],
    release: [208, 245, 7.5],
    question: 'Does the last tile fall when the middle tile is missing?',
  },
  elevator: {
    mount: [288, 265],
    release: [155, 54, 4.2],
    question: 'Where does the rising deck meet the marble?',
  },
  cam: {
    mount: [309, 214],
    release: [150, 57, 4.9],
    question: 'Which part of the rotating rim meets the marble first?',
  },
  piston: {
    mount: [234, 190],
    release: [165, 55, 4.1],
    question: 'Does the marble meet the extending face or the returning face?',
  },
  pinwheel: {
    mount: [311, 210],
    release: [155, 50, 4.5],
    question: 'What changes when the blades are allowed to turn?',
  },
  tripwire: {
    mount: [318, 196],
    release: [154, 51, 5],
    question: 'Which way does the marble leave the wire?',
  },
  switch: {
    mount: [205, 151],
    release: [99, 45, 3.8],
    question: 'When does the blue parcel begin moving after the gold marble hits the switch?',
  },
  hatch: {
    mount: [460, 135],
    release: [99, 45, 3.8],
    question: 'How does the parcel move when the door can swing open?',
  },
  conveyor: {
    mount: [299, 212],
    release: [170, 52, 4.1],
    question: 'How far does a powered belt carry the marble beyond a plain platform?',
  },
  trampoline: {
    mount: [275, 285],
    release: [184, 223, 4.1],
    question: 'Where does the marble travel after it touches the spring bed?',
  },
  fan: {
    mount: [317, 273],
    release: [172, 72, 4.5],
    question: 'When does the air begin lifting the marble above the grille?',
  },
  magnet: {
    mount: [324, 164],
    release: [153, 57, 4.5],
    question: 'Which way does the trail bend as it passes the pole?',
  },
  deflector: {
    mount: [322, 196],
    release: [163, 56, 5.1],
    question: 'Which way does the same incoming velocity point after a quarter turn?',
  },
  syrup: {
    mount: [307, 187],
    release: [150, 55, 5.1],
    question: 'Where does the marble drop after it crosses the syrup?',
  },
  portal: {
    mount: [287, 181],
    release: [160, 46, 4.2],
    question: 'What happens to the angle of travel between the two rings?',
  },
  repulsor: {
    mount: [326, 169],
    release: [153, 54, 4.6],
    question: 'Which side of the coil sends the marble farther away?',
  },
};
export function experiment(M, kind, offset = 0) {
  const { mount, release } = experiments[kind];
  const wired = Object.hasOwn(links, kind);
  const gate = kind === 'switch' || kind === 'hatch';
  const driven = Object.hasOwn(transmissions, kind);
  const delivery = driven || gate || kind === 'pulley';
  const handling = Object.hasOwn(sortQuestions, kind);
  const unpowered = handling || !Object.hasOwn(instruments, kind);
  const apparatus =
    kind === 'weight'
      ? [
          { kind: 'rocker', x: 320, y: 301, w: 194, h: 12, pivot: true },
          { kind: 'rail', x: 370, y: 319, w: 28, h: 12 },
          { kind: 'rail', x: 245, y: 319, w: 35, h: 12 },
        ]
      : kind === 'domino'
        ? [
            { kind: 'rail', x: 350, y: 327, w: 480, h: 14 },
            ...[256, 290, 358, 392, 426].map((x) => ({
              kind: 'tile',
              x,
              y: 287,
              w: 12,
              h: 66,
              track: x === 426,
            })),
          ]
        : [];
  const machine = fieldParts[kind] ? fieldExperiment(kind,offset) : flightParts[kind]
    ? flightExperiment(kind, offset)
    : handling
      ? handlingExperiment(kind, offset)
      : driven
        ? driveExperiment(kind, offset)
        : {
            fixtures: [
              ...apparatus,
              ...(wired
                ? [{ kind: 'eyelet', node: 'peg', r: 6, field: true, x: mount[0], y: mount[1] }]
                : []),
              ...(kind === 'pulley'
                ? [{ kind: 'cargo', node: 'parcel', r: 11, x: 412, y: 145, density: 0.001 }]
                : []),
              {
                ...parts[kind].shape,
                x: mount[0],
                y: mount[1],
                labPiece: true,
                ...(wired
                  ? {
                      from: kind === 'pulley' ? 'runner' : 'peg',
                      to: kind === 'pulley' ? 'parcel' : 'runner',
                      rest: rigExperiments[kind][1],
                    }
                  : {}),
              },
              ...(gate
                ? [
                    kind === 'switch'
                      ? { ...instruments.hatch.shape, x: 460, y: 135 }
                      : { ...instruments.switch.shape, x: 205, y: 151 },
                    { kind: 'cargo', x: 471, y: 113, r: 11 },
                  ]
                : []),
              ...(kind === 'portal' ? [{ ...outlet, x: 423, y: 100 }] : []),
            ],
            ball: {
              kind: 'marble',
              node: 'runner',
              ...(kind === 'pulley' ? { density: 0.006 } : {}),
              r: 12,
              x: release[0] + offset,
              y: release[1],
              vx: release[2],
            },
            goals: [
              {
                kind: 'chime',
                x: 2000,
                y: 2000,
                w: 22,
                h: 28,
                sensor: true,
                striker: delivery ? 'cargo' : kind === 'domino' ? 'tile' : 'marble',
              },
            ],
            sockets: [],
            tray: [],
          };
  const simulate = (disabled) => {
    const run = createRun(M, {
      ...machine,
      fixtures: machine.fixtures
        .filter((s) => !(unpowered && disabled && s.labPiece))
        .map((s) => ({ ...s, disabled: disabled && s.kind === kind })),
    });
    const tracked =
      run.items.find((it) => it.shape.track || (delivery && it.shape.kind === 'cargo'))?.body ||
      run.ball;
    const tape = [snapshot(run)],
      path = [[tracked.position.x, tracked.position.y, false]];
    let used = 0;
    while (run.state === 'running' && run.tick < (kind === 'domino' ? 230 : 145)) {
      advance(M, run);
      tape.push(snapshot(run));
      path.push([tracked.position.x, tracked.position.y, run.uses.length > used && kind === 'portal']);
      used = run.uses.length;
      const { x, y } = tracked.position;
      if (y > HEIGHT - 10 || x > WIDTH - 12 || x < 12 || y < -50) break;
    }
    return { run, tape, path };
  };
  return { powered: simulate(false), reference: simulate(true), delivery, unpowered };
}

export function setupLab(M, { onOpen, onClose } = {}) {
  const el = (id) => document.getElementById(id);
  const modal = el('tool-lab'),
    menu = el('lab-tool'),
    canvas = el('lab-diagram'),
    ctx = canvas.getContext('2d');
  const slider = el('lab-frame');
  let data,
    raf,
    frame = 0,
    origin = null,
    opener = null;
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = null;
    origin = null;
    el('lab-play').textContent = 'Play comparison';
  };
  function paint() {
    const { powered, reference } = data;
    const index = Math.min(frame, powered.tape.length - 1),
      refIndex = Math.min(frame, reference.path.length - 1);
    draw(ctx, atFrame(powered.run, powered.tape[index]), {
      [data.delivery ? 'cargoTrail' : 'trail']: powered.path.slice(0, index + 1),
      ghost: reference.path.slice(0, refIndex + 1),
    });
    const [x, y] = reference.path[refIndex];
    ctx.save();
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#b6ced8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    el('lab-time').value = (frame / 60).toFixed(2) + ' s';
    slider.value = frame;
    slider.setAttribute('aria-valuetext', el('lab-time').value);
  }
  function reset() {
    stop();
    const driven = Object.hasOwn(transmissions, menu.value);
    const handling = Object.hasOwn(sortQuestions, menu.value);
    const flight = fieldParts[menu.value] ? fieldInput : flightParts[menu.value] ? flightInput(menu.value) : null;
    el('lab-release-label').textContent = flight
      ? flight.name[0].toUpperCase() + flight.name.slice(1)
      : handling
        ? 'Load diameter'
        : driven
          ? 'Input speed'
          : 'Release';
    [...el('lab-offset').options].forEach((o, i) => {
      o.textContent = (
        flight
          ? flight.labels
          : handling
            ? ['14 units', '26 units', '42 units']
            : driven
              ? ['Slower', 'Nominal', 'Faster']
              : ['24 units left', 'Center', '24 units right']
      )[i];
    });
    data = experiment(M, menu.value, Number(el('lab-offset').value));
    const max = Math.max(data.powered.tape.length, data.reference.tape.length) - 1;
    frame = max;
    slider.max = max;
    el('lab-question').textContent = experiments[menu.value].question;

    const first = data.powered.run.uses.find((use) => use.kind === menu.value);
    modal.classList.toggle('parcel-experiment', data.delivery);
    const marks = modal.querySelectorAll('.lab-legend span');
    marks[0].textContent = data.unpowered ? 'Part fitted' : 'Powered';
    marks[1].textContent = data.unpowered ? 'Socket empty' : 'Power off';
    canvas.setAttribute(
      'aria-label',
      parts[menu.value].name +
        ' comparison. Solid line: ' +
        marks[0].textContent +
        '. Dashed line: ' +
        marks[1].textContent +
        '.',
    );
    el('lab-contact').textContent = first
      ? (first.action ? parts[menu.value].name + ' ' + first.action + ' at ' : 'First contact at ') +
        (first.tick / 60).toFixed(2) +
        ' s'
      : 'Outside the working area';
    paint();
  }
  function animate(now) {
    origin ??= now - (frame * 1000) / 60;
    frame = Math.min(Number(slider.max), Math.floor(((now - origin) * 60) / 1000));
    paint();
    if (frame >= Number(slider.max)) stop();
    else raf = requestAnimationFrame(animate);
  }
  for (const [kind, part] of Object.entries(parts)) menu.add(new Option(part.name, kind));
  menu.addEventListener('change', reset);
  el('lab-offset').addEventListener('change', reset);
  slider.addEventListener('input', () => {
    stop();
    frame = Number(slider.value);
    paint();
  });
  el('lab-play').addEventListener('click', () => {
    if (raf) {
      stop();
      return;
    }
    if (frame >= Number(slider.max)) frame = 0;
    el('lab-play').textContent = 'Pause comparison';
    raf = requestAnimationFrame(animate);
  });
  el('lab-predict').addEventListener('click', stop);
  el('lab-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    stop();
    onClose?.();
    opener?.focus({ preventScroll: true });
  });
  return {
    open(kind, button) {
      menu.value = Object.hasOwn(experiments, kind) ? kind : 'conveyor';
      el('lab-offset').value = '0';
      opener = button;
      onOpen?.();
      modal.showModal();
      reset();
      menu.focus();
    },
    close() {
      if (modal.open) modal.close();
    },
  };
}

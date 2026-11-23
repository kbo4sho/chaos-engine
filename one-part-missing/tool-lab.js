import { createRun, advance, HEIGHT, WIDTH } from './machines.js';
import { instruments, outlet } from './devices.js';
import { draw, atFrame, snapshot } from './drawing.js';

// A controlled experiment for each tool keeps the release identical in both runs.
// The reference belt/bed is an unpowered solid. Fields switch off completely.
const experiments = {
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
  const delivery = kind === 'switch' || kind === 'hatch';
  const machine = {
    fixtures: [
      { ...instruments[kind].shape, x: mount[0], y: mount[1] },
      ...(delivery
        ? [
            kind === 'switch'
              ? { ...instruments.hatch.shape, x: 460, y: 135 }
              : { ...instruments.switch.shape, x: 205, y: 151 },
            { kind: 'cargo', x: 471, y: 113, r: 11 },
          ]
        : []),
      ...(kind === 'portal' ? [{ ...outlet, x: 423, y: 100 }] : []),
    ],
    ball: { kind: 'marble', r: 12, x: release[0] + offset, y: release[1], vx: release[2] },
    goals: [
      {
        kind: 'chime',
        x: 2000,
        y: 2000,
        w: 22,
        h: 28,
        sensor: true,
        striker: delivery ? 'cargo' : 'marble',
      },
    ],
    sockets: [],
    tray: [],
  };
  const simulate = (disabled) => {
    const run = createRun(M, {
      ...machine,
      fixtures: machine.fixtures.map((s) => ({ ...s, disabled: disabled && s.kind === kind })),
    });
    const tracked = delivery ? run.items.find((i) => i.shape.kind === 'cargo').body : run.ball;
    const tape = [snapshot(run)],
      path = [[tracked.position.x, tracked.position.y, false]];
    let used = 0;
    while (run.state === 'running' && run.tick < 145) {
      advance(M, run);
      tape.push(snapshot(run));
      path.push([tracked.position.x, tracked.position.y, run.uses.length > used && kind === 'portal']);
      used = run.uses.length;
      const { x, y } = tracked.position;
      if (y > HEIGHT - 10 || x > WIDTH - 12 || x < 12 || y < -50) break;
    }
    return { run, tape, path };
  };
  return { powered: simulate(false), reference: simulate(true), delivery };
}

export function setupLab(M) {
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
    data = experiment(M, menu.value, Number(el('lab-offset').value));
    const max = Math.max(data.powered.tape.length, data.reference.tape.length) - 1;
    frame = max;
    slider.max = max;
    el('lab-question').textContent = experiments[menu.value].question;
    canvas.setAttribute(
      'aria-label',
      instruments[menu.value].name +
        ' experiment. The solid path shows the active tool. Dashed path shows the same release without power.',
    );
    const first = data.powered.run.uses.find((use) => use.kind === menu.value);
    modal.classList.toggle('parcel-experiment', data.delivery);
    el('lab-contact').textContent = first
      ? 'First contact at ' + (first.tick / 60).toFixed(2) + ' s'
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
  for (const [kind, part] of Object.entries(instruments)) menu.add(new Option(part.name, kind));
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
  el('lab-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    stop();
    opener?.focus({ preventScroll: true });
  });
  return {
    open(kind, button) {
      menu.value = Object.hasOwn(experiments, kind) ? kind : 'conveyor';
      el('lab-offset').value = '0';
      opener = button;
      modal.showModal();
      reset();
      menu.focus();
    },
    close() {
      if (modal.open) modal.close();
    },
  };
}

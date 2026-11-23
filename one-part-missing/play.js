import { chooseStart, rememberRoute, setupFinder } from './library.js';
import { orders, readOrderLink, fitCode, orderPrefix } from './work-orders.js';
import { setupOrders } from './order-desk.js';
import { receiverOpen } from './transmissions.js';
import { setupFilms } from './attempt-film.js';
import { setupFocus } from './focus.js';
import { styles as pressStyles, availableTools } from './tool-press.js';
import { lessons, lessonById, lessonLink, setupLearning } from './learning.js';
import {
  WIDTH,
  HEIGHT,
  STEP,
  canFlip,
  parts,
  fittings,
  packFittings,
  placePart,
  validMove,
  createRun,
  advance,
} from './machines.js';
import { instruments as deviceParts } from './devices.js';
import { campaign as machines, chapters, campaignById } from './campaign.js';
import { repairBook, repairPrefix } from './repairs.js';
import { portableFile } from './portable.js';
import { usePress } from './press-client.js';
import { makeEditor } from './maker.js';
import { decodePrint } from './workshop.js';
import { setupLab } from './tool-lab.js';
import { draw, partIcon, snapshot, atFrame } from './drawing.js';

const M = window.Matter;
const $ = (id) => document.getElementById(id);
const c = $('diagram').getContext('2d');
const films = setupFilms($),
  focusBench = setupFocus($);
const setEditorMachine = makeEditor(M);
let resumeAfterLab = false;
const lab = setupLab(M, {
  onOpen() {
    resumeAfterLab = playing() && !runPaused;
    if (resumeAfterLab) setPaused(true);
  },
  onClose() {
    if (resumeAfterLab && playing() && runPaused) setPaused(false);
    resumeAfterLab = false;
  },
});
const finder = setupFinder($);
const desk = setupOrders($, (fit) => {
  if (playing()) return;
  move = fit;
  selected = fit.part;
  flipped = false;
  resetRun(true);
  message('Record setup fitted. Run it or change a spare.');
});
const learning = setupLearning({ el: $, lab });
let learningActive = false;
$('open-lab').addEventListener('click', () => {
  const kind =
    selected && Object.hasOwn(parts, selected)
      ? selected
      : machine.tray.find((id) => Object.hasOwn(deviceParts, id)) || machine.tray[0];
  lab.open(kind, $('open-lab'));
});
const book = repairBook(() => localStorage);
function savedMove() {
  const saved = book.read()[machine.id];
  return validMove(machine, saved) ? packFittings(fittings(machine, saved)) : null;
}

let enclosedReplay = null,
  previewSocket = null;
let machine,
  run,
  move = null,
  selected = null,
  flipped = false,
  phase = 'ready',
  raf = 0,
  previous = 0,
  elapsed = 0,
  runPaused = false,
  speed = 1;
let tape = [],
  inspection = null;
let trail = [],
  ghost = [],
  replaying = false,
  sound = true,
  audio,
  routing = null,
  dragging = null;
const number = (n) => String(n).padStart(2, '0');
const socketName = (i) => String.fromCharCode(65 + i);
const playing = () => phase === 'running' || phase === 'finishing';

function message(text) {
  $('status').textContent = text;
}
function tone(hz, duration = 0.25, volume = 0.06, type = 'sine') {
  if (!sound || !audio || audio.state !== 'running') return;
  const t = audio.currentTime,
    osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration);
}
function startAudio() {
  if (!sound) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (Context) {
      audio ||= new Context();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    }
  } catch {}
}
function drawBench() {
  if (!run) return;
  $('delivery-board').hidden = !run.binTicks;
  if (run.binTicks) {
    const ticks = inspection === null ? run.binTicks : tape[inspection].binTicks;
    const holds =
      inspection === null ? run.goals.map((g) => g.body.render.binHold || 0) : tape[inspection].binHolds;
    for (const [i, g] of run.goals.entries()) {
      const out = $(g.shape.bin + '-bin'),
        arrived = ticks[i] != null;
      const label =
        (g.shape.bin === 'blue' ? '◇ Blue' : '○ Gold') +
        ' · ' +
        (arrived
          ? (ticks[i] / 60).toFixed(2) + ' s'
          : g.shape.hold
            ? 'Hold ' + holds[i] + '/' + g.shape.hold
            : 'In transit');
      if (out.textContent !== label) out.textContent = label;
      out.dataset.received = String(arrived);
    }
  }
  const gate = machine.goals.find((g) => g.window || g.turn || g.travel);
  const tick = inspection === null ? run.tick : tape[inspection].tick;
  $('receiver-clock').hidden = !gate;
  if (gate) {
    const w = gate.window,
      phase = w ? (((tick - w.start) % w.period) + w.period) % w.period : 0;
    const timing = w
      ? receiverOpen(gate, tick)
        ? 'Open · ' + ((w.duration - phase) / 60).toFixed(2) + ' s left'
        : 'Opens in ' + ((w.period - phase) / 60).toFixed(2) + ' s'
      : '';
    const direction = gate.turn
      ? gate.turn > 0
        ? 'Clockwise entry'
        : 'Counterclockwise entry'
      : gate.travel
        ? gate.travel > 0
          ? 'Enter moving right'
          : 'Enter moving left'
        : '';
    $('receiver-clock').textContent = [timing, direction].filter(Boolean).join(' · ');
  }
  const cargoIndex = run.cargo ? run.items.findIndex((item) => item.body === run.cargo) : -1;
  const cursor = inspection === null ? tape.length - 1 : inspection;
  const cargoTrail =
    cargoIndex === -1
      ? []
      : tape
          .slice(Math.max(0, cursor - 28), cursor + 1)
          .map((frame) => frame.poses[cargoIndex].slice(0, 2));
  if (inspection !== null) {
    const sample = tape[inspection],
      upto = Math.floor(sample.tick / 3);
    draw(c, atFrame(run, sample), { trail: trail.slice(Math.max(0, upto - 28), upto), cargoTrail });
  } else
    draw(c, run, {
      trail: trail.slice(-28),
      ghost,
      cargoTrail,
      mount: phase === 'ready' && previewSocket !== null ? machine.sockets[previewSocket] : null,
    });
}
function addFrame() {
  if (tape.at(-1)?.tick !== run.tick) tape.push(snapshot(run));
}
$('scrubber').addEventListener('input', () => {
  inspection = Number($('scrubber').value);
  const seconds = (tape[inspection].tick / 60).toFixed(2) + ' s';
  $('film-time').value = seconds;
  $('scrubber').setAttribute('aria-valuetext', seconds);
  $('counter').textContent = seconds;
  $('pilot').textContent = 'Inspecting';
  $('sockets').hidden = true;
  if (run.binTicks)
    $('signal').textContent = tape[inspection].binTicks.filter((t) => t != null).length + ' / 2 sorted';
  else if (run.cargo) {
    const tick = tape[inspection].tick;
    $('signal').textContent =
      run.hits.at(-1) <= tick
        ? 'Parcel delivered'
        : !run.gated
          ? 'Parcel in transit'
          : run.uses.some((u) => u.kind === 'hatch' && u.tick <= tick)
            ? 'Hatch open'
            : 'Hatch closed';
  }
  drawBench();
});
new ResizeObserver(() => {
  const rect = $('stage').getBoundingClientRect(),
    scale = Math.min(2, window.devicePixelRatio || 1, 2160 / Math.max(1, rect.width));
  if (rect.width) {
    $('diagram').width = Math.round(rect.width * scale);
    $('diagram').height = Math.round(rect.height * scale);
    drawBench();
  }
}).observe($('stage'));

let activeChapter = 0;
for (const [i, [title]] of chapters.entries()) {
  const option = document.createElement('option');
  option.value = i;
  option.textContent = number(i + 1) + ' · ' + title;
  $('chapter').append(option);
}
function updateShelf() {
  const all = book.read();
  finder.update(all);
  desk.updateMap(machine, all);
  learning.update(all, learningActive, machine);
  const unfinished = machines.filter((m) => !validMove(m, all[m.id]));
  $('progress').textContent =
    machines.length - unfinished.length + ' of ' + machines.length + ' repaired';
  const resume = $('continue');
  resume.hidden = !unfinished.length;
  if (unfinished.length) {
    resume.href = '#' + unfinished[0].id;
    resume.textContent = 'Continue at ' + number(machines.indexOf(unfinished[0]) + 1) + ' →';
  }
  const nextTool = unfinished.find((m) => m.toolCourse);
  $('tool-entry').href = '#' + (nextTool || machines.find((m) => m.toolCourse)).id;
  $('tool-entry').textContent =
    nextTool && nextTool !== machines.find((m) => m.toolCourse)
      ? 'Resume tool course →'
      : 'Play the tool course →';
  const clockStart = machines.find((m) => m.clockwork);
  const nextClock = unfinished.find((m) => m.clockwork);
  $('clock-entry').href = '#' + (nextClock || clockStart).id;
  $('clock-entry').textContent =
    nextClock && nextClock !== clockStart ? 'Resume clockwork course →' : 'Play the clockwork course →';
  const rigStart = machines.find((m) => m.rigging);
  const nextRig = unfinished.find((m) => m.rigging);
  $('rig-entry').href = '#' + (nextRig || rigStart).id;
  $('rig-entry').textContent =
    nextRig && nextRig !== rigStart ? 'Resume cable rigs →' : 'Play the cable rigs →';
  const pairStart = machines.find((m) => m.capacity === 2),
    nextPair = unfinished.find((m) => m.capacity === 2);
  $('pair-entry').href = '#' + (nextPair || pairStart).id;
  $('pair-entry').textContent =
    nextPair && nextPair !== pairStart ? 'Resume two-part repairs →' : 'Play two-part repairs →';
  const driveStart = machines.find((m) => m.transmission),
    nextDrive = unfinished.find((m) => m.transmission);
  $('drive-entry').href = '#' + (nextDrive || driveStart).id;
  $('drive-entry').textContent =
    nextDrive && nextDrive !== driveStart ? 'Resume the drive table →' : 'Play the drive table →';
  const firstSort = machines.find((m) => m.sorting),
    nextSort = unfinished.find((m) => m.sorting);
  $('sort-entry').href = '#' + (nextSort || firstSort).id;
  $('sort-entry').textContent =
    nextSort && nextSort !== firstSort ? 'Resume the sorting room →' : 'Play the sorting room →';
  $('chapter').value = activeChapter;
  $('chapter-hint').textContent = chapters[activeChapter][1];
  const links = machines.slice(activeChapter * 10, activeChapter * 10 + 10).map((m, i) => {
    const link = document.createElement('a');
    const done = validMove(m, all[m.id]);
    const seq = number(activeChapter * 10 + i + 1);
    link.className = 'shelf-item';
    link.href = '#' + m.id;
    if (m.id === machine.id) link.setAttribute('aria-current', 'page');
    link.setAttribute('aria-label', 'Level ' + seq + ', ' + m.title + (done ? ', repaired' : ''));
    const index = document.createElement('span'),
      title = document.createElement('strong'),
      check = document.createElement('span');
    index.className = 'shelf-num';
    index.textContent = seq;
    title.textContent = m.title;
    check.className = 'check';
    check.textContent = done ? '✓' : '';
    link.append(index, title, check);
    return link;
  });
  $('shelf').replaceChildren(...links);
}
$('chapter').addEventListener('change', () => {
  activeChapter = Number($('chapter').value);
  updateShelf();
});
$('map-link').addEventListener('click', (event) => {
  event.preventDefault();
  $('chapter').focus();
  $('library-title').scrollIntoView({ block: 'start' });
});
function focusCurrent(event) {
  if (event.target.closest('a')?.hash === location.hash) {
    event.preventDefault();
    $('machine-title').focus({ preventScroll: true });
    $('machine-title').scrollIntoView({ block: 'start' });
  }
}
$('shelf').addEventListener('click', focusCurrent);
$('continue').addEventListener('click', focusCurrent);

function controls() {
  $('sockets').hidden = inspection !== null;
  const busy = playing(),
    won = savedMove() || enclosedReplay;
  films.duringRun(busy);
  desk.controls(machine, move, busy);
  const placed = fittings(machine, move),
    paired = machine.capacity === 2;
  $('fitted-pair').hidden = !paired;
  if (paired) {
    $('pair-count').textContent = placed.length + ' of 2 parts fitted';
    // Preserve keyboard focus while the clock runs and after removing one part.
    const key = JSON.stringify([placed, busy]);
    if ($('pair-pieces').dataset.layout !== key) {
      $('pair-pieces').dataset.layout = key;
      $('pair-pieces').replaceChildren(
        ...placed.map((f) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiet';
          b.textContent = socketName(f.socket) + ' · ' + parts[f.part].name + ' ×';
          b.setAttribute(
            'aria-label',
            'Remove ' + parts[f.part].name + ' from socket ' + socketName(f.socket),
          );
          b.disabled = busy;
          b.addEventListener('click', () => {
            move = packFittings(fittings(machine, move).filter((p) => p.socket !== f.socket));
            selected = f.part;
            resetRun(true);
            message(parts[f.part].name + ' returned to the drawer.');
            $('parts')
              .querySelector('[data-part="' + f.part + '"]')
              .focus({ preventScroll: true });
          });
          return b;
        }),
      );
    }
  }
  $('flip').hidden = !machine.reversible;
  $('flip').disabled = busy || !canFlip(machine, selected);
  $('flip').setAttribute('aria-pressed', String(flipped));
  $('flip').textContent = flipped ? 'Flip rail · reversed' : 'Flip rail';
  $('frame-step').hidden = !(busy && runPaused);
  $('run').firstElementChild.textContent = busy && !runPaused ? 'Ⅱ' : '▶';
  $('run-label').textContent = busy
    ? runPaused
      ? 'Resume'
      : 'Pause'
    : phase === 'won'
      ? 'Run again'
      : move
        ? 'Test repair'
        : phase === 'miss'
          ? 'Run again'
          : 'Run machine';
  $('reset').disabled = phase === 'ready' && !move && !selected && !ghost.length;
  $('after-win').hidden = !won || busy;
  $('next').textContent =
    machines.indexOf(machine) === machines.length - 1 || !machines.includes(machine)
      ? 'Machine press ↓'
      : 'Next machine →';
  if (machine.contract)
    $('next').textContent = machine.orderIndex + 1 < orders.length ? 'Next order →' : 'Work orders ↓';
  if (learningActive)
    $('next').textContent =
      lessonById.get(machine.id) === lessons.length - 1 ? 'Lesson map ↓' : 'Next lesson →';
  $('pilot').textContent = {
    ready: 'Ready',
    running: replaying ? 'Replay' : 'Running',
    finishing: 'Contact',
    won: 'Repaired',
    miss: 'Missed',
  }[phase];
  if (busy && runPaused) $('pilot').textContent = 'Paused';
  $('pilot').dataset.state = busy && runPaused ? 'paused' : phase;
  $('signal').textContent =
    machine.goals.length > 1
      ? run.hits.length +
        ' / ' +
        machine.goals.length +
        (machine.goals.every((g) => g.kind === 'chime') ? ' notes' : ' contacts')
      : '';
  if (run.binTicks) $('signal').textContent = run.hits.length + ' / 2 sorted';
  else if (run.cargo)
    $('signal').textContent =
      phase === 'won'
        ? 'Parcel delivered'
        : !run.gated
          ? phase === 'ready'
            ? 'Parcel ready'
            : 'Parcel in transit'
          : run.uses.some((u) => u.kind === 'hatch')
            ? 'Hatch open'
            : 'Hatch closed';
  for (const b of $('parts').children) {
    b.disabled = busy;
    b.setAttribute('aria-pressed', String(selected === b.dataset.part));
    b.classList.toggle('installed', paired && placed.some((f) => f.part === b.dataset.part));
    const reversed = selected === b.dataset.part && flipped;
    const part = parts[b.dataset.part];
    const mirrored = machine.sockets.every((mount) => mount.mirror);
    const reversedRail = Boolean(reversed) !== mirrored;
    const hint =
      b.dataset.part === 'chute'
        ? reversedRail
          ? 'Roll to the right'
          : 'Roll to the left'
        : part.description;
    b.classList.toggle('reversed', ['chute', 'bridge'].includes(b.dataset.part) && reversedRail);
    b.querySelector('small').textContent = hint;
    b.setAttribute('aria-label', part.name + (reversed ? ', reversed' : '') + ' — ' + hint);
  }
  for (const [i, b] of [...$('sockets').children].entries()) {
    b.disabled = busy;
    b.classList.toggle(
      'fitted',
      placed.some((f) => f.socket === i),
    );
    const dir = machine.sockets[i].dir || 1;
    const mark =
      selected === 'conveyor'
        ? dir === 1
          ? '→'
          : '←'
        : selected === 'deflector'
          ? dir === 1
            ? '↶'
            : '↷'
          : '';
    b.querySelector('span').dataset.direction = mark;
    b.setAttribute(
      'aria-description',
      mark
        ? selected === 'conveyor'
          ? 'Belt runs ' + (dir === 1 ? 'right' : 'left')
          : 'Turns ' + (dir === 1 ? 'counterclockwise' : 'clockwise')
        : '',
    );
    b.setAttribute('aria-pressed', String(placed.some((f) => f.socket === i)));
  }
  const hash = new URLSearchParams({ machine: machine.id });
  if (move) {
    hash.set('part', move.part);
    hash.set('socket', String(move.socket));
    if (move.flipped) hash.set('flip', '1');
    if (move.second) {
      hash.set('part2', move.second.part);
      hash.set('socket2', String(move.second.socket));
      if (move.second.flipped) hash.set('flip2', '1');
    }
  }
  $('open-sandbox').href = '../#' + hash;
}
function resetRun(keepGhost = false) {
  cancelAnimationFrame(raf);
  phase = 'ready';
  runPaused = false;
  previous = 0;
  elapsed = 0;
  trail = [];
  if (!keepGhost) ghost = [];
  replaying = false;
  tape = [];
  inspection = null;
  $('cues').hidden = true;
  $('cues').replaceChildren();
  $('film').hidden = true;
  run = createRun(M, machine, move);
  addFrame();
  $('counter').textContent = '0.00 s';
  controls();
  drawBench();
}
function selectPart(id) {
  if (playing()) return;
  if (selected !== id) flipped = false;
  selected = id;
  if (phase !== 'ready') resetRun(true);
  controls();
  message(parts[id].name + ' selected. Tap a socket.');
}
function fit(i) {
  if (playing()) return;
  if (!selected) {
    message('Pick a part from the drawer, then tap socket ' + socketName(i) + '.');
    return;
  }
  const next = placePart(machine, move, {
    part: selected,
    socket: i,
    ...(flipped ? { flipped: true } : {}),
  });
  if (next === move) {
    message('Both spares are fitted. Remove one or tap an occupied socket to replace it.');
    return;
  }
  move = next;
  resetRun(true);
  tone(250, 0.1, 0.03, 'triangle');
  message(
    parts[selected].name +
      ' fitted to ' +
      socketName(i) +
      (flipped ? ', reversed.' : '.') +
      (machine.capacity === 2 && !move.second
        ? ' Fit another part or test this handoff.'
        : ' Test your repair.'),
  );
}
$('flip').addEventListener('click', () => {
  if (playing() || !canFlip(machine, selected)) return;
  flipped = !flipped;
  const installed = fittings(machine, move).find((f) => f.part === selected);
  if (installed) fit(installed.socket);
  else {
    controls();
    message(
      parts[selected].name + (flipped ? ' reversed.' : ' in its original direction.') + ' Tap a socket.',
    );
  }
});
function buildDrawer() {
  $('parts').replaceChildren();
  previewSocket = null;
  $('sockets').replaceChildren();
  for (const id of machine.tray) {
    const b = document.createElement('button');
    b.className = 'part';
    b.dataset.part = id;
    b.type = 'button';
    b.innerHTML =
      partIcon(id) +
      '<span><strong>' +
      parts[id].name +
      '</strong><small>' +
      parts[id].description +
      '</small></span>';
    b.addEventListener('click', () => {
      if (!suppressClick) selectPart(id);
    });
    b.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || playing()) return;
      dragging = { id, b, x: event.clientX, y: event.clientY, active: false, pointer: event.pointerId };
    });
    $('parts').append(b);
  }
  machine.sockets.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'socket';
    // Leave the target and its sequence number visible when a mount is adjacent.
    b.classList.toggle(
      'beside-target',
      machine.goals.some((g) => Math.hypot(g.x - s.x, g.y - s.y) < 42),
    );
    b.type = 'button';
    b.dataset.socket = i;
    b.style.left = (s.x / WIDTH) * 100 + '%';
    b.style.top = (s.y / HEIGHT) * 100 + '%';
    b.setAttribute(
      'aria-label',
      'Socket ' +
        socketName(i) +
        ', ' +
        (s.x < WIDTH / 2 ? 'left' : 'right') +
        ' side, ' +
        (s.y < HEIGHT / 2 ? 'upper' : 'lower') +
        ' bench',
    );
    b.innerHTML = '<span>' + socketName(i) + '</span>';
    if (s.from) {
      const names = {
        runner: 'gold marble',
        parcel: 'blue parcel',
        drive: 'gold input shaft',
        relay: 'intermediate shaft',
        frame: 'fixed frame',
      };
      const name = (node) => names[node] || 'fixed peg ' + (Number(node.slice(3)) + 1);
      const span = Math.round((s.rest || 1) * 100);
      const endpoints =
        name(s.from) +
        ' to ' +
        name(s.to) +
        (machine.transmission
          ? ', drive ' + (s.dir === -1 ? 'counterclockwise' : 'clockwise') + ', gear ratio ' + s.ratio
          : ', ' + span + '% starting span');
      b.title = endpoints;
      b.setAttribute('aria-label', b.getAttribute('aria-label') + ', ' + endpoints);
      const preview = () => {
        previewSocket = i;
        drawBench();
      };
      const clear = () => {
        if (previewSocket === i) {
          previewSocket = null;
          drawBench();
        }
      };
      b.addEventListener('focus', preview);
      b.addEventListener('pointerenter', preview);
      b.addEventListener('blur', clear);
      b.addEventListener('pointerleave', clear);
    }
    b.addEventListener('click', () => fit(i));
    $('sockets').append(b);
  });
}
let suppressClick = false;
const dragGhost = document.createElement('div');
dragGhost.className = 'drag-ghost';
dragGhost.hidden = true;
dragGhost.setAttribute('aria-hidden', 'true');
document.body.append(dragGhost);
function endDrag() {
  dragging = null;
  dragGhost.hidden = true;
}
window.addEventListener('pointermove', (event) => {
  if (!dragging || event.pointerId !== dragging.pointer) return;
  if (!dragging.active && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 8) return;
  if (!dragging.active) {
    dragging.active = true;
    dragging.b.setPointerCapture(event.pointerId);
    selectPart(dragging.id);
    dragGhost.innerHTML = partIcon(dragging.id);
    dragGhost.hidden = false;
  }
  dragGhost.style.left = event.clientX + 'px';
  dragGhost.style.top = event.clientY + 'px';
});
window.addEventListener('pointerup', (event) => {
  if (!dragging || event.pointerId !== dragging.pointer) return;
  if (dragging.active) {
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.socket');
    if (target) fit(Number(target.dataset.socket));
    else message('Drop the part on a marked socket, or tap one.');
  }
  endDrag();
});
window.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', endDrag);

let finishTick = 0;
function bookComplete() {
  if (!campaignById.has(machine.id)) return false;
  const all = book.read();
  return machines.every((m) => validMove(m, all[m.id]));
}
function finish() {
  const win = run.state === 'won';
  phase = win ? 'won' : 'miss';
  runPaused = false;
  ghost = trail.slice();
  addFrame();
  films.add(machine, run, move, tape);
  $('scrubber').max = tape.length - 1;
  $('scrubber').value = tape.length - 1;
  const seconds = (run.tick / 60).toFixed(2) + ' s';
  $('film-time').value = seconds;
  $('scrubber').setAttribute('aria-valuetext', seconds);
  $('film').hidden = false;
  const seen = new Set(),
    contacts = [];
  for (const use of run.uses) {
    const key = use.item + '/' + use.actor + '/' + (use.action || '');
    if (seen.has(key)) continue;
    seen.add(key);
    const shape = run.items[use.item].shape;
    const duplicateDrive =
      shape.drive && run.items.some((it, i) => i !== use.item && it.shape.kind === shape.kind);
    const source = duplicateDrive ? (shape.from === 'drive' ? 'Input · ' : 'Relay · ') : '';
    const label =
      (use.actor === 'cargo' ? 'Parcel · ' : source) +
      parts[use.kind].name +
      (use.action ? ' ' + use.action : '');
    contacts.push({ tick: use.tick, label });
  }
  for (const pass of run.passes) {
    if (seen.has(pass.reason)) continue;
    seen.add(pass.reason);
    contacts.push({ tick: pass.tick, label: pass.reason });
  }
  if (run.binTicks)
    for (const [i, t] of run.binTicks.entries())
      if (t != null) contacts.push({ tick: t, label: i ? 'Blue received' : 'Gold received' });
  const cues = contacts
    .sort((a, b) => a.tick - b.tick)
    .map(({ tick, label }) => {
      const cue = document.createElement('button');
      const text = label + ' · ' + (tick / 60).toFixed(2) + ' s';
      cue.textContent = text;
      cue.setAttribute('aria-label', 'Inspect ' + text);
      cue.addEventListener('click', () => {
        $('scrubber').value = tape.findIndex((f) => f.tick >= tick);
        $('scrubber').dispatchEvent(new Event('input'));
      });
      return cue;
    });
  $('cues').replaceChildren(...cues);
  $('cues').hidden = !cues.length;
  controls();
  updateShelf();
  drawBench();
  message(
    win
      ? machine.success +
          (replaying
            ? ' Replay complete.'
            : bookComplete()
              ? ' All ' + machines.length + ' machines repaired.'
              : ' Repair recorded.')
      : move
        ? 'That repair missed. Try another part or socket.'
        : 'The machine missed. Pick a part, then tap a socket.',
  );
  if (!win && machine.lesson && move) {
    const part = run.items.findIndex((item) => item.shape.fitted);
    const reached = run.uses.some((u) => u.item === part);
    if (parts[move.part].shape.drive)
      message(
        reached
          ? 'The transmission engaged. Follow the output and its entry direction.'
          : 'The fitting stayed idle. Trace the input shaft and the load.',
      );
    if (parts[move.part].shape.wire)
      message(
        reached
          ? parts[move.part].name + ' took a load. Inspect its first pull and the path to the receiver.'
          : 'This fitting never took a load. Try the other pair of endpoints.',
      );
    if (parts[move.part].shape.kind in deviceParts)
      message(
        reached
          ? parts[move.part].name + ' activated. Inspect its exit path before moving the fitting.'
          : 'The marble missed the working area of your ' +
              parts[move.part].name.toLowerCase() +
              '. Check where the marble travels.',
      );
  }
  if (!win && run.gated && run.cargo)
    message(
      run.uses.some((u) => u.kind === 'hatch')
        ? 'The hatch opened. Inspect the blue parcel’s path to the receiver.'
        : 'The parcel is waiting. Trace the gold marble to the trip switch.',
    );
  if (!win && run.binTicks && run.hits.length) {
    const missing = run.binTicks[0] == null ? 'gold marble' : 'blue parcel';
    message('One load arrived. Follow the ' + missing + ' to its receiver.');
  }
  if (!win && run.passes.length) {
    const pass = run.passes.at(-1);
    message(
      pass.reason === 'Receiver closed'
        ? 'The parcel arrived while the receiver was closed. Inspect that pass and change its timing.'
        : 'The parcel reached the receiver from the other direction. Inspect that pass before reversing the drive.',
    );
  }
  if (!win && machine.capacity === 2 && !machine.contract) {
    const installed = fittings(machine, move);
    const used = run.items
      .filter((item, i) => item.shape.fitted && run.uses.some((u) => u.item === i))
      .map((it) => parts[it.shape.kind]?.name || it.shape.kind);
    message(
      !installed.length
        ? 'Both fittings are missing. Follow the empty run to the first gap.'
        : installed.length === 1
          ? used.length
            ? used[0] + ' worked. Inspect its exit, then fit the second part.'
            : 'One part is fitted. Inspect the first gap before placing the second.'
          : used.length === 2
            ? 'Both fittings acted. Inspect where the last one sends the load.'
            : used.length === 1
              ? used[0] + ' acted. Inspect its exit toward the idle fitting.'
              : 'Neither fitting took a load. Trace the first gap.',
    );
  }
  if (!win) tone(128, 0.14, 0.025, 'triangle');
}
function tickMachine() {
  if (phase === 'finishing') {
    // Continue the actual mechanism while the bell swings or the flag rises.
    M.Engine.update(run.engine, STEP);
    run.tick++;
    addFrame();
    if (run.tick >= finishTick) finish();
    return;
  }
  const before = run.hits.length,
    uses = run.uses.length;
  advance(M, run);
  addFrame();
  if (run.uses.length > uses && run.gated && run.cargo) controls();
  if (run.tick % 3 === 0) {
    const jumped = run.uses.some((u) => u.kind === 'portal' && u.tick > run.tick - 3);
    trail.push([run.ball.position.x, run.ball.position.y, jumped]);
  }
  if (run.hits.length !== before) {
    tone([523.25, 659.25, 783.99, 1046.5][Math.min(before, 3)], 0.55, 0.1);
    controls();
  }
  if (run.state === 'won') {
    if (!replaying && validMove(machine, move)) {
      book.save(machine.id, move, run.tick);
      if (machine.contract) desk.save(machine, move, run.tick);
    }
    phase = 'finishing';
    finishTick = run.tick + 30;
    controls();
  } else if (run.state === 'miss') finish();
}
function frame(now) {
  if (!playing() || runPaused) return;
  if (previous) elapsed += Math.min(now - previous, 100) * speed;
  previous = now;
  while (elapsed >= STEP && playing()) {
    elapsed -= STEP;
    tickMachine();
  }
  $('counter').textContent = (run.tick / 60).toFixed(2) + ' s';
  drawBench();
  if (playing()) raf = requestAnimationFrame(frame);
}
function launch(replay = false) {
  if (playing()) return;
  if (replay) {
    const last = enclosedReplay || savedMove();
    if (!last) return;
    move = last;
    selected = last.part;
    flipped = Boolean(last.flipped);
  }
  startAudio();
  resetRun();
  replaying = replay;
  phase = 'running';
  controls();
  message(
    replay
      ? 'Replaying the recorded repair.'
      : move
        ? move.second
          ? 'Testing both fitted parts.'
          : 'Testing the fitted ' + parts[move.part].name.toLowerCase() + '.'
        : 'Watch where the marble goes.',
  );
  raf = requestAnimationFrame(frame);
}
function setPaused(paused) {
  runPaused = paused;
  cancelAnimationFrame(raf);
  previous = 0;
  elapsed = 0;
  controls();
  if (!runPaused) raf = requestAnimationFrame(frame);
}
$('run').addEventListener('click', () => {
  if (playing()) setPaused(!runPaused);
  else launch();
});
$('frame-step').addEventListener('click', () => {
  if (!runPaused || !playing()) return;
  tickMachine();
  $('counter').textContent = (run.tick / 60).toFixed(2) + ' s';
  drawBench();
});
$('playback-rate').addEventListener('change', () => {
  speed = Number($('playback-rate').value);
  previous = 0;
  elapsed = 0;
});
$('replay').addEventListener('click', () => launch(true));
$('reset').addEventListener('click', () => {
  move = null;
  selected = null;
  flipped = false;
  resetRun();
  message('Machine reset. Watch a run, or fit a part.');
});
$('sound').addEventListener('click', () => {
  sound = !sound;
  $('sound').textContent = 'Sound ' + (sound ? 'on' : 'off');
  $('sound').setAttribute('aria-pressed', String(sound));
  if (sound) {
    startAudio();
    tone(440, 0.12, 0.04);
  } else audio?.suspend().catch(() => {});
});
$('next').addEventListener('click', () => {
  focusBench.close();
  if (learningActive) {
    const next = lessons[lessonById.get(machine.id) + 1];
    if (next) location.hash = lessonLink(next.machine.id);
    else learning.showMap();
    return;
  }
  if (machine.contract) {
    const next = orders[machine.orderIndex + 1];
    if (next) location.hash = next.id;
    else desk.showMap();
    return;
  }
  const i = machines.indexOf(machine);
  if (i < 0 || i === machines.length - 1) {
    $('generate').focus();
    return;
  }
  location.hash = machines[i + 1].id;
});
$('share').addEventListener('click', () => copyLink(false));
$('share-setup').addEventListener('click', () => copyLink(true));
async function copyLink(includeFit) {
  const sharedMachine = machine;
  const url = new URL(location.href);
  url.hash = learningActive ? lessonLink(machine.id) : machine.id;
  if (includeFit) {
    const code = fitCode(machine, move);
    if (!code) return;
    url.hash = machine.id + '/build/' + code;
  }
  try {
    await navigator.clipboard.writeText(url.href);
    if (machine === sharedMachine)
      message(
        includeFit
          ? 'Setup link copied. It opens with your spares fitted.'
          : 'Puzzle link copied. It opens the starting machine.',
      );
  } catch {
    if (machine !== sharedMachine) return;
    $('copy-fallback').hidden = false;
    $('share-url').value = url.href;
    $('share-url').focus();
    $('share-url').select();
  }
}
async function downloadMachine(button, replay) {
  const current = machine,
    label = button.textContent;
  button.disabled = true;
  button.textContent = 'Packing…';
  try {
    const file = await portableFile(current, replay);
    const url = URL.createObjectURL(file),
      link = document.createElement('a');
    link.href = url;
    link.download = 'one-part-missing-' + current.id + (replay ? '-replay' : '') + '.html';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (machine === current)
      message(
        replay
          ? 'Replay file ready. Open it and choose Watch replay.'
          : 'Playable copy ready. Send the HTML file to share this machine.',
      );
  } catch {
    if (machine === current) message('The file could not be packed. Reconnect and try again.');
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}
$('download').addEventListener('click', (event) => downloadMachine(event.currentTarget, null));
$('save-replay').addEventListener('click', (event) => {
  const replay = desk.isRecord(machine, move) ? move : savedMove();
  if (replay) downloadMachine(event.currentTarget, replay);
});
function navigate(resolved, id, announce = false, sharedFit = null) {
  lab.close();
  films.clear();
  focusBench.close();
  machine = resolved || machines[0];
  enclosedReplay = null;
  if (document.body.dataset.portable === machine.id && document.body.dataset.repair) {
    try {
      const data = JSON.parse(document.body.dataset.repair);
      if (validMove(machine, data)) enclosedReplay = data;
    } catch {}
  }
  setEditorMachine(machine);
  desk.navigate(machine);
  if (resolved && !document.body.dataset.portable) rememberRoute(machine, learningActive);
  move = sharedFit;
  selected = sharedFit?.part || null;
  flipped = false;
  endDrag();
  $('copy-fallback').hidden = true;
  let lastPrint;
  try {
    lastPrint = localStorage.getItem('chaos.one-part-missing.last-print.v1');
  } catch {}
  if (!machines.includes(machine) && !machine.contract) {
    lastPrint = machine.id;
    try {
      localStorage.setItem('chaos.one-part-missing.last-print.v1', lastPrint);
    } catch {}
  }
  const validLast = Boolean(decodePrint(lastPrint || ''));
  $('last-print').hidden = !validLast || lastPrint === machine.id;
  if (validLast) $('last-print').href = '#' + lastPrint;
  $('proof').hidden = !machine.verifiedRepairs;
  $('proof').open = false;
  if (machine.verifiedRepairs)
    $('proof-text').textContent =
      'The empty machine missed at all three release points. ' +
      machine.verifiedRepairs +
      (machine.verifiedRepairs === 1 ? ' fitting worked' : ' fittings worked') +
      ' at all three. Every available fitting was tested.';
  if (machine.pressPlate) $('proof-text').textContent += ' Press plate: ' + machine.pressPlate + '.';
  const index = machines.indexOf(machine),
    seq = index < 0 ? 'W' : number(index + 1);
  if (index >= 0) activeChapter = Math.floor(index / 10);
  $('machine-no').textContent =
    index < 0
      ? 'Machine press · verified'
      : 'Level ' + seq + ' / ' + machines.length + ' · ' + chapters[activeChapter][0];
  if (machine.contract)
    $('machine-no').textContent = 'Work order ' + number(machine.orderIndex + 1) + ' / ' + orders.length;
  if (learningActive) {
    const n = lessonById.get(machine.id);
    $('machine-no').textContent =
      'Lesson ' + number(n + 1) + ' / ' + lessons.length + ' · ' + lessons[n].chapter;
  }
  $('machine-title').tabIndex = -1;
  $('machine-title').textContent = machine.title;
  $('goal').textContent = machine.goal;
  $('fit-instruction').textContent = machine.contract
    ? 'Fit one spare for economy or try two for speed.'
    : machine.capacity === 2
      ? 'Choose two different parts. Fit each to its own socket.'
      : 'Choose a part, then tap a socket.';
  $('open-lab').hidden = false;
  $('lesson').hidden = !machine.lesson;
  $('lesson').open = Boolean(
    machine.lesson &&
    index >= 0 &&
    index % 10 < 2 &&
    (index < 140 ||
      machine.clockwork ||
      machine.rigging ||
      machine.capacity === 2 ||
      machine.transmission ||
      machine.sorting),
  );
  $('lesson-text').textContent = machine.lesson || '';
  document.title = machine.title + ' · One Part Missing';
  $('diagram').setAttribute(
    'aria-label',
    machine.goal +
      ' ' +
      (machine.description ||
        'A launch rail feeds two mounting sockets and a target. Select a part, choose a socket, then test the repair.'),
  );
  buildDrawer();
  resetRun();
  updateShelf();
  message(
    !resolved && id
      ? 'Unknown puzzle. The first machine is ready.'
      : sharedFit
        ? 'Shared setup fitted. Run it to measure the delivery.'
        : enclosedReplay
          ? 'A repair came with this file. Watch the replay or try your own.'
          : savedMove()
            ? 'You repaired this machine. Play your replay or try another part.'
            : 'Watch a run, or pick a part to fit.',
  );
  if (announce) {
    document.querySelector('.bench').inert = false;
    $('machine-title').tabIndex = -1;
    $('machine-title').focus({ preventScroll: true });
    $('machine-title').scrollIntoView({ block: 'nearest' });
  }
}
for (const [id, label] of Object.entries({ ...pressStyles, classic: 'Original track press' }))
  $('press-style').add(new Option(label, id));
function updatePressSettings() {
  const style = $('press-style').value,
    old = $('press-focus').value;
  const available = availableTools(style);
  $('press-focus-label').hidden = style === 'classic';
  $('press-focus').replaceChildren(
    new Option('Any tool', 'any'),
    ...available.map((k) => new Option(parts[k].name, k)),
  );
  if (available.includes(old)) $('press-focus').value = old;
  updatePartners();
}
function updatePartners() {
  const style = $('press-style').value,
    first = $('press-focus').value,
    old = $('press-partner').value;
  const partners = first !== 'any' && style !== 'direct' ? availableTools(style, first) : [];
  $('press-partner-label').hidden = !partners.length;
  $('press-partner').replaceChildren(
    new Option('Any partner', 'any'),
    ...partners.map((k) => new Option(parts[k].name, k)),
  );
  if (partners.includes(old)) $('press-partner').value = old;
}
updatePressSettings();
$('press-focus').addEventListener('change', updatePartners);
$('press-style').addEventListener('change', updatePressSettings);
let pressController = null,
  freshPrint = null;
function pressBusy(busy) {
  $('generate').disabled = busy;
  $('print-practice').disabled = busy;
  $('generate').textContent = busy ? 'Testing repairs…' : 'Generate a machine ↗';
}
async function printMachine(style, focus, partner = 'any') {
  pressController?.abort();
  const controller = new AbortController();
  pressController = controller;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  if (style === 'classic') {
    pressController = null;
    location.hash = 'press-1-' + seed;
    return;
  }
  pressBusy(true);
  $('press-feedback').textContent = 'Checking the empty machine and every fitting…';
  try {
    const result = await usePress(M, { press: { style, focus, partner, seed } }, controller.signal);
    if (controller.signal.aborted) return;
    if (!result) {
      $('press-feedback').textContent = 'This setup missed its trials. Generate another machine.';
      return;
    }
    freshPrint = result;
    $('press-feedback').textContent = '';
    location.hash = result.id;
  } catch {
    if (!controller.signal.aborted)
      $('press-feedback').textContent = 'The press could not finish this run. Try again.';
  } finally {
    if (pressController === controller) {
      pressController = null;
      pressBusy(false);
    }
  }
}
$('generate').addEventListener('click', () =>
  printMachine($('press-style').value, $('press-focus').value, $('press-partner').value),
);
$('print-practice').addEventListener('click', () => {
  $('press-style').value = 'any';
  updatePressSettings();
  $('press-focus').value = $('practice-tool').value;
  updatePartners();
  $('press-partner').value = 'any';
  $('workshop-title').scrollIntoView({ block: 'start' });
  printMachine('any', $('practice-tool').value);
});
async function route(announce) {
  pressController?.abort();
  $('press-feedback').textContent = '';
  routing?.abort();
  const controller = new AbortController();
  routing = controller;
  const explicit = document.body.dataset.portable || location.hash.slice(1);
  const requested = explicit || chooseStart(book.read());
  if (!explicit) history.replaceState(null, '', '#' + requested);
  const guidedId = requested.startsWith('learn/') ? requested.slice(6) : null;
  learningActive = lessonById.has(guidedId);
  const id = learningActive ? guidedId : requested;
  const bench = document.querySelector('.bench');
  try {
    const order = readOrderLink(id);
    let resolved = order?.machine || (freshPrint?.id === id ? freshPrint : campaignById.get(id));
    freshPrint = null;
    if (!resolved && decodePrint(id)) {
      bench.inert = true;
      bench.setAttribute('aria-busy', 'true');
      pressBusy(true);
      resolved = await usePress(M, { id }, controller.signal);
    }
    if (!controller.signal.aborted) navigate(resolved, id, announce, order?.move);
  } catch {
    if (!controller.signal.aborted) {
      navigate(null, id, announce);
      message('This workshop number could not be loaded. Generate another machine.');
    }
  } finally {
    if (!controller.signal.aborted) {
      bench.inert = false;
      bench.removeAttribute('aria-busy');
      pressBusy(false);
    }
  }
}
window.addEventListener('storage', (event) => {
  if (
    machine &&
    (event.key?.startsWith(repairPrefix) || event.key?.startsWith(orderPrefix) || event.key === null)
  ) {
    desk.refresh(machine);
    updateShelf();
    controls();
  }
});
window.addEventListener('hashchange', () => route(true));
document.addEventListener('visibilitychange', () => {
  previous = 0;
  elapsed = 0;
});
route(false);

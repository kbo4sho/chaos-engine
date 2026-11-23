import { WIDTH, HEIGHT, STEP, canFlip, parts, validMove, createRun, advance } from './machines.js';
import { campaign as machines, chapters, campaignById } from './campaign.js';
import { repairBook, repairPrefix } from './repairs.js';
import { portableFile } from './portable.js';
import { usePress } from './press-client.js';
import { makeEditor } from './maker.js';
import { decodePrint } from './workshop.js';
import { draw, partIcon, snapshot, atFrame } from './drawing.js';

const M = window.Matter;
const $ = (id) => document.getElementById(id);
const c = $('diagram').getContext('2d');
const setEditorMachine = makeEditor(M);
const book = repairBook(() => localStorage);
function savedMove() {
  const saved = book.read()[machine.id];
  return validMove(machine, saved)
    ? { part: saved.part, socket: saved.socket, ...(saved.flipped ? { flipped: true } : {}) }
    : null;
}

let enclosedReplay = null;
let machine,
  run,
  move = null,
  selected = null,
  flipped = false,
  phase = 'ready',
  raf = 0,
  previous = 0,
  elapsed = 0;
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
  if (inspection !== null) {
    const sample = tape[inspection],
      upto = Math.floor(sample.tick / 3);
    draw(c, atFrame(run, sample), { trail: trail.slice(Math.max(0, upto - 28), upto) });
  } else draw(c, run, { trail: trail.slice(-28), ghost });
}
function addFrame() {
  if (tape.at(-1)?.tick !== run.tick) tape.push(snapshot(run));
}
$('scrubber').addEventListener('input', () => {
  inspection = Number($('scrubber').value);
  const seconds = (tape[inspection].tick / 60).toFixed(2) + ' s';
  $('film-time').value = seconds;
  $('scrubber').setAttribute('aria-valuetext', seconds);
  drawBench();
});
new ResizeObserver(() => {
  const rect = $('stage').getBoundingClientRect(),
    scale = Math.min(2, window.devicePixelRatio || 1);
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
  const unfinished = machines.filter((m) => !validMove(m, all[m.id]));
  $('progress').textContent =
    machines.length - unfinished.length + ' of ' + machines.length + ' repaired';
  const resume = $('continue');
  resume.hidden = !unfinished.length;
  if (unfinished.length) {
    resume.href = '#' + unfinished[0].id;
    resume.textContent = 'Continue at ' + number(machines.indexOf(unfinished[0]) + 1) + ' →';
  }
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
  const busy = playing(),
    won = savedMove() || enclosedReplay;
  $('flip').hidden = !machine.reversible;
  $('flip').disabled = busy || !canFlip(machine, selected);
  $('flip').setAttribute('aria-pressed', String(flipped));
  $('flip').textContent = flipped ? 'Flip rail · reversed' : 'Flip rail';
  $('run').disabled = busy;
  $('run-label').textContent = busy
    ? 'Running…'
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
  $('pilot').textContent = {
    ready: 'Ready',
    running: replaying ? 'Replay' : 'Running',
    finishing: 'Contact',
    won: 'Repaired',
    miss: 'Missed',
  }[phase];
  $('pilot').dataset.state = phase;
  $('signal').textContent =
    machine.goals.length > 1
      ? run.hits.length +
        ' / ' +
        machine.goals.length +
        (machine.goals.every((g) => g.kind === 'chime') ? ' notes' : ' contacts')
      : '';
  for (const b of $('parts').children) {
    b.disabled = busy;
    b.setAttribute('aria-pressed', String(selected === b.dataset.part));
    const reversed = selected === b.dataset.part && flipped;
    const part = parts[b.dataset.part];
    const hint = b.dataset.part === 'chute' && reversed ? 'Roll to the right' : part.description;
    b.classList.toggle('reversed', reversed);
    b.querySelector('small').textContent = hint;
    b.setAttribute('aria-label', part.name + (reversed ? ', reversed' : '') + ' — ' + hint);
  }
  for (const [i, b] of [...$('sockets').children].entries()) {
    b.disabled = busy;
    b.classList.toggle('fitted', move?.socket === i);
    b.setAttribute('aria-pressed', String(move?.socket === i));
  }
  const hash = new URLSearchParams({ machine: machine.id });
  if (move) {
    hash.set('part', move.part);
    hash.set('socket', String(move.socket));
    if (move.flipped) hash.set('flip', '1');
  }
  $('open-sandbox').href = 'index.html#' + hash;
}
function resetRun(keepGhost = false) {
  cancelAnimationFrame(raf);
  phase = 'ready';
  previous = 0;
  elapsed = 0;
  trail = [];
  if (!keepGhost) ghost = [];
  replaying = false;
  tape = [];
  inspection = null;
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
  move = { part: selected, socket: i, ...(flipped ? { flipped: true } : {}) };
  resetRun(true);
  tone(250, 0.1, 0.03, 'triangle');
  message(
    parts[selected].name +
      ' fitted to ' +
      socketName(i) +
      (flipped ? ', reversed.' : '.') +
      ' Test your repair.',
  );
}
$('flip').addEventListener('click', () => {
  if (playing() || !canFlip(machine, selected)) return;
  flipped = !flipped;
  if (move?.part === selected) fit(move.socket);
  else {
    controls();
    message(
      parts[selected].name + (flipped ? ' reversed.' : ' in its original direction.') + ' Tap a socket.',
    );
  }
});
function buildDrawer() {
  $('parts').replaceChildren();
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
  ghost = trail.slice();
  addFrame();
  $('scrubber').max = tape.length - 1;
  $('scrubber').value = tape.length - 1;
  const seconds = (run.tick / 60).toFixed(2) + ' s';
  $('film-time').value = seconds;
  $('scrubber').setAttribute('aria-valuetext', seconds);
  $('film').hidden = false;
  controls();
  updateShelf();
  drawBench();
  message(
    win
      ? machine.success +
          (replaying
            ? ' Replay complete.'
            : bookComplete()
              ? ' All 100 machines repaired.'
              : ' Repair recorded.')
      : move
        ? 'That repair missed. Try another part or socket.'
        : 'The machine missed. Pick a part, then tap a socket.',
  );
  if (!win) tone(128, 0.14, 0.025, 'triangle');
}
function frame(now) {
  if (!playing()) return;
  if (previous) elapsed += Math.min(now - previous, 100);
  previous = now;
  while (elapsed >= STEP && playing()) {
    elapsed -= STEP;
    if (phase === 'finishing') {
      // Continue the actual mechanism while the bell swings or the flag rises.
      M.Engine.update(run.engine, STEP);
      run.tick++;
      if (run.tick % 3 === 0) addFrame();
      if (run.tick >= finishTick) finish();
      continue;
    }
    const before = run.hits.length;
    advance(M, run);
    if (run.tick % 3 === 0) {
      addFrame();
      trail.push([run.ball.position.x, run.ball.position.y]);
    }
    if (run.hits.length !== before) {
      tone([523.25, 659.25, 783.99, 1046.5][Math.min(before, 3)], 0.55, 0.1);
      controls();
    }
    if (run.state === 'won') {
      if (!replaying) book.save(machine.id, move, run.tick);
      phase = 'finishing';
      finishTick = run.tick + 30;
      controls();
    } else if (run.state === 'miss') finish();
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
        ? 'Testing the fitted ' + parts[move.part].name.toLowerCase() + '.'
        : 'Watch where the marble goes.',
  );
  raf = requestAnimationFrame(frame);
}
$('run').addEventListener('click', () => launch());
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
  const i = machines.indexOf(machine);
  if (i < 0 || i === machines.length - 1) {
    $('generate').focus();
    return;
  }
  location.hash = machines[i + 1].id;
});
$('share').addEventListener('click', async () => {
  const sharedMachine = machine;
  const url = new URL(location.href);
  url.hash = machine.id;
  try {
    await navigator.clipboard.writeText(url.href);
    if (machine === sharedMachine) message('Puzzle link copied. It opens the starting machine.');
  } catch {
    if (machine !== sharedMachine) return;
    $('copy-fallback').hidden = false;
    $('share-url').value = url.href;
    $('share-url').focus();
    $('share-url').select();
  }
});
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
  const replay = savedMove();
  if (replay) downloadMachine(event.currentTarget, replay);
});
function navigate(resolved, id, announce = false) {
  machine = resolved || machines[0];
  enclosedReplay = null;
  if (document.body.dataset.portable === machine.id && document.body.dataset.repair) {
    try {
      const data = JSON.parse(document.body.dataset.repair);
      if (validMove(machine, data)) enclosedReplay = data;
    } catch {}
  }
  setEditorMachine(machine);
  move = null;
  selected = null;
  flipped = false;
  endDrag();
  $('copy-fallback').hidden = true;
  let lastPrint;
  try {
    lastPrint = localStorage.getItem('chaos.one-part-missing.last-print.v1');
  } catch {}
  if (!machines.includes(machine)) {
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
  const index = machines.indexOf(machine),
    seq = index < 0 ? 'W' : number(index + 1);
  if (index >= 0) activeChapter = Math.floor(index / 10);
  $('machine-no').textContent =
    index < 0 ? 'Machine press · verified' : 'Level ' + seq + ' / 100 · ' + chapters[activeChapter][0];
  $('machine-title').tabIndex = -1;
  $('machine-title').textContent = machine.title;
  $('goal').textContent = machine.goal;
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
$('generate').addEventListener('click', () => {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  $('generate').disabled = true;
  $('generate').textContent = 'Testing the machine…';
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      location.hash = 'press-1-' + seed;
    }),
  );
});
async function route(announce) {
  routing?.abort();
  const controller = new AbortController();
  routing = controller;
  const id = document.body.dataset.portable || location.hash.slice(1) || machines[0].id;
  const bench = document.querySelector('.bench');
  try {
    let resolved = campaignById.get(id);
    if (!resolved && decodePrint(id)) {
      bench.inert = true;
      bench.setAttribute('aria-busy', 'true');
      $('generate').disabled = true;
      $('generate').textContent = 'Testing the machine…';
      resolved = await usePress(M, { id }, controller.signal);
    }
    if (!controller.signal.aborted) navigate(resolved, id, announce);
  } catch {
    if (!controller.signal.aborted) {
      navigate(null, id, announce);
      message('This workshop number could not be loaded. Generate another machine.');
    }
  } finally {
    if (!controller.signal.aborted) {
      bench.inert = false;
      bench.removeAttribute('aria-busy');
      $('generate').disabled = false;
      $('generate').textContent = 'Generate a machine ↗';
    }
  }
}
window.addEventListener('storage', (event) => {
  if (machine && (event.key?.startsWith(repairPrefix) || event.key === null)) {
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

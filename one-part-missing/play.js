import { readTraining, trainingFileRoute, pairTrainingPrefix } from './pair-training.js';
import { setupPairTraining } from './pair-training-desk.js';
import { pathReader, filmPaths } from './path-reader.js';
import { readMatch, matchFileRoute } from './match-cards.js';
import { setupMatches } from './match-desk.js';
import {setupSpareStudy} from './spare-study-desk.js';
import { setupDispatchLog } from './dispatch-log.js';
import {mountLayout} from './mount-layout.js';
import {setupFittingLedger} from './fitting-ledger.js';
import { setupCoach } from './coach-desk.js';
import { flightNames } from './flight.js';
import { setupDesignBench } from './design-bench.js';
import { chooseStart, rememberRoute, setupFinder } from './library.js';
import { orders, orderById, readOrderLink, fitCode, orderPrefix } from './work-orders.js';
import { setupOrders } from './order-desk.js';
import { receiverOpen } from './transmissions.js';
import { toolEvidence } from './tool-evidence.js';
import { notebookTransfer } from './repair-notebook-desk.js';
import { toolNotebook } from './tool-notebook.js';
import { draftDesk } from './draft-desk.js';
import { editHistory } from './bench-edits.js';
import { setupRace, readRace } from './friend-race.js';
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
import { portableFile, keepChallengeShell } from './portable.js';
import { usePress } from './press-client.js';
import { makeEditor } from './maker.js';
import { decodePrint } from './workshop.js';
import { setupPredictions } from './prediction-desk.js';
import { setupLab } from './tool-lab.js';
import { draw, partIcon, snapshot, atFrame } from './drawing.js';

keepChallengeShell();

// Keep the run and parts together. The same film and lesson controls move below
// the repair on a phone so their state, listeners and accessible labels survive.
const phoneWidth = matchMedia('(max-width: 640px)');
const phoneNotes = document.getElementById('phone-notes');
const benchNotes = ['lesson', 'film', 'bench-path', 'compare-attempts', 'dispatch-log', 'cues'].map(id => {
  const node = document.getElementById(id);
  const anchor = document.createComment(id);
  node.before(anchor);
  return { node, anchor };
});
function arrangeNotes() {
  for (const { node, anchor } of benchNotes) {
    if (phoneWidth.matches) phoneNotes.append(node);
    else anchor.after(node);
  }
}
arrangeNotes();
phoneWidth.addEventListener('change', arrangeNotes);

const M = window.Matter;
const $ = (id) => document.getElementById(id);
const c = $('diagram').getContext('2d');
const films = setupFilms($),
  focusBench = setupFocus($);
const raceDesk = setupRace($, films);
const matches = setupMatches($, M, films);
const edits = editHistory();
const drafts = draftDesk($, { campaign:machines, orders, decodePrint, restore(saved) {
  edits.restore(saved.history);
  move=saved.move;selected=null;flipped=false;waitingSocket=null;
  resetRun();
  message('Unfinished repair restored. Test the fittings or keep building.');
  $('run').focus({preventScroll:true});
} });
let waitingSocket = null;
function inspectTick(tick) {
  const frame = tape.findIndex(sample => sample.tick >= tick);
  if (frame < 0) return;
  $('scrubber').value = frame;
  $('scrubber').dispatchEvent(new Event('input'));
}
const fittingLedger = setupFittingLedger($, () => fittings(machine, move), inspectTick);
const spareStudy = setupSpareStudy(M,$);
const dispatchLog = setupDispatchLog($, inspectTick, drawBench);
const coach = setupCoach(M, $, (choice) => {
  if (choice.operation === 'remove') {
    const b = document.querySelector('#pair-pieces [data-remove="' + choice.socket + '"]');
    b?.focus();
    return;
  }
  waitingSocket = null;
  selectPart(choice.part);
  flipped = Boolean(choice.flipped);
  controls();
  message(parts[choice.part].name + ' selected. Fit it at socket ' + socketName(choice.socket) + '.');
  const socket = document.querySelector('[data-socket="' + choice.socket + '"]');
  socket.focus();
});
const setEditorMachine = makeEditor(M);
const setDesignMachine = setupDesignBench(M, (machine) => {
  if (location.hash === '#' + machine.id) navigate(machine, machine.id, true);
  else {
    freshPrint = machine;
    location.hash = machine.id;
  }
});
let resumeAfterLab = false;
const studyPlayback = {
  onOpen() {
    resumeAfterLab = playing() && !runPaused;
    if (resumeAfterLab) setPaused(true);
  },
  onClose() {
    if (resumeAfterLab && playing() && runPaused) setPaused(false);
    resumeAfterLab = false;
  },
};
const lab = setupLab(M, studyPlayback);
const forecasts = setupPredictions(M, studyPlayback);
const finder = setupFinder($);
const desk = setupOrders($, (fit, record) => {
  if (playing()) return;
  changeFittings(fit);
  selected = fit.part;
  flipped = false;
  resetRun(true);
  raceDesk.useRecord(record);
  message('Record setup fitted. Run it or change a spare.');
});
const learning = setupLearning({ el: $, lab });
const training=setupPairTraining($,tick=>{
  inspectTick(tick); $('film').scrollIntoView({block:'center'}); $('scrubber').focus({preventScroll:true});
});
let learningActive = false;
$('open-lab').addEventListener('click', () => {
  const kind =
    selected && Object.hasOwn(parts, selected)
      ? selected
      : machine.tray.find((id) => Object.hasOwn(deviceParts, id)) || machine.tray[0];
  lab.open(kind, $('open-lab'));
});
const book = repairBook(() => localStorage);
const evidence = toolEvidence(() => localStorage);
const knownMachine = (id) => campaignById.has(id) || orderById.has(id) || Boolean(decodePrint(id));
const sourceMachine = async (id, signal) => campaignById.get(id) || orderById.get(id) ||
  (decodePrint(id) ? await usePress(M, {id}, signal) : null);
const notebook = toolNotebook(M,$,{ campaign:machines,book,films,evidence,source:sourceMachine });
const transfer = notebookTransfer($, {
  book, drafts:drafts.store, evidence, orderBook:desk.log, orders, orderById, M,
  known: knownMachine, source: sourceMachine,
  printed: id => !campaignById.has(id) && !orderById.has(id) && Boolean(decodePrint(id)),
  lesson: id => lessonById.has(id)
}, () => {
  updateShelf(); drafts.refresh(); notebook.refresh(); desk.refresh(machine); controls();
});
let personalRepair=false;
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
const path = pathReader($('bench-path'),$('diagram'),{
  frame:()=>inspection??tape.length-1,redraw:drawBench,
  seek:frame=>{$('scrubber').value=frame;$('scrubber').dispatchEvent(new Event('input'));}
});
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
  if(machine.capacity===3 || machine.grand || machine.qualification)fittingLedger.draw(run, inspection===null?run.tick:tape[inspection].tick, phase==='won'||phase==='miss');
  const fieldReadout=$('field-display');
  fieldReadout.hidden=!(machine.fieldwork || machine.fieldReadout);
  if(!fieldReadout.hidden){
    const state=(body,idx)=>{
      const sign=inspection===null?body.render.fieldCharge:tape[inspection].poses[idx][4],phase=inspection===null?body.render.phaseFrames:tape[inspection].poses[idx][5];
      const charge=sign===1?'Positive (+)':sign===-1?'Negative (−)':'Neutral';
      return charge+(phase?' · Phased '+(phase/60).toFixed(2)+' s':'');
    };
    const line='Gold · '+state(run.ball,run.items.findIndex(it=>it.body===run.ball))+(run.cargo?' / Blue · '+state(run.cargo,cargoIndex):'');
    if(fieldReadout.textContent!==line)fieldReadout.textContent=line;
  }
  const gearPanel = $('flight-gear');
  gearPanel.hidden = !(machine.flight || machine.flightEquipment || machine.fieldwork && run.items.some(it=>it.body.render.gearMask || ['gyro','thruster','lift','unload'].includes(it.shape.kind)));
  if (!gearPanel.hidden) {
    const idx = run.items.findIndex((it) => it.body === run.ball);
    const equipment = (actor, i) =>
      flightNames(inspection === null ? actor.render.gearMask : tape[inspection].poses[i][3] || 0).join(
        ' + ',
      ) || 'No gear';
    const text =
      'Gold · ' +
      equipment(run.ball, idx) +
      (run.cargo ? ' / Blue · ' + equipment(run.cargo, cargoIndex) : '');
    if (gearPanel.textContent !== text) gearPanel.textContent = text;
  }
  const cargoTrail =
    cargoIndex === -1
      ? []
      : tape
          .slice(Math.max(0, cursor - 28), cursor + 1)
          .map((frame) => frame.poses[cargoIndex].slice(0, 2));
  if (inspection !== null) {
    const sample = tape[inspection],
      upto = Math.floor(sample.tick / 3);
    draw(c, atFrame(run, sample), { trail: trail.slice(Math.max(0, upto - 28), upto), cargoTrail, routes:dispatchLog.paths() });
  } else
    draw(c, run, {
      routes:dispatchLog.paths(),
      trail: trail.slice(-28),
      ghost,
      cargoTrail,
      mount: phase === 'ready' && previewSocket !== null ? machine.sockets[previewSocket] : null,
    });
  path.draw(c,cursor);
}
function signalAt(sample) {
  if (sample.binTicks) return sample.binTicks.filter((t) => t !== null).length + ' / 2 sorted';
  const count = sample.hits.length,
    total = machine.goals.length,
    prefix = count + ' / ' + total;
  if (!run.cargo)
    return total > 1
      ? prefix + (machine.goals.every((g) => g.kind === 'chime') ? ' notes' : ' contacts')
      : '';
  const status =
    count === total
      ? 'Parcel delivered'
      : run.gated
        ? run.uses.some((u) => u.kind === 'hatch' && u.tick <= sample.tick)
          ? 'Hatch open'
          : 'Hatch closed'
        : sample.tick === 0
          ? 'Parcel ready'
          : 'Parcel in transit';
  return total > 1 ? prefix + ' · ' + status : status;
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
  $('signal').textContent = signalAt(tape[inspection]);
  drawBench();
});
new ResizeObserver(() => {
  const rect = $('stage').getBoundingClientRect(),
    scale = Math.min(2, window.devicePixelRatio || 1, 2160 / Math.max(1, rect.width));
  if (rect.width) {
    if(machine)mountLayout($('sockets'),machine,fittings(machine,move).map(f=>f.socket));
    coach.positionPin();
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
    nextPair = unfinished.find((m) => m.capacity === 2 && !m.grand);
  $('pair-entry').href = '#' + (nextPair || pairStart).id;
  $('pair-entry').textContent =
    nextPair && nextPair !== pairStart ? 'Resume two-part repairs →' : 'Play two-part repairs →';
  const firstQualification=machines.find(m=>m.qualification);
  const nextQualification=unfinished.find(m=>m.qualification);
  $('qualification-entry').href='#'+(nextQualification||firstQualification).id;
  $('qualification-entry').textContent=nextQualification&&nextQualification!==firstQualification?'Resume cross training →':'Play cross training →';
  const relayStart = machines.find(m => m.grand), nextRelay = unfinished.find(m => m.grand);
  $('grand-entry').href = '#' + (nextRelay || relayStart).id;
  $('grand-entry').textContent = nextRelay && nextRelay !== relayStart ? 'Resume grand relays →' : 'Play grand relays →';
  const firstField=machines.find(m=>m.fieldwork),nextField=unfinished.find(m=>m.fieldwork);
  $('field-entry').href='#'+(nextField||firstField).id;$('field-entry').textContent=nextField&&nextField!==firstField?'Resume field stations →':'Play field stations →';
  const firstAssembly=machines.find(m=>m.capacity===3 && !m.grand),nextAssembly=unfinished.find(m=>m.capacity===3 && !m.grand);
  if(firstAssembly){$('assembly-entry').href='#'+(nextAssembly||firstAssembly).id;$('assembly-entry').textContent=nextAssembly&&nextAssembly!==firstAssembly?'Resume three-part repairs →':'Play three-part repairs →';}
  const driveStart = machines.find((m) => m.transmission),
    nextDrive = unfinished.find((m) => m.transmission);
  $('drive-entry').href = '#' + (nextDrive || driveStart).id;
  $('drive-entry').textContent =
    nextDrive && nextDrive !== driveStart ? 'Resume the drive table →' : 'Play the drive table →';
  const firstFlight = machines.find((m) => m.flight),
    nextFlight = unfinished.find((m) => m.flight);
  $('flight-entry').href = '#' + (nextFlight || firstFlight).id;
  $('flight-entry').textContent =
    nextFlight && nextFlight !== firstFlight ? 'Resume flight school →' : 'Play flight school →';
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
    won = !matches.active && !raceDesk.blind && (savedMove() || enclosedReplay);
  drafts.busy(busy);
  training.setBusy(busy);
  films.duringRun(busy);
  desk.controls(machine, move, busy);
  $('order-card').hidden = !machine.contract || matches.active || raceDesk.blind;
  $('undo-fitting').hidden = !edits.available;
  $('undo-fitting').disabled = busy;
  const placed = fittings(machine, move),
    paired = machine.capacity > 1;
  $('fitting-ledger').hidden=machine.capacity!==3 && !machine.grand && !machine.qualification;
  $('share-assembly').disabled=busy||!validMove(machine,move);
  $('fitted-pair').hidden = !paired;
  if (paired) {
    $('pair-count').textContent = placed.length + ' of '+machine.capacity+' parts fitted';
    // Preserve keyboard focus while the clock runs and after removing one part.
    const key = JSON.stringify([placed, busy]);
    if ($('pair-pieces').dataset.layout !== key) {
      $('pair-pieces').dataset.layout = key;
      $('pair-pieces').replaceChildren(
        ...placed.map((f) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiet';
          b.dataset.remove = String(f.socket);
          b.textContent = socketName(f.socket) + ' · ' + parts[f.part].name + ' ×';
          b.setAttribute(
            'aria-label',
            'Remove ' + parts[f.part].name + ' from socket ' + socketName(f.socket),
          );
          b.disabled = busy;
          b.addEventListener('click', () => {
            changeFittings(packFittings(fittings(machine, move).filter((p) => p.socket !== f.socket)));
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
  $('reset').disabled = phase === 'ready' && !move && !selected && !ghost.length && waitingSocket === null;
  $('after-win').hidden = !won || busy;
  $('study-open').hidden=!campaignById.has(machine.id);
  $('next').textContent =
    machines.indexOf(machine) === machines.length - 1 || !machines.includes(machine)
      ? 'Machine press ↓'
      : 'Next machine →';
  if (machine.contract)
    $('next').textContent = machine.orderIndex + 1 < orders.length ? 'Next order →' : 'Work orders ↓';
  if (learningActive)
    $('next').textContent =
      lessonById.get(machine.id) === lessons.length - 1 ? 'Lesson map ↓' : 'Next lesson →';
  if(training.active) $('next').textContent=training.nextLabel();
  $('pilot').textContent = {
    ready: 'Ready',
    running: replaying ? 'Replay' : 'Running',
    finishing: 'Contact',
    won: 'Repaired',
    miss: 'Missed',
  }[phase];
  if (busy && runPaused) $('pilot').textContent = 'Paused';
  $('pilot').dataset.state = busy && runPaused ? 'paused' : phase;
  $('signal').textContent = signalAt(run);
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
    b.classList.toggle('awaiting-part', waitingSocket === i);
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
      waitingSocket === i ? 'Selected socket. Choose a spare to fit here.' : mark
        ? selected === 'conveyor'
          ? 'Belt runs ' + (dir === 1 ? 'right' : 'left')
          : 'Turns ' + (dir === 1 ? 'counterclockwise' : 'clockwise')
        : '',
    );
    b.setAttribute('aria-pressed', String(placed.some((f) => f.socket === i)));
  }
  mountLayout($('sockets'),machine,placed.map(f=>f.socket));
  coach.positionPin();
  const hash = new URLSearchParams({ machine: machine.id });
  placed.forEach((fit,i)=>{
    const suffix=i?String(i+1):'';
    hash.set('part'+suffix,fit.part);hash.set('socket'+suffix,String(fit.socket));
    if(fit.flipped)hash.set('flip'+suffix,'1');
  });
  $('open-sandbox').href = '../#' + hash;
}
function resetRun(keepGhost = false) {
  training.clearFilm();
  path.clear();
  coach.clear();
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
  dispatchLog.clear();
  $('cues').replaceChildren();
  $('film').hidden = true;
  run = createRun(M, machine, move);
  addFrame();
  $('counter').textContent = '0.00 s';
  controls();
  drawBench();
}
function changeFittings(next, persist = true) {
  edits.remember(move, next);
  move = next;
  if (persist) drafts.edited(move, edits.snapshot());
  waitingSocket = null;
}
function selectPart(id) {
  if (playing()) return;
  if (selected !== id) flipped = false;
  selected = id;
  if (phase !== 'ready') resetRun(true);
  controls();
  if (waitingSocket !== null) fit(waitingSocket);
  else message(parts[id].name + ' selected. Tap a socket.');
}
function fit(i) {
  if (playing()) return;
  if (!selected) {
    waitingSocket = waitingSocket === i ? null : i;
    controls();
    message(waitingSocket === null ? 'Socket selection cleared.' : 'Socket ' + socketName(i) + ' selected. Choose a spare to fit here.');
    return;
  }
  const next = placePart(machine, move, {
    part: selected,
    socket: i,
    ...(flipped ? { flipped: true } : {}),
  });
  if (next === move) {
    message((machine.capacity===3?'Three':'Both')+' spares are fitted. Remove one or tap an occupied socket to replace it.');
    return;
  }
  changeFittings(next);
  resetRun(true);
  tone(250, 0.1, 0.03, 'triangle');
  message(
    parts[selected].name +
      ' fitted to ' +
      socketName(i) +
      (flipped ? ', reversed.' : '.') +
      (machine.capacity > 1 && fittings(machine,move).length<machine.capacity
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
  delete $('sockets').dataset.mounts;
  machine.sockets.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'socket';
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
        ((machine.transmission || machine.shaftMounts)
          ? ', drive ' + (s.dir === -1 ? 'counterclockwise' : 'clockwise') + ', gear ratio ' + (s.ratio || 1)
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
    waitingSocket = null;
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
  const attempt = films.add(machine, run, move, tape);
  path.ready(()=>filmPaths(attempt));
  if (win && !replaying) {
    training.delivered(move,run);
    if (matches.active) matches.deliver(move);
    else raceDesk.delivered(move, run.hits.at(-1), attempt);
  }
  if (!win) coach.capture(machine, move, attempt, run.passes);
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
  $('cues').hidden = !cues.length || !!machine.grand;
  if (machine.grand) dispatchLog.show(run,tape);
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
  if(!win && machine.capacity===3) {
    const placed=fittings(machine,move);
    const acted=run.items.filter((it,i)=>it.shape.fitted&&run.uses.some(e=>e.item===i));
    message(placed.length===0?'Three fittings are missing. Start with the first reachable socket.':acted.length+' of '+placed.length+' installed fittings acted. '+(placed.length<3?'Keep the working handoff and try the next spare.':'Inspect the contacts to find the missed handoff.'));
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
  if(!win && machine.qualification && move){
    const fitted=fittings(machine,move);
    const working=new Set(run.uses.filter(e=>run.items[e.item]?.shape.fitted).map(e=>e.item));
    const next=machine.goals[run.hits.length];
    const actor=next.striker==='cargo'?'blue parcel':next.striker==='tile'?'falling domino':'gold marble';
    const progress=working.size+' of '+machine.capacity+' fitted stations acted. ';
    if(run.passes.at(-1)?.reason==='Receiver closed')message(progress+'The '+actor+' reached a closed receiver. Inspect that crossing on the film.');
    else if(run.hits.length)message(progress+'First chime reached at '+(run.hits[0]/60).toFixed(2)+' s. Follow the '+actor+' to the flag.');
    else if(fitted.length<machine.capacity)message(progress+'Keep the working fittings and test the next handoff.');
    else message(progress+'Follow the '+actor+' to the '+(machine.goals.length>1?'first chime.':'marked receiver.'));
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
    if (!replaying && !matches.viewing && validMove(machine, move)) {
      book.save(machine.id, move, run.tick, personalRepair);
      notebook.delivered(machine,move,run);
      drafts.delivered();
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
  const clockTick = machine.contract && run.state==='won' ? run.hits.at(-1) : run.tick;
  $('counter').textContent = (clockTick / 60).toFixed(2) + ' s';
  drawBench();
  if (playing()) raf = requestAnimationFrame(frame);
}
function launch(replay = false) {
  if (playing() || matches.viewing) return;
  if (replay) {
    const last = enclosedReplay || savedMove();
    if (!last) return;
    changeFittings(last, false);
    selected = last.part;
    flipped = Boolean(last.flipped);
  }
  waitingSocket = null;
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
          ? move.third ? 'Testing three fitted parts.' : 'Testing both fitted parts.'
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
  const clockTick = machine.contract && run.state==='won' ? run.hits.at(-1) : run.tick;
  $('counter').textContent = (clockTick / 60).toFixed(2) + ' s';
  drawBench();
});
$('playback-rate').addEventListener('change', () => {
  speed = Number($('playback-rate').value);
  previous = 0;
  elapsed = 0;
});
$('replay').addEventListener('click', () => launch(true));
$('undo-fitting').addEventListener('click', () => {
  if (playing() || !edits.available) return;
  move = edits.undo();
  drafts.edited(move, edits.snapshot());
  waitingSocket = null;
  selected = null;
  flipped = false;
  resetRun(true);
  const placed = fittings(machine, move);
  message(placed.length ? 'Previous fittings restored. Test the repair.' : 'Fitting removed. The sockets are empty.');
  if (!edits.available) $('run').focus({preventScroll:true});
});
$('reset').addEventListener('click', () => {
  changeFittings(null);
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
  if(training.next())return;
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
$('share-assembly').addEventListener('click',()=>copyLink(true));
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
$('study-open').addEventListener('click',()=>{
  const fit=enclosedReplay || savedMove();
  if (fit) spareStudy.open(machine,fit);
});
$('save-replay').addEventListener('click', (event) => {
  const replay = desk.isRecord(machine, move) ? move : savedMove();
  if (replay) downloadMachine(event.currentTarget, replay);
});
function navigate(resolved, id, announce = false, sharedFit = null, race = null, match = null, resume = false, course = null) {
  spareStudy.close();
  forecasts.close();
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
  setDesignMachine(machine);
  desk.navigate(machine);
  matches.navigate(match);
  training.navigate(course);
  raceDesk.navigate(match ? null : machine, race, desk.fastest);
  const personal=resolved && (id===machine.id || course) && !race && !match && !sharedFit && !document.body.dataset.portable;
  personalRepair=Boolean(personal);
  notebook.enter(personalRepair);
  transfer.enter(personalRepair);
  if (personal) rememberRoute(machine, learningActive);
  edits.clear();
  waitingSocket = null;
  const draft=drafts.enter(personal ? machine : null, learningActive, resume);
  if (draft) edits.restore(draft.history);
  move = match?.returned?.[match.round]?.move || sharedFit || draft?.move || null;
  selected = draft ? null : move?.part || null;
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
  if (machine.designed)
    $('proof-text').textContent +=
      ' The complete design delivered and the empty station missed at seven release points.';
  if (machine.pressPlate) $('proof-text').textContent += ' Press plate: ' + machine.pressPlate + '.';
  const index = machines.indexOf(machine),
    seq = index < 0 ? 'W' : number(index + 1);
  if (index >= 0) activeChapter = Math.floor(index / 10);
  $('machine-no').textContent =
    index < 0
      ? 'Machine press · verified'
      : 'Level ' + seq + ' / ' + machines.length + ' · ' + chapters[activeChapter][0];
  if (machine.designed) $('machine-no').textContent = 'Design bench · verified';
  if (machine.contract)
    $('machine-no').textContent = 'Work order ' + number(machine.orderIndex + 1) + ' / ' + orders.length;
  if (match) $('machine-no').textContent = match.card.title + ' · round ' + (match.round+1) + ' / 3';
  if (learningActive) {
    const n = lessonById.get(machine.id);
    $('machine-no').textContent =
      'Lesson ' + number(n + 1) + ' / ' + lessons.length + ' · ' + lessons[n].chapter;
  }
  $('machine-title').tabIndex = -1;
  $('machine-title').textContent = machine.title;
  $('goal').textContent = match ? matches.objective : machine.goal;
  $('fit-instruction').textContent = machine.contract
    ? 'Fit one spare for economy or try two for speed.'
    : machine.capacity === 3
      ? 'Fit three different spares. Test each handoff as you build.'
      : machine.capacity === 2
      ? 'Choose two different parts. Fit each to its own socket.'
      : 'Choose a part, then tap a socket.';
  $('open-lab').hidden = false;
  if(course) $('machine-no').textContent='Tool pair '+(course.stage+1)+' / 3 · Level '+course.step.n+' · '+(course.stage===2?'Combine':parts[course.step.targets[0]].name);
  $('lesson').hidden = !machine.lesson;
  $('lesson').open = Boolean(
    machine.lesson &&
    index >= 0 &&
    index % 10 < 2 &&
    (index < 140 ||
      machine.clockwork ||
      machine.rigging ||
      machine.capacity > 1 ||
      machine.transmission ||
      machine.sorting ||
      machine.flight || machine.fieldwork),
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
      : match ? (match.returned ? 'Open the scorecard to watch this recorded round.' : 'Make a delivery to post your score for this round.')
      : raceDesk.blind
        ? 'A fresh bench. Make your own delivery to compare with the challenger.'
      : sharedFit
        ? 'Shared setup fitted. Run it to measure the delivery.'
        : enclosedReplay
          ? 'A repair came with this file. Watch the replay or try your own.'
          : draft ? 'Unfinished repair restored. Test the fittings or keep building.'
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
    location.hash = 'press-3-' + seed;
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
  const packed = document.body.dataset.portable;
  const hash = location.hash.slice(1);
  const explicit = packed?.startsWith('tool-pair/1/') ? trainingFileRoute(packed,hash) : packed?.startsWith('match/1/') ? matchFileRoute(packed,hash) : packed || hash;
  const requested = explicit || chooseStart(book.read());
  if (!explicit) history.replaceState(null, '', '#' + requested);
  const resume = !packed && requested.startsWith('resume/');
  const target = resume ? requested.slice(7) : requested;
  const guidedId = target.startsWith('learn/') ? target.slice(6) : null;
  learningActive = lessonById.has(guidedId);
  const id = learningActive ? guidedId : target;
  const bench = document.querySelector('.bench');
  try {
    const course = id.startsWith('tool-pair/') ? readTraining(id) : null;
    const match = id.startsWith('match/') ? readMatch(M,id) : null;
    const race = id.startsWith('race/') ? readRace(M, id) : null;
    const order = readOrderLink(id);
    let resolved = course?.step.machine || match?.card.rounds[match.round] || race?.machine || order?.machine || (freshPrint?.id === id ? freshPrint : campaignById.get(id));
    freshPrint = null;
    if (!resolved && decodePrint(id)) {
      bench.inert = true;
      bench.setAttribute('aria-busy', 'true');
      pressBusy(true);
      resolved = await usePress(M, { id }, controller.signal);
    }
    if (!controller.signal.aborted) {
      navigate(resolved, id, announce, order?.move, race, match, resume || !explicit, course);
      if(id.startsWith('tool-pair/') && !course) message('This practice pair is unavailable. Choose two tools in the level map.');
      if (id.startsWith('match/') && !match) message('This card could not be replayed. Open a fresh card from the level map.');
      if (race?.reply) raceDesk.watchReturn();
      if (id.startsWith('race/') && !race) message('This challenge link could not be replayed. Ask for a new link.');
    }
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
  if(event.key===null || event.key.startsWith(pairTrainingPrefix))training.sync();
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

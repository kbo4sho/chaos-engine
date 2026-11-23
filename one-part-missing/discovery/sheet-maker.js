import { actorNames } from './double-rigs.js';
import { capture, certifySheet } from './shutter-sheet.js';

export async function copySheetLink(route, input, status, success, isCurrent) {
  const url = new URL(location.href);
  url.hash = route;
  try {
    await navigator.clipboard.writeText(url.href);
    if (isCurrent()) status.textContent = success;
  } catch {
    if (!isCurrent()) return;
    input.value = url.href;
    input.hidden = false;
    input.focus();
    input.select();
    status.textContent = 'Select and copy this link.';
  }
}
const clock = (frame) => (frame / 60).toFixed(2) + ' s';
export function sheetMaker(el, inspect, repaint) {
  const panel = el('maker'),
    ranges = [el('mark-1'), el('mark-2')],
    result = el('maker-result'),
    play = el('play-sheet');
  let machine,
    recording,
    targets,
    certified = null,
    revision = 0;
  function clearResult() {
    revision++;
    certified = null;
    play.hidden = true;
    el('copy-sheet').hidden = true;
    el('sheet-url').hidden = true;
    el('sheet-url').value = '';
    result.textContent = '';
  }
  function reset() {
    clearResult();
    panel.open = false;
    panel.hidden = true;
    recording = null;
    targets = null;
  }
  function refresh() {
    ranges.forEach((range, i) => {
      const s = targets[i];
      el('mark-label-' + (i + 1)).textContent = 'Shutter ' + (i + 1) + ' · ' + actorNames[s.kind];
      el('mark-value-' + (i + 1)).value = clock(s.tick) + ' · (' + s.x + ', ' + s.y + ')';
      range.setAttribute(
        'aria-valuetext',
        clock(s.tick) + ', ' + actorNames[s.kind] + ' at ' + s.x + ', ' + s.y,
      );
    });
  }
  ranges.forEach((range, i) =>
    range.addEventListener('input', () => {
      clearResult();
      targets[i] = capture(recording, machine, i, range.valueAsNumber);
      refresh();
      inspect(range.valueAsNumber);
    }),
  );
  panel.addEventListener('toggle', () => {
    if (recording) repaint();
  });
  el('test-sheet').addEventListener('click', () => {
    clearResult();
    const proof = certifySheet(window.Matter, machine, targets);
    result.textContent = proof.message;
    if (!proof.route) return;
    certified = proof.route;
    play.href = '#' + certified;
    play.hidden = false;
    el('copy-sheet').hidden = false;
  });
  el('copy-sheet').addEventListener('click', async () => {
    if (!certified) return;
    const at = revision;
    await copySheetLink(
      certified,
      el('sheet-url'),
      result,
      'Puzzle link copied. It opens with a fresh set of controls.',
      () => at === revision,
    );
  });
  return {
    reset,
    get preview() {
      return panel.open && recording ? targets : null;
    },
    use(rig, tape) {
      reset();
      if (document.body.dataset.double) return;
      machine = rig;
      recording = tape;
      targets = rig.shots.map((s, i) => capture(tape, rig, i, s.tick));
      ranges.forEach((r, i) => {
        r.max = tape.frames.at(-1).tick;
        r.value = targets[i].tick;
      });
      refresh();
      panel.hidden = false;
    },
  };
}

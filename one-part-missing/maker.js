import { createRun } from './machines.js';
import { decodePrint, resolveMachine, tuneTarget } from './workshop.js';
import { usePress } from './press-client.js';
import { draw } from './drawing.js';

export function makeEditor(M) {
  const el = (id) => document.getElementById(id);
  const panel = el('maker'),
    preview = el('maker-preview').getContext('2d');
  let base, current, draft, pending;
  function update() {
    if (!current) return;
    if (!base) base = resolveMachine(M, decodePrint(current.id).base);
    pending?.abort();
    const x = el('target-x').valueAsNumber,
      y = el('target-y').valueAsNumber;
    el('offset-x').value = x === 0 ? 'Centered' : Math.abs(x * 8) + ' ' + (x < 0 ? 'left' : 'right');
    el('offset-y').value = y === 0 ? 'Centered' : Math.abs(y * 8) + ' ' + (y < 0 ? 'up' : 'down');
    draft = tuneTarget(base, x, y);
    el('prove').disabled = draft.id === current.id;
    el('maker-result').textContent = '';
    draw(preview, createRun(M, draft));
  }
  for (const id of ['target-x', 'target-y']) el(id).addEventListener('input', update);
  panel.addEventListener('toggle', () => {
    if (panel.open) {
      if (!draft) update();
    } else if (pending) {
      pending.abort();
      pending = null;
      el('prove').disabled = !draft || draft.id === current.id;
      el('maker-result').textContent = '';
    }
  });
  el('prove').addEventListener('click', () => {
    pending?.abort();
    const request = new AbortController();
    pending = request;
    el('prove').disabled = true;
    el('maker-result').textContent = 'Testing the release points…';
    usePress(M, { draft }, request.signal)
      .then((proof) => {
        if (!panel.open || request.signal.aborted) return;
        if (proof.machine) {
          location.hash = draft.id;
          return;
        }
        el('maker-result').textContent = proof.reason;
        el('prove').disabled = false;
      })
      .catch(() => {
        if (!request.signal.aborted) {
          el('maker-result').textContent = 'The press stopped. Try the test again.';
          el('prove').disabled = false;
        }
      });
  });
  return (machine) => {
    pending?.abort();
    current = machine;
    const code = decodePrint(machine.id);
    base = code.x || code.y ? null : machine;
    draft = null;
    el('target-x').value = code.x;
    el('target-y').value = code.y;
    panel.open = false;
    el('maker-result').textContent = '';
  };
}

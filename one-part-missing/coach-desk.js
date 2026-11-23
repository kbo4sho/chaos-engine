import { mountLabels } from './mount-layout.js';
import { draw, atFrame } from './drawing.js';
import { parts, WIDTH, HEIGHT } from './machines.js';
import { inspectMiss, compareHandoff } from './repair-coach.js';
import { usePress } from './press-client.js';
const clock = (t) => (t / 60).toFixed(2) + ' s';
export function setupCoach(M, el, select) {
  const modal = el('repair-coach'),
    open = el('inspect-miss'),
    pin = el('miss-pin'),
    slow = el('coach-slow'),
    canvas = el('coach-scene'),
    c = canvas.getContext('2d'),
    slider = el('coach-frame');
  let attempt = null,
    diagnosis = null,
    response = null,
    comparison = null,
    t = 0,
    shown = 0,
    pending = null,
    overlay = false;
  let replayFrame = 0;
  function stopReplay() {
    cancelAnimationFrame(replayFrame);
    replayFrame = 0;
    slow.textContent = 'Replay at ¼ speed';
  }
  function cancel() {
    stopReplay();
    pending?.abort();
    pending = null;
    el('coach-compare').disabled = false;
  }
  function clear() {
    cancel();
    if (modal.open) modal.close();
    attempt = null;
    diagnosis = null;
    response = null;
    comparison = null;
    overlay = false;
    shown = 0;
    open.hidden = true;
    pin.hidden = true;
  }
  function positionPin() {
    if (pin.hidden || !attempt || !diagnosis) return;
    const stage = el('stage'), w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const [x,y] = attempt.film.frames[diagnosis.tick].poses[diagnosis.actor];
    const anchor = {x: Math.max(0,Math.min(w,x / WIDTH * w)), y: Math.max(0,Math.min(h,y / HEIGHT * h))};
    const occupied = [...el('sockets').children].map(b => ({
      x: b.offsetLeft, y: b.offsetTop,
    }));
    const [point] = mountLabels([anchor], [], w, h, [], occupied);
    const dx=anchor.x-point.x, dy=anchor.y-point.y;
    pin.style.left = point.x+'px';
    pin.style.top = point.y+'px';
    pin.style.setProperty('--pin-length', Math.hypot(dx,dy)+'px');
    pin.style.setProperty('--pin-angle', Math.atan2(dy,dx)+'rad');
  }
  function paint() {
    const { m, film } = attempt,
      range = (tape) => Math.min(t, tape.length - 1);
    draw(c, atFrame(film, film.frames[t]));
    const actual = film.frames[t].poses[diagnosis.actor],
      goal = m.goals[diagnosis.index];
    c.save();
    c.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    c.strokeStyle = '#cca2e1';
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.strokeRect(goal.x - goal.w / 2 - 4, goal.y - goal.h / 2 - 4, goal.w + 8, goal.h + 8);
    c.setLineDash([]);
    c.lineWidth = 2.5;
    function trace(path, ghost) {
      const n = range(path),
        start = Math.max(0, n - 60);
      c.setLineDash(ghost ? [5, 4] : []);
      c.strokeStyle = ghost ? '#c2cfd9' : diagnosis.kind === 'cargo' ? '#88d5fb' : '#ffc668';
      c.beginPath();
      for (let i = start; i <= n; i++) {
        const p = path[i];
        if (i === start || (ghost ? p[3] : attempt.jumps.has(i))) c.moveTo(p[0], p[1]);
        else c.lineTo(p[0], p[1]);
      }
      c.stroke();
      const [x, y, a] = path[n],
        s = diagnosis.source,
        r = s.r || 8;
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.beginPath();
      if (diagnosis.kind === 'tile' || diagnosis.kind === 'weight')
        c.rect(-s.w / 2 - 2, -s.h / 2 - 2, s.w + 4, s.h + 4);
      else if (diagnosis.kind === 'cargo') {
        c.moveTo(0, -r - 3);
        c.lineTo(r + 3, 0);
        c.lineTo(0, r + 3);
        c.lineTo(-r - 3, 0);
        c.closePath();
      } else c.arc(0, 0, r + 3, 0, 2 * Math.PI);
      c.stroke();
      c.restore();
    }
    trace(attempt.path, false);
    if (overlay) {
      trace(response.path, true);
      el('coach-gap').textContent =
        diagnosis.name +
        ' · ' +
        Math.round(comparison.distance(t)) +
        ' units apart at ' +
        clock(t) +
        '.';
    }
    c.restore();
    slider.value = t;
    slider.setAttribute('aria-valuetext', clock(t));
    el('coach-time').value = clock(t);
    canvas.setAttribute(
      'aria-label',
      diagnosis.name +
        ' at x ' +
        Math.round(actual[0]) +
        ', y ' +
        Math.round(actual[1]) +
        '. ' +
        (overlay ? el('coach-gap').textContent : diagnosis.detail),
    );
  }
  function go(frame) {
    stopReplay();
    t = Math.max(0, Math.min(Number(slider.max), frame));
    paint();
  }
  function inspect() {
    if (!attempt) return;
    if (!diagnosis) return;
    if (!attempt.path) {
      attempt.path = attempt.film.frames.map((f) => f.poses[diagnosis.actor]);
      attempt.jumps = new Set(
        attempt.film.uses
          .filter((u) => u.kind === 'portal' && u.actor === diagnosis.kind)
          .map((u) => u.tick),
      );
      slider.max = attempt.path.length - 1;
      t = diagnosis.tick;
      el('coach-observation').textContent = diagnosis.detail + ' Inspect ' + clock(t) + '.';
      el('coach-return').textContent = diagnosis.priority ? 'Inspect the contact' : 'Closest approach';
      el('coach-change').hidden = true;
      el('coach-legend').hidden = true;
      el('coach-rule').textContent = '';
      el('coach-gap').textContent = '';
      el('coach-steps').replaceChildren();
      el('coach-steps').hidden = true;
      el('coach-reveal').hidden = true;
      el('coach-compare').disabled = false;
      el('coach-compare').textContent = 'See the working motion';
    }
    modal.showModal();
    paint();
    el('coach-close').focus({ preventScroll: true });
  }
  function slowReplay() {
    if (replayFrame) {
      stopReplay();
      return;
    }
    if (overlay) showOverlay(false);
    const start = Math.max(0, diagnosis.tick - 36);
    const end = Math.min(attempt.path.length - 1, diagnosis.tick + 18);
    go(start);
    const origin = performance.now();
    slow.textContent = 'Pause replay';
    const advance = now => {
      t = Math.min(end, start + Math.floor(Math.max(0, now - origin) * 15 / 1000));
      paint();
      if (t < end) replayFrame = requestAnimationFrame(advance);
      else stopReplay();
    };
    replayFrame = requestAnimationFrame(advance);
  }
  slow.addEventListener('click', slowReplay);
  open.addEventListener('click', inspect);
  pin.addEventListener('click', () => {
    inspect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) go(diagnosis.tick);
    else slowReplay();
  });
  function showOverlay(enable) {
    overlay = enable;
    slider.max = enable ? comparison.end : attempt.path.length - 1;
    el('coach-legend').hidden = !enable;
    el('coach-change').hidden = !enable;
    el('coach-change').textContent =
      comparison?.first == null ? 'Inspect the handoff' : 'First separation';
    el('coach-compare').textContent = enable ? 'Hide working path' : 'Show working path';
    if (!enable) el('coach-gap').textContent = '';
  }
  el('coach-return').addEventListener('click', () => {
    if (overlay && diagnosis.tick > comparison.end) showOverlay(false);
    go(diagnosis.tick);
  });
  el('coach-change').addEventListener('click', () => go(comparison.first ?? comparison.frame));
  slider.addEventListener('input', () => go(slider.valueAsNumber));
  el('coach-compare').addEventListener('click', async () => {
    cancel();
    if (response) {
      showOverlay(!overlay);
      go(overlay ? comparison.frame : t);
      return;
    }
    const controller = new AbortController();
    pending = controller;
    el('coach-compare').disabled = true;
    el('coach-rule').textContent = 'Testing a working repair…';
    try {
      const data = await usePress(
        M,
        {
          guide: {
            machine: attempt.m,
            move: attempt.move,
            which: { kind: diagnosis.kind, source: diagnosis.source },
          },
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (!data) {
        el('coach-rule').textContent = 'No reference run was found for this setup.';
        return;
      }
      response = data;
      comparison = compareHandoff(attempt.film, diagnosis, data);
      showOverlay(true);
      el('coach-rule').textContent =
        data.advice +
        ' ' +
        data.hintTime +
        (comparison.first === null
          ? ' The paths stay within one load radius over the shared recording.'
          : ' The paths separate at ' + clock(comparison.first) + '.');

      el('coach-reveal').hidden = !data.steps.length;
      el('coach-reveal').textContent = 'Show one fitting';
      go(comparison.frame);
    } catch {
      if (!controller.signal.aborted)
        el('coach-rule').textContent = 'The comparison stopped. Try again.';
    } finally {
      if (pending === controller) {
        el('coach-compare').disabled = false;
        pending = null;
      }
    }
  });
  el('coach-reveal').addEventListener('click', () => {
    const step = response?.steps[shown];
    if (!step) return;
    shown++;
    const li = document.createElement('li'),
      b = document.createElement('button'),
      label = parts[step.part].name,
      slot = String.fromCharCode(65 + step.socket);
    li.append(
      step.operation === 'remove'
        ? 'Remove ' + label + ' from socket ' + slot + '.'
        : 'Fit ' + label + (step.flipped ? ' reversed' : '') + ' at socket ' + slot + '.',
    );
    b.type = 'button';
    b.className = 'quiet';
    b.textContent = step.operation === 'remove' ? 'Find fitted part' : 'Select spare';
    b.addEventListener('click', () => {
      modal.close();
      select(step);
    });
    li.append(b);
    el('coach-steps').append(li);
    el('coach-steps').hidden = false;
    el('coach-reveal').hidden = shown >= response.steps.length;
    el('coach-reveal').textContent = 'Show next fitting';
    b.focus({ preventScroll: true });
    li.scrollIntoView({ block: 'nearest' });
  });
  el('coach-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    cancel();
    if (diagnosis && !response) el('coach-rule').textContent = '';
  });
  return {
    clear,
    positionPin,
    capture(m, move, film, passes) {
      clear();
      diagnosis = inspectMiss(m, film, passes);
      if (!diagnosis) return;
      attempt = { m, move, film };

      pin.title = 'Replay the missed handoff at ' + clock(diagnosis.tick);
      pin.hidden = false;
      positionPin();
      open.hidden = false;
    },
  };
}

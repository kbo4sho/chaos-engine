import { draw, atFrame } from './drawing.js';
import { parts, WIDTH, HEIGHT } from './machines.js';
import { prediction, predictionBook, exercises, clock } from './predictions.js';

export function setupPredictions(M, { onOpen, onClose } = {}) {
  const el = (id) => document.getElementById(id),
    modal = el('prediction-lab'),
    tool = el('predict-tool'),
    mode = el('predict-mode'),
    canvas = el('predict-diagram'),
    c = canvas.getContext('2d'),
    slider = el('predict-frame'),
    book = predictionBook(() => localStorage);
  let lesson,
    t = 0,
    answer = null,
    raf = 0,
    origin = null,
    opener = null,
    nested = false;
  for (const [id, p] of Object.entries(parts)) tool.add(new Option(p.name, id));
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    origin = null;
    el('predict-play').textContent = answer === null ? 'Watch reference' : 'Watch both runs';
  }
  function actor(run, index) {
    return run.path[Math.min(index, run.path.length - 1)];
  }
  function path(run, reference) {
    const end = Math.min(t, run.path.length - 1),
      start = Math.max(0, end - 95);
    c.strokeStyle = reference ? '#c1cdd5' : lesson.delivery ? '#99d9fb' : '#ffd074';
    c.lineWidth = 2.3;
    c.setLineDash(reference ? [5, 5] : []);
    c.beginPath();
    for (let i = start; i <= end; i++) {
      const [x, y, jump] = run.path[i];
      if (i === start || jump) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    const [x, y] = actor(run, t);
    if (reference) {
      const s = run.run.items[lesson.refIndex].shape,
        angle = run.tape[Math.min(t, run.tape.length - 1)].poses[lesson.refIndex][2];
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.beginPath();
      if (s.kind === 'cargo') {
        const r = s.r + 2;
        c.moveTo(0, -r);
        c.lineTo(r, 0);
        c.lineTo(0, r);
        c.lineTo(-r, 0);
        c.closePath();
      } else if (s.r) c.arc(0, 0, s.r + 2, 0, Math.PI * 2);
      else c.rect(-s.w / 2, -s.h / 2, s.w, s.h);
      c.stroke();
      c.restore();
    }
  }
  function paint() {
    if (!lesson) return;
    const referenceOnly = answer === null,
      base = referenceOnly ? lesson.b : lesson.a;
    draw(c, atFrame(base.run, base.tape[Math.min(t, base.tape.length - 1)]));
    c.save();
    c.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    if (lesson.mode === 'input') {
      const vertical = lesson.axis === 0,
        x = vertical ? lesson.line : 12,
        y = vertical ? 14 : lesson.line;
      c.strokeStyle = '#cc9de1';
      c.lineWidth = 2;
      c.setLineDash([10, 4, 2, 4]);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(vertical ? x : WIDTH - 12, vertical ? HEIGHT - 12 : y);
      c.stroke();
      const ax = vertical ? x : WIDTH / 2,
        ay = vertical ? HEIGHT / 2 : y,
        dx = vertical ? lesson.dir : 0,
        dy = vertical ? 0 : lesson.dir;
      c.setLineDash([]);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(ax - 12 * dx, ay - 12 * dy);
      c.lineTo(ax + 12 * dx, ay + 12 * dy);
      c.lineTo(ax + 4 * dx - 5 * dy, ay + 4 * dy + 5 * dx);
      c.moveTo(ax + 12 * dx, ay + 12 * dy);
      c.lineTo(ax + 4 * dx + 5 * dy, ay + 4 * dy - 5 * dx);
      c.stroke();
      c.font = 'bold 13px ui-monospace,monospace';
      c.fillStyle = '#e2caec';
      c.fillText('TIMING LINE', Math.min(x + 4, WIDTH - 88), vertical ? 25 : y - 5);
    }
    path(lesson.b, true);
    if (!referenceOnly) path(lesson.a, false);
    if (!referenceOnly && lesson.mode === 'effect') {
      const A = actor(lesson.a, t),
        B = actor(lesson.b, t);
      c.strokeStyle = '#d5a7dd';
      c.lineWidth = 1.6;
      c.setLineDash([2, 4]);
      c.beginPath();
      c.moveTo(A[0], A[1]);
      if (lesson.axis) c.lineTo(A[0], B[1]);
      else c.lineTo(B[0], A[1]);
      c.stroke();
    }
    c.restore();
    slider.value = t;
    slider.setAttribute('aria-valuetext', clock(t));
    el('predict-time').value = clock(t);
    const axisName = lesson.axis ? 'y' : 'x',
      pos = (run) => axisName + ' ' + Math.round(actor(run, t)[lesson.axis]);
    el('predict-live').textContent = referenceOnly
      ? lesson.labels[1] + ' · ' + pos(lesson.b)
      : lesson.labels[0] + ' · ' + pos(lesson.a) + ' / ' + lesson.labels[1] + ' · ' + pos(lesson.b);
  }
  function progress() {
    const stats = book.counts();
    el('predict-progress').textContent =
      stats.correct + ' of ' + exercises.length + ' correct · ' + stats.tried + ' tried';
  }
  function rebuild() {
    stop();
    answer = null;
    t = 0;
    lesson = prediction(M, tool.value, mode.value);
    modal.classList.toggle('parcel-experiment', lesson.delivery);
    el('predict-primary').hidden = true;
    slider.max = lesson.end;
    el('predict-question').textContent = lesson.question;
    el('predict-primary').textContent = lesson.labels[0];
    el('predict-reference').textContent = lesson.labels[1];
    canvas.setAttribute(
      'aria-label',
      lesson.question + ' Solid path: ' + lesson.labels[0] + '. Dashed path: ' + lesson.labels[1] + '.',
    );
    el('predict-instruction').textContent =
      lesson.mode === 'effect'
        ? lesson.axis
          ? 'Compare vertical positions.'
          : 'Compare horizontal positions.'
        : 'Cross moving ' +
          (lesson.axis ? (lesson.dir > 0 ? 'down' : 'up') : lesson.dir > 0 ? 'right' : 'left') +
          '. Within one frame counts as together.';
    el('predict-result').textContent = '';
    el('predict-actions').hidden = true;
    el('predict-choices').replaceChildren(
      ...lesson.answers.map((label, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiet';
        btn.textContent = label;
        btn.dataset.answer = i;
        btn.addEventListener('click', () => submit(i));
        return btn;
      }),
    );
    progress();
    paint();
  }
  function submit(i) {
    if (answer !== null) return;
    stop();
    answer = i;
    const ok = i === lesson.correct;
    book.mark(lesson.kind, lesson.mode, ok);
    t = lesson.end;
    const buttons = el('predict-choices').children;
    for (let j = 0; j < buttons.length; j++) {
      const b = buttons[j];
      b.disabled = true;
      b.dataset.correct = String(j === lesson.correct);
      b.textContent = lesson.answers[j] + (j === lesson.correct ? ' ✓' : j === i ? ' · your pick' : '');
    }
    el('predict-result').textContent =
      (ok ? 'Correct. ' : 'Observed outcome: ' + lesson.answers[lesson.correct] + '. ') + lesson.result;
    el('predict-primary').hidden = false;
    el('predict-actions').hidden = false;
    el('predict-play').textContent = 'Watch both runs';
    progress();
    paint();
    el('predict-result').focus({ preventScroll: true });
    el('predict-result').scrollIntoView({ block: 'nearest' });
  }
  function animate(now) {
    origin ??= now - (t * 1000) / 60;
    t = Math.min(lesson.end, Math.floor(((now - origin) * 60) / 1000 + 1e-5));
    paint();
    if (t < lesson.end) raf = requestAnimationFrame(animate);
    else stop();
  }
  el('predict-play').addEventListener('click', () => {
    if (raf) {
      stop();
      return;
    }
    if (t >= lesson.end) t = 0;
    el('predict-play').textContent = 'Pause';
    raf = requestAnimationFrame(animate);
  });
  slider.addEventListener('input', () => {
    stop();
    t = slider.valueAsNumber;
    paint();
  });
  el('predict-again').addEventListener('click', () => {
    rebuild();
    el('predict-choices').firstElementChild.focus();
  });
  el('predict-next').addEventListener('click', () => {
    const next = book.next(tool.value, mode.value);
    tool.value = next.kind;
    mode.value = next.mode;
    rebuild();
    el('predict-question').focus({ preventScroll: true });
  });
  tool.addEventListener('change', rebuild);
  mode.addEventListener('change', rebuild);
  el('predict-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    stop();
    lesson = null;
    if (!nested) onClose?.();
    opener?.focus({ preventScroll: true });
  });
  function open(kind, button) {
    opener = button;
    nested = el('tool-lab').open;
    if (!nested) onOpen?.();
    tool.value = kind;
    mode.value = 'effect';
    modal.showModal();
    rebuild();
    tool.focus({ preventScroll: true });
  }
  el('lab-predict').addEventListener('click', () => open(el('lab-tool').value, el('lab-predict')));
  el('practice-predict').addEventListener('click', () =>
    open(el('practice-tool').value, el('practice-predict')),
  );
  return {
    close() {
      if (modal.open) modal.close();
    },
  };
}

import { parts, fittings, WIDTH, HEIGHT } from './machines.js';
import { atFrame, draw } from './drawing.js';
import { compareSpare, studyKey } from './spare-study.js';
const clock = (t) => (t / 60).toFixed(2) + ' s';
const sample = (r, t) => r.frames[Math.min(t, r.run.tick)];
export function setupSpareStudy(M, el) {
  const modal = el('spare-study'),
    canvas = el('study-diagram'),
    c = canvas.getContext('2d'),
    menu = el('study-spare');
  const memory = new Set();
  let machine,
    move,
    study = null,
    choice = null,
    t = 0;
  function marked(k) {
    try {
      return !!localStorage.getItem(k) || memory.has(k);
    } catch {
      return memory.has(k);
    }
  }
  function stored() {
    const key = studyKey(machine, move, Number(menu.value));
    el('study-record').textContent = marked(key + '.predicted')
      ? 'Prediction recorded for this fitting.'
      : marked(key + '.reviewed')
        ? 'Comparison reviewed for this fitting.'
        : '';
  }
  function paint() {
    if (!study) return;
    const f = sample(study.fitted, t),
      b = sample(study.bare, t),
      revealed = choice !== null,
      active = revealed ? study.bare : study.fitted,
      show = revealed ? b : f;
    draw(c, atFrame(active.run, show));
    if (revealed && el('study-overlay').checked) {
      c.save();
      c.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
      c.strokeStyle = '#edbce4';
      c.lineWidth = 2.4;
      c.setLineDash([5, 4]);
      const indices =
        study.kind === 'contacts'
          ? Object.values(study.fitted.film.actors)
          : [study.a];
      for (const index of indices) {
        const s = study.fitted.run.items[index].shape,
          [x, y, angle] = f.poses[index],
          r = s.r || 10,
          start = Math.max(0, f.tick - 45);
        const jumps = new Set(
          study.fitted.run.uses
            .filter((e) => e.kind === 'portal' && e.actor === s.kind)
            .map((e) => e.tick),
        );
        c.beginPath();
        for (let k = start; k <= f.tick; k++) {
          const [px, py] = study.fitted.frames[k].poses[index];
          if (k === start || jumps.has(k)) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.stroke();
        c.save();
        c.translate(x, y);
        c.rotate(angle);
        c.beginPath();
        if (s.kind === 'cargo') {
          c.moveTo(0, -r);
          c.lineTo(r, 0);
          c.lineTo(0, r);
          c.lineTo(-r, 0);
          c.closePath();
        } else if (s.r) c.arc(0, 0, r + 2, 0, Math.PI * 2);
        else c.rect(-s.w / 2, -s.h / 2, s.w, s.h);
        c.stroke();
        c.restore();
      }
      c.restore();
    }
    const axisLabel = study.axis === 0 ? 'x' : 'y';
    const reading =
      study.kind === 'contacts'
        ? 'Working · ' +
          f.hits.length +
          (revealed ? ' / Removed · ' + b.hits.length : '') +
          ' contacts'
        : 'Working ' +
          axisLabel +
          ' · ' +
          Math.round(f.poses[study.a][study.axis]) +
          (revealed
            ? ' / Removed ' +
              axisLabel +
              ' · ' +
              Math.round(b.poses[study.b][study.axis])
            : '');
    el('study-measure').textContent = reading;
    el('study-time').value = clock(t);
    el('study-frame').value = t;
    el('study-frame').setAttribute('aria-valuetext', clock(t));
    canvas.setAttribute('aria-label', reading + ' at ' + clock(t));
  }
  function answer(i) {
    if (!study || choice !== null) return;
    choice = i;
    t = study.tick;
    const correct = i === study.correct;
    const key =
      studyKey(machine, move, Number(menu.value)) +
      (correct ? '.predicted' : '.reviewed');
    memory.add(key);
    try {
      localStorage.setItem(key, '1');
    } catch {}
    el('study-result').textContent =
      (correct
        ? 'Correct. '
        : 'Your prediction was ' + study.answers[i].toLowerCase() + '. ') +
      study.result;
    el('study-mode').textContent = 'Spare removed';
    el('study-compare').hidden = false;
    for (const [n, b] of [...el('study-choices').children].entries()) {
      b.disabled = true;
      if (n === study.correct) b.dataset.answer = 'correct';
      b.setAttribute('aria-pressed', String(i === n));
    }
    stored();
    paint();
    el('study-result').focus({ preventScroll: true });
  }
  function select() {
    const reused = study?.fitted;
    study = compareSpare(M, machine, move, Number(menu.value), reused);
    choice = null;
    if (!study) {
      modal.close();
      return;
    }
    t = study.tick;
    el('study-goal').textContent = study.question;
    el('study-result').textContent = '';
    el('study-compare').hidden = true;
    el('study-overlay').checked = true;
    el('study-mode').textContent = 'Working setup';
    el('study-frame').max = study.end;
    el('study-choices').replaceChildren(
      ...study.answers.map((label, i) => {
        const b = document.createElement('button');
        b.className = 'quiet';
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', () => answer(i));
        return b;
      }),
    );
    stored();
    paint();
  }
  menu.addEventListener('change', select);
  el('study-frame').addEventListener('input', () => {
    t = Number(el('study-frame').value);
    paint();
  });
  el('study-overlay').addEventListener('change', paint);
  el('study-observe').addEventListener('click', () => {
    t = study.tick;
    paint();
  });
  el('study-retry').addEventListener('click', () => {
    select();
    el('study-choices').querySelector('button')?.focus();
  });
  el('study-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    study = null;
    choice = null;
    el('study-open').focus({ preventScroll: true });
  });
  const resize = new ResizeObserver(() => {
    const w = Math.round(
      canvas.clientWidth * Math.min(2, devicePixelRatio || 1),
    );
    if (w > 0 && canvas.width !== w) {
      canvas.width = w;
      canvas.height = Math.round((w * HEIGHT) / WIDTH);
      paint();
    }
  });
  resize.observe(canvas);
  return {
    close() {
      if (modal.open) modal.close();
    },
    open(m, repair) {
      const fits = fittings(m, repair);
      if (!fits.length) return;
      machine = m;
      move = repair;
      study = null;
      menu.replaceChildren(
        ...fits.map(
          (f) =>
            new Option(
              String.fromCharCode(65 + f.socket) + ' · ' + parts[f.part].name,
              f.socket,
            ),
        ),
      );
      el('study-machine').textContent = m.title;
      modal.showModal();
      select();
      el('study-goal').focus({ preventScroll: true });
    },
  };
}

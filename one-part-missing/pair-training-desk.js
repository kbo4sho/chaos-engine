import { parts } from './machines.js';
import {
  partnersFor,
  pairCourse,
  trainingRoute,
  trainingBook,
  contactReceipt,
  arrivalOrder,
} from './pair-training.js';
import { portableFile } from './portable.js';
import { challengeFile } from './challenge-file.js';

const time = (t) => (t / 60).toFixed(2) + ' s';
const pairTitle = (c) => parts[c.first].name + ' + ' + parts[c.second].name;
export function setupPairTraining(el, inspect) {
  const book = trainingBook(() => localStorage),
    tool = el('practice-tool'),
    partner = el('training-partner'),
    panel = el('training-panel'),
    choices = el('training-call');
  const links = Array.from(el('training-steps').querySelectorAll('a'));
  let mode = null,
    prediction = null,
    shown = null,
    busy = false;
  const selected = () => pairCourse(tool.value, partner.value);
  const pack = challengeFile(
    el('training-pack'),
    el('training-file'),
    el('training-file-status'),
    async () => {
      const c = selected();
      if (!c) return null;
      const blob = await portableFile(c.steps[0].machine, null, trainingRoute(c));
      return {
        blob,
        name: 'one-part-missing-' + c.first + '-' + c.second + '-practice.html',
        action: 'Save playable practice file',
        message: 'All three machines are ready to take offline.',
      };
    },
  );
  function picker() {
    const c = selected();
    if (!c) return;
    const done = c.steps.map((_, i) => Boolean(book.get(c, i))),
      next = done.indexOf(false);
    const a = el('training-enter');
    a.href = '#' + trainingRoute(c, next < 0 ? 0 : next);
    a.textContent =
      (next < 0
        ? 'Practice again'
        : next === 0
          ? 'Start three machines'
          : 'Resume at machine ' + (next + 1)) + ' →';
    el('training-program').textContent = c.steps.map((s) => s.machine.title).join(' → ');
    el('training-picker-progress').textContent = done.filter(Boolean).length + ' of 3 complete';
  }
  function updatePartners() {
    const old = partner.value;
    partner.replaceChildren(...partnersFor(tool.value).map((k) => new Option(parts[k].name, k)));
    if ([...partner.options].some((o) => o.value === old)) partner.value = old;
    pack.clear();
    picker();
  }
  tool.addEventListener('change', updatePartners);
  partner.addEventListener('change', () => {
    pack.clear();
    picker();
  });
  updatePartners();
  function forecastButtons() {
    if (!mode) return;
    for (const b of choices.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.prediction === prediction));
      b.disabled = busy || Boolean(shown);
    }
  }
  function refresh() {
    if (!mode) return;
    const { course: c, step, stage } = mode;
    const done = c.steps.map((_, i) => Boolean(book.get(c, i)));
    el('training-title').textContent = pairTitle(c);
    el('training-step-title').textContent =
      'Machine ' +
      (stage + 1) +
      ' of 3 · ' +
      (stage === 2
        ? 'Combine working spares'
        : step.grade === 'seen'
          ? 'Watch the installed tool'
          : 'Fit one working spare');
    el('training-brief').textContent =
      stage === 2
        ? 'Make a delivery in which both tools act. You can call the order of their first contacts before running.'
        : step.grade === 'seen'
          ? 'The ' +
            parts[step.targets[0]].name.toLowerCase() +
            ' is installed. Fit the missing spare and watch for it to open.'
          : parts[step.targets[0]].description +
            '. Deliver with this spare and catch its first contact.';
    links.forEach((a, i) => {
      const label = i === 2 ? 'Combine' : parts[c.steps[i].targets[0]].name;
      a.href = '#' + trainingRoute(c, i);
      a.textContent = (done[i] ? '✓ ' : '') + (i + 1) + ' · ' + label;
      if (i === stage) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
      a.setAttribute('aria-label', label + ', machine ' + (i + 1) + (done[i] ? ', completed' : ''));
    });
    el('training-progress').textContent = done.filter(Boolean).length + ' of 3 complete';
    choices.hidden = stage !== 2;
    const variant = el('training-alternate');
    variant.hidden = stage !== 2 || c.variants < 2;
    if (!variant.hidden) {
      const alternate = (c.variant + 1) % c.variants;
      variant.href = '#' + trainingRoute(c, 2, alternate);
      variant.textContent = 'Next combined machine · ' + (alternate + 1) + ' of ' + c.variants + ' →';
    }
    const next = el('training-next');
    next.hidden = !done[stage] || stage === 2;
    next.href = '#' + trainingRoute(c, Math.min(2, stage + 1));
    next.textContent = 'Next practice machine →';
    const result = el('training-result'),
      record = book.get(c, stage);
    if (shown) {
      const names = [...shown]
        .sort((a, b) => a.tick - b.tick)
        .map((e) => parts[e.kind].name + ' ' + time(e.tick))
        .join(' · ');
      result.textContent =
        (prediction
          ? prediction === arrivalOrder(shown)
            ? 'Correct call. '
            : arrivalOrder(shown) === 'same'
              ? 'Both tools acted on the same frame. '
              : parts[arrivalOrder(shown)].name + ' acted first. '
          : 'Delivery recorded. ') +
        names +
        '.';
    } else
      result.textContent = record
        ? 'Previously completed' + (record.called ? ' · correct contact order' : '') + '.'
        : '';
    forecastButtons();
  }
  function clearFilm() {
    shown = null;
    el('training-contacts').replaceChildren();
    if (mode) refresh();
  }
  function navigate(value) {
    mode = value;
    prediction = null;
    shown = null;
    busy = false;
    panel.hidden = !mode;
    el('training-contacts').replaceChildren();
    choices.replaceChildren();
    if (!mode) return;
    const { course: c, stage } = mode;
    if (stage === 2)
      for (const k of [c.first, c.second, 'same']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiet';
        b.dataset.prediction = k;
        b.textContent = k === 'same' ? 'Same frame' : parts[k].name + ' first';
        b.onclick = () => {
          prediction = k;
          forecastButtons();
        };
        choices.append(b);
      }
    refresh();
  }
  return {
    navigate,
    clearFilm,
    get active() {
      return Boolean(mode);
    },
    setBusy(value) {
      busy = value;
      forecastButtons();
    },
    delivered(move, run) {
      if (!mode) return;
      const contacts = contactReceipt(mode.step, move, run);
      if (!contacts) return;
      shown = contacts;
      book.save(mode.course, mode.stage, contacts, prediction);
      refresh();
      picker();
      el('training-contacts').replaceChildren(
        ...contacts.map(({ kind, tick }) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiet';
          b.textContent = 'Inspect ' + parts[kind].name + ' · frame ' + tick;
          b.onclick = () => inspect(tick);
          return b;
        }),
      );
    },
    next() {
      if (!mode) return false;
      if (mode.stage < 2) location.hash = trainingRoute(mode.course, mode.stage + 1);
      else {
        panel.scrollIntoView({ block: 'center' });
        links[2].focus({ preventScroll: true });
      }
      return true;
    },
    nextLabel() {
      return mode?.stage === 2 ? 'Practice results ↓' : 'Next practice machine →';
    },
    sync() {
      picker();
      refresh();
    },
  };
}

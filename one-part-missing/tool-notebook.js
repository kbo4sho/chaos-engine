import { parts, validMove, createRun, advance } from './machines.js';
import { practiceTargets } from './practice-targets.js';
import { toolEvents, grades, eventLine, evidencePrefix } from './tool-evidence.js';
import { recordSimulation } from './attempt-film.js';

const headings = {
  seen: 'Seen in a delivery',
  fitted: 'Fitted and working',
  combined: 'Combined with another spare',
};
const later = (ms) => new Promise((done) => setTimeout(done, ms));
export function toolNotebook(M, el, { campaign, book, source, films, evidence: log }) {
  const panel = el('practice'),
    menu = el('practice-tool'),
    section = el('tool-notebook');
  let personal = false,
    review = null,
    watch = null;
  const buttons = new Map();
  for (const grade of grades) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiet';
    button.dataset.eventGrade = grade;
    button.addEventListener('click', () => inspect(grade, button));
    el('tool-events').append(button);
    buttons.set(grade, button);
  }
  function draw() {
    section.hidden = !personal;
    if (!personal || !panel.open) return;
    const id = menu.value,
      rows = Object.fromEntries(grades.map((g) => [g, log.get(id, g)]));
    const score = Object.keys(parts).filter((k) => log.get(k, 'fitted')).length;
    el('tool-progress').textContent =
      score + ' of ' + Object.keys(parts).length + ' tools fitted in a working repair';
    for (const [g, b] of buttons) {
      const row = rows[g];
      const laterGrades = grades.slice(grades.indexOf(g) + 1);
      const sameFrame = laterGrades.some((other) => {
        const higher = rows[other];
        return (
          row &&
          higher &&
          row.machine === higher.machine &&
          row.tick === higher.tick &&
          JSON.stringify(row.move) === JSON.stringify(higher.move)
        );
      });
      b.hidden = !row || sameFrame;
      if (row)
        b.textContent = headings[g] + ' · ' + row.title + ' · ' + (row.tick / 60).toFixed(2) + ' s';
    }
    const best = rows.combined || rows.fitted || rows.seen;
    el('tool-event-note').textContent = best
      ? eventLine(best) + (best.partner ? ' · also used ' + parts[best.partner].name : '')
      : 'Complete a delivery in which this tool acts to record its first contact.';
    const [solo, mixed] = practiceTargets[id] || [[], []];
    const target = !rows.fitted && solo.length ? solo : !rows.combined && mixed.length ? mixed : [];
    const link = el('tool-practice-next');
    link.hidden = !target.length;
    if (target.length) {
      const results = book.read();
      const n =
        target.find((n) => !validMove(campaign[n - 1], results[campaign[n - 1].id])) || target[0];
      link.href = '#' + campaign[n - 1].id;
      link.textContent =
        (target === solo ? 'Fit this tool' : 'Combine working spares') +
        ' · ' +
        campaign[n - 1].title +
        ' →';
    }
    el('tool-next-untried').hidden = score === Object.keys(parts).length;
  }
  async function inspect(grade, button) {
    watch?.abort();
    const controller = new AbortController();
    watch = controller;
    const row = log.get(menu.value, grade);
    if (!row) return;
    el('tool-event-status').textContent = 'Opening the recorded contact…';
    try {
      const machine = await source(row.machine, controller.signal);
      if (controller.signal.aborted) return;
      if (!machine || !validMove(machine, row.move)) throw Error('Unavailable machine');
      const working = recordSimulation(M, machine, row.move);
      const matching = toolEvents(machine, row.move, working.run).some(
        (actual) =>
          actual.kind === row.kind &&
          actual.grade === row.grade &&
          actual.tick === row.tick &&
          actual.actor === row.actor &&
          actual.partner === row.partner,
      );
      if (!matching) throw Error('Changed machine');
      const empty = recordSimulation(M, machine);
      films.comparePair(working.film, empty.film, false, null, { row, machine, opener: button });
      el('tool-event-status').textContent = '';
    } catch {
      if (!controller.signal.aborted)
        el('tool-event-status').textContent =
          'This contact could not be replayed. Try its machine again.';
    }
  }
  function cancel() {
    review?.abort();
    review = null;
    watch?.abort();
    watch = null;
    el('tool-event-status').textContent = '';
  }
  async function recover() {
    if (!personal || !panel.open || review) return;
    const controller = new AbortController();
    review = controller;
    let recovered = 0,
      unavailable = false;
    const records = Object.entries(book.read()).filter(([, v]) => v && v.evidenceEligible !== false);
    for (const [id, move] of records) {
      if (controller.signal.aborted) break;
      try {
        if (log.processed(id, move)) continue;
        if (!recovered)
          el('tool-event-status').textContent = 'Checking saved repairs for working tools…';
        const machine = await source(id, controller.signal);
        if (controller.signal.aborted) break;
        if (!machine || !validMove(machine, move)) continue;
        const run = createRun(M, machine, move);
        while (run.state === 'running' && !controller.signal.aborted) {
          const until = performance.now() + 4;
          do {
            advance(M, run);
          } while (run.state === 'running' && performance.now() < until);
          if (run.state === 'running') await later(12);
        }
        if (controller.signal.aborted) break;
        if (run.state === 'won') log.record(machine, move, run);
        else log.mark(machine, move);
        recovered++;
        draw();
        await later(12);
      } catch {
        if (!controller.signal.aborted) unavailable = true;
      }
    }
    if (controller.signal.aborted) return;
    el('tool-event-status').textContent = unavailable
      ? 'Some saved machines could not be opened. Reopen practice to retry.'
      : recovered
        ? 'Checked ' + recovered + (recovered === 1 ? ' saved repair.' : ' saved repairs.')
        : '';
    review = null;
  }
  menu.addEventListener('change', () => {
    watch?.abort();
    draw();
  });
  el('tool-next-untried').addEventListener('click', () => {
    const ids = [...menu.options].map((o) => o.value),
      idx = ids.indexOf(menu.value);
    const next = [...ids.slice(idx + 1), ...ids.slice(0, idx + 1)].find((k) => !log.get(k, 'fitted'));
    if (next) {
      menu.value = next;
      menu.dispatchEvent(new Event('change'));
      menu.focus({ preventScroll: true });
    }
  });
  panel.addEventListener('toggle', () => {
    if (panel.open) {
      draw();
      void recover();
    } else cancel();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith(evidencePrefix)) draw();
  });
  return {
    refresh: draw,
    enter(enabled) {
      cancel();
      personal = Boolean(enabled);
      draw();
      if (personal && panel.open) void recover();
    },
    delivered(machine, move, run) {
      if (personal) {
        log.record(machine, move, run);
        draw();
      }
    },
  };
}

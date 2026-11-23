import { benchDrafts, draftPrefix } from './bench-drafts.js';
import { fittings, packedParts } from './machines.js';

export function draftDesk(el, { campaign, orders, decodePrint, restore }) {
  const store = benchDrafts(() => localStorage);
  const numbered = new Map(campaign.map((m, i) => [m.id, { machine: m, label: 'Level ' + (i + 1) }]));
  const work = new Map(orders.map((m, i) => [m.id, { machine: m, label: 'Order ' + (i + 1) }]));
  const panel = el('unfinished-repairs'),
    resume = el('resume-draft');
  let active = null,
    guided = false,
    revision = null,
    limit = 6,
    currentMove = null;

  function library() {
    if (!active) {
      panel.hidden = true;
      return;
    }
    const rows = store.list().flatMap((row) => {
      const known = numbered.get(row.id) || work.get(row.id);
      const machine = known?.machine;
      if (!machine && (!row.printed || !decodePrint(row.id))) return [];
      const count = machine ? fittings(machine, row.move).length : packedParts(row.move).length;
      if (!count) return [];
      return [
        {
          ...row,
          title: machine?.title || row.title,
          count,
          capacity: machine?.capacity || row.capacity,
          label: known?.label || 'Machine press',
        },
      ];
    });
    panel.hidden = !rows.length;
    el('draft-count').textContent = '· ' + rows.length;
    if (!panel.open) return;
    el('draft-list').replaceChildren(
      ...rows.slice(0, limit).map((row) => {
        const a = document.createElement('a'),
          title = document.createElement('strong'),
          info = document.createElement('small');
        a.href = '#resume/' + (row.guided ? 'learn/' : '') + row.id;
        title.textContent = row.title;
        info.textContent = row.label + ' · ' + row.count + ' of ' + row.capacity + ' fitted';
        a.append(title, info);
        a.addEventListener('click', (e) => {
          if (a.hash !== location.hash) return;
          e.preventDefault();
          resumeHere();
        });
        return a;
      }),
    );
    el('draft-more').hidden = rows.length <= limit;
  }
  function offer() {
    const draft = active && !currentMove && store.read(active);
    resume.hidden = !draft;
    if (draft) {
      const count = fittings(active, draft.move).length;
      resume.textContent = 'Resume ' + count + (count === 1 ? ' fitting' : ' fittings');
    }
  }
  function rememberEntry(id) {
    try {
      history.replaceState({ ...history.state, benchDraft: id }, '');
    } catch {}
  }
  function take() {
    const saved = active && store.read(active);
    if (!saved) return null;
    revision = saved.revision;
    currentMove = saved.move;
    rememberEntry(active.id);
    offer();
    return saved;
  }
  function resumeHere() {
    const draft = take();
    if (draft) restore(draft);
    else offer();
  }
  function release() {
    if (active) store.clear(active.id, revision);
    revision = null;
    if (history.state?.benchDraft) rememberEntry(null);
    library();
    offer();
  }
  resume.addEventListener('click', resumeHere);
  panel.addEventListener('toggle', library);
  el('draft-more').addEventListener('click', () => {
    limit += 6;
    library();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith(draftPrefix)) {
      library();
      offer();
    }
  });
  return {
    enter(machine, isGuided, auto) {
      active = machine;
      guided = isGuided;
      revision = null;
      currentMove = null;
      limit = 6;
      const saved = active && (auto || history.state?.benchDraft === active.id) ? take() : null;
      library();
      offer();
      return saved;
    },
    edited(move, history) {
      if (!active) return;
      currentMove = move;
      if (!move) {
        release();
        return;
      }
      revision = store.save(
        active,
        move,
        history,
        guided,
        !numbered.has(active.id) && !work.has(active.id),
      );
      rememberEntry(active.id);
      offer();
      library();
    },
    delivered() {
      if (active) release();
    },
    busy(value) {
      resume.disabled = value;
    },
  };
}

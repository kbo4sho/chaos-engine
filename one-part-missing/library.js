import { campaign, chapters } from './campaign.js';
import { lessons, lessonById, lessonLink } from './learning.js';
import { orders, orderGroups, orderById } from './work-orders.js';
import { indexedTools, workingParts } from './library-index.js';
import { parts, validMove } from './machines.js';

const fold = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const titles = [...campaign, ...orders].map((machine, i) => {
  const isOrder = i >= campaign.length,
    n = isOrder ? i - campaign.length + 1 : i + 1;
  const group = isOrder ? orderGroups[Math.floor((n - 1) / 6)] : chapters[Math.floor(i / 10)][0];
  const tools = (workingParts[i] || '')
    .split('.')
    .filter(Boolean)
    .map((k) => indexedTools[parseInt(k, 36)]);
  const label = (isOrder ? 'Order ' : 'Level ') + n,
    lessonNo = (lessonById.get(machine.id) ?? -1) + 1;
  return {
    machine,
    n,
    isOrder,
    group,
    tools,
    label,
    lessonNo,
    terms: fold(
      [
        label,
        lessonNo ? 'lesson' : '',
        group,
        machine.title,
        ...tools.flatMap((k) => [k, parts[k].name]),
      ].join(' '),
    ).split(' '),
  };
});
export function findLevels(query, scope, unfinished, records = {}) {
  const words = fold(query).split(' ').filter(Boolean);
  return titles.filter(({ machine, isOrder, terms, n, lessonNo }) => {
    if (
      (scope === 'orders' && !isOrder) ||
      (scope === 'campaign' && isOrder) ||
      (scope === 'lessons' && !lessonById.has(machine.id))
    )
      return false;
    if (unfinished && validMove(machine, records[machine.id])) return false;
    return words.every((w) =>
      /^\d+$/.test(w)
        ? ((scope === 'lessons' || words.includes('lesson')) && !words.includes('level')
            ? lessonNo
            : n) === Number(w)
        : terms.some((t) => t.startsWith(w)),
    );
  });
}
const itinerary = {
  learn: lessons.map((l) => l.machine),
  numbered: campaign,
  orders,
};
export const positionKey = 'chaos.one-part-missing.route.v1';
export function startRoute(position, records) {
  let which = position?.route;
  if (!Object.hasOwn(itinerary, which))
    which = campaign.some((m) => validMove(m, records[m.id])) ? 'numbered' : 'learn';
  const path = itinerary[which],
    index = Math.max(
      0,
      path.findIndex((m) => m.id === position?.id),
    );
  const candidates = path.slice(index).concat(path.slice(0, index));
  const m = candidates.find((m) => !validMove(m, records[m.id])) || path[index];
  return which === 'learn' ? lessonLink(m.id).slice(1) : m.id;
}
export function chooseStart(records) {
  let prior;
  try {
    prior = JSON.parse(localStorage.getItem(positionKey));
  } catch {}
  return startRoute(prior, records);
}
export function rememberRoute(m, guided) {
  const route = guided
    ? 'learn'
    : orderById.has(m.id)
      ? 'orders'
      : campaign.includes(m)
        ? 'numbered'
        : null;
  if (route)
    try {
      localStorage.setItem(positionKey, JSON.stringify({ route, id: m.id }));
    } catch {}
}
export function setupFinder(el) {
  const query = el('find-query'),
    mode = el('find-scope'),
    unfinished = el('find-unfinished'),
    list = el('find-list'),
    panel = el('finder');
  let records = {},
    shown = 12;
  function render() {
    if (!panel.open) return;
    const rows = findLevels(query.value, mode.value, unfinished.checked, records);
    const displayed = rows.slice(0, shown);
    el('find-count').textContent =
      rows.length === 0
        ? 'No matching machines.'
        : rows.length === 1
          ? '1 match'
          : displayed.length + ' of ' + rows.length + ' matches';
    el('find-more').hidden = shown >= rows.length;
    list.replaceChildren(
      ...displayed.map(({ machine, group, label, tools, lessonNo }) => {
        const a = document.createElement('a'),
          name = document.createElement('strong'),
          meta = document.createElement('small'),
          hardware = document.createElement('span');
        a.className = 'find-result';
        const guided =
          lessonNo && (mode.value === 'lessons' || fold(query.value).split(' ').includes('lesson'));
        a.href = guided ? lessonLink(machine.id) : '#' + machine.id;
        name.textContent = machine.title;
        meta.textContent =
          (guided ? 'Lesson ' + lessonNo + ' · ' : '') +
          label +
          ' · ' +
          group +
          (validMove(machine, records[machine.id]) ? ' · repaired' : '');
        hardware.textContent = tools.map((k) => parts[k].name).join(' · ');
        a.append(meta, name, hardware);
        return a;
      }),
    );
  }
  const reset = () => {
    shown = 12;
    render();
  };
  query.addEventListener('input', reset);
  mode.addEventListener('change', reset);
  unfinished.addEventListener('change', reset);
  panel.addEventListener('toggle', render);
  el('find-more').addEventListener('click', () => {
    const first = shown;
    shown += 12;
    render();
    list.children[first]?.focus({ preventScroll: true });
  });
  return {
    update(book) {
      records = book;
      render();
    },
  };
}

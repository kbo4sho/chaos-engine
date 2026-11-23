import { orders, orderGroups, fitCode, orderLog } from './work-orders.js';
import { fittings, parts, validMove } from './machines.js';

export function setupOrders(el, load) {
  const log = orderLog(() => localStorage),
    map = el('order-map'),
    group = el('order-group');
  orderGroups.forEach((name, i) => group.add(new Option(name, i)));
  let active = null,
    saved = {},
    scores = {};
  function renderMap() {
    const groupIndex = Number(group.value);
    el('order-list').replaceChildren(
      ...orders.slice(groupIndex * 6, groupIndex * 6 + 6).map((m) => {
        const a = document.createElement('a'),
          num = document.createElement('span'),
          title = document.createElement('strong'),
          mark = document.createElement('span');
        a.className = 'shelf-item';
        a.href = '#' + m.id;
        num.className = 'shelf-num';
        num.textContent = String(m.orderIndex + 1).padStart(2, '0');
        title.textContent = m.title;
        mark.className = 'check';
        mark.textContent = validMove(m, saved[m.id]) ? '✓' : '';
        if (m === active) a.setAttribute('aria-current', 'page');
        a.append(num, title, mark);
        return a;
      }),
    );
  }
  for (const role of ['economy', 'speed']) {
    el('order-' + role + '-load').addEventListener('click', () => {
      if (scores[role]) load(scores[role].move);
    });
  }
  group.addEventListener('change', renderMap);
  function showMap() {
    map.open = true;
    map.scrollIntoView({ block: 'start' });
    group.focus({ preventScroll: true });
  }
  function refresh(m) {
    active = m;
    el('order-card').hidden = !m.contract;
    if (!m.contract) {
      scores = {};
      return;
    }
    scores = log.records(m);
    for (const role of ['economy', 'speed']) {
      const r = scores[role],
        result = el('order-' + role + '-value'),
        fit = el('order-' + role + '-load');
      fit.hidden = !r;
      result.textContent = r
        ? role === 'economy'
          ? r.count + (r.count === 1 ? ' part' : ' parts') + ' · ' + (r.tick / 60).toFixed(2) + ' s'
          : (r.tick / 60).toFixed(2) + ' s · ' + r.count + (r.count === 1 ? ' part' : ' parts')
        : 'Awaiting delivery';
      if (r) {
        const list = fittings(m, r.move)
          .map((f) => String.fromCharCode(65 + f.socket) + ' · ' + parts[f.part].name)
          .join(', ');
        fit.setAttribute(
          'aria-label',
          'Fit ' + (role === 'economy' ? 'fewest-parts' : 'fastest') + ' setup: ' + list,
        );
        fit.title = list;
      }
    }
  }
  return {
    showMap,
    refresh,
    navigate(m) {
      if (m.contract) group.value = String(Math.floor(m.orderIndex / 6));
      refresh(m);
    },
    updateMap(m, records) {
      active = m;
      saved = records;
      el('order-progress').textContent =
        orders.filter((o) => validMove(o, saved[o.id])).length + ' of ' + orders.length + ' delivered';
      renderMap();
    },
    controls(m, move, busy) {
      if (!m.contract) return;
      el('share-setup').disabled = busy || !fitCode(m, move);
      for (const role of ['economy', 'speed']) el('order-' + role + '-load').disabled = busy;
    },
    save(m, move, tick) {
      log.save(m, move, tick);
      refresh(m);
    },
    isRecord(m, move) {
      if (!m.contract || !move) return false;
      const code = fitCode(m, move);
      return Object.values(scores).some((r) => r?.code === code);
    },
  };
}

import { createRun, WIDTH, HEIGHT, LIMIT } from './machines.js';
import { draw } from './drawing.js';
import { receiverOpen } from './transmissions.js';
import { diagramGroups, diagramEntries, hitsAt, nearby } from './machine-diagram.js';

export function setupDiagram(M, el, { context, pause, chooseSocket }) {
  const modal = el('machine-reader'),
    pick = el('reader-item'),
    canvas = el('reader-diagram'),
    ctx = canvas.getContext('2d'),
    range = el('reader-frame');
  let session = null,
    entry = null,
    tick = 0,
    overlaps = [],
    nearest = null,
    fitNext = false;
  function paint() {
    if (!session || !entry) return;
    draw(ctx, { ...session.run, tick });
    ctx.save();
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    for (const r of session.entries.filter((v) => v.group === 'sockets')) {
      const { x, y } = r.shape;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#0c181e';
      ctx.fill();
      ctx.strokeStyle = '#75e3ea';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#dffcff';
      ctx.fillText(String.fromCharCode(65 + r.index), x, y);
    }
    const s = entry.shape,
      rx = Math.max(12, s.r ?? (s.w || 20) / 2) + 5,
      ry = Math.max(12, s.r ?? (s.h || 20) / 2) + 5;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.a || 0);
    ctx.strokeStyle = '#081116';
    ctx.lineWidth = 5;
    ctx.strokeRect(-rx, -ry, 2 * rx, 2 * ry);
    ctx.strokeStyle = '#ffe7a3';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 3]);
    ctx.strokeRect(-rx, -ry, 2 * rx, 2 * ry);
    ctx.restore();
  }
  function clock() {
    const visible = Boolean(entry?.shape.window);
    el('reader-clock').hidden = !visible;
    if (visible) {
      const open = receiverOpen(entry.shape, tick),
        text = 'Frame ' + tick + ' · ' + (tick / 60).toFixed(2) + ' s · ' + (open ? 'open' : 'closed');
      range.value = String(tick);
      range.setAttribute('aria-valuetext', text);
      el('reader-clock-time').value = text;
      const win = entry.windows.find(([from, to]) => from <= tick && tick <= to);
      el('reader-window').textContent = win
        ? 'Open on frames ' + win[0] + '–' + win[1] + '.'
        : 'The receiver is closed on this frame.';
      el('reader-next-window').disabled = !entry.windows.length;
      el('reader-last-open').disabled = !entry.windows.length;
    }
    paint();
  }
  function select(item, resetHit = true) {
    if (!item) return;
    entry = item;
    tick = 0;
    pick.value = entry.id;
    if (resetHit) overlaps = [];
    const i = session.entries.indexOf(entry);
    el('reader-previous').disabled = i === 0;
    el('reader-next').disabled = i === session.entries.length - 1;
    el('reader-count').textContent = i + 1 + ' of ' + session.entries.length;
    el('reader-name').textContent = entry.label;
    el('reader-position').textContent = entry.location;
    el('reader-notes').textContent = entry.notes.join(' ');
    canvas.setAttribute(
      'aria-label',
      session.machine.title + ' at release. Selected ' + entry.label + ', ' + entry.location + '.',
    );
    const other = entry.group === 'receivers' ? 'sockets' : 'receivers';
    nearest = nearby(session.entries, entry, other);
    const jump = el('reader-nearest');
    jump.hidden = !nearest;
    if (nearest)
      jump.textContent =
        'Nearest ' + (other === 'sockets' ? 'socket' : 'receiver') + ' · ' + nearest.text;
    el('reader-choose').hidden = entry.group !== 'sockets' || !session.canFit;
    if (!el('reader-choose').hidden)
      el('reader-choose').textContent = 'Choose a spare for ' + entry.label;
    el('reader-overlap').hidden = overlaps.length < 2;
    if (overlaps.length > 1)
      el('reader-overlap').textContent =
        'Next at this point · ' + (overlaps.indexOf(entry) + 1) + ' of ' + overlaps.length;
    clock();
  }
  function open(opener) {
    const { machine, move, canFit, resume } = context();
    if (!machine || session) return;
    if (resume) pause(true);
    const entries = diagramEntries(machine, move);
    session = { machine, opener, resume, canFit, entries, run: createRun(M, machine, move) };
    fitNext = false;
    overlaps = [];
    el('reader-machine').textContent = machine.title;
    pick.replaceChildren(
      ...Object.entries(diagramGroups).flatMap(([key, name]) => {
        const rows = entries.filter((e) => e.group === key);
        if (!rows.length) return [];
        const group = document.createElement('optgroup');
        group.label = name;
        for (const e of rows) group.append(new Option(e.label, e.id));
        return [group];
      }),
    );
    select(entries[0]);
    modal.showModal();
    pick.focus({ preventScroll: true });
  }
  for (const id of ['reader-open', 'focus-reader'])
    el(id).addEventListener('click', (event) => open(event.currentTarget));
  pick.addEventListener('change', () => select(session.entries.find((e) => e.id === pick.value)));
  el('reader-previous').onclick = () => select(session.entries[session.entries.indexOf(entry) - 1]);
  el('reader-next').onclick = () => select(session.entries[session.entries.indexOf(entry) + 1]);
  el('reader-nearest').onclick = () => select(nearest?.entry);
  el('reader-overlap').onclick = () =>
    select(overlaps[(overlaps.indexOf(entry) + 1) % overlaps.length], false);
  el('reader-choose').onclick = () => {
    fitNext = true;
    closeReader();
  };
  el('reader-close').onclick = closeReader;
  function closeReader() {
    modal.close();
    finishClose();
  }
  canvas.addEventListener('click', (e) => {
    const box = canvas.getBoundingClientRect();
    const x = ((e.clientX - box.left) * WIDTH) / box.width,
      y = ((e.clientY - box.top) * HEIGHT) / box.height;
    const hits = hitsAt(session.entries, x, y, Math.min(20, (8 * WIDTH) / box.width));
    if (!hits.length) return;
    const same = hits.length === overlaps.length && hits.every((r, i) => r === overlaps[i]);
    overlaps = hits;
    select(same ? hits[(hits.indexOf(entry) + 1) % hits.length] : hits[0], false);
  });
  range.max = String(LIMIT);
  range.addEventListener('input', () => {
    tick = Number(range.value);
    clock();
  });
  el('reader-next-window').onclick = () => {
    tick = (entry.windows.find(([a]) => a > tick) || entry.windows[0])[0];
    clock();
  };
  el('reader-last-open').onclick = () => {
    tick = (entry.windows.find(([, b]) => b >= tick) || entry.windows[0])[1];
    clock();
  };
  function finishClose() {
    if (!session || modal.open) return;
    const previous = session,
      index = entry.index;
    session = null;
    entry = null;
    if (previous.machine !== context().machine) return;
    if (previous.resume) pause(false);
    if (fitNext) chooseSocket(index);
    else if (previous.opener.isConnected) previous.opener.focus({ preventScroll: true });
  }
  modal.addEventListener('close', finishClose);
  return {
    dismiss() {
      session = null;
      entry = null;
      fitNext = false;
      if (modal.open) modal.close();
    },
  };
}

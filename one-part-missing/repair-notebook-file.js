import {
  advance,
  createRun,
  fittings,
  packFittings,
  packedParts,
  parts,
  validMove,
} from './machines.js';
import { grades, toolEvents } from './tool-evidence.js';

const format = 'one-part-missing-repair-notebook';
export const maxNotebookBytes = 2 * 1024 * 1024;
const limits = { repairs: 600, contacts: 162, orders: 48, drafts: 600 };
const nextFrame = () => new Promise((done) => setTimeout(done, 0));
const mark = (row) => row.id + '/' + row.fit;
function fitText(move) {
  return packedParts(move)
    .map((f) => f.socket + '.' + f.part + (f.flipped ? '~' : ''))
    .join(',');
}
function readFit(machine, text) {
  if (typeof text !== 'string' || !/^(\d{1,2}\.[a-z]+~?)(,\d{1,2}\.[a-z]+~?){0,2}$/.test(text))
    return null;
  const rows = text.split(',').map((item) => {
    const [socket, name] = item.split('.');
    return {
      socket: Number(socket),
      part: name.replace(/~$/, ''),
      ...(name.endsWith('~') ? { flipped: true } : {}),
    };
  });
  const move = packFittings(rows);
  return fittings(machine, move).length === rows.length && fitText(move) === text ? move : null;
}
function unique(rows) {
  return [...new Map(rows.map((r) => [mark(r), r])).values()];
}
export function notebookFile({ book, drafts, evidence, orderBook, orders, known }) {
  const repairs = Object.entries(book.read())
    .filter(([id, m]) => known(id) && m?.part)
    .map(([id, m]) => ({
      id,
      fit: fitText(m),
      ...(m.evidenceEligible === false ? { borrowed: true } : {}),
    }));
  const byFitting = new Map();
  for (const kind of Object.keys(parts))
    for (const grade of grades) {
      const r = evidence.get(kind, grade);
      if (!r || !known(r.machine)) continue;
      const row = { id: r.machine, fit: fitText(r.move) },
        key = mark(row);
      if (!byFitting.has(key)) byFitting.set(key, { ...row, marks: [] });
      byFitting.get(key).marks.push(kind + '.' + grade);
    }
  const contacts = [...byFitting.values()];
  const scores = unique(
    orders.flatMap((m) =>
      Object.values(orderBook.records(m))
        .filter(Boolean)
        .map((r) => ({ id: m.id, fit: fitText(r.move) })),
    ),
  );
  const unfinished = drafts
    .list()
    .filter((r) => known(r.id))
    .map((r) => ({
      id: r.id,
      fit: fitText(r.move),
      guided: Boolean(r.guided),
      undo: (Array.isArray(r.history) ? r.history : [])
        .slice(-32)
        .map((fit) => (fit ? fitText(fit) : null)),
    }));
  return { format, version: 1, repairs, contacts, orders: scores, drafts: unfinished };
}
export function readNotebook(text) {
  if (typeof text !== 'string' || text.length > maxNotebookBytes)
    throw Error('Choose a notebook smaller than 2 MB.');
  let value;
  try {
    value = JSON.parse(text);
  } catch {}
  if (
    value?.format !== format ||
    value.version !== 1 ||
    Object.entries(limits).some(([k, max]) => !Array.isArray(value[k]) || value[k].length > max)
  )
    throw Error('Choose a One Part Missing repair notebook (.json).');
  return value;
}
const fitKey = (x) =>
  x && typeof x.id === 'string' && x.id.length <= 100 && typeof x.fit === 'string' && x.fit.length <= 85;
export async function inspectNotebook(
  file,
  { source, known, orderById, signal, progress = () => {}, M },
) {
  const groups = new Map(),
    result = { repairs: [], contacts: [], orders: [], drafts: [], skipped: 0 };
  for (const role of Object.keys(limits))
    for (const row of file[role]) {
      if (!fitKey(row) || !known(row.id) || (role === 'orders' && !orderById.has(row.id))) {
        result.skipped++;
        continue;
      }
      if (!groups.has(row.id)) groups.set(row.id, []);
      groups.get(row.id).push({ role, row });
    }
  let count = 0;
  for (const [id, entries] of groups) {
    signal.throwIfAborted();
    progress(++count, groups.size);
    let machine;
    try {
      machine = await source(id, signal);
    } catch {
      signal.throwIfAborted();
    }
    if (!machine) {
      result.skipped += entries.length;
      continue;
    }
    const checked = new Map();
    for (const { role, row } of entries) {
      const move = readFit(machine, row.fit);
      if (!move) {
        result.skipped++;
        continue;
      }
      if (role === 'drafts') {
        if (!Array.isArray(row.undo) || row.undo.length > 32 || typeof row.guided !== 'boolean') {
          result.skipped++;
          continue;
        }
        const history = row.undo.map((f) => (f === null ? null : readFit(machine, f)));
        if (history.some((v, i) => !v && row.undo[i] !== null)) {
          result.skipped++;
          continue;
        }
        result.drafts.push({ machine, move, history, guided: row.guided });
      } else {
        if (!validMove(machine, move)) {
          result.skipped++;
          continue;
        }
        if (!checked.has(row.fit)) {
          const run = createRun(M, machine, move);
          while (run.state === 'running') {
            signal.throwIfAborted();
            const end = performance.now() + 8;
            do {
              advance(M, run);
            } while (run.state === 'running' && performance.now() < end);
            if (run.state === 'running') await nextFrame();
          }
          checked.set(
            row.fit,
            run.state === 'won'
              ? { machine, move, tick: run.tick, events: toolEvents(machine, move, run) }
              : null,
          );
        }
        const win = checked.get(row.fit);
        if (!win) {
          result.skipped++;
          continue;
        }
        if (role === 'contacts') {
          if (!Array.isArray(row.marks) || row.marks.length > 162) {
            result.skipped++;
            continue;
          }
          const events = win.events.filter((e) => row.marks.includes(e.kind + '.' + e.grade));
          if (events.length) result.contacts.push({ ...win, events });
          else result.skipped++;
        } else result[role].push({ ...win, borrowed: row.borrowed === true });
      }
    }
    await nextFrame();
  }
  signal.throwIfAborted();
  return result;
}
// Local work wins a collision. Extra tool contacts and work-order scores can
// still be recovered from a different successful fitting on the same machine.
export function mergeNotebook(result, { book, drafts, evidence, orderBook, printed, lesson }) {
  let repairs = 0,
    unfinished = 0,
    contacts = 0,
    scores = 0,
    kept = 0,
    full = 0;
  const existing = book.read();
  const savedPrints = new Set(Object.keys(existing).filter(printed));
  const draftPrints = new Set(
    drafts
      .list()
      .map((r) => r.id)
      .filter(printed),
  );
  for (const r of result.repairs) {
    const id = r.machine.id;
    if (printed(id) && !savedPrints.has(id) && savedPrints.size >= 32) {
      full++;
      continue;
    }
    if (validMove(r.machine, existing[id])) {
      kept++;
      continue;
    }
    book.save(id, r.move, r.tick, !r.borrowed);
    existing[id] = r.move;
    if (printed(id)) savedPrints.add(id);
    repairs++;
  }
  for (const r of [...result.contacts, ...result.repairs.filter((r) => !r.borrowed)])
    contacts += evidence.remember(r.events);
  for (const r of result.orders) {
    const old = orderBook.records(r.machine);
    orderBook.save(r.machine, r.move, r.tick);
    if (JSON.stringify(old) !== JSON.stringify(orderBook.records(r.machine))) scores++;
  }
  for (const r of result.drafts) {
    const id = r.machine.id,
      isPrint = printed(id);
    if (isPrint && !draftPrints.has(id) && draftPrints.size >= 24) {
      full++;
      continue;
    }
    if (drafts.read(r.machine)) {
      kept++;
      continue;
    }
    drafts.save(r.machine, r.move, r.history, r.guided && lesson(id), isPrint);
    if (isPrint) draftPrints.add(id);
    unfinished++;
  }
  return { repairs, unfinished, contacts, scores, kept, full, skipped: result.skipped };
}

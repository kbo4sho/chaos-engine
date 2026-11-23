import { fittings, packFittings } from './machines.js';

export const draftPrefix = 'chaos.one-part-missing.draft.v1.';
const limit = 32;
const fits = (machine, move) => packFittings(fittings(machine, move));

function unpack(value) {
  try {
    const record = JSON.parse(value);
    return record && typeof record === 'object' && record.move && Number.isFinite(record.at)
      ? record
      : null;
  } catch {
    return null;
  }
}

export function benchDrafts(getStorage) {
  const session = new Map();
  function raw(id) {
    if (session.has(id)) return session.get(id);
    try {
      return getStorage().getItem(draftPrefix + id);
    } catch {
      return null;
    }
  }
  function write(id, value) {
    session.set(id, value);
    try {
      const storage = getStorage();
      if (value === null) storage.removeItem(draftPrefix + id);
      else storage.setItem(draftPrefix + id, value);
      session.delete(id);
    } catch {
      /* A blocked browser still keeps this bench for the current visit. */
    }
  }
  function list() {
    const ids = new Set(session.keys());
    try {
      const storage = getStorage();
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(draftPrefix)) ids.add(key.slice(draftPrefix.length));
      }
    } catch {}
    return [...ids]
      .flatMap((id) => {
        const value = unpack(raw(id));
        return value ? [{ ...value, id }] : [];
      })
      .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  }
  function read(machine) {
    const revision = raw(machine.id),
      record = unpack(revision);
    if (!record) return null;
    const move = fits(machine, record.move);
    if (!move) return null;
    const history = (Array.isArray(record.history) ? record.history.slice(-limit) : []).flatMap(
      (item) => {
        if (item === null) return [null];
        const valid = fits(machine, item);
        return valid ? [valid] : [];
      },
    );
    return { move, history, revision };
  }
  function save(machine, move, history, guided, printed) {
    const normal = fits(machine, move);
    if (!normal) return null;
    const newPrint = printed && !raw(machine.id);
    const value = JSON.stringify({
      move: normal,
      history: history.slice(-limit),
      guided,
      printed,
      capacity: machine.capacity || 1,
      title: machine.title,
      at: Date.now(),
    });
    write(machine.id, value);
    if (newPrint) {
      const older = list()
        .filter((row) => row.printed && row.id !== machine.id)
        .slice(23);
      for (const row of older) write(row.id, null);
    }
    return value;
  }
  function clear(id, revision) {
    if (revision && raw(id) === revision) write(id, null);
  }
  return { read, list, save, clear };
}

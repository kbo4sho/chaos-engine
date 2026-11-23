export const doublePrefix = 'chaos.one-part-missing.double.v1.';
// Keep one receipt per combination. Finishing one shutter on each of two
// different runs never counts as a complete pair.
export function doubleRecords(getStorage) {
  const memory = new Map();
  function best(rig) {
    let top = null;
    for (const [a] of rig.controls[0].values.entries())
      for (const [b] of rig.controls[1].values.entries()) {
        const key = doublePrefix + (rig.sheet || rig.id) + '.' + a + '.' + b;
        let raw = memory.get(key);
        if (!raw) {
          try {
            raw = getStorage().getItem(key);
          } catch {}
        }
        if (!raw) continue;
        try {
          const [count, error] = JSON.parse(raw);
          if (!Number.isInteger(count) || count < 1 || count > 2 || !Number.isFinite(error) || error < 0)
            continue;
          if (!top || count > top.count || (count === top.count && error < top.error))
            top = { settings: [a, b], count, error };
        } catch {}
      }
    return top;
  }
  function save(rig, settings, tape) {
    if (!tape.count) return;
    const key = doublePrefix + (rig.sheet || rig.id) + '.' + settings.join('.');
    const raw = JSON.stringify([
      tape.count,
      Math.round(tape.receipts.reduce((sum, r) => sum + Math.hypot(r.dx, r.dy), 0) * 100) / 100,
    ]);
    memory.set(key, raw);
    try {
      getStorage().setItem(key, raw);
      memory.delete(key);
    } catch {}
  }
  return { best, save };
}

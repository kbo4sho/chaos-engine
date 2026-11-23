// One key per route lets replies from different tabs coexist. The small book
// only remembers work-order addresses and when they were last opened.
export const racePrefix = 'chaos.one-part-missing.race.v1.';
export function raceBook(getStorage, limit = 12) {
  const memory = new Map();
  function rows() {
    const entries = new Map();
    const add = (route, value) => {
      if (!/^race\/1\/order-[a-z-]+\/[a-z0-9.]{1,5}(\/[a-z0-9.]{1,5})?$/.test(route)) return;
      try {
        const [at, source] = JSON.parse(value);
        if (Number.isSafeInteger(at) && at >= 0 && ['sent', 'opened', 'returned'].includes(source)) {
          const existing = entries.get(route);
          if (!existing || at >= existing.at) entries.set(route, { route, at, source });
        }
      } catch {}
    };
    try {
      const store = getStorage();
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key?.startsWith(racePrefix)) add(key.slice(racePrefix.length), store.getItem(key));
      }
    } catch {}
    for (const [route, value] of memory) add(route, value);
    return [...entries.values()].sort((a, b) => b.at - a.at || a.route.localeCompare(b.route));
  }
  function keep(route, source, now = Date.now()) {
    const previous = rows().find((r) => r.route === route);
    const value = JSON.stringify([now, previous?.source === 'sent' ? 'sent' : source]);
    memory.set(route, value);
    try {
      getStorage().setItem(racePrefix + route, value);
      memory.delete(route);
    } catch {}
    for (const stale of rows().slice(limit)) {
      memory.delete(stale.route);
      try {
        getStorage().removeItem(racePrefix + stale.route);
      } catch {}
    }
  }
  return { keep, recent: () => rows().slice(0, limit) };
}

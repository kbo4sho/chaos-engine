import { campaignById } from './campaign.js';
import { decodePrint } from './workshop.js';

const legacyKey = 'chaos.one-part-missing.repairs.v1';
export const repairPrefix = 'chaos.one-part-missing.repair.';
const maxPrints = 32;

function readObject(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Each machine owns its storage entry. A win in one tab cannot replace a
// different machine's replay in another tab.
export function repairBook(getStorage) {
  const session = new Map();
  function read() {
    const result = {};
    try {
      const storage = getStorage();
      Object.assign(result, readObject(storage.getItem(legacyKey)));
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(repairPrefix)) continue;
        const record = readObject(storage.getItem(key));
        if (record) result[key.slice(repairPrefix.length)] = record;
      }
    } catch {
      /* Storage can be unavailable for a local file. */
    }
    return { ...result, ...Object.fromEntries(session) };
  }
  function save(id, move, tick) {
    const record = {
      part: move.part,
      socket: move.socket,
      ...(move.flipped ? { flipped: true } : {}),
      tick,
      savedAt: Date.now(),
    };
    session.set(id, record);
    try {
      const storage = getStorage();
      storage.setItem(repairPrefix + id, JSON.stringify(record));
      session.delete(id);
      const otherPrints = Object.entries(read())
        .filter(([key]) => key !== id && !campaignById.has(key) && decodePrint(key))
        .sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));
      for (const [key] of otherPrints.slice(campaignById.has(id) ? maxPrints : maxPrints - 1))
        storage.removeItem(repairPrefix + key);
    } catch {
      const prints = [...session.keys()].filter((key) => !campaignById.has(key));
      for (const key of prints.slice(0, Math.max(0, prints.length - maxPrints))) session.delete(key);
    }
  }
  return { read, save };
}

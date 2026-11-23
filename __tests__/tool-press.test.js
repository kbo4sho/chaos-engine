import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { availableTools, printTools, readTicket } from '../one-part-missing/tool-press.js';
import { createRun, advance, parts } from '../one-part-missing/machines.js';
import {
  certify,
  decodePrint,
  resolveMachine,
  tuneTarget,
  proveTarget,
} from '../one-part-missing/workshop.js';
import { reserves } from '../one-part-missing/press-reserves.js';
describe('Tool-aware machine press', () => {
  it('offers all twenty tools and only partners with working stock', () => {
    expect(availableTools('any').sort()).toEqual(Object.keys(parts).sort());
    expect(availableTools('parcel', 'portal')).toContain('hatch');
    expect(availableTools('direct', 'fan')).toEqual([]);
    expect(availableTools('chain', 'magnet')).toContain('fan');
    for (const id of reserves) {
      expect(readTicket(id), id).not.toBeNull();
      expect(resolveMachine(M, id)?.verifiedRepairs, id).toBeGreaterThan(0);
    }
  });
  it.each([
    ['chain', 'magnet', 'fan', 13],
    ['direct', 'cam', 'any', 71],
    ['parcel', 'hatch', 'switch', 32],
    ['chain', 'domino', 'any', 1953],
  ])('%s prints and reopens the exact working %s/%s machine', (style, focus, partner, seed) => {
    const req = { style, focus, partner, seed },
      m = printTools(M, req);
    expect(m).toBeTruthy();
    const other = resolveMachine(M, m.id);
    for (const key of ['ball', 'fixtures', 'sockets', 'tray', 'goals'])
      expect(other[key]).toEqual(m[key]);
    const [fit] = certify(M, other),
      run = createRun(M, other, fit);
    while (run.state === 'running') advance(M, run);
    expect(run.state).toBe('won');
    const seen = new Set([fit.part, ...run.uses.map((u) => u.kind)]);
    expect(seen.has(focus)).toBe(true);
    if (partner !== 'any') expect(seen.has(partner)).toBe(true);
    expect(printTools(M, req).id).toBe(m.id);
  });
  it('encodes bounded, canonical shared layouts and keeps their target remixes usable', () => {
    const m = printTools(M, { style: 'chain', focus: 'fan', seed: 111 });
    const base = readTicket(m.id);
    expect(base).not.toBeNull();
    for (const id of [
      m.id + '-0',
      'press-2-00-1-0-60-60',
      'press-2-1-1-g-60-60',
      'press-2-ff-1-0-60-60',
      'press-2-1-zzzzzzz-0-60-60',
      'press-2-1-1-0-0-0',
    ]) {
      expect(readTicket(id)).toBeNull();
      expect(decodePrint(id)).toBeNull();
    }
    const edited = [
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([x, y]) => proveTarget(M, tuneTarget(m, x, y)).machine)
      .find(Boolean);
    expect(edited).toBeTruthy();
    expect(resolveMachine(M, edited.id).goals).toEqual(edited.goals);
  });
});

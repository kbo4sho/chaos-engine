import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import Matter from 'matter-js';
import { campaign, chapters } from '../one-part-missing/campaign.js';
import { machines, validMove, assembly, trial } from '../one-part-missing/machines.js';
import { certify, resolveMachine } from '../one-part-missing/workshop.js';
import { repairBook } from '../one-part-missing/repairs.js';

describe('Numbered puzzle campaign', () => {
  it('offers forty chapters of distinct, deep-linkable machines and preserves original IDs', () => {
    expect(chapters).toHaveLength(40);
    expect(campaign).toHaveLength(400);
    expect(campaign).toEqual(expect.arrayContaining(machines));
    for (const machine of campaign) expect(resolveMachine(Matter, machine.id)).toBe(machine);
    for (const values of [
      campaign.map((m) => m.id),
      campaign.map((m) => m.title),
      campaign.map((m) => JSON.stringify([m.ball, m.sockets, m.fixtures, m.goals])),
    ]) {
      expect(new Set(values).size).toBe(400);
    }
    for (const id of ['station-000', 'station-001', 'station-101', 'station-02', 'station-005~-0.0']) {
      expect(resolveMachine(Matter, id)).toBeNull();
    }
  });
  it.each(chapters.map(([title], i) => [title, i]))(
    '%s has a robust physical repair for every level',
    (_, chapter) => {
      for (const machine of campaign.slice(chapter * 10, chapter * 10 + 10)) {
        const repairs = certify(Matter, machine);
        expect(repairs?.length, machine.id).toBeGreaterThan(0);
        if (!machines.includes(machine)) expect(repairs, machine.id).toHaveLength(1);
        if (chapter === 9) {
          expect(machine.sockets).toHaveLength(4);
          expect(machine.goals).toHaveLength(4);
        }
      }
    },
    20000,
  );
  it('distinguishes a reversed ramp from the same part in the original orientation', () => {
    const reversed = campaign
      .slice(60, 70)
      .map((machine) => [machine, certify(Matter, machine)[0]])
      .find(([, move]) => move.flipped);
    const [machine, move] = reversed;
    const plain = { ...move, flipped: false };
    expect(assembly(machine, move).find((s) => s.fitted).a).toBe(
      -assembly(machine, plain).find((s) => s.fitted).a,
    );
    expect(trial(Matter, machine, plain).state).toBe('miss');
    expect(validMove(machines[0], { part: 'bridge', socket: 0, flipped: true })).toBe(false);
    expect(validMove(campaign.at(-1), { part: 'weight', socket: 0, flipped: true })).toBe(false);
  });
  it('keeps all campaign replays when printed repairs exceed their separate limit', () => {
    const dom = new JSDOM('', { url: 'https://example.test' });
    try {
      const book = repairBook(() => dom.window.localStorage);
      for (const m of campaign)
        book.save(
          m.id,
          {
            part: m.tray[0],
            socket: 0,
            ...(m.capacity === 2 ? { second: { part: m.tray[1], socket: 1 } } : {}),
          },
          123,
        );
      for (let i = 0; i < 40; i++) book.save('press-1-' + i, { part: 'bridge', socket: 0 }, 88);
      const after = repairBook(() => dom.window.localStorage).read();
      expect(campaign.filter((m) => validMove(m, after[m.id]))).toHaveLength(400);
      expect(Object.keys(after).filter((id) => id.startsWith('press-'))).toHaveLength(32);
    } finally {
      dom.window.close();
    }
  });
});

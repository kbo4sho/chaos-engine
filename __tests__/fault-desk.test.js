import { it, expect } from 'vitest';
import M from 'matter-js';
import { cases } from '../one-part-missing/fault-desk/cases.js';
import {
  fieldMachine,
  tapeFor,
  firstDifference,
  inspectionLine,
  scopes,
} from '../one-part-missing/fault-desk/physics.js';
import { campaignById } from '../one-part-missing/campaign.js';
import { trial } from '../one-part-missing/machines.js';
it.each(cases)(
  '$title has exactly one repair across seven release marks',
  (j) => {
    const source = campaignById.get(j.source),
      mk = (slot) => fieldMachine(source, j.fit, j.station, j.change, slot);
    const fault = tapeFor(M, mk(null)),
      ref = tapeFor(M, mk(j.station));
    expect(firstDifference(fault, ref)?.tick).toBeGreaterThan(0);
    expect(firstDifference(ref, ref)).toBeNull();
    const choices = scopes(inspectionLine(source, j.fit), j.indices);
    expect(new Set(choices.map((s) => s.letter)).size).toBe(choices.length);
    expect(choices.length).toBeGreaterThan(1);
    for (const k of [null, ...j.indices])
      for (const offset of [-3, -2, -1, 0, 1, 2, 3])
        expect(trial(M, mk(k), null, offset).state).toBe(
          k === j.station ? 'won' : 'miss',
        );
  },
);

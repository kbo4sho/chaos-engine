// Capture which tools take part in a proven repair. The catalogue carries no socket answers.
import fs from 'node:fs';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { createRun, advance } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
const rows = campaign.map((m, i) => {
  const move = certify(M, m)[0],
    run = createRun(M, m, move);
  while (run.state === 'running') advance(M, run);
  const used = [...new Set([move.part, ...run.uses.map((u) => u.kind)])];
  const form = m.rigging
    ? 'rig'
    : run.cargo
      ? 'parcel'
      : used.length > 1 || m.goals.length > 1
        ? 'chain'
        : 'direct';
  return [i + 1, form, ...used];
});
fs.writeFileSync(
  new URL('../one-part-missing/press-catalog.js', import.meta.url),
  '// Stable press plates and the tools observed in their working machines.\nexport const plates = [\n' +
    rows.map((row) => '  ' + JSON.stringify(row) + ',').join('\n') +
    '\n];\n',
);

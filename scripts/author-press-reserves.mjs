// Every advertised combination has a tested specimen even on an unlucky draw.
import fs from 'node:fs';
import M from 'matter-js';
import { plates } from '../one-part-missing/press-catalog.js';
import { printTools, readTicket } from '../one-part-missing/tool-press.js';
const requests = new Map(),
  stock = [];
for (const [, style, ...tools] of plates) {
  const tags = [...new Set(tools)].sort();
  for (const focus of tags)
    for (const partner of [...tags.filter((k) => k > focus), 'any']) {
      const request = { style, focus, partner };
      requests.set(JSON.stringify(request), request);
    }
}
const ordered = [...requests.values()].sort(
  (a, b) => Number(a.partner === 'any') - Number(b.partner === 'any'),
);
for (const r of ordered) {
  const covers = (base) =>
    base[1] === r.style &&
    base.slice(2).includes(r.focus) &&
    (r.partner === 'any' || base.slice(2).includes(r.partner));
  if (stock.some((id) => covers(plates[readTicket(id).plate - 1]))) continue;
  let result;
  for (const seed of [43, 131, 71, 1901]) {
    result = printTools(M, { ...r, seed }, false);
    if (result) break;
  }
  if (result) stock.push(result.id);
  else console.log('No stock', r);
}
fs.writeFileSync(
  new URL('../one-part-missing/press-reserves.js', import.meta.url),
  '// Pretested prints cover the tool combinations offered in the press.\nexport const reserves = [\n' +
    stock.map((s) => "  '" + s + "',").join('\n') +
    '\n];\n',
);
console.log('Stocked', stock.length, 'prints for', ordered.length, 'requests');

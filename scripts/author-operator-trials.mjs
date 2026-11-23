// Find physical timing problems with a robust working sheet and no incomplete
// solution in the displayed signal windows. Benchmarks stay out of the player bundle.
import fs from 'node:fs';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { parts, createRun } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { operatorBoard, stepConsole } from '../one-part-missing/control-room/console.js';
const recipes = [
  ['Stop short', 'brake', [101, 111, 112]],
  ['Up and over', 'punch', [102, 111, 132]],
  ['Return to sender', 'reverse', [101, 121, 132]],
  ['A right angle', 'right', [112, 101, 122]],
  ['The other bend', 'left', [102, 121, 111]],
  ['Read the rim', 'bank', [121, 361, 366]],
  ['Belt brake', 'brake', [141, 145, 155]],
  ['Across the gap', 'punch', [135, 142, 156]],
  ['Out and back', 'reverse', [146, 145, 151]],
  ['Borrowed motion', 'relay', [321, 334, 326, 339]],
  ['Level the nose', 'trim', [372, 387, 391, 399]],
  ['Send it sideways', 'right', [221, 228, 335, 387]],
  ['Stop and lift', 'brake punch', [141, 155, 145]],
  ['Double bend', 'right left', [151, 146, 157]],
  ['Hang then fall', 'punch brake', [135, 156, 145]],
  ['A second pass', 'reverse bank', [146, 156, 151]],
  ['Late turn', 'bank left', [367, 373, 379]],
  ['Cross the return', 'right reverse', [328, 335, 338, 391]],
  ['Hand the parcel over', 'relay punch', [321, 329, 333, 339, 342, 346, 354, 358, 360]],
  ['Brake the parcel', 'brake left', [381, 382, 387]],
  ['Bring it back', 'punch reverse', [388, 397, 387]],
  ['Crossed signals', 'relay right', [337, 339, 334, 342]],
  ['Catch the turn', 'left bank', [395, 390, 389]],
  ['After the hatch', 'reverse punch', [399, 400, 397, 387]],
  ['Three calls', 'punch right brake', [385, 389, 395, 387]],
  ['Double back', 'bank reverse punch', [395, 397, 390, 387]],
  ['Return corridor', 'left punch right', [399, 400, 397, 395]],
  ['Change of hands', 'relay left punch', [228, 240, 235, 221, 349, 352, 347, 342, 339, 334, 331, 326]],
  ['Approach lights', 'punch bank left', [400, 399, 397, 395]],
  ['Control room final', 'reverse right punch', [400, 399, 397, 395]],
];
const inside = (p) => p && p.x > 35 && p.x < 685 && p.y > 38 && p.y < 355;
const point = (b, t) => ({
  x: b.position.x,
  y: b.position.y,
  a: b.angle,
  vx: b.velocity.x,
  vy: b.velocity.y,
  t,
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const far = { kind: 'flag', x: 1700, y: 1500, w: 19, h: 20, sensor: true };
const fitCache = new Map();
function draw(i, salt = 0) {
  const [title, list, sources] = recipes[i],
    kinds = list.split(' '),
    count = kinds.length;
  let seed = Math.imul(987191, i + 1) + salt * 39439;
  const random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => a + Math.floor(random() * (b - a + 1)),
    pick = (arr) => arr[int(0, arr.length - 1)];
  const shuffle = (xs) => {
    const a = [...xs];
    for (let j = a.length - 1; j > 0; j--) {
      const k = int(0, j);
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  };
  const counters = Array(7).fill(0);
  for (let attempt = 0; attempt < 1800; attempt++) {
    const src = campaign[sources[attempt % sources.length] - 1];
    if (!fitCache.has(src.id)) fitCache.set(src.id, certify(M, src)[0]);
    const fit = fitCache.get(src.id),
      actor = src.goals.at(-1).striker === 'cargo' ? 'cargo' : 'marble';
    const job = {
      id: title.toLowerCase().replaceAll(' ', '-'),
      title,
      source: src.id,
      fit,
      actor,
      slots: kinds.map((kind) => ({ kind })),
      goals: [{ ...far, striker: actor }],
    };
    const board = operatorBoard(job),
      cues = kinds.map(() => null);
    const simulate = (b, inputs, offset = 0, track = false) => {
      const r = createRun(M, b, null, offset),
        path = [],
        other = [],
        primary = actor === 'cargo' ? r.cargo : r.ball,
        partner = actor === 'cargo' ? r.ball : r.cargo;
      while (r.state === 'running' && (!track || r.tick < 180)) {
        if (track) {
          path.push(point(primary, r.tick));
          if (partner) other.push(point(partner, r.tick));
        }
        stepConsole(M, r, job, inputs);
      }
      return { state: r.state, tick: r.tick, uses: r.uses, hits: r.hits, path, other };
    };
    let run = simulate(board, cues, 0, true),
      last = 0,
      valid = true;
    const sourcesUsed = run.uses.filter((u, j, arr) => arr.findIndex((e) => e.item === u.item) === j);
    if (!sourcesUsed.length) continue;
    // Later shifts start after more of the underlying mechanism has run.
    const need = Math.min(sourcesUsed.length, i < 6 ? 1 : i < 12 ? 2 : i < 24 ? 3 : i === 29 ? 7 : 4);
    const start = sourcesUsed[need - 1].tick;
    for (const [j, kind] of kinds.entries()) {
      const positions = shuffle(
        run.path.filter(
          (p) =>
            p.t >= Math.max(4, start - 7, last + (j ? 11 : 0)) &&
            p.t <= Math.min(151, j ? last + 48 : start + 58) &&
            inside(p) &&
            Math.hypot(p.vx, p.vy) > 1 &&
            (kind !== 'relay' || (run.other[p.t] && inside(run.other[p.t]))),
        ),
      );
      let placed = false;
      for (const p of positions.slice(0, 18)) {
        const inputs = [...cues];
        inputs[j] = p.t;
        const next = simulate(board, inputs, 0, true);
        if (
          !next.path.some(
            (q) =>
              q.t >= p.t + 4 &&
              q.t <= p.t + 35 &&
              inside(q) &&
              run.path[q.t] &&
              distance(q, run.path[q.t]) > 17,
          )
        )
          continue;
        cues[j] = p.t;
        last = p.t;
        run = next;
        placed = true;
        break;
      }
      if (!placed) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;
    counters[0]++;
    const widths = i < 6 ? 18 : i < 12 ? 16 : i < 24 ? 13 : 11;
    job.slots = kinds.map((kind, j) => {
      const left = int(3, widths - 4),
        from = Math.max(1, cues[j] - left, j ? cues[j - 1] + 3 : 1),
        to = Math.min(190, from + widths, j < count - 1 ? cues[j + 1] - 3 : 190);
      return { kind, from, to };
    });
    // A live operator can always finish the preceding window before the next one opens.
    for (let j = 1; j < count; j++)
      if (job.slots[j].from <= job.slots[j - 1].to) {
        const split = Math.floor((cues[j - 1] + cues[j]) / 2);
        job.slots[j - 1].to = split;
        job.slots[j].from = split + 1;
      }
    if (job.slots.some((s, j) => cues[j] - s.from < 2 || s.to - cues[j] < 2)) continue;
    const targets = shuffle(
      run.path.filter(
        (p) =>
          p.t >= last + 7 &&
          p.t <= last + 46 &&
          inside(p) &&
          Math.hypot(p.vx, p.vy) > 1 &&
          distance(p, run.path[last]) > 28,
      ),
    ).slice(0, 22);
    for (const dest of targets) {
      const makeGoal = (p, kind) => ({
        ...far,
        kind,
        w: int(17, 27),
        h: int(17, 27),
        x: Math.round(p.x),
        y: Math.round(p.y),
        striker: actor,
      });
      const goals = [makeGoal(dest, 'flag')];
      if (count >= 2) {
        for (let j = count - 2; j >= 0; j--) {
          const ws = run.path.filter(
            (p) =>
              p.t > cues[j] + 4 &&
              p.t < cues[j + 1] - 3 &&
              inside(p) &&
              goals.every((g) => distance(p, g) > 45),
          );
          if (ws.length) goals.unshift(makeGoal(pick(ws), 'chime'));
        }
      }
      const m = { ...board, goals },
        win = (inputs, offset = 0, b = m) => simulate(b, inputs, offset).state === 'won';
      if (!win(cues) || win(cues.map(() => null))) continue;
      counters[1]++;
      if (cues.some((_, j) => win(cues.map((t, n) => (n === j ? null : t))))) continue;
      const variations = [
        ...cues.flatMap((_, j) => [-2, 2].map((d) => cues.map((t, k) => t + (j === k ? d : 0)))),
        cues.map((t) => t - 2),
        cues.map((t) => t + 2),
      ];
      if (variations.some((inputs) => !win(inputs)) || [-2, 2].some((o) => !win(cues, o))) continue;
      counters[2]++;
      const actual = simulate(m, cues);
      const ingredient = m.fixtures.filter((s) => parts[s.kind]);
      const uniqueUsed = new Set(actual.uses.map((e) => e.kind));
      if (uniqueUsed.size < Math.min(need, ingredient.length) || (i === 29 && uniqueUsed.size < 6))
        continue;
      const critical = ingredient.filter(
        (s) =>
          !win(cues, 0, {
            ...m,
            fixtures: m.fixtures.map((f) => (f === s ? { ...s, disabled: true } : f)),
          }),
      );
      if (
        critical.length < Math.min(need, ingredient.length) ||
        (i === 29 && new Set(critical.map((s) => s.kind)).size < 6)
      )
        continue;
      counters[3]++;
      // At least one complete sheet must miss. Every incomplete sheet inside the
      // published windows is then ruled out on the actual physical course.
      if (
        ![
          job.slots.map((s) => s.from),
          job.slots.map((s) => s.to),
          job.slots.map((s, j) => (j % 2 ? s.from : s.to)),
        ].some((v) => !win(v))
      )
        continue;
      counters[4]++;
      let shortcut = false;
      function skipTest(prefix, skipped) {
        if (shortcut) return;
        if (prefix.length === count) {
          if (skipped && win(prefix)) shortcut = true;
          return;
        }
        const j = prefix.length,
          s = job.slots[j];
        skipTest([...prefix, null], true);
        if (!skipped && j === count - 1) return;
        for (let n = s.from; n <= s.to && !shortcut; n++) skipTest([...prefix, n], skipped);
      }
      skipTest([], false);
      if (shortcut) continue;
      return {
        job: { ...job, goals },
        cues,
        tick: actual.tick,
        uses: [...uniqueUsed],
        critical: critical.map((s) => s.kind),
        attempt,
      };
    }
  }
  throw Error('No operator sheet for ' + title + ' ' + counters.join('/'));
}
// Full regeneration writes playable stock separately from verification sheets.
const [first = '0', end = String(recipes.length), dir, saltOverride] = process.argv.slice(2);
const results = [];
if (dir) fs.mkdirSync(dir, { recursive: true });
for (let i = Number(first); i < Number(end); i++) {
  const salt =
    saltOverride !== undefined
      ? Number(saltOverride)
      : i === 27
        ? 2
        : (i >= 18 && i <= 23) || i >= 28
          ? 1
          : 0;
  const result = draw(i, salt);
  results.push(result);
  if (dir) fs.writeFileSync(dir + '/' + i + '.json', JSON.stringify(result));
  console.log(i, result.job.id, result.cues, result.tick, result.critical, result.attempt);
}
if (!dir && results.length === recipes.length) {
  const write = (file, name, rows) =>
    fs.writeFileSync(
      new URL(file, import.meta.url),
      '// Generated by scripts/author-operator-trials.mjs.\nexport const ' +
        name +
        ' = [\n' +
        rows.map((r) => '  ' + JSON.stringify(r) + ',').join('\n') +
        '\n];\n',
    );
  write(
    '../one-part-missing/control-scores.js',
    'controlScores',
    results.map((r) => r.job),
  );
  write(
    './lib/operator-benchmarks.mjs',
    'operatorBenchmarks',
    results.map((r) => ({ id: r.job.id, cues: r.cues, tick: r.tick, critical: r.critical })),
  );
}

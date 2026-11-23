// Find a common setting across three physical deliveries. Benchmarks are
// written separately so the player can inspect the machinery without a key.
import fs from 'node:fs';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { certify } from '../one-part-missing/certify.js';
import { parts, createRun, advance } from '../one-part-missing/machines.js';
import { readyLine, batchMachine, testLot } from '../one-part-missing/test-bay/station.js';
const recipes = [
  ['Catch height', [101, 104, 109, 141]],
  ['Aim the lift', [111, 115, 118, 145]],
  ['Belt height', [102, 107, 109, 110]],
  ['Pole spacing', [112, 116, 119, 129]],
  ['Cable length', [201, 203, 211, 216, 229]],
  ['Input ratio', [281, 286, 293, 297, 300]],
  ['Two-sided catch', [105, 106, 109, 141, 146]],
  ['Overhead line', [229, 233, 236, 238]],
  ['Across the bend', [141, 145, 151, 157]],
  ['Three wheel test', [297, 300, 311, 320]],
  ['Return current', [454, 458, 459, 462]],
  ['Pressure and travel', [191, 194, 197, 199]],
  ['Two feed lanes', [326, 335, 350, 353, 356, 360]],
  ['Take up the load', [231, 233, 234, 238, 239, 240]],
  ['Drive under load', [300, 310, 312, 319, 320]],
  ['Live coupling', [463, 465, 466, 469, 470]],
  ['Heading check', [371, 373, 391, 395, 399]],
  ['Clear the shutter', [445, 455, 456, 471, 477]],
  ['Return tolerance', [154, 157, 158, 160]],
  ['Freight acceptance', [195, 197, 198, 199, 200]],
  ['Power acceptance', [311, 317, 318, 319, 320]],
  ['Airworthiness', [395, 397, 399, 400]],
  ['Field acceptance', [471, 472, 476, 479, 480]],
  ['Commissioned', [480, 400, 399, 200]],
];
const spec = (key, center, steps) =>
  Array.from({ length: 5 }, (_, i) => Number((center + (i - 2) * steps).toFixed(5)));
const stock = new Map();
function source(n) {
  if (!stock.has(n)) {
    const m = campaign[n - 1],
      fit = certify(M, m)[0];
    stock.set(n, { m, fit, shapes: readyLine(m, fit) });
  }
  return stock.get(n);
}
function knobs(s) {
  if (!parts[s.kind]) return [];
  if (s.drive) {
    const p = {
      motor: 'rate',
      gearbox: 'ratio',
      clutch: 'ratio',
      rack: 'pitch',
      torsion: 'wind',
      ratchet: 'dir',
    }[s.kind];
    if (!['rate', 'ratio', 'pitch'].includes(p)) return [];
    const base = s[p] ?? (p === 'pitch' ? 24 : p === 'rate' ? 0.15 : 1);
    return [[p, spec(p, base, Math.abs(base) * 0.27)]];
  }
  if (s.wire) return [['rest', spec('rest', s.rest || 1, 0.17)]];
  const r = [
    ['x', spec('x', s.x, 18)],
    ['y', spec('y', s.y, 15)],
  ];
  if (s.kind === 'sieve') r.push(['gap', spec('gap', s.gap || 30, 5)]);
  if (s.kind === 'zipline')
    r.push(['span', spec('span', s.span || 130, 18)], ['drop', spec('drop', s.drop || 55, 10)]);
  return r
    .filter(([key, values]) => key !== 'x' || values.every((v) => v > 24 && v < 696))
    .filter(([key, values]) => key !== 'y' || values.every((v) => v > 24 && v < 376));
}
const mark = (x, y, w = 21, h = 23, actor = 'marble') => ({
  kind: 'flag',
  x: Math.round(x),
  y: Math.round(y),
  w,
  h,
  striker: actor,
  sensor: true,
});
function draw(i) {
  let seed = (i + 1) * 991299;
  const rand = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1)),
    pick = (xs) => xs[int(0, xs.length - 1)],
    shuffle = (xs) => {
      const a = [...xs];
      for (let j = a.length - 1; j > 0; j--) {
        const k = int(0, j);
        [a[j], a[k]] = [a[k], a[j]];
      }
      return a;
    };
  const [title, sources] = recipes[i],
    dialCount = i < 6 ? 1 : 2,
    counters = Array(7).fill(0);
  for (let attempt = 0; attempt < 1100; attempt++) {
    const { m, fit, shapes } = source(sources[attempt % sources.length]),
      actor = m.goals.at(-1).striker === 'cargo' ? 'cargo' : 'marble';
    const choices = shuffle(
      shapes.flatMap((s, idx) => knobs(s).map(([key, values]) => ({ station: idx, key, values }))),
    );
    const dials = [];
    for (const d of choices)
      if (dials.length < dialCount && dials.every((x) => x.station !== d.station)) dials.push(d);
    if (dials.length < dialCount) continue;
    const cargo = shapes.findIndex((s) => s.kind === 'cargo'),
      inputStation = m.transmission ? -1 : actor === 'cargo' && cargo >= 0 ? cargo : -1,
      body = inputStation === -1 ? m.ball : shapes[inputStation];
    let feeds = m.transmission
      ? ['spin', 'density']
      : i < 3
        ? ['vx', 'x', 'r']
        : ['vx', 'vy', 'x', 'y', 'r', 'density', 'a'];
    if (body.flywheel || body.guide || body.axle)
      feeds = feeds.filter((key) => !['x', 'y', 'r'].includes(key));
    const prop = pick(feeds),
      base = body[prop] ?? (prop === 'density' ? 0.002 : 0),
      step = {
        vx: 1.5,
        vy: 1.35,
        x: 15,
        y: 10,
        r: 3,
        density: (body.density || 0.002) * 0.33,
        a: 0.36,
        spin: 0.07,
      }[prop];
    const values = [-1, 0, 1].map((d) => Number((base + d * step).toFixed(5)));
    const job = {
      id: title.toLowerCase().replaceAll(' ', '-'),
      title,
      source: m.id,
      fit,
      actor,
      dials,
      feed: { station: inputStation, key: prop },
      lots: values.map((value) => ({ value, goals: [mark(1800, 1500, 22, 24, actor)] })),
    };
    const target = dials.map(() => int(0, 4));
    if (target.every((v) => v === 2)) continue;
    const live = dials.map((d) => d.station),
      outputs = [];
    for (let k = 0; k < 3; k++) {
      const r = createRun(M, batchMachine(job, target, k)),
        b = actor === 'cargo' ? r.cargo : r.ball,
        line = [];
      for (let t = 1; t <= 182; t++) {
        r.tick++;
        M.Engine.update(r.engine, 1000 / 60);
        const { x, y } = b.position;
        if (t > 8 && (x < -25 || x > 745 || y > 415 || y < -80)) break;
        if (
          t % 2 === 0 &&
          x > 35 &&
          x < 685 &&
          y > 40 &&
          y < 350 &&
          Math.hypot(b.velocity.x, b.velocity.y) > 0.75 &&
          live.every((j) => r.uses.some((e) => e.item === j)) &&
          r.uses.length > 0
        ) {
          line.push({ x, y, t });
        }
      }
      outputs.push(line);
    }
    if (outputs.some((xs) => xs.length < 2)) continue;
    counters[0]++;
    const commonTimes = outputs[1].filter((p) => outputs.every((xs) => xs.some((q) => q.t === p.t)));
    for (const p of shuffle(commonTimes).slice(0, 7)) {
      const points = outputs.map((xs) => xs.find((q) => q.t === p.t));
      const separation = Math.max(
        ...points.flatMap((a) => points.map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
      );
      if (separation < 17) continue;
      for (let k = 0; k < 3; k++)
        job.lots[k].goals = [mark(points[k].x, points[k].y, int(15, 25), int(16, 25), actor)];
      if (i >= 12 && i % 3 === 0) {
        const early = outputs.map((xs) =>
          xs.filter(
            (q) =>
              q.t < p.t - 7 &&
              Math.hypot(q.x - points[outputs.indexOf(xs)].x, q.y - points[outputs.indexOf(xs)].y) > 40,
          ),
        );
        if (early.every((xs) => xs.length))
          for (let k = 0; k < 3; k++) {
            const q = pick(early[k]);
            job.lots[k].goals.unshift({ ...mark(q.x, q.y, 20, 22, actor), kind: 'chime' });
          }
      }
      let trials = [0, 1, 2].map((k) => testLot(M, job, target, k));
      if (
        trials.some((r) => !r.ok || r.tick < 12 || live.some((j) => !r.uses.some((e) => e.item === j)))
      )
        continue;
      counters[1]++;
      if (i >= 18 || m.transmission)
        for (let k = 0; k < 3; k++)
          job.lots[k].goals.at(-1).window = {
            start: Math.max(0, trials[k].tick - 4),
            duration: 9,
            period: 175,
          };
      trials = [0, 1, 2].map((k) => testLot(M, job, target, k));
      if (
        trials.some((r) => !r.ok || r.tick < 12 || live.some((j) => !r.uses.some((e) => e.item === j)))
      )
        continue;
      const nominal = trials[1],
        kinds = new Set(nominal.uses.map((e) => e.kind)),
        needed = i < 6 ? 1 : i < 12 ? 2 : i < 18 ? 2 : i === 23 ? 7 : 4;
      if (kinds.size < needed) continue;
      const all =
        dialCount === 1
          ? Array.from({ length: 5 }, (_, a) => [a])
          : Array.from({ length: 25 }, (_, j) => [Math.floor(j / 5), j % 5]);
      const matrix = all.map((s) => [0, 1, 2].map((k) => testLot(M, job, s, k).ok)),
        wins = all.filter((_, k) => matrix[k].every(Boolean));
      if (wins.length !== 1 || wins[0].some((v, k) => v !== target[k])) continue;
      counters[2]++;
      const signatures = new Set(matrix.map((r) => r.map(Number).join('')));
      if (![...signatures].some((s) => s !== '000' && s !== '111') || (i >= 6 && signatures.size < 4))
        continue;
      counters[3]++;
      if (
        target.some(
          (d, j) =>
            !all.some(
              (s, k) =>
                s[j] !== d &&
                s.every((n, q) => q === j || n === target[q]) &&
                matrix[k].some(Boolean) &&
                !matrix[k].every(Boolean),
            ),
        )
      )
        continue;
      // At least one lot must genuinely rely on each active process counted toward the later shifts.
      const criticalStations = new Set();
      const critical = shapes.flatMap((s, j) => {
        if (!parts[s.kind] || !nominal.uses.some((e) => e.item === j)) return [];
        for (let k = 0; k < 3; k++) {
          const alt = batchMachine(job, target, k);
          alt.fixtures[j].disabled = true;
          const r = createRun(M, alt);
          while (r.state === 'running') advance(M, r);
          if (r.state === 'miss') {
            criticalStations.add(j);
            return [s.kind];
          }
        }
        return [];
      });
      if (new Set(critical).size < needed || live.some((j) => !criticalStations.has(j))) continue;
      counters[4]++;
      return { job, settings: target, ticks: trials.map((r) => r.tick), matrix, critical, attempt };
    }
  }
  throw Error('No verified batch ' + i + ' ' + counters.join('/'));
}
const [start = '0', end = '24', dir] = process.argv.slice(2),
  rows = [];
if (dir) fs.mkdirSync(dir, { recursive: true });
for (let i = +start; i < +end; i++) {
  const r = draw(i);
  rows.push(r);
  if (dir) fs.writeFileSync(dir + '/' + i + '.json', JSON.stringify(r));
  console.log(i, r.job.title, r.settings, r.ticks, r.critical, r.attempt);
}
if (!dir && rows.length === 24) {
  for (const [file, name, data] of [
    ['../one-part-missing/batch-scores.js', 'batchScores', rows.map((r) => r.job)],
    [
      './lib/batch-benchmarks.mjs',
      'batchBenchmarks',
      rows.map((r) => ({ id: r.job.id, settings: r.settings, ticks: r.ticks, critical: r.critical })),
    ],
  ])
    fs.writeFileSync(
      new URL(file, import.meta.url),
      '// Generated by scripts/author-batch-jobs.mjs.\nexport const ' +
        name +
        ' = [\n' +
        data.map((o) => '  ' + JSON.stringify(o) + ',').join('\n') +
        '\n];\n',
    );
}

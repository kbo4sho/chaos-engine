import { assembly, parts, createRun, advance } from '../machines.js';
import { campaignById } from '../campaign.js';
import { batchScores } from '../batch-scores.js';
export const lines = ['One adjustment', 'Two stations', 'Changing loads', 'Final inspection'];
export const jobs = batchScores.map((r, i) => ({ ...r, index: i, chapter: Math.floor(i / 6) }));
const byId = new Map(jobs.map((j) => [j.id, j]));
export const variables = {
  x: { name: 'Horizontal position', unit: 'u' },
  y: { name: 'Vertical position', unit: 'u' },
  rate: { name: 'Drive rate', unit: 'rad/step' },
  pitch: { name: 'Rack pitch', unit: 'u/rad' },
  ratio: { name: 'Gear ratio', unit: '×' },
  rest: { name: 'Starting span', unit: '×' },
  gap: { name: 'Grating gap', unit: 'u' },
  span: { name: 'Cable reach', unit: 'u' },
  drop: { name: 'Cable drop', unit: 'u' },
  r: { name: 'Load radius', unit: 'u' },
  vx: { name: 'Horizontal feed', unit: 'u/step' },
  vy: { name: 'Vertical feed', unit: 'u/step' },
  a: { name: 'Nose angle', unit: 'rad' },
  spin: { name: 'Input spin', unit: 'rad/step' },
  density: { name: 'Load density', unit: 'mass/u²' },
};
export const inputNames = ['Low', 'Nominal', 'High'];
export function units(prop, value) {
  return Number(value.toFixed(4)) + ' ' + variables[prop].unit;
}
export function readyLine(source, fit) {
  return assembly(source, fit)
    .slice(0, -source.goals.length - 1)
    .map(({ fitted, ...s }) => s);
}
export function positions(job) {
  return job.dials.map(() => 2);
}
export function legal(job, p) {
  return (
    Array.isArray(p) &&
    p.length === job.dials.length &&
    p.every((n, i) => Number.isInteger(n) && n >= 0 && n < job.dials[i].values.length)
  );
}
export function batchMachine(job, settings, lot) {
  if (!legal(job, settings) || !Number.isInteger(lot) || !job.lots[lot])
    throw Error('Invalid batch setup');
  const source = campaignById.get(job.source),
    ball = { ...source.ball },
    fixtures = readyLine(source, job.fit);
  for (const [i, d] of job.dials.entries()) fixtures[d.station][d.key] = d.values[settings[i]];
  const input = job.feed.station === -1 ? ball : fixtures[job.feed.station];
  input[job.feed.key] = job.lots[lot].value;
  return {
    id: job.id,
    title: job.title,
    ball,
    fixtures,
    sockets: [],
    tray: [],
    goals: job.lots[lot].goals,
    striker: job.actor,
  };
}
export function testLot(M, j, p, i) {
  const r = createRun(M, batchMachine(j, p, i));
  while (r.state === 'running') advance(M, r);
  return { ok: r.state === 'won', tick: r.tick, hits: r.hits, uses: r.uses };
}
export function stationName(j, d) {
  const source = campaignById.get(j.source),
    s = readyLine(source, j.fit)[d.station];
  return parts[s.kind]?.name || s.kind;
}
export function sheetLink(j, p) {
  if (!legal(j, p)) throw Error('Invalid settings');
  return '#' + j.id + '~' + p.join('');
}
export function readSheet(hash) {
  const m = /^#?([a-z0-9-]{1,55})(?:~([0-4]{1,2}))?$/.exec(hash || ''),
    j = m && byId.get(m[1]);
  if (!j) return null;
  if (!m[2]) return { job: j, settings: null };
  const p = m[2].split('').map(Number);
  return legal(j, p) ? { job: j, settings: p } : null;
}
export const stampPrefix = 'chaos.one-part-missing.batch.v1.';
export function certificates(storage) {
  const memory = new Map();
  const read = (job) => {
    let rec = memory.get(job.id);
    if (!rec)
      try {
        rec = JSON.parse(storage().getItem(stampPrefix + job.id));
      } catch {}
    return rec &&
      legal(job, rec.settings) &&
      Array.isArray(rec.ticks) &&
      rec.ticks.length === job.lots.length &&
      rec.ticks.every((n) => Number.isInteger(n) && n > 0 && n <= 420)
      ? rec
      : null;
  };
  return {
    read,
    save(job, p, ticks) {
      if (
        !legal(job, p) ||
        ticks.length !== job.lots.length ||
        !ticks.every((n) => Number.isInteger(n) && n > 0 && n <= 420)
      )
        return;
      const record = { settings: [...p], ticks: [...ticks] };
      memory.set(job.id, record);
      try {
        storage().setItem(stampPrefix + job.id, JSON.stringify(record));
        memory.delete(job.id);
      } catch {}
    },
  };
}

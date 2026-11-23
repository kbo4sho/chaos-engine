// Couple an instrumented signal path to a second load. A working drawing must
// lose the delivery when any installed station is disconnected.
import fs from "node:fs";
import M from "matter-js";
import { campaign } from "../one-part-missing/campaign.js";
import {
  assembly,
  parts,
  createRun,
  advance,
  trial,
  packFittings,
} from "../one-part-missing/machines.js";
import { certify, possibilities } from "../one-part-missing/certify.js";
import { inside, dist, g, trace } from "./lib/station-traces.mjs";
const cache = new Map();
function stock(n) {
  if (!cache.has(n)) {
    const m = campaign[n - 1];
    const shapes = assembly(m, certify(M, m)[0])
      .slice(0, -m.goals.length - 1)
      .map(({ fitted, ...s }) => s);
    cache.set(n, { m, shapes });
  }
  return cache.get(n);
}
function shifted(s, x, y) {
  return {
    ...s,
    x: s.x + x,
    y: s.y + y,
    ...(s.axle && { axle: [s.axle[0] + x, s.axle[1] + y] }),
    ...(s.guide && { guide: s.guide.map((v) => v + x) }),
  };
}
const goldGroups = [
  [441, 442, 443, 445, 449, 450],
  [451, 453, 454, 456, 457, 459, 460],
  [141, 142, 144, 145, 147, 148, 149, 150, 391, 392, 393, 394],
  [151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 473, 474, 477, 478],
];
const blueGroups = [
  [381, 382, 383, 384, 385, 386, 387, 388, 389, 390],
  [385, 386, 387, 388, 389, 390, 471, 472],
  [395, 396, 397, 399, 471, 472, 475, 476, 479],
  [399, 400, 475, 476, 479, 480],
];
const spread = [0, -3, 3, -1, 1, -2, 2];
function author(i) {
  let rng = (i + 51) * 87361;
  const rand = () =>
    (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
  const num = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = (a) => a[num(0, a.length - 1)];
  const shuffle = (a) => {
    const b = [...a];
    for (let k = b.length - 1; k > 0; k--) {
      const j = num(0, k);
      [b[k], b[j]] = [b[j], b[k]];
    }
    return b;
  };
  const phase = Math.floor(i / 5),
    counts = [0, 0, 0, 0, 0];
  for (let attempt = 0; attempt < 10000; attempt++) {
    const wireJobs = {
      2: [203],
      4: [206],
      7: [225],
      9: [226],
      13: [222],
      16: [227],
    };
    const gn = pick(wireJobs[i] || goldGroups[phase]),
      bn = pick(
        i === 16
          ? [399, 400, 479, 480]
          : i === 19
            ? [400, 479, 480]
            : blueGroups[phase],
      ),
      gold = stock(gn),
      blue = stock(bn);
    if (
      gold.shapes.some((s) => ["cargo", "hatch"].includes(s.kind)) ||
      !blue.shapes.some((s) => s.kind === "hatch")
    )
      continue;
    const gdx = num(-115, 115),
      gdy = num(-30, 38),
      bdx = num(-33, 33),
      bdy = num(-10, 12);
    const ball = shifted(gold.m.ball, gdx, gdy),
      left = gold.shapes.map((s) => shifted(s, gdx, gdy)),
      right = blue.shapes
        .filter((s) => s.kind !== "switch")
        .map((s) => shifted(s, bdx, bdy));
    const freight = right.find((s) => s.kind === "cargo");
    const components = [ball, ...left, ...right];
    if (
      components.some((s) => s.x < 26 || s.x > 694 || s.y < 16 || s.y > 365) ||
      Math.abs(ball.x - freight.x) < 190
    )
      continue;
    const sw = shifted(
        blue.shapes.find((s) => s.kind === "switch"),
        0,
        0,
      ),
      dest = shifted(gold.m.goals.at(-1), gdx, gdy);
    sw.x = Math.round(dest.x + num(-14, 14));
    sw.y = Math.round(dest.y + num(-14, 14));
    if (i === 19) {
      const route = {
        ball,
        fixtures: left,
        sockets: [],
        goals: [g({ x: 900, y: 900 }, "marble")],
      };
      const original = trace(route, "marble", 210);
      const last = Math.max(...original.uses.map((e) => e.tick));
      const candidates = original.points.filter(
        (p) =>
          inside(p) && p.t >= last + 1 && left.every((s) => dist(s, p) > 42),
      );
      if (!candidates.length) continue;
      const p = pick(candidates),
        extra = pick(["phase", "swirl", "pulse", "lift", "bank", "thruster"]);
      if (
        left.some((s) => s.kind === extra) ||
        right.some((s) => s.kind === extra) ||
        extra === "phase"
      )
        continue;
      left.push({
        ...parts[extra].shape,
        x: Math.round(p.x) + num(-5, 5),
        y: Math.round(p.y) + num(-5, 5),
        dir: pick([-1, 1]),
      });
      const modified = trace(route, "marble", 230);
      const exits = modified.points.filter(
        (q) =>
          inside(q) &&
          q.t > p.t + 6 &&
          dist(q, p) > 56 &&
          left.every((s) => dist(s, q) > 40),
      );
      if (!exits.length) continue;
      Object.assign(
        sw,
        (({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }))(pick(exits)),
      );
    }
    if (!inside(sw) || left.some((s) => dist(s, sw) < 33)) continue;
    const all = [...left, sw, ...right],
      devices = all.filter((s) => parts[s.kind]),
      unique = new Set(devices.map((s) => s.kind));
    if (unique.size < [4, 6, 7, i === 19 ? 12 : 8][phase]) continue;
    counts[0]++;
    const blank = {
      ball,
      fixtures: all,
      sockets: [],
      tray: [],
      goals: [g({ x: 900, y: 900 }, "cargo")],
    };
    const r = createRun(M, blank),
      samples = [],
      goldPath = [];
    while (r.state === "running" && r.tick < 235) {
      advance(M, r);
      const { x, y } = r.cargo.position;
      if (!r.uses.some((e) => e.kind === "switch")) {
        if (inside(r.ball.position))
          goldPath.push({ t: r.tick, ...r.ball.position });
      } else if (
        r.tick % 3 === 0 &&
        inside({ x, y }) &&
        dist(freight, { x, y }) > 65
      )
        samples.push({ t: r.tick, x, y });
    }
    const signal = r.uses.find((e) => e.kind === "switch");
    if (
      !signal ||
      devices.some(
        (s) =>
          !r.uses.some(
            (e) =>
              e.item === all.indexOf(s) &&
              e.actor ===
                (s.wire
                  ? "rig"
                  : left.includes(s) || s === sw || s.kind === "hatch"
                    ? "marble"
                    : "cargo") &&
              (left.includes(s) ? e.tick <= signal.tick : true),
          ),
      )
    )
      continue;
    counts[1]++;
    const latest = Math.max(
      ...devices.map((s) => r.uses.find((e) => e.item === all.indexOf(s)).tick),
    );
    const finish = shuffle(
      samples.filter((p) => p.t >= latest + 3 && dist(p, sw) > 48),
    );
    if (!finish.length) continue;
    const first = pick(
      goldPath.filter(
        (p) =>
          p.t > 2 &&
          p.t < signal.tick - 2 &&
          dist(p, sw) > 41 &&
          dist(p, ball) > 38 &&
          all.every((s) => dist(s, p) > 22),
      ),
    );
    if (!first) continue;
    for (const target of finish.slice(0, 4)) {
      const goals = [g(first, "marble", "chime")];
      if (phase >= 1) {
        const mid = pick(
          samples.filter(
            (p) =>
              p.t < target.t - 9 &&
              p.t > signal.tick + 9 &&
              dist(p, target) > 63 &&
              dist(p, first) > 47,
          ),
        );
        if (!mid) continue;
        goals.push(g(mid, "cargo", "chime"));
      }
      goals.push(g(target, "cargo"));
      let machine = { ...blank, goals };
      let normal = trial(M, machine);
      if (normal.state !== "won") continue;
      if (phase >= 2) {
        goals.at(-1).window = {
          start: normal.tick - 5,
          duration: 11,
          period: 310,
        };
      }
      for (const f of devices) {
        if (
          trial(M, {
            ...machine,
            fixtures: all.map((s) => (s === f ? { ...s, disabled: true } : s)),
          }).state === "won"
        ) {
          normal = null;
          break;
        }
      }
      if (
        !normal ||
        !spread.every((n) => trial(M, machine, null, n).state === "won")
      )
        continue;
      counts[2]++;
      const upstream = shuffle(devices.filter((s) => left.includes(s))),
        downstream = shuffle(
          devices.filter((s) => right.includes(s) && s.kind !== "hatch"),
        );
      const cut = [
        upstream[0],
        downstream.find(
          (s) => s.kind !== upstream[0]?.kind && dist(s, upstream[0]) > 70,
        ),
      ];
      if (cut.some((s) => !s)) continue;
      if (i >= 17) {
        const third = shuffle(devices).find((s) =>
          cut.every((v) => v.kind !== s.kind && dist(s, v) > 57),
        );
        if (!third) continue;
        cut.push(third);
      }
      const socket = (s) =>
        Object.fromEntries(
          Object.entries(s).filter(
            ([k]) =>
              ![
                "kind",
                "w",
                "h",
                "r",
                "field",
                "fitted",
                "bounce",
                "sensor",
                "wire",
                "drive",
              ].includes(k),
          ),
        );
      const sockets = cut.map(socket);
      if (i >= 5) {
        for (let j = 0; j < 60; j++) {
          const p = { x: num(80, 642), y: num(62, 320) };
          if ([...sockets, ...all, ...goals].every((s) => dist(p, s) > 58)) {
            sockets.push(p);
            break;
          }
        }
      }
      const wire = cut.find((s) => s.wire);
      if (wire)
        for (const seat of sockets)
          if (!seat.from)
            Object.assign(seat, {
              from: wire.from,
              to: wire.to,
              rest: wire.rest ?? 1,
            });
      const mounts = shuffle(sockets),
        kinds = cut.map((s) => s.kind),
        available = [
          "repulsor",
          "magnet",
          "bank",
          "parachute",
          "syrup",
          "fan",
          "pulse",
          "float",
          "gyro",
        ].filter((s) => !kinds.includes(s));
      const board = {
        ball,
        goals,
        fixtures: all.filter((s) => !cut.includes(s)),
        capacity: cut.length,
        sockets: mounts,
        tray: shuffle([
          ...kinds,
          ...shuffle(available).slice(0, i < 5 ? 0 : i < 15 ? 1 : 2),
        ]),
      };
      const move = packFittings(
        cut.map((s, k) => ({
          part: s.kind,
          socket: mounts.indexOf(sockets[k]),
        })),
      );
      if (!spread.every((n) => trial(M, board, move, n).state === "won"))
        continue;
      counts[3]++;
      const alt = [
        null,
        ...Array.from({ length: board.capacity }, (_, k) => [
          ...possibilities(board, k + 1),
        ]).flat(),
      ].filter((m) => JSON.stringify(m) !== JSON.stringify(move));
      if (
        alt.some((m) =>
          spread.some((n) => trial(M, board, m, n).state === "won"),
        )
      )
        continue;
      const proof = createRun(M, board, move);
      while (proof.state === "running") advance(M, proof);
      if (
        proof.items.some(
          (it, k) =>
            parts[it.shape.kind] && !proof.uses.some((e) => e.item === k),
        )
      )
        continue;
      return {
        board,
        move,
        upstream: gn,
        downstream: bn,
        tick: proof.tick,
        order: [...new Set(proof.uses.map((e) => e.kind))],
        attempt,
      };
    }
  }
  throw Error("Unbuilt relay " + i + " " + counts.join("/"));
}
const [start = "0", end = "20", dir = "/tmp/chaos-relay-drawings"] =
  process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
for (let i = +start; i < +end; i++) {
  const result = author(i);
  fs.writeFileSync(dir + "/" + i + ".json", JSON.stringify(result));
  console.log(
    i,
    result.upstream,
    result.downstream,
    result.tick,
    result.order.join("/"),
    result.attempt,
  );
}
if (+start === 0 && +end === 20) {
  const rows = Array.from(
    { length: 20 },
    (_, i) => JSON.parse(fs.readFileSync(dir + "/" + i + ".json")).board,
  );
  fs.writeFileSync(
    new URL("../one-part-missing/relay-boards.js", import.meta.url),
    "// Generated by scripts/author-relays.mjs.\nexport const relayBoards = [\n" +
      rows.map((b) => "  " + JSON.stringify(b) + ",").join("\n") +
      "\n];\n",
  );
}

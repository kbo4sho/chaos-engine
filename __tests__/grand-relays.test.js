import { it, expect } from "vitest";
import M from "matter-js";
import { relayCourse } from "../one-part-missing/relay-course.js";
import {
  parts,
  assembly,
  advance,
  createRun,
  trial,
} from "../one-part-missing/machines.js";
import { certify } from "../one-part-missing/certify.js";
import {
  relayEvents,
  recordedRoutes,
} from "../one-part-missing/dispatch-log.js";
import { snapshot } from "../one-part-missing/drawing.js";
import { fitCode, readOrderLink } from "../one-part-missing/work-orders.js";

it.each(relayCourse)(
  "$title needs every installed station and both loads",
  (m) => {
    const [move] = certify(M, m);
    const fixed = assembly(m, move).slice(0, -m.goals.length - 1);
    const run = createRun(M, m, move),
      film = [snapshot(run)];
    while (run.state === "running") {
      advance(M, run);
      film.push(snapshot(run));
    }
    for (const [index, shape] of fixed.entries()) {
      if (!parts[shape.kind]) continue;
      expect(
        run.uses.some((e) => e.item === index),
        shape.kind,
      ).toBe(true);
      const fixtures = fixed.map((s, i) =>
        i === index ? { ...s, disabled: true } : s,
      );
      expect(trial(M, { ...m, fixtures }).state, shape.kind).toBe("miss");
    }
    const events = relayEvents(run, film),
      event = (k) => events.find((e) => e.kind === k);
    expect(event("switch").tick).toBe(event("hatch").tick);
    expect(event("departure").tick).toBeGreaterThan(event("hatch").tick);
    expect(event("delivery").lane).toBe("blue");
    expect(events.filter((e) => e.kind === "target")[0].lane).toBe("gold");
    expect(readOrderLink(m.id + "/build/" + fitCode(m, move)).move).toEqual(
      move,
    );
    for (const route of recordedRoutes(run, film)) {
      const actor = route.lane === "gold" ? "marble" : "cargo";
      const jumps = new Set(
        run.uses
          .filter((e) => e.kind === "portal" && e.actor === actor)
          .map((e) => e.tick),
      );
      expect(route.pieces.length).toBe(jumps.size + 1);
    }
  },
);

it("opens with two spares, then asks for twelve different working tools on the final delivery", () => {
  const first = relayCourse[0],
    last = relayCourse.at(-1),
    fit = certify(M, last)[0];
  expect(first.capacity).toBe(2);
  expect(first.sockets.length).toBe(2);
  expect(last.capacity).toBe(3);
  expect(last.goals.at(-1).window).toBeTruthy();
  expect(
    new Set(
      assembly(last, fit)
        .map((s) => s.kind)
        .filter((k) => parts[k]),
    ).size,
  ).toBeGreaterThanOrEqual(12);
});

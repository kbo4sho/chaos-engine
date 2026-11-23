import { parts } from "./machines.js";
const seconds = (tick) => (tick / 60).toFixed(2) + " s";

// Keep body identity: two identical conveyors may act on different loads, or
// the same load can pass through a fitted and a fixed conveyor on one journey.
export function relayEvents(run, tape) {
  const events = [],
    seen = new Set();
  for (const u of run.uses) {
    const key = [u.item, u.actor, u.action].join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    const lane =
      u.kind === "hatch" || u.actor === "rig" || u.actor === "drive"
        ? "machine"
        : u.actor === "cargo"
          ? "blue"
          : "gold";
    const shape = run.items[u.item].shape;
    events.push({
      lane,
      tick: u.tick,
      label:
        parts[u.kind].name +
        (u.kind === "switch"
          ? " tripped"
          : u.kind === "hatch"
            ? " opened"
            : u.action
              ? " " + u.action
              : ""),
      kind: u.kind,
      fitted: !!shape.fitted,
    });
  }
  const release = events.find((e) => e.kind === "hatch"),
    cargo = run.items.findIndex((it) => it.shape.kind === "cargo");
  if (release && cargo >= 0) {
    const origin = tape.find((s) => s.tick === release.tick)?.poses[cargo];
    if (origin) {
      const moved = tape.find(
        (s) =>
          s.tick > release.tick &&
          Math.hypot(
            s.poses[cargo][0] - origin[0],
            s.poses[cargo][1] - origin[1],
          ) >= run.items[cargo].shape.r,
      );
      if (moved)
        events.push({
          lane: "blue",
          kind: "departure",
          tick: moved.tick,
          label: "Parcel cleared one radius",
        });
    }
  }
  for (const [i, tick] of run.hits.entries()) {
    const final = i === run.goals.length - 1;
    events.push({
      tick,
      lane: run.goals[i].shape.striker === "cargo" ? "blue" : "gold",
      kind: final ? "delivery" : "target",
      label: final ? "Parcel received" : "Target " + (i + 1) + " reached",
    });
  }
  for (const pass of run.passes.filter((p) => !p.accepted))
    events.push({
      lane: "blue",
      tick: pass.tick,
      kind: "miss",
      label: pass.reason,
    });
  return events.sort((a, b) => a.tick - b.tick);
}

// Split at actual portal activations so the overlay never draws an imaginary
// trajectory between two rings. Retain ticks for inspection before delivery.
export function recordedRoutes(run, tape) {
  return ["marble", "cargo"].flatMap((kind) => {
    const body = run.items.findIndex((it) => it.shape.kind === kind);
    if (body < 0) return [];
    const jumps = new Set(
      run.uses
        .filter((e) => e.kind === "portal" && e.actor === kind)
        .map((e) => e.tick),
    );
    const pieces = [];
    for (const f of tape) {
      if (!pieces.length || jumps.has(f.tick)) pieces.push([]);
      const [x, y] = f.poses[body];
      pieces.at(-1).push({ tick: f.tick, x, y });
    }
    return [{ lane: kind === "cargo" ? "blue" : "gold", pieces }];
  });
}

export function setupDispatchLog(el, inspect, redraw) {
  const panel = el("dispatch-log"),
    list = el("dispatch-events"),
    filter = el("dispatch-lane");
  let events = [],
    routes = [];
  const overlay = el("dispatch-paths");
  overlay.addEventListener("change", redraw);
  panel.addEventListener("toggle", redraw);
  function render() {
    const visible = events.filter(
      (e) => filter.value === "all" || filter.value === e.lane,
    );
    list.replaceChildren(
      ...visible.map((e) => {
        const li = document.createElement("li"),
          b = document.createElement("button"),
          tag = document.createElement("span"),
          clock = document.createElement("time");
        b.type = "button";
        tag.className = "dispatch-tag " + e.lane;
        tag.textContent = { gold: "Gold", blue: "Blue", machine: "Machine" }[
          e.lane
        ];
        clock.textContent = seconds(e.tick);
        b.append(
          tag,
          document.createTextNode(e.label + (e.fitted ? " · fitted" : "")),
          clock,
        );
        b.addEventListener("click", () => inspect(e.tick));
        li.append(b);
        return li;
      }),
    );
    if (!visible.length) {
      const item = document.createElement("li");
      item.textContent = "No contacts recorded on this lane.";
      list.append(item);
    }
  }
  filter.addEventListener("change", () => {
    render();
    redraw();
  });
  return {
    paths() {
      return panel.open && !panel.hidden && overlay.checked
        ? routes.filter(
            (r) => filter.value === "all" || r.lane === filter.value,
          )
        : [];
    },
    clear() {
      routes = [];
      overlay.checked = false;
      panel.hidden = true;
      panel.open = false;
      events = [];
      list.replaceChildren();
      filter.value = "all";
    },
    show(run, tape) {
      events = relayEvents(run, tape);
      routes = recordedRoutes(run, tape);
      const release = events.find((e) => e.kind === "hatch"),
        arrival = events.find((e) => e.kind === "delivery");
      el("dispatch-interval").textContent = !release
        ? "The hatch stayed closed. Follow gold to the trip switch."
        : arrival
          ? "Hatch to receiver · " + seconds(arrival.tick - release.tick)
          : "The hatch opened at " +
            seconds(release.tick) +
            ". Follow blue from there.";
      el("dispatch-count").textContent = String(events.length);
      panel.hidden = false;
      render();
    },
  };
}

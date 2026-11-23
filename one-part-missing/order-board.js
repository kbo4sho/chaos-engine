export function orderBoard(source, spec) {
  const actor = source.goals.at(-1).striker || source.striker || 'marble';
  return {
    ...source,
    capacity: 2,
    minimum: 1,
    contract: true,
    reversible: false,
    tray: spec.tray,
    sockets: source.sockets,
    toolCourse: false,
    goals: [{ kind: 'flag', striker: actor, sensor: true, x: spec.x, y: spec.y, w: spec.w, h: spec.h }],
  };
}

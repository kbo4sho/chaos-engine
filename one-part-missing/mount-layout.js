// Keep the entire touch target selectable in dense machines. The leader points
// back to the exact physics socket even when the label must move on a phone.
export function mountLabels(anchors, targets, width, height, pressed = []) {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v)),
    half = Math.min(22, width / 2, height / 2);
  const points = [];
  for (const [index, a] of anchors.entries()) {
    const beside = targets.some((g) => Math.hypot(g.x - a.x, g.y - a.y) < Math.min(30, width * 0.058));
    const desired = { x: a.x, y: a.y + (beside ? 25 : pressed.includes(index) ? -17 : 0) };
    let best,
      cost = Infinity;
    for (let ring = 0; ring <= 7; ring++) {
      for (let step = 0; step < (ring ? 16 : 1); step++) {
        const angle = (step * Math.PI) / 8;
        const x = clamp(desired.x + Math.cos(angle) * ring * 9, half, width - half),
          y = clamp(desired.y + Math.sin(angle) * ring * 9, half, height - half);
        const overlap = points.reduce(
          (sum, b) =>
            sum +
            Math.max(0, 2 * half + 2 - Math.abs(b.x - x)) *
              Math.max(0, 2 * half + 2 - Math.abs(b.y - y)),
          0,
        );
        const covering = targets.reduce((n, g) => n + Math.max(0, 18 - Math.hypot(g.x - x, g.y - y)), 0);
        const score = overlap * 10000 + covering * 60 + Math.hypot(x - desired.x, y - desired.y);
        if (score < cost) {
          cost = score;
          best = { x, y };
        }
      }
      if (cost <= ring * 9) break;
    }
    points.push(best);
  }
  return points;
}
export function mountLayout(layer, machine, pressed) {
  const w = layer.clientWidth,
    h = layer.clientHeight;
  if (!w || !h) return;
  const key = [machine.id, w, h, ...pressed].join('/');
  if (layer.dataset.mounts === key) return;
  layer.dataset.mounts = key;
  const project = (s) => ({ x: (s.x * w) / 720, y: (s.y * h) / 400 }),
    anchors = machine.sockets.map(project);
  const points = mountLabels(anchors, machine.goals.map(project), w, h, pressed);
  for (const [i, b] of [...layer.children].entries()) {
    const p = points[i],
      a = anchors[i],
      dx = a.x - p.x,
      dy = a.y - p.y,
      len = Math.hypot(dx, dy);
    b.style.left = p.x + 'px';
    b.style.top = p.y + 'px';
    b.classList.toggle('leader', len >= 5);
    b.style.setProperty('--mount-x', dx + 'px');
    b.style.setProperty('--mount-y', dy + 'px');
    b.style.setProperty('--mount-length', len + 'px');
    b.style.setProperty('--mount-angle', Math.atan2(dy, dx) + 'rad');
  }
}

// The same cable drawing follows the simulated bodies in the bench, film and sandbox.
const colors = {
  tether: '#99ded9',
  spring: '#caa5ff',
  strut: '#81cadc',
  winch: '#ffd076',
  pulley: '#9ed6fa',
  breaklink: '#ff9d97',
  damper: '#a8dfad',
};
const ring = (c, x, y, r, fill) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.stroke();
};
export function eyelet(c) {
  c.save();
  c.lineWidth = 1.6;
  c.strokeStyle = '#a6bbc4';
  ring(c, 0, 0, 6, '#213b49');
  ring(c, 0, 0, 2, '#0c141c');
  c.restore();
}
function section(c, x, y, endX, endY) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(endX, endY);
  c.stroke();
}
function cable(c, a, b, extra) {
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.quadraticCurveTo(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2 + Math.min(42, Math.max(0, extra) * 0.65),
    b.x,
    b.y,
  );
  c.stroke();
}
function drawRig(c, kind, a, b, hub, length, broken) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d < 0.01) return;
  c.save();
  c.strokeStyle = colors[kind];
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (kind === 'pulley') {
    const routed = Math.hypot(hub.x - a.x, hub.y - a.y) + Math.hypot(hub.x - b.x, hub.y - b.y);
    cable(c, a, hub, (length - routed) / 2);
    cable(c, hub, b, (length - routed) / 2);
    ring(c, hub.x, hub.y, 9, '#223745');
    ring(c, hub.x, hub.y, 4, '#526d76');
  } else if (kind === 'tether' || kind === 'winch') {
    cable(c, a, b, length - d);
    if (kind === 'winch') {
      ring(c, a.x, a.y, 9, '#253846');
      ring(c, a.x, a.y, 5, '#5c5446');
    }
  } else {
    c.translate(a.x, a.y);
    c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    const left = d * 0.28,
      right = d * 0.72;
    if (broken) {
      section(c, 0, 0, Math.min(17, left), 5);
      section(c, d, 0, d - Math.min(17, left), 4);
    } else if (kind === 'strut') {
      c.lineWidth = 5;
      c.strokeStyle = '#314b59';
      section(c, 0, 0, d, 0);
      c.lineWidth = 1.5;
      c.strokeStyle = colors[kind];
      section(c, 0, -2, d, -2);
      section(c, 0, 2, d, 2);
    } else if (kind === 'spring') {
      section(c, 0, 0, left, 0);
      c.beginPath();
      c.moveTo(left, 0);
      for (let j = 1; j < 16; j++) c.lineTo(left + ((right - left) * j) / 16, j % 2 ? 4 : -4);
      c.lineTo(right, 0);
      c.stroke();
      section(c, right, 0, d, 0);
    } else if (kind === 'damper') {
      section(c, 0, 0, d, 0);
      c.fillStyle = '#29453e';
      c.fillRect(left, -4, right - left, 8);
      c.strokeRect(left, -4, right - left, 8);
      section(c, left + 3, -5, left + 3, 5);
      section(c, right, 0, d, 0);
    } else {
      section(c, 0, 0, d, 0);
      c.fillStyle = '#462d31';
      c.fillRect(d / 2 - 5, -3, 10, 6);
      c.strokeRect(d / 2 - 5, -3, 10, 6);
      section(c, d / 2 + 1, -3, d / 2 - 1, 3);
    }
  }
  c.restore();
}
export function drawBenchRig(c, items, preview) {
  if (!preview && !items.some((i) => i.shape.wire)) return;
  const nodes = new Map(items.filter((i) => i.shape.node).map((i) => [i.shape.node, i.body.position]));
  if (preview) {
    const a = nodes.get(preview.from),
      b = nodes.get(preview.to);
    if (a && b) {
      c.save();
      c.strokeStyle = '#b2d0de';
      c.lineWidth = 1.4;
      c.setLineDash([3, 5]);
      for (const end of [a, b]) section(c, preview.x, preview.y, end.x, end.y);
      c.restore();
    }
  }
  for (const { shape: s, body } of items) {
    if (!s.wire || s.disabled) continue;
    const a = nodes.get(s.from),
      b = nodes.get(s.to);
    if (a && b)
      drawRig(
        c,
        s.kind,
        a,
        b,
        body.position,
        body.render?.cableLength || Math.hypot(a.x - b.x, a.y - b.y),
        body.render?.cableBroken,
      );
  }
}
export function drawSandboxRig(c, link) {
  if (link.rig && link.rigMarker)
    drawRig(
      c,
      link.rig.kind,
      link.bodyA.position,
      link.bodyB.position,
      link.rigMarker.position,
      link.length,
      link.rig.broken,
    );
}
export const rigIcons = {
  tether: '<path d="M7 11q20 36 46 0"/><circle cx="7" cy="11" r="3"/><circle cx="53" cy="11" r="3"/>',
  spring: '<path d="M4 20h8l3-1 3-7 4 16 4-16 4 16 4-16 4 16 4-16 3 8h11"/>',
  strut:
    '<path d="M9 25 48 10l2 5-39 15z"/><circle cx="8" cy="28" r="4"/><circle cx="52" cy="12" r="4"/>',
  winch:
    '<circle cx="20" cy="20" r="11"/><circle cx="20" cy="20" r="6"/><path d="M19 9h33v11m-4-3 4 4 4-4M8 33h24"/>',
  pulley:
    '<circle cx="30" cy="13" r="9"/><circle cx="30" cy="13" r="3"/><path d="M21 13v13m18-13v17M15 26h12v8H15zm20 4h8v6h-8z"/>',
  breaklink: '<path d="M4 20h17l4-5h8l-4 10h8l4-5h15m-26-9 2-4m-4 22-3 5"/>',
  damper:
    '<path d="M4 20h10m0-5h23v10H14zm23 5h17m-34-7v14m8-12v10"/><circle cx="5" cy="20" r="2"/><circle cx="55" cy="20" r="2"/>',
};

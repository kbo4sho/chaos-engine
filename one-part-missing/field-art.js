const glyphs = {
  pulse: 'M-12 0H-4M-9 -3L-12 0L-9 3M4 0H12M9 -3L12 0L9 3M0 -5V-12M-3 -9L0 -12L3 -9M0 5V12',
  swirl: 'M-9 5C-15 -7 -1 -15 7 -7C14 0 5 9 -1 5C-6 1 -3 -4 1 -3M-12 4L-9 8L-5 5',
  lift: 'M-10 6L0 -7L10 6M-8 10L0 0L8 10M0 -7V-12',
  gyro: 'M-12 1Q0 -11 12 1Q0 12 -12 1M0 -12V12M-5 -8Q3 -12 6 -5M-6 6Q-2 12 5 8',
  phase: 'M-11 -10V10M-6 -5L-2 -1L-6 3M0 -11V-6M0 -2V2M0 6V11M4 -6L11 0L4 6',
  positive: 'M-9 0H9M0 -9V9',
  negative: 'M-9 0H9',
  ground: 'M0 -12V1M-10 1H10M-6 5H6M-3 9H3',
};
export const fieldIcons = Object.fromEntries(
  Object.entries(glyphs).map(([k, v]) => [
    k,
    '<g transform="translate(30 20)"><path d="M-17 -7L-8 -16H8L17 -7V7L8 16H-8L-17 7Z"/><path d="' +
      v +
      '"/></g>',
  ]),
);
const paths = new Map();
function glyph(c, k) {
  if (!paths.has(k)) paths.set(k, new Path2D(glyphs[k]));
  c.stroke(paths.get(k));
}
export function drawField(c, s, active) {
  c.save();
  const positive = s.kind === 'positive' || (s.kind === 'electrode' && s.sign === 1);
  c.strokeStyle = active
    ? '#ffe7a0'
    : positive
      ? '#ffb380'
      : s.kind === 'negative' || s.kind === 'electrode'
        ? '#a0c9ff'
        : '#8bdce1';
  c.fillStyle = s.kind === 'electrode' ? '#15212a' : '#172e36';
  c.lineWidth = 2.2;
  if (s.kind === 'electrode') {
    c.beginPath();
    c.arc(0, 0, s.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.scale(0.7, 0.7);
    glyph(c, positive ? 'positive' : 'negative');
  } else {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) * Math.PI) / 4,
        x = s.r * Math.cos(a),
        y = s.r * Math.sin(a);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.closePath();
    c.fill();
    c.stroke();
    if (s.kind === 'swirl' && s.dir === -1) c.scale(-1, 1);
    glyph(c, s.kind);
  }
  c.restore();
}
export function drawFieldState(c, r, sign, phase, angle = 0) {
  if (!sign && !phase) return;
  c.save();
  c.rotate(-angle);
  c.lineWidth = 2;
  if (phase) {
    c.strokeStyle = '#d0aaff';
    c.setLineDash([4, 3]);
    c.beginPath();
    c.arc(0, 0, r + 6, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  }
  if (sign) {
    const x = r * 0.8,
      y = -r * 0.8;
    c.fillStyle = '#10191d';
    c.strokeStyle = sign > 0 ? '#ffb380' : '#a0c9ff';
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(x - 3, y);
    c.lineTo(x + 3, y);
    if (sign > 0) {
      c.moveTo(x, y - 3);
      c.lineTo(x, y + 3);
    }
    c.stroke();
  }
  c.restore();
}
export function drawChargePairs(c, items) {
  const poles = items.flatMap((it) => {
    const sign = it.shape.kind === 'electrode' ? it.shape.sign : it.body.render?.fieldCharge;
    return sign ? [{ ...it.body.position, sign, fixed: it.shape.kind === 'electrode' }] : [];
  });
  if (poles.length < 2) return;
  c.save();
  c.lineWidth = 1.4;
  for (let i = 0; i < poles.length; i++)
    for (const b of poles.slice(i + 1)) {
      const a = poles[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
      if ((a.fixed && b.fixed) || d <= 16 || d >= 240) continue;
      const ux = dx / d,
        uy = dy / d,
        direction = a.sign === b.sign ? -1 : 1;
      c.strokeStyle = direction === 1 ? '#7ad8d0' : '#eec48a';
      c.setLineDash([2, 5]);
      c.beginPath();
      c.moveTo(a.x + ux * 12, a.y + uy * 12);
      c.lineTo(b.x - ux * 12, b.y - uy * 12);
      c.stroke();
      c.setLineDash([]);
      for (const [base, s, moving] of [
        [a, 1, !a.fixed],
        [b, -1, !b.fixed],
      ])
        if (moving) {
          const x = base.x + ux * s * 20,
            y = base.y + uy * s * 20,
            turn = s * direction;
          c.beginPath();
          c.moveTo(x - ux * turn * 5 - uy * 4, y - uy * turn * 5 + ux * 4);
          c.lineTo(x, y);
          c.lineTo(x - ux * turn * 5 + uy * 4, y - uy * turn * 5 - ux * 4);
          c.stroke();
        }
    }
  c.restore();
}

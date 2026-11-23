const clock = (t) => (t / 60).toFixed(2) + ' s';
export function drawSandboxShutter(c, render) {
  const s = render.machineShape,
    result = render.exposureResult;
  const color = result
    ? result.matched
      ? '#78efb5'
      : '#ffc857'
    : s.actor === 'cargo'
      ? '#91d7ff'
      : s.actor === 'weight'
        ? '#d9b3ef'
        : '#ffc857';
  c.lineWidth = 2;
  c.strokeStyle = color;
  c.setLineDash(result ? [] : [5, 3]);
  c.beginPath();
  if (s.actor === 'cargo') {
    c.moveTo(0, -s.r);
    c.lineTo(s.r, 0);
    c.lineTo(0, s.r);
    c.lineTo(-s.r, 0);
    c.closePath();
  } else if (s.actor === 'weight') c.rect(-s.r, -s.r, 2 * s.r, 2 * s.r);
  else c.arc(0, 0, s.r, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  if (result && !result.matched && !result.missing) {
    const d = Math.hypot(result.dx, result.dy),
      factor = Math.min(1, 45 / Math.max(1, d));
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(result.dx * factor, result.dy * factor);
    c.stroke();
  }
  const label =
    (s.reference ? 'REF ' : '') +
    s.sequence +
    ' · ' +
    (result ? (result.missing ? 'NO LOAD' : result.matched ? 'HIT' : 'MISS') : clock(s.tick));
  c.font = 'bold 13px monospace';
  const w = c.measureText(label).width + 8,
    x = s.x > 585 ? -w - 4 : 4,
    y = s.y < 42 ? s.r + 5 : -s.r - 21;
  c.fillStyle = '#0b1116';
  c.fillRect(x, y, w, 19);
  c.strokeRect(x, y, w, 19);
  c.fillStyle = color;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(label, x + 4, y + 9);
}

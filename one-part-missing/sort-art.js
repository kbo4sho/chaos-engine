import { slats, cable } from './sorting.js';
const tint = {
  sieve: '#98d9de',
  funnel: '#a1bdcd',
  basket: '#a8c7b1',
  ice: '#9ce3fc',
  oneway: '#edc67c',
  zipline: '#eed49f',
};
export function drawSortTool(c, s, active) {
  c.save();
  const color = active ? '#fff5c6' : tint[s.kind];
  c.strokeStyle = color;
  c.fillStyle = '#1c3540';
  c.lineWidth = 1.7;
  const line = (x, y, X, Y) => {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(X, Y);
    c.stroke();
  };
  for (const p of slats(s)) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.a);
    c.fillStyle = s.kind === 'ice' ? '#406775' : '#24414a';
    c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
    if (s.kind === 'ice') {
      for (let x = -p.w / 2 + 7; x < p.w / 2 - 9; x += 21) {
        line(x, -1, x + 6, -2);
        line(x + 3, 2, x + 8, 1);
      }
    } else if (p.w > p.h) {
      for (let x = -p.w / 2 + 5; x < p.w / 2 - 3; x += 9) line(x, p.h / 2 - 1, x + 3, -p.h / 2 + 2);
    }
    c.restore();
  }
  if (s.kind === 'sieve') {
    const half = (s.gap || 28) / 2;
    c.setLineDash([2, 3]);
    line(-half, -8, half, -8);
    c.setLineDash([]);
    line(-half, -10, -half, -5);
    line(half, -10, half, -5);
  }
  if (s.kind === 'oneway') {
    const w = s.w / 2,
      d = s.dir || -1;
    c.setLineDash([6, 4]);
    line(-w, 0, w, 0);
    c.setLineDash([]);
    for (let x = -w + 12; x < w; x += 23) {
      line(x, -5 * d, x, 6 * d);
      line(x, 6 * d, x - 4, 2 * d);
      line(x, 6 * d, x + 4, 2 * d);
    }
  }
  if (s.kind === 'zipline') {
    const { dx, dy } = cable(s);
    line(0, 0, dx, dy);
    c.globalAlpha = 0.45;
    line(0, 3, dx, dy + 3);
    c.globalAlpha = 1;
    for (const [x, y] of [
      [0, 0],
      [dx, dy],
    ]) {
      c.fillStyle = '#354b53';
      c.beginPath();
      c.arc(x, y, 5, 0, 2 * Math.PI);
      c.fill();
      c.stroke();
      line(x, y + 5, x, y + 16);
      line(x - 6, y + 16, x + 6, y + 16);
    }
  }
  c.restore();
}
export function drawBin(c, s, received, hold) {
  const blue = s.bin === 'blue',
    r = Math.min(s.w, s.h) * 0.52,
    col = blue ? '#99d9fb' : '#ffd074';
  c.save();
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.fillStyle = received ? (blue ? '#39627a' : '#665a35') : '#152731';
  c.beginPath();
  if (blue) {
    c.moveTo(0, -r);
    c.lineTo(r, 0);
    c.lineTo(0, r);
    c.lineTo(-r, 0);
    c.closePath();
  } else c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  if (received) {
    c.beginPath();
    c.moveTo(-5, 0);
    c.lineTo(-1, 4);
    c.lineTo(6, -5);
    c.stroke();
  } else {
    c.setLineDash([2, 2]);
    c.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
    c.setLineDash([]);
  }
  if (s.hold && !received) {
    const y = r + 5;
    c.fillStyle = '#34515d';
    c.fillRect(-r, y, r * 2, 3);
    c.fillStyle = col;
    c.fillRect(-r, y, r * 2 * Math.min(1, (hold || 0) / s.hold), 3);
  }
  c.font = 'bold 13px ui-monospace, monospace';
  c.textAlign = 'center';
  c.lineWidth = 3;
  c.strokeStyle = '#0c1820';
  c.fillStyle = col;
  const name = (blue ? 'BLUE' : 'GOLD') + (s.hold ? ' · HOLD' : '');
  c.strokeText(name, 0, -r - 5);
  c.fillText(name, 0, -r - 5);
  c.restore();
}
export const sortIcons = {
  sieve:
    '<path d="M4 19h18v7H4zm34 0h18v7H38zM22 13h16m-16-3v6m16-6v6M8 24l3-4m3 4 3-4m25 4 3-4m4 4 3-4"/>',
  funnel: '<path d="M4 8l21 18v6m31-24L35 26v6M4 13l16 15m36-15L40 28m-14 5h8"/>',
  basket: '<path d="M7 9h4v20h38V9h4v25H7zm8 17 11-13m-1 13 11-13m-1 13 10-12"/>',
  ice: '<path d="M5 12l50 12-1 5L4 17zm8 1 4 1m7 1 5 1m8 2 6 1"/>',
  oneway:
    '<path d="M4 23h52" stroke-dasharray="4 3"/><path d="M15 29V12m-5 6 5-6 5 6m10 11V12m-5 6 5-6 5 6m10 11V12m-5 6 5-6 5 6"/>',
  zipline:
    '<path d="M6 7l48 20M6 8v12m48 7v9M21 14l-3 8m-4-1 8 3"/><circle cx="6" cy="7" r="3"/><circle cx="54" cy="27" r="3"/>',
};

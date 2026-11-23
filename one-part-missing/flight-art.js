import { gearBit } from './flight.js';
const glyphs = {
  float: 'M-10 2 Q0 -4 10 2 M-8 6 Q0 0 8 6 M0 -3 V-11 M-4 -7 L0 -11 L4 -7',
  parachute: 'M-11 0 Q-8 -15 1 -11 Q9 -11 12 0 Q6 -4 2 0 Q-4 -4 -11 0 M-10 0 L1 11 L11 0 M1 11 V0',
  thruster: 'M-7 -5 L4 -5 L10 0 L4 5 L-7 5 Z M-8 -3 L-15 0 L-8 3 M0 -3 L5 0 L0 3',
  keel: 'M-13 -2 H12 L5 2 L-2 11 L-1 2 L-11 2 Z M-9 -6 H7',
  hopper: 'M-5 -11 L2 -8 L-5 -4 L2 0 L-5 4 L2 8 M-9 9 H8 L12 7',
  bank: 'M-12 8 L0 -3 L9 8 M6 8 H10 V4 M-11 -4 H11',
  unload: 'M-11 -8 L-4 -1 L-11 6 M11 -8 L4 -1 L11 6 M-2 8 L0 12 L2 8',
};
export const flightIcons = Object.fromEntries(
  Object.entries(glyphs).map(([k, v]) => [
    k,
    '<g transform="translate(30 20)"><circle r="16" stroke-dasharray="6 3"/><path d="' + v + '"/></g>',
  ]),
);
const paths = new Map();
export function drawFlightRing(c, s, active) {
  c.save();
  c.strokeStyle = active ? '#ffe39a' : s.fitted ? '#ffb266' : '#78d4d6';
  c.fillStyle = '#17343c';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, s.r, 0, Math.PI * 2);
  c.fill();
  c.setLineDash([6, 4]);
  c.stroke();
  c.setLineDash([]);
  if (!paths.has(s.kind)) paths.set(s.kind, new Path2D(glyphs[s.kind]));
  c.stroke(paths.get(s.kind));
  c.restore();
}
export function drawGear(c, r, mask, angle = 0) {
  if (!mask) return;
  c.save();
  c.lineWidth = 1.8;
  if (mask & gearBit.thruster) {
    c.strokeStyle = '#ffb666';
    c.fillStyle = '#e8823d';
    c.beginPath();
    c.moveTo(-r, -3);
    c.lineTo(-r - 9, 0);
    c.lineTo(-r, 3);
    c.closePath();
    c.fill();
  }
  if (mask & gearBit.keel) {
    c.strokeStyle = '#73e3de';
    c.beginPath();
    c.moveTo(-r - 3, 2);
    c.lineTo(r, 2);
    c.lineTo(-4, r + 6);
    c.lineTo(-3, 3);
    c.stroke();
  }
  if(mask&gearBit.gyro){c.strokeStyle='#b7efca';c.beginPath();c.moveTo(0,0);c.lineTo(r+9,0);c.moveTo(r+6,-3);c.lineTo(r+9,0);c.lineTo(r+6,3);c.stroke();}
  c.rotate(-angle);
  if(mask&gearBit.lift){c.strokeStyle='#b1c4ff';c.beginPath();c.moveTo(-r-3,1);c.lineTo(-r-3,-7);c.lineTo(-r-6,-4);c.moveTo(r+3,1);c.lineTo(r+3,-7);c.lineTo(r+6,-4);c.stroke();}
  if (mask & gearBit.parachute) {
    c.strokeStyle = '#9fd6f3';
    c.fillStyle = '#284d65';
    c.beginPath();
    c.arc(0, -r - 9, r + 4, Math.PI, Math.PI * 2);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-r - 4, -r - 9);
    c.lineTo(0, -r + 2);
    c.lineTo(r + 4, -r - 9);
    c.stroke();
  }
  if (mask & gearBit.float) {
    c.strokeStyle = '#91f1da';
    c.setLineDash([3, 3]);
    c.beginPath();
    c.ellipse(0, 0, r + 5, r + 2, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  }
  if (mask & gearBit.hopper) {
    c.strokeStyle = '#ffce76';
    c.beginPath();
    c.moveTo(0, r - 1);
    c.lineTo(-2, r + 3);
    c.lineTo(2, r + 5);
    c.lineTo(0, r + 7);
    c.moveTo(-6, r + 7);
    c.lineTo(6, r + 7);
    c.stroke();
  }
  c.restore();
}

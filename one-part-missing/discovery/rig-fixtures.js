import { parts } from '../machines.js';

export const tool = (kind, x, y, other = {}) => ({ ...parts[kind].shape, x, y, ...other });
export const ball = (x, y, r = 11, vx = 0) => ({ kind: 'marble', node: 'runner', x, y, r, vx });
export const parcel = (x, y, r = 11) => ({ kind: 'cargo', node: 'parcel', x, y, r });
export const post = (x, y) => ({ kind: 'eyelet', node: 'post', field: true, r: 6, x, y });
export const offstage = { kind: 'flag', x: 1600, y: 950, w: 20, h: 24, sensor: true };
export const track = (ball, fixtures, striker) => ({
  ball,
  fixtures,
  goals: [{ ...offstage, striker }],
  sockets: [],
  tray: [],
});
export const control = (name, values, labels, lesson) => ({ name, values, labels, lesson });
export const shot = (tick, kind, x, y) => ({ tick, kind, x, y });

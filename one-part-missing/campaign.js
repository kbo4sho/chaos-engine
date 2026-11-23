import { machines } from './machines.js';
import { originals, layout, addScore } from './campaign-layout.js';
import { scores } from './campaign-score.js';

export { chapters } from './campaign-layout.js';
export const campaign = scores.map((entry, index) => {
  const number = index + 1;
  if (!entry) return machines.find((machine) => machine.id === originals.get(number));
  const [seed, score] = entry;
  const machine = addScore(layout(number, seed).machine, score);
  // A gentler release keeps the last two dominoes moving on WebKit as well as Chrome.
  if (machine.id === 'station-092') machine.ball.vx = 1.7;
  return machine;
});
export const campaignById = new Map(campaign.map((machine) => [machine.id, machine]));

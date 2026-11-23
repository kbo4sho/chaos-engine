// Stable recipes for the numbered campaign. Coordinates are in sandbox units.
// Seeds establish the mechanical layout. The authored score supplies the targets.
export const chapters = [
  ['First shift', 'Follow the marble across an open gap.'],
  ['Return lines', 'Read the slope at the end of each rail.'],
  ['Rebound shop', 'Aim the rebound off the curved face of a drum.'],
  ['Heavy lifting', 'Watch what happens on the opposite arm of a pivot.'],
  ['Signal yard', 'Carry a push across a break in a domino line.'],
  ['Chime works', 'Strike the numbered targets in order.'],
  ['Mirror shop', 'Flip a rail to change which way it slopes.'],
  ['Exchange floor', 'Trace each handoff before choosing a socket.'],
  ['Close quarters', 'Read narrow target windows and four mounting positions.'],
  ['Final assembly', 'Carry a signal through a four-contact sequence.'],
];

const lineups = [
  'bridge bridge bridge bumper bridge bridge chute bridge bumper bridge',
  'bridge chute bridge chute chute bridge chute bridge chute chute',
  'bumper bridge bumper chute bumper bumper bridge bumper chute bumper',
  'weight bridge weight bumper weight chute weight weight bumper weight',
  'domino weight domino bridge domino bumper domino weight domino domino',
  'bridge chute bumper domino bridge weight chute bumper domino bridge',
  'chute bridge chute bumper bridge chute domino bridge chute bridge',
  'domino weight bumper chute domino bridge weight bumper chute domino',
  'bumper chute domino bridge bumper weight chute domino bridge bumper',
  'bridge domino chute bumper bridge domino chute bumper bridge domino',
].map((row) => row.split(' '));

const titles = [
  'The last bell|Loading dock|Span one|Short hop|Freight spur|Copper run|Lower siding|Side track|Parcel drop|End of the line',
  'Lower landing|Foldback|Parcel shelf|Blind corner|Hairpin|East siding|Wrong-way freight|Overpass|Return ticket|The reversing room',
  'First rebound|Spring crossing|Rim shot|The lower loop|Flywheel|Over the lip|Transfer bridge|The high note|Inside turn|Crown bell',
  'Counterbalance|Split rail|Lift shaft|High striker|Heavy lifting|Brake slope|Short arm|Ballast lift|Upstroke|The weigh house',
  'Signal post|Hoist line|First dispatch|Across the yard|Gap in the ranks|Switch drum|Semaphore|Balance point|Special delivery|Outbound freight',
  'Two tones|Answer bell|Overtone|Flag and bell|Arpeggio|Hammer note|Descending scale|Resonance|Last post|Three-note waltz',
  'Mirror mount|Reverse span|Back pitch|Offset rebound|Southpaw|Counterflow|Westbound mail|Opposite bank|The left turn|Double reading',
  'Signal exchange|Gravity lift|Rim transfer|Back channel|Freight exchange|Through line|Pivot transfer|Bank transfer|Down exchange|Relay office',
  'Glancing blow|Narrow gauge|One tile short|Needle bridge|Rim clearance|Lift window|Blind return|Final inch|Tight crossing|Pinpoint',
  'Opening quartet|Four-way dispatch|Countermelody|Resonant chamber|Four spans|Night mail|Descending fourth|Bell tower|The long measure|The hundredth signal',
].map((row) => row.split('|'));

export const originals = new Map([
  [1, 'last-bell'],
  [17, 'switchback'],
  [28, 'high-note'],
  [35, 'counterweight'],
  [49, 'domino-post'],
  [60, 'three-chimes'],
]);
export const levelId = (levelNumber) =>
  originals.get(levelNumber) || 'station-' + String(levelNumber).padStart(3, '0');

const rail = (x, y, w, a = 0, h = 12) => ({ kind: 'rail', x, y, w, h, a });
const socket = (x, y) => ({ x, y });
const marble = (x, y, vx) => ({ kind: 'marble', x, y, r: 12, vx });

export function layout(levelNumber, seed) {
  let state = seed;
  const integer = (lo, hi) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return lo + Math.floor((state / 4294967296) * (hi - lo + 1));
  };
  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };
  const chapter = Math.floor((levelNumber - 1) / 10),
    position = (levelNumber - 1) % 10;
  const family = lineups[chapter][position];
  const part = family;
  const reversible = chapter >= 6;
  const mirror = (reversible || ['weight', 'domino', 'bumper'].includes(family)) && integer(0, 1) === 1;
  let ball, fixtures, mount, finalTile;
  if (family === 'weight') {
    const x = integer(300, 413),
      y = integer(272, 314),
      arm = integer(81, 115);
    fixtures = [
      { ...rail(x, y, 2 * arm), kind: 'rocker', pivot: true },
      rail(x - arm * 0.55, y + 18, 26),
      rail(x + arm * 0.76, y + 18, 32),
    ];
    ball = marble(x + arm * 0.76, y - integer(26, 38), 0);
    mount = socket(x - (arm * integer(62, 84)) / 100, y - integer(125, 207));
  } else if (family === 'domino') {
    const x = integer(277, 352),
      floor = integer(309, 340),
      step = integer(25, 32);
    const count = integer(6, 9),
      gap = integer(1, count - 3);
    finalTile = x + (count - 1) * step;
    const h = integer(58, 72),
      y = floor - 9 - h / 2;
    fixtures = [
      rail(x - 167, floor - 147, integer(215, 246), integer(29, 39) / 100),
      rail((x + finalTile) / 2, floor, (count - 1) * step + 148, 0, 18),
    ];
    for (let i = 0; i < count; i++)
      if (i !== gap) fixtures.push({ kind: 'tile', x: x + i * step, y, w: 12, h });
    ball = marble(x - 254, floor - 239, integer(18, 30) / 10);
    mount = socket(x + gap * step, floor - 9 - 67 / 2);
    finalTile = { x: finalTile + integer(39, 46), y: floor - integer(22, 35) };
  } else {
    const x = integer(133, 207),
      y = integer(92, 135),
      w = integer(173, 269),
      a = integer(15, 35) / 100;
    const lip = x + w / 2;
    fixtures = [rail(x, y, w, a)];
    ball = marble(
      x - w / 2 + integer(14, 35),
      Math.max(18, y - (w * a) / 2 - integer(29, 43)),
      integer(16, 30) / 10,
    );
    mount = socket(
      Math.round(lip + integer(28, 76)),
      Math.round(y + (w * a) / 2 + integer(38, family === 'bumper' ? 118 : 84)),
    );
    if (family === 'bridge' && (levelNumber % 3 !== 0 || chapter >= 5))
      fixtures.push(
        rail(
          mount.x + integer(136, 191),
          mount.y + integer(31, 79),
          integer(118, 207),
          integer(4, 24) / 100,
        ),
      );
    if (family === 'chute')
      fixtures.push(
        rail(
          mount.x - integer(69, 136),
          mount.y + integer(64, 115),
          integer(129, 202),
          -integer(8, 23) / 100,
        ),
      );
  }
  const sockets = [mount];
  const count = chapter < 2 ? 2 : chapter < 8 ? 3 : 4;
  // Keep every mount separately tappable at the phone's scale.
  while (sockets.length < count) {
    const decoy = socket(
      integer(Math.max(62, mount.x - 186), Math.min(658, mount.x + 199)),
      integer(105, 329),
    );
    if (sockets.every((p) => Math.hypot(p.x - decoy.x, p.y - decoy.y) > 108)) sockets.push(decoy);
  }
  shuffle(sockets);
  const alternatives = shuffle(
    ['bridge', 'chute', 'bumper', 'domino', 'weight'].filter((p) => p !== part),
  );
  const tray = shuffle([
    part,
    ...alternatives.slice(0, chapter === 0 && position < 5 ? 1 : chapter < 5 ? 2 : chapter < 8 ? 3 : 4),
  ]);
  const reflect = (s) =>
    mirror ? { ...s, x: 720 - s.x, ...(s.a ? { a: -s.a } : {}), ...(s.vx ? { vx: -s.vx } : {}) } : s;
  const machine = {
    id: levelId(levelNumber),
    title: titles[chapter][position],
    ball: reflect(ball),
    fixtures: fixtures.map(reflect),
    sockets: sockets.map(reflect),
    tray,
    reversible,
    goals: [],
  };
  const intended = { part, socket: sockets.indexOf(mount) };
  if (mirror && ['chute', 'bridge'].includes(part)) intended.flipped = true;
  return { machine, intended, family, finalTile: finalTile && reflect(finalTile) };
}

// A score entry gives the target shape, center, dimensions and optional striking body.
export function addScore(machine, score) {
  machine.goals = score.map(([kind, x, y, w, h, striker]) => ({
    kind,
    x,
    y,
    w,
    h,
    sensor: true,
    ...(striker ? { striker } : {}),
  }));
  const final = machine.goals.at(-1);
  const action =
    final.striker === 'tile'
      ? 'Trip the flag with a falling domino.'
      : { bell: 'Ring the bell.', flag: 'Raise the flag.', chime: 'Strike the chime.' }[final.kind];
  const count = machine.goals.length;
  const relay = machine.goals.slice(0, -1).some((g) => g.striker === 'tile');
  if (relay) {
    const opening = count === 3 ? 'Ring chime 1' : 'Ring chimes 1 and 2';
    machine.goal =
      opening +
      ' with the marble, then topple dominoes through chime ' +
      (count - 1) +
      ' and flag ' +
      count +
      '.';
  } else if (machine.goals[0].striker === 'weight') {
    machine.goal =
      'Strike chime 1 with the weight, then send the marble to ' +
      (count === 2 ? 'target 2.' : 'targets 2 and 3.');
  } else {
    machine.goal = (count > 1 ? 'Follow the numbered targets in order. ' : '') + action;
  }
  machine.success =
    final.striker === 'tile'
      ? 'The last tile raised the flag.'
      : { bell: 'The bell rang.', chime: 'The chime sounded.', flag: 'Flag raised.' }[final.kind];
  const first = machine.fixtures[0];
  const dominoes = machine.fixtures.filter((f) => f.kind === 'tile').length;
  const release = first.pivot
    ? 'The marble rests on a pivoted beam.'
    : 'The launch rail slopes ' + (first.a > 0 ? 'right' : 'left') + '.';
  const track = dominoes
    ? ' A gap separates two groups of standing dominoes.'
    : machine.fixtures.length === 2
      ? ' A second rail sits below the first.'
      : '';
  const locations = machine.goals.map((g, i) => {
    const side = g.x < 250 ? 'left' : g.x > 470 ? 'right' : 'center';
    return i + 1 + ' ' + g.kind + ' in the ' + (g.y < 200 ? 'upper ' : 'lower ') + side;
  });
  machine.description = release + track + ' The targets in order are ' + locations.join(', ') + '.';
  return machine;
}

import { relayBoards } from "./relay-boards.js";
export const relayChapters = [
  [
    "Relay yard",
    "Carry a gold signal to a hatch, then follow a different load to its receiver.",
  ],
  [
    "Master dispatch",
    "Read the receiving clock and trace a fault back across both sides of a working machine.",
  ],
];
const cards = [
  [
    "First handoff",
    "Follow gold to the switch. The hatch opens on that signal. Switch the dispatch log to Blue to follow the parcel from there.",
  ],
  [
    "Two kinds of lift",
    "Gold can rise against gravity while the parcel descends under a canopy. Follow one load at a time.",
  ],
  [
    "Spring messenger",
    "Inspect Machinery to see the spring act. Find which moving body it can bring to the switch.",
  ],
  [
    "Tangent telegram",
    "Look at the winding from the incoming side. Then follow what the parcel carries away from the belt.",
  ],
  [
    "Cable courier",
    "A winch shortens its line while gold moves. Compare the first cable movement with the instant the hatch opens.",
  ],
  [
    "Cut the lift",
    "Trace where gold loses its harness. Blue has a separate carrier and must reach its own numbered target.",
  ],
  [
    "Pole to parcel",
    "A negative terminal changes the approach to a swirl. Once the door opens, inspect blue’s forward travel.",
  ],
  [
    "Damped delivery",
    "Syrup acts on the load in its field. A damper resists changes in cable length. Check when each one actually works.",
  ],
  [
    "Float the second load",
    "Start with the charged gold curve. After the transfer, read the blue nose as the thruster acts.",
  ],
  [
    "Breakaway post",
    "A breakaway link can release stored motion. Look at the cable and the deflector before tracing the keel.",
  ],
  [
    "Receiver hours",
    "Gold must trip the switch early enough for blue. The striped receiver only accepts a crossing during its open interval.",
  ],
  [
    "Signed departure",
    "A carried thruster acts over many frames. A pulse acts once on entry. Use the time between contacts to tell them apart.",
  ],
  [
    "Both departures",
    "Both loads encounter flight gear. Filter the log by color to see which hopper or release actually affected each load.",
  ],
  [
    "Spring exchange",
    "A gold spring and trampoline feed a line that charges the parcel. Watch the charge after it reaches the brush.",
  ],
  [
    "Counterflow flights",
    "The two loads approach their stations from different directions. Check the nose at the bank and at the hopper.",
  ],
  [
    "Long distance exchange",
    "Follow gold through the two portal rings, then switch to the parcel. Compare the hatch time with the receiver time.",
  ],
  [
    "Cable and canopy",
    "The winch changes distance to an anchor while the magnet bends the swing. Check the parcel’s carried gear after release.",
  ],
  [
    "Three shift changes",
    "One spare can act before the signal and another after it. Try a partial run and inspect the last event on each lane.",
  ],
  [
    "The charged manifest",
    "Use the clock, the belt and the charge badge together. To investigate a miss, follow the load that last touched a fitted spare.",
  ],
  [
    "The five hundredth dispatch",
    "Start with the first missing action on gold. Once the hatch opens, trace blue through its canopy, thruster, release hoop and bank to the timed receiver.",
  ],
];
export const relayCourse = relayBoards.map((board, i) => {
  const [title, lesson] = cards[i],
    kinds = [...board.fixtures.map((s) => s.kind), ...board.tray];
  return {
    ...board,
    id: "grand-" + title.toLowerCase().replaceAll(" ", "-"),
    title,
    lesson,
    grand: true,
    flightEquipment: kinds.some((k) =>
      [
        "float",
        "lift",
        "thruster",
        "parachute",
        "hopper",
        "keel",
        "gyro",
      ].includes(k),
    ),
    fieldReadout: kinds.some((k) =>
      ["positive", "negative", "ground", "phase"].includes(k),
    ),
    goal:
      "Ring the gold target, open the hatch, then deliver blue" +
      (board.goals.length === 3 ? " through both numbered targets." : "."),
    description:
      "Use the dispatch log after a test to inspect either load or the machinery.",
    success: "Both lanes delivered.",
  };
});

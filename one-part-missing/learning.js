import { campaign } from './campaign.js';
import { parts, validMove } from './machines.js';

// A shorter path gives a new player the whole toolbox without a hundred prerequisite repairs.
// Ordinary level links and the learning path count the same physical repair.
const sequence = [
  ['Carry and catch', [1, 101, 102, 105]],
  ['Change direction', [17, 28, 111, 112, 116]],
  ['Pass a signal', [35, 49, 60, 115]],
  ['Turn and brake', [121, 122, 126, 130]],
  ['Cross a gap', [131, 132, 137, 140]],
  ['Move a surface', [161, 162, 171, 172, 173, 178]],
  ['Deliver a parcel', [181, 182, 191, 195, 200]],
  ['Connect moving bodies', [201, 202, 203, 205, 206, 207, 211, 240]],
  ['Restore two handoffs', [241, 244, 254, 264, 270, 280]],
];
export const lessons = sequence.flatMap(([chapter, numbers]) =>
  numbers.map((n) => ({ chapter, machine: campaign[n - 1] })),
);
export const lessonById = new Map(lessons.map((lesson, i) => [lesson.machine.id, i]));
export const lessonLink = (id) => '#learn/' + id;

export const practice = {
  bridge: [1, 2, 91],
  chute: [17, 12, 93],
  bumper: [28, 21, 94],
  weight: [35, 31, 38],
  domino: [49, 41, 96],
  conveyor: [101, 103, 160],
  trampoline: [102, 104, 195],
  fan: [111, 113, 198],
  magnet: [112, 114, 199],
  deflector: [121, 123, 196],
  syrup: [122, 125, 154],
  portal: [131, 133, 200],
  repulsor: [132, 134, 151],
  elevator: [161, 163, 191],
  cam: [162, 164, 193],
  piston: [171, 174, 197],
  pinwheel: [172, 175, 200],
  tripwire: [173, 176, 194],
  switch: [181, 184, 188],
  hatch: [181, 182, 200],
  tether: [201, 204, 221],
  strut: [202, 210, 223],
  spring: [203, 208, 222],
  damper: [205, 215, 225],
  winch: [206, 209, 227],
  breaklink: [207, 219, 226],
  pulley: [211, 212, 240],
};

export function setupLearning({ el, lab }) {
  const menu = el('practice-tool'),
    practiceLinks = el('practice-links');
  for (const group of [
    ['Tracks and weights', ['bridge', 'chute', 'bumper', 'weight', 'domino']],
    [
      'Powered tools',
      ['conveyor', 'trampoline', 'fan', 'magnet', 'deflector', 'syrup', 'portal', 'repulsor'],
    ],
    ['Rigging', ['tether', 'strut', 'spring', 'damper', 'winch', 'breaklink', 'pulley']],
    ['Clockwork', ['elevator', 'cam', 'piston', 'pinwheel', 'tripwire', 'switch', 'hatch']],
  ]) {
    const list = document.createElement('optgroup');
    list.label = group[0];
    for (const id of group[1]) list.append(new Option(parts[id].name, id));
    menu.append(list);
  }
  let records = {},
    currentLesson = -1;
  const groupSelect = el('lesson-chapter');
  sequence.forEach(([name], i) => groupSelect.add(new Option(name, i)));
  const done = (m) => validMove(m, records[m.id]);
  function renderMap() {
    const group = sequence[Number(groupSelect.value)];
    el('lesson-list').replaceChildren(
      ...group[1].map((n) => {
        const m = campaign[n - 1],
          a = document.createElement('a');
        a.href = lessonLink(m.id);
        a.className = 'shelf-item';
        const num = document.createElement('span'),
          title = document.createElement('strong'),
          check = document.createElement('span');
        num.className = 'shelf-num';
        num.textContent = String(lessonById.get(m.id) + 1).padStart(2, '0');
        title.textContent = m.title;
        check.className = 'check';
        check.textContent = done(m) ? '✓' : '';
        if (currentLesson === lessonById.get(m.id)) a.setAttribute('aria-current', 'step');
        a.append(num, title, check);
        return a;
      }),
    );
  }
  function showMap() {
    el('lesson-map').open = true;
    el('lesson-map').scrollIntoView({ block: 'start' });
    groupSelect.focus({ preventScroll: true });
  }
  el('learn-start').addEventListener('click', (event) => {
    if (currentLesson >= 0) {
      event.preventDefault();
      showMap();
    }
  });
  groupSelect.addEventListener('change', renderMap);
  function renderPractice() {
    const id = menu.value;
    const phases = ['Meet', 'Practice', 'Combine'];
    el('practice-note').textContent = parts[id].description + '.';
    practiceLinks.replaceChildren(
      ...practice[id].map((n, i) => {
        const m = campaign[n - 1],
          a = document.createElement('a');
        const stage = document.createElement('small'),
          title = document.createElement('strong');
        stage.textContent = phases[i] + ' · ' + String(n).padStart(3, '0');
        title.textContent = m.title;
        a.href = '#' + m.id;
        a.append(stage, title);
        if (done(m)) {
          a.classList.add('complete');
          a.setAttribute('aria-label', stage.textContent + ', ' + m.title + ', repaired');
        }
        return a;
      }),
    );
  }
  menu.addEventListener('change', renderPractice);
  el('practice-demo').addEventListener('click', () => lab.open(menu.value, el('practice-demo')));
  return {
    showMap,
    update(book, active, machine) {
      records = book;
      const index = active ? lessonById.get(machine.id) : -1;
      if (index !== currentLesson && index >= 0)
        groupSelect.value = sequence.findIndex(([name]) => name === lessons[index].chapter);
      currentLesson = index;
      const totalDone = lessons.filter(({ machine }) => done(machine)).length;
      const next = lessons.find(({ machine }) => !done(machine)) || lessons[0];
      el('learn-start').href = lessonLink(next.machine.id);
      el('learn-start').textContent = active
        ? 'Lesson map ↓'
        : totalDone > 0 && totalDone < lessons.length
          ? 'Resume tool lessons →'
          : 'Learn the tools →';
      if (active) el('learn-start').href = '#lesson-map';
      el('learning-progress').textContent = totalDone + ' of ' + lessons.length + ' lessons repaired';
      renderMap();
      renderPractice();
    },
  };
}

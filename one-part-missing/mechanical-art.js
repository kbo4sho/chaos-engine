const steel = '#385460',
  rim = '#8adce1',
  gold = '#ffca75',
  blue = '#92d4ff',
  dark = '#10232d';
function stroke(c, points, color, size = 1) {
  c.strokeStyle = color;
  c.lineWidth = size;
  c.beginPath();
  c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  c.stroke();
}
function circle(c, x, y, r, color, edge, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (color) {
    c.fillStyle = color;
    c.fill();
  }
  if (edge) {
    c.strokeStyle = edge;
    c.lineWidth = width;
    c.stroke();
  }
}
function plate(c, x, y, w, h, color = steel, edge = rim) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
  c.strokeStyle = edge;
  c.lineWidth = 1.5;
  c.strokeRect(x, y, w, h);
}
export function drawMechanism(c, s, active, triggered, angle = 0) {
  const dir = s.dir || 1,
    edge = active ? '#fff4c9' : s.fitted ? gold : rim;
  switch (s.kind) {
    case 'elevator':
      plate(c, -39, -6, 78, 12, steel, edge);
      for (let x = -31; x < 36; x += 12)
        stroke(
          c,
          [
            [x, 3],
            [x + 5, -2],
          ],
          '#a9ced2',
          1.5,
        );
      for (const x of [-28, 28]) circle(c, x, 8, 4, dark, edge);
      break;
    case 'piston':
      plate(c, -9, -27, 18, 54, steel, edge);
      for (let y = -21; y < 26; y += 9)
        stroke(
          c,
          [
            [dir * -6, y],
            [dir * 6, y - 4],
          ],
          edge,
          1.3,
        );
      break;
    case 'cam':
      circle(c, 0, 0, 25, '#3f5358', edge, 2);
      circle(c, 0, 0, 17, null, '#78928d');
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        circle(c, 9 * Math.cos(a), 9 * Math.sin(a), 3, dark);
      }
      // The off-center axle stays fixed in world space while this solid orbits it.
      circle(c, -18 * Math.cos(s.phase || 0), -18 * Math.sin(s.phase || 0), 4, gold, dark);
      break;
    case 'pinwheel':
      for (let i = 0; i < 4; i++) {
        c.save();
        c.rotate((i * Math.PI) / 2);
        plate(c, 0, -6, 43, 12, '#30515b', edge);
        for (const x of [17, 25, 33])
          stroke(
            c,
            [
              [x, -3],
              [x + 3, 3],
            ],
            edge,
          );
        c.restore();
      }
      circle(c, 0, 0, 8, '#203640', gold, 2);
      circle(c, 0, 0, 3, gold);
      break;
    case 'tripwire': {
      const dx = 0.572 * 40,
        dy = 0.82 * dir * 40;
      stroke(
        c,
        [
          [-dx, -dy],
          [dx, dy],
        ],
        edge,
        2,
      );
      circle(c, -dx, -dy, 4, dark, edge);
      circle(c, dx, dy, 4, dark, edge);
      c.save();
      c.rotate(Math.atan2(-0.572, 0.82 * dir));
      stroke(
        c,
        [
          [1, 0],
          [16, 0],
          [11, -4],
        ],
        gold,
        1.7,
      );
      stroke(
        c,
        [
          [16, 0],
          [11, 4],
        ],
        gold,
        1.7,
      );
      c.restore();
      break;
    }
    case 'switch':
      circle(c, 0, 0, 18, dark, triggered ? gold : blue, 2);
      circle(c, 0, 0, 12, triggered ? '#9b642a' : '#2e5a6d', blue);
      stroke(
        c,
        [
          [-7, 4],
          [-2, 4],
          [1, -6],
          [3, 4],
          [8, 4],
        ],
        triggered ? gold : '#d1edfc',
        2,
      );
      break;
    case 'hatch':
      plate(c, -s.w / 2, -5, s.w, 10, '#665a42', edge);
      for (let x = -29; x < 30; x += 12)
        stroke(
          c,
          [
            [x, -4],
            [x + 7, 4],
          ],
          gold,
          1.5,
        );
      circle(c, (-dir * s.w) / 2, 0, 6, dark, gold, 2);
      break;
  }
}

export function drawMachineGuides(c, items, uses) {
  const door = items.find((i) => i.shape.kind === 'hatch');
  const trigger = items.find((i) => i.shape.kind === 'switch');
  if (door && trigger) {
    const a = trigger.shape,
      b = door.shape,
      live = uses?.some((u) => u.kind === 'switch');
    const x = b.x - ((b.dir || 1) * b.w) / 2;
    c.setLineDash(live ? [] : [3, 6]);
    stroke(
      c,
      [
        [a.x, a.y],
        [a.x, a.y + 23],
        [x, a.y + 23],
        [x, b.y],
      ],
      live ? '#bc965f' : '#456b7b',
      1.5,
    );
    c.setLineDash([]);
  }
  for (const { shape: s, body } of items) {
    const dir = s.dir || 1;
    if (s.kind === 'elevator') {
      for (const x of [s.x - 27, s.x + 27]) {
        stroke(
          c,
          [
            [x, s.y - 76],
            [x, s.y + 12],
          ],
          steel,
          3,
        );
        for (let y = s.y - 70; y < s.y + 5; y += 12)
          stroke(
            c,
            [
              [x - 3, y],
              [x + 3, y],
            ],
            rim,
          );
      }
    } else if (s.kind === 'piston') {
      const x = s.x - dir * 22;
      stroke(
        c,
        [
          [x, s.y],
          [body.position.x, s.y],
        ],
        '#59737e',
        8,
      );
      stroke(
        c,
        [
          [x, s.y - 20],
          [x, s.y + 20],
        ],
        gold,
        4,
      );
      c.setLineDash([3, 5]);
      stroke(
        c,
        [
          [s.x, s.y + 29],
          [s.x + dir * 78, s.y + 29],
        ],
        steel,
      );
      c.setLineDash([]);
    } else if (s.kind === 'hatch') {
      stroke(
        c,
        [
          [s.x - (dir * s.w) / 2, s.y - 34],
          [s.x - (dir * s.w) / 2, s.y],
        ],
        steel,
        4,
      );
      stroke(
        c,
        [
          [s.x + (dir * s.w) / 2, s.y - 21],
          [s.x + (dir * s.w) / 2, s.y - 5],
        ],
        steel,
        3,
      );
    }
  }
}
export function parcel(c, r) {
  circle(c, 0, 0, r, '#3685a7', '#c4eeff', 2);
  c.beginPath();
  c.moveTo(0, -r * 0.63);
  c.lineTo(r * 0.51, 0);
  c.lineTo(0, r * 0.63);
  c.lineTo(-r * 0.51, 0);
  c.closePath();
  c.fillStyle = '#c9f1ff';
  c.fill();
}
export const mechanicalIcons = {
  elevator: '<path d="M13 4v32m34-32v32M8 26h44v7H8zM27 19V5m-5 6 5-6 5 6"/>',
  piston: '<path d="M7 12v16m0-8h28m0-13h10v26H35zM48 20h9m-4-4 4 4-4 4"/>',
  cam: '<circle cx="30" cy="20" r="16"/><circle cx="30" cy="20" r="10"/><circle cx="20" cy="20" r="3"/>',
  pinwheel:
    '<g transform="rotate(24 30 20)"><path d="M12 17h15V2h6v15h15v6H33v15h-6V23H12z"/><circle cx="30" cy="20" r="4"/></g>',
  tripwire:
    '<circle cx="17" cy="5" r="3"/><circle cx="42" cy="34" r="3"/><path d="m19 8 21 24m-9-13 13-9m-7 1 7-1-1 7"/>',
  switch:
    '<circle cx="30" cy="20" r="16"/><circle cx="30" cy="20" r="12"/><path d="M20 23h6l4-10 4 10h7"/>',
  hatch: '<path d="M9 18h43v7H9zm8 1 4 6m5-6 4 6m5-6 4 6"/><circle cx="12" cy="21" r="5"/>',
};

# Domino drag-to-place (swipe a line of dominoes)

**Impact:** high
**Goal alignment:** "more fun and more satisfying" — domino chains are the most universally satisfying thing in physics sandboxes, but placing them one-by-one is tedious. Swipe-to-place removes the friction between imagining a chain and seeing it topple.

**Why:** Right now, building a domino chain of 20 pieces requires 20 individual taps with careful spacing. Most players give up after 5-6. A drag gesture that auto-spaces dominoes along your finger path turns a 30-second chore into a 2-second swipe — and the payoff (watching them all fall) is immediate. Setup should be fast; destruction should be slow. This nails that ratio.

## Changes

When `currentTool === 'domino'`, change pointer behavior:

1. **On drag start:** Begin recording pointer path points
2. **On drag move:** Show ghost dominoes along the path, evenly spaced ~35px apart, oriented perpendicular to the path direction at each point
3. **On drag end:** Spawn all dominoes along the path in one batch with a quick staggered `playSpawn()` sound (ascending pitch)
4. **Single tap:** Still spawns one domino (existing behavior preserved)

### Implementation detail

```javascript
// In onDown(): if currentTool === 'domino', set dominoDragPath = [pos]
// In onMove(): if dragging && domino tool, push pos to path, 
//   compute spacing along path to show preview count
// In onUp(): if path length > minDragDist (30px), 
//   sample points along path every 35px,
//   compute angle at each point from path tangent,
//   spawn dominos with perpendicular rotation
//   else: single spawn (existing behavior)
```

### Ghost preview rendering (in render loop):
```javascript
if (currentTool === 'domino' && dominoDragPath.length > 1) {
  const points = sampleAlongPath(dominoDragPath, 35);
  points.forEach((p, i) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI/2); // perpendicular to path
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff8844';
    ctx.fillRect(-6, -20, 12, 40);
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}
```

### Path sampling utility:
```javascript
function sampleAlongPath(path, spacing) {
  const result = [];
  let accumulated = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i-1].x;
    const dy = path[i].y - path[i-1].y;
    const segLen = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    let pos = accumulated;
    while (pos < segLen) {
      const t = pos / segLen;
      result.push({
        x: path[i-1].x + dx * t,
        y: path[i-1].y + dy * t,
        angle
      });
      pos += spacing;
    }
    accumulated = pos - segLen;
  }
  return result;
}
```

### Sound: Staggered ascending spawn pings
```javascript
points.forEach((p, i) => {
  setTimeout(() => playSound(600 + i * 30, 0.05, 'square', 0.04), i * 20);
});
```

## Scope
- ~60 lines of logic (path recording, sampling, ghost render, batch spawn)
- Zero new dependencies
- No changes to existing domino physics or rendering
- Single-tap behavior fully preserved
- Works on touch and mouse

## What it enables
- Curved domino chains (follow your finger around obstacles)
- Spiral patterns
- Quick straight lines for bowling-pin-like setups
- Pairs beautifully with the existing slingshot (build chain → launch ball at first domino)

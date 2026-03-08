# Collision Heatmap Overlay

**Impact:** medium
**Goal alignment:** "more satisfying to play with" — lets players *see* where chaos concentrates; transforms invisible collision data into a glowing visual history that makes destruction feel cumulative and territorial

## Why

Every collision disappears instantly. Dust puffs and sparks flash and vanish — there's no persistent visual record of *where* the chaos happened. A heatmap overlay paints the canvas with warm-colored glow at collision points that slowly fades over time. After 30 seconds of play, you can literally see the chaos zones: the corner where everything piles up glows orange, the area under the seesaw burns red, quiet zones stay cool.

This creates a "look what I did" canvas effect without changing any gameplay. It's the visual equivalent of scuff marks on a gym floor — evidence of action that makes the space feel alive.

## How It Works

1. **Data collection:** On every `collisionStart`, record the contact point coordinates and relative velocity magnitude into a 2D grid (cell size ~20px). Each collision adds energy to that cell proportional to impact speed.

2. **Grid decay:** Every frame, all cells decay by multiplying by `0.995` (slow fade ~3s half-life). This keeps the heatmap responsive — recent chaos is bright, old chaos fades naturally.

3. **Rendering:** Before drawing objects (after background clear), render the heatmap grid as an offscreen canvas overlay with additive blending. Cell color maps from cold→hot:
   - 0-0.2: transparent (no visual noise for light touches)
   - 0.2-0.5: dark blue `rgba(0, 30, 80, 0.15)`
   - 0.5-0.8: purple `rgba(100, 0, 120, 0.25)`
   - 0.8-1.0: orange-red `rgba(200, 60, 0, 0.35)`
   - Gaussian blur (4px) on the offscreen canvas for smooth gradients

4. **Toggle:** Add a small toggle button or make it activate automatically above a certain destruction level. Could also tie into the existing destruction meter — heatmap only appears at Level 3+, rewarding sustained chaos.

5. **Performance:** Grid is coarse (canvas_width/20 × canvas_height/20 = ~50×40 = 2000 cells). Offscreen canvas redrawn every 3rd frame. Minimal overhead.

## Changes

- Add `heatGrid[][]` 2D array initialized on resize
- In `collisionStart` handler, map contact point to grid cell and add energy
- In render loop (before object drawing), render heatmap from offscreen canvas
- Add toggle or auto-activation logic
- ~60-80 lines of code

## Diff

```javascript
// ── HEATMAP STATE ──
let heatGrid = [];
let heatCanvas = null;
let heatCtx = null;
const HEAT_CELL = 20;
let heatCols = 0, heatRows = 0;

function initHeatmap() {
  heatCols = Math.ceil(canvas.width / HEAT_CELL);
  heatRows = Math.ceil(canvas.height / HEAT_CELL);
  heatGrid = Array.from({ length: heatRows }, () => new Float32Array(heatCols));
  heatCanvas = document.createElement('canvas');
  heatCanvas.width = heatCols;
  heatCanvas.height = heatRows;
  heatCtx = heatCanvas.getContext('2d');
}

// Call in resize() after canvas dimensions set:
// initHeatmap();

// In collisionStart handler, after existing logic:
function recordHeatCollision(x, y, intensity) {
  const col = Math.floor(x / HEAT_CELL);
  const row = Math.floor(y / HEAT_CELL);
  if (row >= 0 && row < heatRows && col >= 0 && col < heatCols) {
    heatGrid[row][col] = Math.min(heatGrid[row][col] + intensity * 0.15, 1.0);
  }
}

// In render loop, before drawing bodies:
function renderHeatmap(ctx) {
  // Decay
  for (let r = 0; r < heatRows; r++) {
    for (let c = 0; c < heatCols; c++) {
      heatGrid[r][c] *= 0.995;
      if (heatGrid[r][c] < 0.01) heatGrid[r][c] = 0;
    }
  }
  
  // Draw to offscreen
  const imgData = heatCtx.createImageData(heatCols, heatRows);
  for (let r = 0; r < heatRows; r++) {
    for (let c = 0; c < heatCols; c++) {
      const v = heatGrid[r][c];
      if (v < 0.1) continue;
      const i = (r * heatCols + c) * 4;
      if (v < 0.4) {
        imgData.data[i] = 0;
        imgData.data[i+1] = Math.floor(30 * v / 0.4);
        imgData.data[i+2] = Math.floor(80 * v / 0.4);
        imgData.data[i+3] = Math.floor(40 * v);
      } else if (v < 0.7) {
        const t = (v - 0.4) / 0.3;
        imgData.data[i] = Math.floor(100 * t);
        imgData.data[i+1] = 0;
        imgData.data[i+2] = Math.floor(80 + 40 * t);
        imgData.data[i+3] = Math.floor(60 * v);
      } else {
        const t = (v - 0.7) / 0.3;
        imgData.data[i] = Math.floor(100 + 155 * t);
        imgData.data[i+1] = Math.floor(60 * t);
        imgData.data[i+2] = Math.floor(120 * (1 - t));
        imgData.data[i+3] = Math.floor(90 * v);
      }
    }
  }
  heatCtx.putImageData(imgData, 0, 0);
  
  // Draw scaled to main canvas with smoothing
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(8px)';
  ctx.drawImage(heatCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}
```

## Testing Notes

- Add tests for `initHeatmap()` grid dimensions
- Add tests for `recordHeatCollision()` energy accumulation and clamping
- Add tests for decay behavior (value decreases each frame)
- Existing tests unaffected — purely additive visual layer

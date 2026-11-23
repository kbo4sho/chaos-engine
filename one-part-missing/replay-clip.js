import { GIFEncoder, quantize, applyPalette } from './gifenc.js';

const width = 576,
  sceneHeight = 320,
  header = 49,
  height = header + sceneHeight + 55;
const seconds = (t) => (t / 60).toFixed(2) + ' s';
const nextPaint = () => new Promise((resolve) => setTimeout(resolve, 0));

// Sample at fifteen frames per second, preserving the exact event and arrival
// frames even for a long film. The exported loop holds on the scored result.
export function clipTimeline(end, highlights = []) {
  const steps = Math.max(4, Math.ceil(end / 96));
  const times = new Set([
    0,
    end,
    ...highlights.filter((t) => Number.isInteger(t) && t >= 0 && t <= end),
  ]);
  for (let t = steps; t < end; t += steps) times.add(t);
  const ticks = [...times].sort((a, b) => a - b);
  return ticks.map((t, i) => ({
    tick: t,
    delay:
      i === ticks.length - 1
        ? 950
        : Math.max(20, ((ticks[i + 1] - t) * 1000) / 60) + (i === 0 ? 240 : 0),
  }));
}
function surface(w, h, read = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d', { alpha: false, willReadFrequently: read });
}
function fitText(ctx, text, x, y, max, size, font) {
  ctx.font = size + 'px ' + font;
  while (size > 11 && ctx.measureText(text).width > max) ctx.font = --size + 'px ' + font;
  ctx.fillText(text, x, y, max);
}
export async function makeClip(
  { title, label, end, highlights, scene, legend, caption },
  signal,
  onProgress,
) {
  const output = surface(width, height, true),
    bench = surface(width, sceneHeight),
    gif = GIFEncoder(),
    timeline = clipTimeline(end, highlights);
  function render(t) {
    output.fillStyle = '#080c10';
    output.fillRect(0, 0, width, height);
    output.fillStyle = '#4bdadf';
    output.font = '12px monospace';
    output.fillText('ONE PART MISSING  /  ' + label, 12, 16);
    output.fillStyle = '#dffcff';
    fitText(output, title, 12, 39, width - 110, 23, 'monospace');
    output.fillStyle = '#ffc857';
    output.font = '15px monospace';
    output.textAlign = 'right';
    output.fillText(seconds(t), width - 12, 36);
    output.textAlign = 'left';
    scene(bench, t);
    output.drawImage(bench.canvas, 0, header);
    output.strokeStyle = '#345361';
    output.beginPath();
    output.moveTo(0, header + 0.5);
    output.lineTo(width, header + 0.5);
    output.stroke();
    let x = 14;
    for (const [i, entry] of legend.entries()) {
      output.strokeStyle = i ? '#c3cfd9' : '#ffc857';
      output.lineWidth = 2;
      output.setLineDash(i ? [5, 3] : []);
      output.beginPath();
      output.moveTo(x, height - 37);
      output.lineTo(x + 21, height - 37);
      output.stroke();
      output.setLineDash([]);
      output.fillStyle = '#dffcff';
      output.font = '14px monospace';
      output.fillText(entry, x + 28, height - 32);
      x += output.measureText(entry).width + 51;
    }
    output.fillStyle = '#a2b7c2';
    fitText(output, caption(t), 14, height - 10, width - 28, 14, 'monospace');
    return output.getImageData(0, 0, width, height).data;
  }
  const samples = [];
  for (const i of new Set([0, Math.floor(timeline.length / 2), timeline.length - 1])) {
    const pixels = render(timeline[i].tick);
    // Retain thin track lines, small glyphs and both actor colors in one table.
    for (let n = 0; n < pixels.length; n += 28)
      samples.push(pixels[n], pixels[n + 1], pixels[n + 2], 255);
  }
  const palette = quantize(new Uint8Array(samples), 128);
  const globalPalette = [...palette, [0, 0, 0]],
    transparentIndex = palette.length;
  let previous = null;
  for (const [i, frame] of timeline.entries()) {
    signal.throwIfAborted();
    const indexed = applyPalette(render(frame.tick), palette);
    const pixels = indexed.slice();
    if (previous) {
      for (let j = 0; j < pixels.length; j++)
        if (previous[j] === indexed[j]) pixels[j] = transparentIndex;
    }
    gif.writeFrame(pixels, width, height, {
      palette: i === 0 ? globalPalette : undefined,
      delay: frame.delay,
      repeat: 0,
      transparent: !!previous,
      transparentIndex,
      dispose: 1,
    });
    previous = indexed;
    if (i % 4 === 0) {
      onProgress((i + 1) / timeline.length);
      await nextPaint();
    }
  }
  signal.throwIfAborted();
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

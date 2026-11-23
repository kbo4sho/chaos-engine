import { expect, it } from 'vitest';
import { drawingFile, readDrawingFile } from '../one-part-missing/drawing-exchange.js';
import { freshDesign, encodeDesign, getDesignKit } from '../one-part-missing/blueprints.js';
it('carries just the drawing, including unfinished and legacy builds', () => {
  for (const kit of [0, 2, 1266, 1520]) {
    const draft = freshDesign(kit);
    draft.edits[0].type = Math.min(1, getDesignKit(kit).stations[0].options.length - 1);
    const text = drawingFile(draft);
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['drawing', 'format', 'version']);
    expect(encodeDesign(readDrawingFile(text))).toBe(encodeDesign(draft));
    expect(text.length).toBeLessThan(180);
  }
});
it('rejects oversized, unfamiliar and noncanonical drawings', () => {
  for (const f of [
    '',
    null,
    '{bad',
    'null',
    '[]',
    drawingFile(freshDesign()).replace('design-1', 'design-4'),
    drawingFile(freshDesign()).replace('"version":1', '"version":2'),
    drawingFile(freshDesign()) + ' '.repeat(1024),
  ])
    expect(readDrawingFile(f)).toBeNull();
});

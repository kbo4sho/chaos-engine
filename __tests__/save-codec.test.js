import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function loadCodec() {
  const source = fs.readFileSync(new URL('../save-codec.js', import.meta.url), 'utf8');
  vm.runInThisContext(source);
  return globalThis.ChaosSaveCodec;
}

let codec;

beforeEach(() => {
  codec = loadCodec();
});

function roundTrip(value) {
  const graph = codec.encode(value);
  const serialized = JSON.stringify({
    version: 1,
    savedAt: '2026-11-01T12:00:00.000Z',
    checksum: codec.checksum(graph),
    graph
  });
  const parsed = JSON.parse(serialized);
  if (parsed.checksum !== codec.checksum(parsed.graph)) throw new Error('Damaged save');
  return codec.decode(parsed.graph);
}

describe('ChaosSaveCodec', () => {
  it('round-trips primitives, object identity, Map keys and Set members', () => {
    const shared = { label: 'shared', amount: 2 };
    const root = {
      name: 'sample-scene',
      empty: undefined,
      count: 0,
      ok: false,
      items: [shared, shared],
      lookup: new Map([[shared, 'held'], ['slot', shared]]),
      marked: new Set([shared])
    };
    const restored = roundTrip(root);
    expect(restored.name).toBe('sample-scene');
    expect(restored.empty).toBeNull();
    expect(restored.count).toBe(0);
    expect(restored.ok).toBe(false);
    expect(restored.items[0]).toBe(restored.items[1]);
    expect(restored.lookup.get(restored.items[0])).toBe('held');
    expect(restored.lookup.get('slot')).toBe(restored.items[0]);
    expect(restored.marked.has(restored.items[0])).toBe(true);
  });

  it('preserves cyclic parent/child graphs used by Matter bodies', () => {
    const parent = { type: 'body', id: 7, parts: [] };
    const part = { type: 'body', id: 8, parent, vertices: [] };
    parent.parts = [parent, part];
    parent.parent = parent;
    part.vertices.push({ x: 1, y: 2, body: part });
    const restored = roundTrip({ bodies: [parent] });
    expect(restored.bodies[0].parent).toBe(restored.bodies[0]);
    expect(restored.bodies[0].parts[0]).toBe(restored.bodies[0]);
    expect(restored.bodies[0].parts[1].parent).toBe(restored.bodies[0]);
    expect(restored.bodies[0].parts[1].vertices[0].body).toBe(restored.bodies[0].parts[1]);
  });

  it('round-trips Infinity, -Infinity and NaN instead of turning them into null', () => {
    const restored = roundTrip({
      discoTimer: Infinity,
      mass: Infinity,
      left: -Infinity,
      missing: NaN
    });
    expect(restored.discoTimer).toBe(Infinity);
    expect(restored.mass).toBe(Infinity);
    expect(restored.left).toBe(-Infinity);
    expect(Number.isNaN(restored.missing)).toBe(true);
    expect(JSON.parse(JSON.stringify({ discoTimer: Infinity })).discoTimer).toBeNull();
  });

  it('omits host callbacks so a lesson config can still be saved', () => {
    const restored = roundTrip({
      id: 'sample-lesson',
      setup() {},
      onTick() {},
      simulation: { gravity: 'earth', goals: [{ type: 'count-placed', target: 1 }] }
    });
    expect(restored.id).toBe('sample-lesson');
    expect(restored.setup).toBeUndefined();
    expect(restored.onTick).toBeUndefined();
    expect(restored.simulation.goals).toEqual([{ type: 'count-placed', target: 1 }]);
  });

  it('keeps checksums stable across JSON persistence and rejects tampering', () => {
    const graph = codec.encode({ slot: 1, bodies: [{ id: 3, position: { x: 1, y: 2 } }] });
    const checksum = codec.checksum(graph);
    expect(codec.checksum(JSON.parse(JSON.stringify(graph)))).toBe(checksum);
    const damaged = JSON.parse(JSON.stringify(graph));
    damaged.nodes.pop();
    expect(codec.checksum(damaged)).not.toBe(checksum);
  });

  it('rejects missing, future, corrupt and unsafe graphs before decode completes', () => {
    expect(() => codec.decode(null)).toThrow('Invalid save graph');
    expect(() => codec.decode({ entry: { ref: 0 }, nodes: null })).toThrow('Invalid save graph');
    expect(() => codec.decode({ entry: { ref: 9 }, nodes: [{ kind: 'object', values: [] }] })).toThrow('Invalid save reference');
    expect(() => codec.decode({ entry: { ref: 0 }, nodes: [{ kind: 'mystery', values: [] }] })).toThrow('Unknown save node');
    expect(() => codec.decode({
      entry: { ref: 0 },
      nodes: [{ kind: 'object', values: [['__proto__', { ref: 0 }]] }]
    })).toThrow('Invalid save key');
    expect(() => codec.decode({
      entry: { ref: 0 },
      nodes: [{ kind: 'object', values: [['constructor', { ref: 0 }]] }]
    })).toThrow('Invalid save key');
  });

  it('still rejects a function used as the save root', () => {
    expect(() => codec.encode(() => {})).toThrow('Unsupported save value');
  });
});

// Matter bodies contain cycles (parts, parents and vertices). Keep object identity
// across the world and tool registries, including Map keys and Set members.
globalThis.ChaosSaveCodec = Object.freeze({
  // Detect damaged payloads before decoding or changing the live game.
  checksum(graph) {
    const text = JSON.stringify(graph);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16);
  },

  encode(root) {
    const nodes = [];
    const pending = [];
    const seen = new Map();
    function reference(value) {
      if (typeof value === 'number' && !Number.isFinite(value)) return { number:String(value) };
      if (value === null || typeof value !== 'object') {
        if (value === undefined) return null;
        if (typeof value === 'function') throw new Error('Unsupported save value');
        return value;
      }
      if (!seen.has(value)) {
        if (nodes.length >= 200000) throw new Error('Save too large');
        seen.set(value, nodes.length);
        nodes.push(null);
        pending.push(value);
      }
      return { ref:seen.get(value) };
    }
    const entry = reference(root);
    for (let index = 0; index < pending.length; index++) {
      const value = pending[index];
      if (value instanceof Map) {
        nodes[index] = { kind:'map', values:[...value].map(([key, item]) => [reference(key), reference(item)]) };
      } else if (value instanceof Set || Array.isArray(value)) {
        nodes[index] = { kind:value instanceof Set ? 'set' : 'array', values:[...value].map(reference) };
      } else {
        nodes[index] = { kind:'object', values:Object.entries(value)
          .filter(([key]) => !['__proto__', 'prototype', 'constructor'].includes(key))
          .map(([key, item]) => [key, reference(item)]) };
      }
    }
    return { entry, nodes };
  },

  decode(graph) {
    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length > 200000) throw new Error('Invalid save graph');
    const nodes = graph.nodes.map(node => {
      if (!node || !Array.isArray(node.values)) throw new Error('Invalid save node');
      switch (node.kind) {
        case 'object': return {};
        case 'array': return [];
        case 'map': return new Map();
        case 'set': return new Set();
        default: throw new Error('Unknown save node');
      }
    });
    function dereference(value) {
      if (value === null || typeof value !== 'object') return value;
      if (Object.keys(value).length !== 1) throw new Error('Invalid save reference');
      if (Object.hasOwn(value, 'ref') && Number.isInteger(value.ref) && value.ref >= 0 && value.ref < nodes.length) return nodes[value.ref];
      if (value.number === 'Infinity') return Infinity;
      if (value.number === '-Infinity') return -Infinity;
      if (value.number === 'NaN') return NaN;
      throw new Error('Invalid save reference');
    }
    graph.nodes.forEach((node, index) => {
      const target = nodes[index];
      if (node.kind === 'array' || node.kind === 'set') {
        node.values.forEach(item => node.kind === 'array' ? target.push(dereference(item)) : target.add(dereference(item)));
      } else {
        node.values.forEach(entry => {
          if (!Array.isArray(entry) || entry.length !== 2) throw new Error('Invalid save entry');
          const [key, value] = entry;
          if (node.kind === 'map') target.set(dereference(key), dereference(value));
          else {
            if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key) || Object.hasOwn(target, key)) throw new Error('Invalid save key');
            target[key] = dereference(value);
          }
        });
      }
    });
    return dereference(graph.entry);
  }
});

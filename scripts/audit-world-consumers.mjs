#!/usr/bin/env node
/**
 * Rerunnable inventory of worldBounds / origin / clamp / route / render / effect consumers.
 * Run: node scripts/audit-world-consumers.mjs
 * Exit 0 always (inventory). Pair with legacy-world-matrix tests for invariants.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const lines = html.split('\n');

function hits(re) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) out.push({ line: i + 1, text: lines[i].trim().slice(0, 160) });
  }
  return out;
}

const inventory = {
  generatedAt: new Date().toISOString(),
  tipHint: 'run from feature/logical-world-camera worktree',
  categories: {
    inferSources: {
      invariant: 'inferWorldBounds must include every persisted spatial feature so walls never clip authored routes/machines',
      currentInclude: hits(/include(Bounds|Circle)?\(/).filter(h => h.line >= 1405 && h.line <= 1460),
      missingCandidates: {
        rails: hits(/rails\.push|entry\.start|entry\.end/).slice(0, 5),
        ziplines: hits(/ziplines\.push/).slice(0, 5),
        tripwires: hits(/tripwires\.push/).slice(0, 5),
        elevators: hits(/elevators\.push|upperY|lowerY/).slice(0, 8),
        pistons: hits(/pistons\.push|retractedX|extendedX/).slice(0, 8),
        cams: hits(/camAnchor/).slice(0, 8),
        presses: hits(/bedY|presses\.push/).slice(0, 8),
        catapults: hits(/catapults\.push|pivot/).slice(0, 8),
        webs: hits(/webTraps\.push/).slice(0, 5),
        syrup: hits(/syrupPools/).slice(0, 5),
      }
    },
    zeroOriginSuspects: {
      invariant: 'world-space x/y must be worldMinX()+f*width (or worldCenter*), never bare width/2 or random*width as absolute x',
      widthOver2: hits(/worldBounds\.width\s*\/\s*2/),
      heightOver2: hits(/worldBounds\.height\s*\/\s*2/),
      randomWidth: hits(/Math\.random\(\)\s*\*\s*\(.*worldBounds\.width/),
      randomHeight: hits(/Math\.random\(\)\s*\*\s*\(.*worldBounds\.height/),
      tornadoDirSign: hits(/tornadoX\s*<\s*0/),
    },
    placementClamps: {
      invariant: 'padLeft+padRight < width and padTop+padBottom < height; else reject/null — never inverted Math.max/min',
      helpers: hits(/function get\w+Placement|function get\w+Endpoint|function get\w+Anchor|function get\w+Point\(/),
      maxMinClamps: hits(/Math\.max\(worldBounds\.x|Math\.max\(worldBounds\.y|clampWorldAxes/),
    },
    cameraInput: {
      invariant: 'creation requires isWorldPoint; camera maps screen↔world with origin',
      isWorldPoint: hits(/isWorldPoint/),
      screenToWorld: hits(/screenToWorld|worldToScreen/),
    },
    orbitBranches: {
      invariant: 'only Map orbitingBodies is a supported live/save shape; array/tuple branches must be proven unreachable before removal',
      inferBranches: hits(/orbitingBodies/),
    }
  }
};

const outDir = process.argv[2] || path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'world-consumer-audit.json');
fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2));

// Markdown summary
const md = [];
md.push('# World consumer audit inventory');
md.push('');
md.push(`Generated: ${inventory.generatedAt}`);
md.push('');
for (const [cat, body] of Object.entries(inventory.categories)) {
  md.push(`## ${cat}`);
  md.push(`Invariant: ${body.invariant}`);
  md.push('');
  for (const [k, v] of Object.entries(body)) {
    if (k === 'invariant') continue;
    if (Array.isArray(v)) {
      md.push(`### ${k} (${v.length})`);
      for (const h of v.slice(0, 40)) md.push(`- L${h.line}: \`${h.text.replace(/`/g, "'")}\``);
      if (v.length > 40) md.push(`- … +${v.length - 40} more`);
      md.push('');
    } else if (v && typeof v === 'object') {
      md.push(`### ${k}`);
      for (const [sk, sv] of Object.entries(v)) {
        if (Array.isArray(sv)) {
          md.push(`- **${sk}** (${sv.length} sample hits)`);
          for (const h of sv.slice(0, 3)) md.push(`  - L${h.line}: \`${h.text.replace(/`/g, "'").slice(0,100)}\``);
        }
      }
      md.push('');
    }
  }
}
const mdPath = path.join(outDir, 'world-consumer-audit.md');
fs.writeFileSync(mdPath, md.join('\n'));
console.log(`wrote ${jsonPath}`);
console.log(`wrote ${mdPath}`);
console.log(`width/2=${inventory.categories.zeroOriginSuspects.widthOver2.length} height/2=${inventory.categories.zeroOriginSuspects.heightOver2.length} randW=${inventory.categories.zeroOriginSuspects.randomWidth.length}`);

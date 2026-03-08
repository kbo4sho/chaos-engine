# Keyboard shortcuts for desktop play

**Impact:** high  
**Goal alignment:** "more fun and more satisfying" — desktop players currently click 26 tiny buttons to switch tools; keyboard shortcuts make tool switching instant, enabling flow states where you chain object types without breaking rhythm

## Why

The sandbox has 26 spawnable tools and 8+ chaos actions, all behind mouse clicks on small buttons. On desktop, this is the biggest friction point — building a Rube Goldberg chain means: click domino button → place dominoes → click bomb button → place bomb → click ball button → place ball. Each tool switch breaks the creative flow.

Keyboard shortcuts are the single most impactful UX improvement for desktop players because they eliminate the context switch between "aiming on canvas" and "navigating UI." Your mouse stays on the canvas, your left hand picks tools. This is the same pattern that makes Photoshop, Blender, and every professional creative tool feel fast.

## Changes

Add a `keydown` event listener that maps keys to tool selection and chaos actions:

**Tool shortcuts (number row + letters):**
| Key | Tool | Rationale |
|-----|------|-----------|
| `1` | Ball | Most common, default tool |
| `2` | Block | Second most basic |
| `3` | Bomb | 💣 frequent use |
| `4` | Balloon | Pairs with bombs |
| `5` | Domino | Chain building |
| `6` | Star | ⭐ |
| `7` | Ragdoll | Popular |
| `8` | Anvil | Heavy objects |
| `9` | Duck | 🦆 |
| `0` | Beachball | Bouncy |
| `R` | Rocket | R for rocket |
| `C` | Car | C for car |
| `D` | Draw | D for draw |
| `G` | Grab | G for grab |
| `P` | Portal | P for portal |
| `T` | Trampoline | T for trampoline |
| `M` | Magnet | M for magnet |
| `F` | Fan | F for fan |
| `K` | Pin (sKittle) | K for pin |
| `V` | Conveyor Right | V for conveyor |
| `I` | Ice | I for ice |
| `W` | Wrecking ball | W for wrecking |
| `S` | Seesaw | S for seesaw |
| `O` | Rope | O for rope (lassO) |

**Chaos action shortcuts (shifted or standalone):**
| Key | Action |
|-----|--------|
| `E` | Explode |
| `Q` | Quake |
| `Space` | Pause/Resume |
| `Backspace` | Clear all |
| `X` | Black hole |
| `Z` | Freeze |
| `N` | Anti-gravity float |
| `J` | Gravity flip |
| `L` | Rain |

**Slo-mo toggle:** Already a tool button — `Shift+Space` or just selecting tool `slomo` via some key.

**Visual feedback:** When a shortcut is pressed, briefly flash the corresponding toolbar button (add/remove a CSS class for 150ms) so the user sees which tool activated.

**Discoverability:** Add a small `⌨️` button in the top bar that toggles a keyboard shortcut overlay/cheat sheet panel.

## Diff

```javascript
// Add inside the existing keydown listener, before the Konami code check:
document.addEventListener('keydown', (e) => {
  // Skip if user is typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toLowerCase();

  // Tool shortcuts
  const toolMap = {
    '1': 'ball', '2': 'block', '3': 'bomb', '4': 'balloon',
    '5': 'domino', '6': 'star', '7': 'ragdoll', '8': 'anvil',
    '9': 'duck', '0': 'beachball',
    'r': 'rocket', 'c': 'car', 'd': 'draw', 'g': 'grab',
    'p': 'portal', 't': 'trampoline', 'm': 'magnet', 'f': 'fan',
    'k': 'pin', 'v': 'conveyor-right', 'i': 'ice', 'w': 'wrecking',
    's': 'seesaw', 'o': 'rope'
  };

  if (toolMap[key]) {
    const tool = toolMap[key];
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.classList.add('shortcut-flash');
      setTimeout(() => btn.classList.remove('shortcut-flash'), 150);
      // Scroll into view if in toolbar
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    e.preventDefault();
    return;
  }

  // Chaos action shortcuts
  const chaosMap = {
    'e': 'btn-explode',
    'q': 'btn-quake',
    'x': 'btn-blackhole',
    'z': 'btn-freeze',
    'n': 'btn-antigrav',
    'j': 'btn-gravflip',
    'l': 'btn-rain'
  };

  if (chaosMap[key]) {
    document.getElementById(chaosMap[key])?.click();
    e.preventDefault();
    return;
  }

  // Space = pause/resume
  if (key === ' ') {
    document.getElementById('btn-pause')?.click();
    e.preventDefault();
    return;
  }

  // Backspace = clear
  if (key === 'backspace') {
    document.getElementById('btn-clear')?.click();
    e.preventDefault();
    return;
  }

  // Konami code handling (existing)...
});
```

```css
/* Shortcut flash animation */
.tool-btn.shortcut-flash {
  animation: shortcut-pulse 0.15s ease-out;
}
@keyframes shortcut-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.6); transform: scale(1.15); }
  100% { box-shadow: 0 0 0 0 transparent; transform: scale(1); }
}
```

## Notes

- ~60 lines of JS + ~8 lines of CSS
- Zero dependencies
- No conflict with existing Konami code handler (new listener fires first, Konami still buffers)
- Graceful on mobile (keyboards rare, no interference with touch)
- The cheat sheet overlay is optional polish — core value is the shortcuts themselves
- Letter choices avoid conflicts: no `A` (could be browser default), `H` reserved for potential help overlay

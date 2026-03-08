# Haptic Feedback for Mobile

**Impact:** high
**Goal alignment:** "more satisfying to play with" — haptics are the missing sensory channel; every explosion, impact, and slingshot release becomes a tactile moment

## Why

The sandbox has great visual feedback (sparks, screen shake, trails) and decent audio (material-specific impacts, boom sounds). But on mobile — where most play happens on a physics sandbox — there's zero tactile feedback. `navigator.vibrate()` is free, widely supported on Android/Chrome, and transforms screen shake from visual-only to full-body. Explosions you can *feel* are categorically more satisfying than ones you can only see.

This is pure juice. No gameplay change. No UI change. Just a new sensory dimension layered onto existing events.

## Changes

Add a `haptic(pattern)` utility function that safely calls `navigator.vibrate()` (no-op on unsupported browsers). Then wire it into existing event hooks:

### 1. Utility function (~5 lines)

```javascript
function haptic(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch(e) {}
}
```

### 2. Integration points (add one `haptic()` call at each)

| Event | Pattern | Rationale |
|-------|---------|-----------|
| Bomb explosion (`explodeBomb`) | `[30, 20, 60]` | Heavy double-pulse for big boom |
| Random explosion button | `[50, 30, 80]` | Bigger than single bomb |
| Earthquake button | `[20, 10, 20, 10, 40, 10, 60]` | Rumble pattern |
| Slingshot release | `[15]` | Quick snap — tactile "thwip" |
| High-velocity collision (relVel > 8) | `[10]` | Micro-pulse for hard impacts |
| Gravity flip | `[25]` | Stomach-drop moment |
| Black hole activate | `[10, 5, 10, 5, 10, 5, 30]` | Building pulse |
| Mega bounce activate | `[20, 10, 40]` | Spring tension release |
| Wrecking ball swing contact | `[20]` | Heavy thud |
| Clear all objects | `[10, 10, 10, 10, 10]` | Rapid staccato for vortex feel |

### 3. Collision throttle

High-velocity collisions happen in bursts. Add a simple timestamp throttle (last haptic > 50ms ago) to prevent vibration motor saturation:

```javascript
let lastHapticTime = 0;
function hapticThrottled(pattern) {
  const now = performance.now();
  if (now - lastHapticTime > 50) {
    lastHapticTime = now;
    haptic(pattern);
  }
}
```

Use `hapticThrottled` for collision events, `haptic` for user-initiated actions (buttons).

## Scope

- ~30 lines of new code total
- No new dependencies
- No UI changes
- No physics changes  
- Graceful degradation (silent no-op on desktop/Safari/iOS)
- iOS note: `navigator.vibrate` is not supported on iOS Safari. This is Android/Chrome-first. No harm on unsupported platforms.

## Diff

Changes to `index.html` only. Insertions at:
1. After `playImpactSound` function definition (~line 550): add `haptic()` and `hapticThrottled()`
2. Inside `explodeBomb()`: add `haptic([30, 20, 60])`
3. Inside each chaos button handler (explode, quake, gravity flip, etc.): add appropriate `haptic()` call
4. Inside collision handler where `relVel > 8`: add `hapticThrottled([10])`
5. Inside slingshot release handler: add `haptic([15])`

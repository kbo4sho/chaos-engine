# Changelog — Make It Better

Improvement history for this project. Each entry logs one cycle's work.

---

## 2026-06-27T14:05:59Z — Shipped: Balloon popping on hard impact
**Why:** Balloons were visually distinct but mostly passive once spawned. Hard impacts and nearby bomb blasts now turn them into satisfying targets with a bright pop payoff.
**Goal alignment:** "more surprising and more satisfying" — adds a discoverable object-specific reaction to existing collisions and explosions without new controls, dependencies, or physics UI.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (252/252 passing)
**Status:** shipped

## 2026-06-26T14:04:02Z — Shipped: Desktop keyboard shortcuts
**Why:** Desktop building still required leaving the canvas to click tiny toolbar buttons. Shortcut keys let players swap tools, trigger common chaos actions, pause, clear, and toggle slo-mo without breaking placement flow.
**Goal alignment:** "more fun and more satisfying" — removes friction from the build → experiment loop while preserving the existing toolbar, chaos buttons, sounds, and physics behavior.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (246/246 passing)
**Status:** shipped

## 2026-06-25T14:02:10Z — Shipped: Slingshot trajectory preview
**Why:** Slingshot launches were satisfying but still required guessing the arc. A fading dotted preview makes pull-back shots feel deliberate, especially under altered gravity.
**Goal alignment:** "more satisfying to play with" — adds immediate visual aiming feedback to the core launch gesture without new controls, dependencies, or physics rules.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (243/243 passing)
**Status:** shipped

## 2026-06-24T14:04:47Z — Shipped: Collision heatmap overlay
**Why:** Sparks and dust made impacts feel lively, but the playfield did not remember where the biggest crashes happened. A fading heatmap turns repeated collisions into glowing cyan, violet, and hot orange zones so chaotic scenes leave a visible history.
**Goal alignment:** "more satisfying to play with" — adds cumulative visual feedback to the existing collision and destruction loop without new controls, dependencies, or physics changes.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (242/242 passing)
**Status:** shipped

## 2026-06-23T14:03:55Z — Shipped: Eraser poof tool
**Why:** Clear All was the only way to remove a misplaced object or clean up one part of a scene. A focused eraser lets players sculpt setups without resetting the whole sandbox, and deletion itself gets a small poof, sound, haptic pulse, and screen nudge.
**Goal alignment:** "more fun and more satisfying" — improves the build → refine → destroy loop with one discoverable tool and no new dependencies.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (237/237 passing)
**Status:** shipped

## 2026-06-22T14:05:52Z — Shipped: Animated clear vortex drain
**Why:** Clear was still an instant hard cut after a chaotic scene. A short vortex drain gives the reset loop its own satisfying payoff: objects shrink, spin toward center, pulse with cyan rings, and vanish after the effect.
**Goal alignment:** "more satisfying to play with" — polishes the common build → chaos → clear loop without adding controls or changing normal physics.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (229/229 passing)
**Status:** shipped

## 2026-06-21T14:04:23Z — Shipped: Destruction level-up celebration
**Why:** The destruction meter already tracked escalating chaos, but crossing a new rank only changed the label. Level-up confetti, a short center-screen banner, shake, and rising chimes make each threshold feel like a reward.
**Goal alignment:** "more satisfying to play with" — rewards the existing collision and destruction loop without adding controls or changing physics.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (226/226 passing)
**Status:** shipped

## 2026-06-20T23:52:13Z — Shipped: Musical collision notes
**Why:** Collision sounds used arbitrary random frequencies, so busy scenes could become noisy instead of rhythmic. Pentatonic impact notes make bounces, squeaks, and material collisions layer into a more musical physics toy without adding UI or changing motion.
**Goal alignment:** "more satisfying to play with" — audio polish that makes existing collisions feel more intentional and rewards chaotic scenes with consonant generative sound.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (225/225 passing)
**Status:** shipped

## 2026-06-20T18:48:37Z — Shipped: Chain Link tool
**Why:** The sandbox had ropes and wrecking balls, but no repeatable physical part for building flexible structures. Chain links add a compact construction primitive for dangling chains, bridges, traps, and improvised machines.
**Goal alignment:** "more fun, more surprising, more satisfying" — new feature work that expands emergent physics while keeping the existing top bar, canvas, object toolbar, and chaos bar layout intact.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (224/224 passing)
**Status:** shipped

## 2026-06-20T18:45:03Z — Proposed: Chain Link tool
**Why:** The sandbox has ropes and wrecking balls, but no repeatable physical part for building flexible structures. Auto-connecting metal links would let players build dangling chains, bridges, traps, and improvised machines from the existing object toolbar without changing the layout.
**Goal alignment:** "more fun, more surprising, more satisfying" — adds a new feature that expands creative construction and emergent physics while preserving the two bottom scrolling sections.
**Files changed:** proposals/2026-06-20-chain-link-tool.md, changelog.md
**Verified:** tests ✓ (218/218), proposal only
**Status:** proposed

## 2026-06-16T04:09:00Z — Shipped: Mobile haptic feedback
**Why:** The sandbox already has strong visual and audio feedback, but mobile play had no tactile layer. Small vibration pulses make explosions, launches, gravity flips, clears, and hard impacts feel more physical without changing controls or physics.
**Goal alignment:** "more satisfying to play with" — tactile polish for existing high-energy interactions, with graceful no-op behavior on unsupported browsers
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (222/222 passing)
**Status:** shipped

## 2026-06-14T14:03:47Z — Shipped: Spawn pop animation
**Why:** Objects already had a birth flash, but their bodies still appeared at full size immediately. A quick scale-in makes each spawn feel punchier while leaving physics unchanged.
**Goal alignment:** "more satisfying to play with" — visual polish for the core spawn interaction, with no new controls or gameplay rules
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (204/204 passing)
**Status:** shipped

## 2026-06-13T17:45:30Z — Shipped: Tap ripple effect
**Why:** Canvas taps had no immediate feedback before the object appeared. A quick expanding ring makes every click or touch feel acknowledged and more tactile.
**Goal alignment:** "more satisfying to play with" — pure visual juice for the most common interaction, with no new controls or physics changes
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (202/202 passing); browser smoke ✓ (local app loads, tap spawns object, ripple visible)
**Status:** shipped

## 2026-03-01T15:44:00Z — Fixed broken test expectations
**Why:** Test suite was failing — button counts hardcoded at 22/16 but actual HTML has 26/21. Tests must pass before any improvements ship.
**Goal alignment:** Foundation — can't improve what you can't verify
**Files changed:** __tests__/chaos-engine.test.js
**Verified:** tests ✓ (200/200 passing)
**Status:** shipped

## 2026-03-08T10:47:00Z — Proposed: Charge-to-spawn (hold longer for bigger objects)
**Why:** Every spawn is identical regardless of gesture — no way to express intent through the tap itself. A charge mechanic (hold 300ms+ to grow, up to 3× at 2s) adds a skill dimension to the most frequent action. Giant anvils, massive bombs, huge ducks — each creates different emergent gameplay at scale. First accidental giant is a genuine surprise moment.
**Goal alignment:** "more fun, more surprising, more satisfying" — turns passive tapping into an expressive, skill-based gesture; works with every existing object type
**Files changed:** proposals/2026-03-08-charge-spawn-size.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-08T05:48:00Z — Proposed: Velocity glow (dynamic light emission)
**Why:** Objects render at the same visual intensity regardless of speed — the most exciting moments have no velocity-specific visual language. A soft radial glow proportional to speed turns slingshot launches into comets, bomb debris into radiating sunbursts, and settling scenes into gradual dimming. The sandbox tells a visual story about energy.
**Goal alignment:** "more satisfying to play with" — adds a dynamic lighting layer that makes speed tangible and rewards chaos with beauty; pairs with every existing feature
**Files changed:** proposals/2026-03-08-velocity-glow.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-08T01:48:00Z — Proposed: Musical collisions (pentatonic impact sounds)
**Why:** All collision sounds use random frequencies, producing noise instead of music. Snapping to a pentatonic scale means every impact harmonizes — more objects = richer generative composition. Same code complexity, radically different feel. The sandbox becomes a wind chime you play by throwing things.
**Goal alignment:** "more satisfying to play with" — transforms the most frequent audio event from noise into emergent music; zero new UI
**Files changed:** proposals/2026-03-07-musical-collisions.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T20:47:00Z — Proposed: Contextual discovery hints
**Why:** 26 tools and dozens of hidden interactions (bomb chains, balloon pops, portal linking, seesaw physics) that most players never find. Typewriter-style CRT hints triggered by player actions surface possibilities at the exact moment they're relevant — turning a shallow-looking sandbox into a "what else can this do?" discovery loop.
**Goal alignment:** "more fun, more surprising" — zero new mechanics, pure discoverability; makes existing depth accessible
**Files changed:** proposals/2026-03-07-contextual-discovery-hints.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T17:47:00Z — Proposed: Pinball flippers
**Why:** Every sandbox object is passive or set-and-forget — nothing demands real-time player skill. Placeable flippers with tap/key activation (Z//) add timing-based gameplay, and players who combine them with bumpers + pins + balls discover emergent pinball. First object that creates a "one more try" loop.
**Goal alignment:** "more fun, more surprising, more satisfying" — active skill-based interaction is the missing dimension; emergent pinball from existing parts is a discovery moment
**Files changed:** proposals/2026-03-07-pinball-flippers.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T13:47:00Z — Proposed: Keyboard shortcuts for desktop play
**Why:** 26 tools and 8+ chaos actions all require mouse clicks on small buttons. Desktop players break creative flow every time they switch tools. Keyboard shortcuts keep the mouse on the canvas and the left hand on tool selection — the same pattern that makes every professional creative tool feel fast.
**Goal alignment:** "more fun and more satisfying" — eliminates the biggest friction point for desktop play; enables flow states where you chain object types without breaking rhythm
**Files changed:** proposals/2026-03-07-keyboard-shortcuts.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T09:47:00Z — Proposed: Screenshot & share button
**Why:** Players create spectacular chaos scenes with no way to capture or share them. A 📸 button that hides UI, captures the canvas with a camera flash effect, and opens native share (mobile) or downloads PNG (desktop) gives every moment a second life. ~30 lines, zero dependencies.
**Goal alignment:** "more satisfying to play with" — social sharing doubles the payoff of every creation; the "look what I did" moment becomes portable
**Files changed:** proposals/2026-03-07-screenshot-share.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T05:48:00Z — Proposed: Microphone-reactive mode (clap to chaos)
**Why:** The sandbox responds to touch and buttons but is deaf. A mic-reactive mode using Web Audio API detects volume spikes (claps, shouts, screams) and triggers proportional physics events — turning the player's voice into a chaos controller. The discovery moment alone is worth it.
**Goal alignment:** "more fun, more surprising, more satisfying" — physical-to-digital sensory bridge; pairs with tilt-gravity as body-as-controller philosophy
**Files changed:** proposals/2026-03-06-mic-reactive-mode.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-07T00:48:00Z — Proposed: Tilt-to-gravity (device orientation)
**Why:** Every gravity change is a button press — but on mobile, the accelerometer is sitting there unused. Tilting your phone to physically control gravity direction is the missing bridge between digital sandbox and physical world. ~40 lines, graceful no-op on desktop/unsupported devices.
**Goal alignment:** "more fun, more surprising, more satisfying" — turns your phone into a physical gravity controller; the physical-to-digital mapping is inherently delightful
**Files changed:** proposals/2026-03-06-tilt-gravity.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-06T17:47:00Z — Proposed: Double-tap to duplicate
**Why:** Building structured setups (domino rows, block walls, pin formations) requires tedious repeated spawning. Double-tapping an existing object to clone it with a slight offset is the missing "copy-paste" — discoverable, zero new UI, makes building as fluid as destroying.
**Goal alignment:** "more fun and more satisfying" — removes friction from the build phase; every sandbox needs fast duplication
**Files changed:** proposals/2026-03-06-double-tap-duplicate.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-06T12:48:00Z — Proposed: Tap ripple effect
**Why:** Every canvas tap lacks immediate visual feedback — objects just appear. An expanding ring ripple at the touch point makes the canvas feel alive and responsive, the same tactile illusion every polished touch game uses.
**Goal alignment:** "more satisfying to play with" — juices the most frequent user action (tapping the canvas); zero gameplay change, pure feel
**Files changed:** proposals/2026-03-06-tap-ripple-effect.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-06T08:47:00Z — Proposed: Instant replay (last 5 seconds)
**Why:** Best physics moments happen once and vanish. A ring buffer recording the last 5 seconds of body positions lets players rewatch chain reactions, perfect shots, and spectacular collapses at 1×/0.5×/0.25× speed with a scrub bar. The "did you SEE that?!" button.
**Goal alignment:** "more satisfying to play with" — doubles the payoff of every great moment; pairs with every existing chaos feature
**Files changed:** proposals/2026-03-06-instant-replay.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-06T05:48:00Z — Proposed: Undo last action
**Why:** No way to reverse a misplaced spawn — Clear All is the only recourse. Undo (button + Ctrl/Cmd+Z) removes fear of mistakes, letting players build more ambitiously. Action history stack tracks spawns including multi-body objects (seesaws, wrecking balls) as single undoable units.
**Goal alignment:** "more fun and more satisfying" — cheap mistakes = bolder experiments; completes the create→refine loop
**Files changed:** proposals/2026-03-05-undo-last-action.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-06T01:48:00Z — Proposed: Save & load scenes
**Why:** Players build elaborate setups (domino chains, Rube Goldberg machines, Jenga towers) but lose everything on clear or page refresh. Save/load lets you build once, destroy many ways — the most fundamental missing sandbox feature.
**Goal alignment:** "more fun and more satisfying" — transforms throwaway experiments into replayable creations; amplifies every creative feature in the game
**Files changed:** proposals/2026-03-05-save-load-scenes.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T20:48:00Z — Proposed: Speed trails (motion afterimages)
**Why:** Fast-moving objects have no visual velocity cue — a slingshot launch looks identical to a slow roll until impact. Fading afterimage trails at previous positions make speed tangible and every launch/explosion/freefall feel powerful. Pairs beautifully with slo-mo.
**Goal alignment:** "more satisfying to play with" — adds a visual language for velocity that makes physics feel alive; pure juice, zero gameplay change
**Files changed:** proposals/2026-03-05-speed-trails.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T17:47:00Z — Proposed: Scene presets (one-tap starter scenes)
**Why:** Sandbox always starts empty — players who don't know what to build tap randomly. Pre-built scenes (Bowling, Domino Run, Rube Goldberg, Demolition, Pinball) solve cold-start paralysis and showcase what the engine can do. Each preset is immediately playable and modifiable.
**Goal alignment:** "more fun and more surprising" — transforms blank canvas into instant play; presets demonstrate combinations players wouldn't discover on their own
**Files changed:** proposals/2026-03-05-scene-presets.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T12:47:00Z — Proposed: Causal chain detection & celebration
**Why:** Players build Rube Goldberg setups (domino→ball→bomb→explosion) but the game has zero awareness of causal sequences. Detecting when object A hits B which triggers C and celebrating with escalating fanfare (text popups, screen shake, rising chimes) rewards the most creative play pattern without any new UI controls.
**Goal alignment:** "more surprising and more satisfying" — turns accidental chain reactions into celebrated moments; implicit goal (beat your longest chain) emerges from existing mechanics
**Files changed:** proposals/2026-03-05-causal-chain-detection.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T08:47:00Z — Proposed: Haptic feedback for mobile
**Why:** The sandbox has visual juice (sparks, shake, trails) and audio (material impacts, booms) but zero tactile feedback. `navigator.vibrate()` adds a third sensory channel — explosions, collisions, and slingshot releases you can feel. ~30 lines, graceful no-op on unsupported browsers.
**Goal alignment:** "more satisfying to play with" — haptics are the missing sensory dimension; transforms every impact from see+hear to see+hear+feel
**Files changed:** proposals/2026-03-05-haptic-feedback.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T05:47:00Z — Proposed: Domino drag-to-place
**Why:** Building domino chains requires tedious one-by-one tapping. A drag gesture that auto-spaces dominoes along your finger path turns 30 taps into one swipe, making the most satisfying physics sandbox activity (build chain → topple) frictionless.
**Goal alignment:** "more fun and more satisfying" — removes friction from setup so players spend more time in the payoff moment (watching things fall)
**Files changed:** proposals/2026-03-04-domino-drag-placement.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-05T01:47:00Z — Proposed: Eraser tool
**Why:** No way to selectively remove objects — Clear All is the only option, which is nuclear. An eraser tool lets players tap individual objects to delete them with a satisfying poof animation, completing the create→arrange→refine loop that every good sandbox needs.
**Goal alignment:** "more fun and more satisfying" — transforms the sandbox from spawn-and-hope to sculpt-and-play; deletion itself becomes a micro-moment of fun
**Files changed:** proposals/2026-03-04-eraser-tool.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T20:49:00Z — Proposed: Collision heatmap overlay
**Why:** Collisions leave no persistent spatial record. A glowing heatmap overlay paints warm colors at collision hotspots that slowly fade — after 30 seconds of play you can see the chaos zones. Pure visual layer, zero gameplay change, makes destruction feel cumulative.
**Goal alignment:** "more satisfying to play with" — transforms invisible collision data into visible territory; the "look what I did" effect
**Files changed:** proposals/2026-03-04-collision-heatmap.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T17:47:00Z — Proposed: Tower height tracker
**Why:** No emergent building goal — players destroy but never build toward something. A real-time tower height counter with record tracking creates a build→beat-record→destroy→rebuild loop. Makes both construction AND destruction more satisfying.
**Goal alignment:** "more fun and more satisfying" — gives sandbox play a self-directed goal; destruction hits harder when you built something first
**Files changed:** proposals/2026-03-04-tower-height-tracker.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T12:48:00Z — Proposed: Spawn pop animation
**Why:** Objects appear instantly with zero entrance feedback. A 150ms spring scale-up (0→1.15→1.0) with fading glow ring makes every tap feel punchy. Purely visual — no physics changes. Amplifies all 25 object types automatically.
**Goal alignment:** "more satisfying to play with" — juices the single most frequent user action (spawning)
**Files changed:** proposals/2026-03-04-spawn-pop-animation.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T08:47:00Z — Proposed: Animated clear (vortex drain)
**Why:** Clear button is the most-used action between play cycles and it's instant/dead. A 0.6s vortex animation where objects spiral to center and shrink makes the reset loop itself satisfying — every sandbox session ends with a mini-spectacle instead of a hard cut.
**Goal alignment:** "more satisfying to play with" — transforms the build→chaos→clear loop's weakest moment into a payoff
**Files changed:** proposals/2026-03-04-animated-clear-vortex.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T05:50:00Z — Proposed: Rare object variants
**Why:** Every spawn is predictable — no discovery moment. Rare variants (6% chance: golden/bouncy, glass/shatterable, giant, tiny, ghostly) add slot-machine surprise to every tap without any new UI. Amplifies all existing spawn mechanisms.
**Goal alignment:** "more surprising" — organic discovery moments; "what was THAT?!" reactions
**Files changed:** proposals/2026-03-03-rare-object-variants.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-04T00:47:00Z — Proposed: Slow-motion toggle
**Why:** Pause exists but no speed control. Slow-mo (0.25× via Matter.js timeScale) turns every explosion, domino chain, and ragdoll tumble into a cinematic moment. Near-zero implementation cost, amplifies every existing feature.
**Goal alignment:** "more satisfying to play with" — the setup→trigger→slow-mo loop is the core satisfaction cycle of every great physics sandbox
**Files changed:** proposals/2026-03-03-slow-motion-toggle.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-03T20:48:00Z — Proposed: Grow/shrink tool
**Why:** No way to modify objects after spawning them. A grow/shrink tool lets players tap objects to scale them up or down, turning every existing object into a family of sizes. Giant ducks, tiny anvils, huge beachball bowling — pure discovery delight.
**Goal alignment:** "more fun and more surprising" — multiplies creative space of every existing object; highest-leverage interaction addition
**Files changed:** proposals/2026-03-03-grow-shrink-tool.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-03T17:50:00Z — Proposed: Pinch-to-zoom & pan camera
**Why:** Fixed camera is the biggest interaction gap — can't lean in to watch details or zoom out for full-scene Rube Goldberg chains. Every good physics sandbox has camera control; adding it makes every existing feature more engaging.
**Goal alignment:** "more satisfying to play with" — zoom transforms passive observation into active exploration
**Files changed:** proposals/2026-03-03-pinch-zoom-pan.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-03T05:47:00Z — Proposed: Destruction level-up celebration
**Why:** The destruction meter silently transitions between 7 levels with zero fanfare. Adding confetti burst, screen shake, and ascending chime at each threshold turns passive tracking into a dopamine-hit reward loop.
**Goal alignment:** "more satisfying" — rewards the core chaos loop; every level-up becomes a moment
**Files changed:** proposals/2026-03-02-destruction-level-up.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-03T00:47:00Z — Proposed: Impact decals (persistent splat marks)
**Why:** Collisions leave no visual trace — surfaces stay pristine no matter how much chaos happens. Colored splat marks at high-velocity impact points create a "look what I did" history that makes destruction feel permanent and rewarding.
**Goal alignment:** "more satisfying" — pure visual juice; zero gameplay change, big satisfaction increase
**Files changed:** proposals/2026-03-02-impact-decals.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-02T20:48:00Z — Proposed: Grab & throw tool
**Why:** No way to interact with existing objects — you can only spawn new ones. Grab-and-throw is the most fundamental physics sandbox interaction (Algodoo, Garry's Mod, etc). Unlocks stacking, aiming bombs, yeeting ducks, and using objects as projectiles against targets.
**Goal alignment:** "more fun and more satisfying" — transforms passive watching into active play; the single highest-impact UX addition
**Files changed:** proposals/2026-03-02-grab-and-throw.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-02T17:47:00Z — Proposed: Block shattering on high-velocity impact
**Why:** Blocks are indestructible — slam them at max speed and they just bounce. In a chaos sandbox, the absence of breakage is the biggest missing feedback loop. Shattering blocks into 3-5 fragments on hard impacts (relVel > 8) creates visible destruction, secondary cascading chaos, and "wait, they BREAK?!" discovery moments.
**Goal alignment:** "more surprising and more satisfying" — visible destruction is the most impactful single addition; pairs with bombs, slingshot, wrecking ball
**Files changed:** proposals/2026-03-02-block-shattering.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-02T12:49:00Z — Proposed: Balloon popping on hard impact
**Why:** Balloons float forever with no unique interaction beyond buoyancy. Adding a pop on hard impact (relVel > 5) creates discovery moments and a satisfying aim-and-pop loop — color-matched confetti burst, snap sound, string remnants falling.
**Goal alignment:** "more surprising and more satisfying" — turns passive decoration into emergent targets; pairs with slingshot for aim-based play
**Files changed:** proposals/2026-03-02-balloon-popping.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-02T05:49:00Z — Proposed: Bomb chain reactions
**Why:** Bombs near other bombs don't trigger each other. Adding staggered chain reactions (50ms delay per link) creates emergent Rube Goldberg moments — players discover cascading detonations organically and start engineering setups.
**Goal alignment:** "more surprising and more satisfying" — cascading explosions are the highest surprise-per-line-of-code improvement available
**Files changed:** proposals/2026-03-01-bomb-chain-reactions.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-02T01:47:00Z — Proposed: Impact combo system
**Why:** Destruction meter tracks cumulative energy but nothing rewards bursts of chaos. A combo counter with escalating audiovisual feedback (rising pitch, growing particles, milestone screen shakes) turns random collisions into moments of delight.
**Goal alignment:** "more surprising and more satisfying" — emergent combo discovery rewards experimentation; pairs with every existing feature (bowling pins, bombs, bumpers, anti-grav)
**Files changed:** proposals/2026-03-01-impact-combo-system.md
**Verified:** tests ✓ (200/200), proposal only
**Status:** proposed

## 2026-03-01T15:45:00Z — Proposed: Slingshot trajectory preview
**Why:** Core slingshot interaction lacks aiming feedback. Dotted arc turns random launches into satisfying aimed shots.
**Goal alignment:** "more satisfying to play with" — deliberate > random
**Files changed:** proposals/2026-03-01-trajectory-preview.md
**Verified:** n/a (proposal only)
**Status:** proposed

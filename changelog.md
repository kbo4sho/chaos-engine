# Changelog — Make It Better

Improvement history for this project. Each entry logs one cycle's work.

---

## 2026-08-31T14:13:40Z — Added: Pivot tool
**Why:** The toolbar could freeze a whole object with Anchor or join two objects with Hinge, but it had no way to fasten one exact point of a dynamic part to the world while leaving that part free to rotate. Pivot adds a reversible world joint without overlapping either existing construction tool.
**Goal alignment:** "more fun, more surprising, more satisfying" — blocks, dominoes, anvils, and powered parts become pendulums, spinner arms, hanging obstacles, and fixed axles with one precise tap, then return to free motion with a second tap.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (352/352 passing); browser smoke ✓ (existing Block tool placed one paused subject, Pivot selected at toolbar end, an off-center tap showed `PIVOT PINNED` plus a persistent gold pin marker, unpausing visibly rotated the still-dynamic block around the exact world point, a second tap showed `PIVOT RELEASED` and let it fall, 0 console errors/warnings); mobile ✓ (390×844, final Pivot button fully reachable/selectable at 52×50px and pinned a block successfully); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-30T14:08:49Z — Added: Float tool
**Why:** The toolbar could anchor an object in place or alter gravity for the whole scene, but it had no way to remove gravity from one object while keeping that object dynamic. Float adds a reversible local zero-gravity transform without overlapping Anchor, global anti-gravity, or Alchemy's material changes.
**Goal alignment:** "more fun, more surprising, more satisfying" — balls, blocks, anvils, and other loose parts can hover as moving targets, airborne building pieces, or suspended obstacles while continuing to collide, spin, launch, and respond to other forces.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (346/346 passing); browser smoke ✓ (existing Ball tool placed one subject, Float selected at toolbar end, first tap showed `FLOAT: ZERO-G` and a persistent cyan `0G` levitation marker, the dynamic ball held position for 1.2s under live Earth gravity, second tap showed `FLOAT: GRAVITY ON` and the ball visibly fell, 0 console errors/warnings); mobile ✓ (390×844, final Float button fully reachable/selectable at 52×50px and toggled the object successfully); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-29T14:09:05Z — Added: Launch tool
**Why:** The toolbar could drag and throw objects freehand, but it had no precise, touch-friendly way to aim an existing object at a chosen point. Launch adds a two-tap velocity tool without overlapping Grab's continuous gesture or the spawn-time slingshot.
**Goal alignment:** "more fun, more surprising, more satisfying" — any loose object becomes an aimed projectile for targets, domino runs, bumpers, bombs, and improvised machines, with a readable vector sight before firing and a neon arrow burst afterward.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (341/341 passing); browser smoke ✓ (existing Ball tool placed one paused subject, Launch selected at toolbar end, first tap showed `LAUNCH: TAP TARGET` plus a live dashed aim vector, second tap produced `LAUNCHED PWR 24`, then unpausing visibly fired the ball across the canvas while OBJ remained 1, 0 console errors/warnings); mobile ✓ (390×844, final Launch button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-28T14:10:15Z — Added: Spring tool
**Why:** The toolbar could tether parts with a slack rope, brace them with a rigid strut, or pin them with a hinge, but it had no elastic connection that stores and releases energy. Spring adds a deliberately preloaded, damped link without overlapping those existing construction tools.
**Goal alignment:** "more fun, more surprising, more satisfying" — two taps turn ordinary objects into bouncing pairs, suspension rigs, springy pendulums, and energy-storing machines, with a bright coil that visibly compresses and stretches during play.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (335/335 passing); browser smoke ✓ (existing Ball tool placed two subjects, Spring selected at toolbar end, two taps created one visible preloaded coil with `SPRING CHARGED`, distance contracted from 300px to its 216px rest length while OBJ 2 and the connection remained intact, 0 console errors/warnings); mobile ✓ (390×844, final Spring button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-27T14:11:48Z — Added: Hinge tool
**Why:** The toolbar could make flexible ropes and stiff distance braces, but it had no precise rotational joint for building articulated mechanisms. Hinge pins two deliberately tapped body points together while leaving both parts free to rotate independently around the shared joint.
**Goal alignment:** "more fun, more surprising, more satisfying" — adjacent blocks become doors, arms, folding chains, pendulums, and improvised machines with one readable two-tap connection that remains compatible with Anchor, Grab, Snip, Eraser, and Clear.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (329/329 passing); browser smoke ✓ (existing Block and Anchor tools placed and fixed two parts, Hinge selected at toolbar end, two facing tap points created one visible zero-length pin joint with `HINGE LOCKED`, existing Grab rotated the free block through roughly one full turn while the hinge and OBJ 2 remained intact, 0 console errors/warnings); mobile ✓ (390×844, final Hinge button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-26T14:11:45Z — Added: Fusion tool
**Why:** The toolbar could split, clone, swap, connect, and transform objects, but it had no deliberate way to combine two existing parts into one new physical object. Fusion adds a two-to-one transform that is meaningfully distinct from Fission's one-to-two split and preserves the selected pair's total mass and momentum.
**Goal alignment:** "more fun, more surprising, more satisfying" — two familiar objects collapse into a larger pulsing neon fusion core whose size, movement, and weight emerge from both inputs, enabling repeatable mashups and heavier projectiles.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (323/323 passing); browser smoke ✓ (existing Ball and Block placed, Fusion selected at toolbar end, first subject marker/status shown, second tap replaced 2 objects with one visibly distinct momentum-preserving fusion core and `FUSION COMPLETE`, 0 console errors/warnings); mobile ✓ (390×844, final Fusion button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-25T14:08:31Z — Added: Rotate tool
**Why:** The toolbar could continuously motorize objects but had no precise way to reorient a placed build part. Rotate adds a deliberate reversible quarter-turn transform without overlapping Motor's powered spin, Grab's free movement, or Swap's position exchange.
**Goal alignment:** "more fun, more surprising, more satisfying" — blocks, dominoes, anvils, and other standalone parts can be snapped into useful new orientations with one tap, while reselection reverses direction for quick layout corrections.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (317/317 passing); browser smoke ✓ (existing Block placed, Rotate selected at toolbar end, clockwise tap changed its angle 0→π/2 and stopped spin, reselection changed to `TURN CCW`, counter-clockwise tap restored angle exactly to 0, OBJ remained 1, 0 console errors/warnings); mobile ✓ (390×844, final Rotate button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-24T14:11:30Z — Added: Strut tool
**Why:** The toolbar could make soft ropes and self-linking chains, but it had no deliberate rigid connection for building frames, braces, or improvised machines. Strut adds a stiff fixed-length structural link without overlapping Rope's flexible tether or Chain's spawned physical links.
**Goal alignment:** "more fun, more surprising, more satisfying" — two taps turn loose objects into a readable neon structure that can fall, swing, and collide as one build, while the existing Snip tool can release any brace on demand.
**Files changed:** .agent.md, index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (311/311 passing); browser smoke ✓ (existing Ball and Beach Ball placed, Strut selected at toolbar end, two bodies joined by one 0.92-stiffness fixed-length constraint, 300px spacing held under live physics, `STRUT LOCKED` visible, OBJ remained 2, 0 console errors/warnings); mobile ✓ (390×844, final Strut button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.52:3003)
**Status:** shipped

## 2026-08-23T15:26:18Z — Added: Alchemy tool
**Why:** The toolbar could change an object's size, count, position, rotation, and fixed state, but it could not directly rewrite how that object behaves on impact and contact. Alchemy adds a reversible physics-material transform without overlapping Resize, Motor, Anchor, Fission, or the creation tools.
**Goal alignment:** "more fun, more surprising, more satisfying" — one object can become springy, weighty, or nearly frictionless in successive taps, turning familiar builds into new experiments while a persistent neon badge keeps each altered state readable.
**Files changed:** .agent.md, index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (305/305 passing); browser smoke ✓ (existing Ball placed, Alchemy selected at toolbar end, Bouncy → Heavy → Slippery → Normal changed live Matter.js density/restitution/friction and restored the originals, persistent state badge visible, OBJ remained 1, 0 console errors/warnings); mobile ✓ (390×844, final Alchemy button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.54:3003)
**Status:** shipped

## 2026-08-22T14:09:00Z — Added: Fission tool
**Why:** The toolbar could preserve-copy, resize, rearrange, connect, and remove objects, but it had no one-to-two transformation that converted one existing object into new moving parts. Fission adds a compact destructive transform without overlapping Snip's connection cutting or Eraser's deletion.
**Goal alignment:** "more fun, more surprising, more satisfying" — one tap turns a standalone build piece into two half-mass twins that burst apart, enabling cascading splits and unexpected motion while protecting assemblies and tiny descendants.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (299/299 passing); browser smoke ✓ (existing Ball placed, Fission selected at toolbar end, one ball became two visibly smaller separating twins with `FISSION ×2`, OBJ changed 1→2, 0 console errors/warnings); mobile ✓ (390×844, final Fission button fully reachable/selectable at 52×50px); live ✓ (http://192.168.68.59:3003)
**Status:** shipped

## 2026-08-21T14:08:49Z — Added: Snip tool
**Why:** The toolbar could build connections with ropes, chains, joints, and axles, and Eraser could remove whole assemblies, but there was no precise way to release a connection while keeping its objects in play. Snip adds that missing destructive construction verb.
**Goal alignment:** "more fun, more surprising, more satisfying" — players can now turn connected builds into timed releases, falling ragdolls, loose wrecking balls, and deliberately broken machines without deleting their parts.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (293/293 passing); browser smoke ✓ on isolated local preview (Ball and Block placed, Rope connected them, Snip selected at toolbar end and cut the connection with `CONNECTION CUT!`, OBJ remained 2, 0 console errors/warnings); mobile ✓ (390×844, final Snip button reachable/selectable at 52×50px); live blocked (documented http://192.168.68.59:3003 currently serves the unrelated KBO Software Factory)
**Status:** verified; live deployment blocked by documented URL/port ownership

## 2026-08-20T14:08:45Z — Added: Swap tool
**Why:** The toolbar could create, connect, move, duplicate, resize, anchor, power, and remove objects, but it could not directly rearrange a pair. Swap turns two deliberately chosen standalone bodies into a quick spatial remix without disturbing their motion.
**Goal alignment:** "more fun, more surprising, more satisfying" — a two-step targeted exchange adds a distinct scene-composition verb while preserving the compact scrolling toolbar and one-tap touch flow.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (287/287 passing); browser smoke ✓ (Ball and Block placed with existing tools, Swap selected at toolbar end, first-body marker/status shown, second tap completed the exchange with `SWAPPED!`, OBJ remained 2, 0 console errors/warnings); responsive CSS ✓ (52×50px mobile tool target and horizontal end reachability retained); live ✓ (http://192.168.68.59:3003)
**Status:** shipped

## 2026-08-16T14:08:02Z — Added: Pinball Flipper tool
**Why:** The toolbar could place passive mechanisms and give objects persistent motors, but it had no player-timed part for batting objects through a scene. Flipper turns bumpers, pins, balls, and ramps into an improvised pinball table with a single compact control.
**Goal alignment:** "more fun, more surprising, more satisfying" — alternate left/right paddles create a timing-and-skill interaction that is meaningfully different from spawning, transforming, or continuously powering an object.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (282/282 passing); browser smoke ✓ (Ball selected and placed, Flipper selected at toolbar end, left paddle placed and fired to its active angle before springing back, right paddle placed/fired at 390×844, final 52×50px button reachable, 0 console errors/warnings); live ✓ (http://192.168.68.59:3003)
**Status:** shipped

## 2026-08-15T14:11:41Z — Added: Motor tool
**Why:** The toolbar could place, move, connect, anchor, resize, clone, and remove objects, but it had no persistent way to power an individual part. Motor turns existing bodies—including constrained parts—into reusable clockwise or counter-clockwise rotors.
**Goal alignment:** "more fun, more surprising, more satisfying" — powered seesaws, spinning dominoes, and improvised machines add a new active-building verb while keeping the one-button, one-row desktop and mobile flow.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (277/277 passing); browser smoke ✓ (Ball selected and placed, Motor selected at toolbar end, tapped body cycled CW → CCW → OFF → CW with visible status feedback, powered state ran after unpausing, final 52×50px button reachable at 390×844, 0 console errors/warnings); live ✓ (http://192.168.68.59:3003)
**Status:** shipped

## 2026-08-14T15:13:02Z — Added: Clone tool
**Why:** The toolbar could spawn new random objects and transform existing ones, but it could not reproduce a specific object already in the scene. Clone turns a successful shape, size, angle, color, or object behavior into a reusable building part with one tap.
**Goal alignment:** "more fun, more surprising, more satisfying" — quickly multiplying a giant ball, tuned domino, bomb, duck, or rocket makes experiments faster while preserving the compact one-row tool flow on desktop and mobile.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (272/272 passing); browser smoke ✓ (Ball selected and placed, Clone selected at toolbar end, OBJ increased from 1 to 2, matching duplicate appeared with offset and CLONED ×2 feedback, final button reachable at desktop and 390px mobile widths, 0 console errors/warnings); live ✓ (http://192.168.68.59:3003, committed index SHA-256 match)
**Status:** shipped

## 2026-08-11T14:13:59Z — Shipped: Resize tool
**Why:** The toolbar could create, connect, move, anchor, and remove objects, but standalone bodies kept their spawn size forever. Resize adds a direct transform without adding a second control: tap an object to grow it, then reselect the active tool to switch between grow and shrink.
**Goal alignment:** "more fun, more surprising, more satisfying" — giant balls, tiny anvils, and deliberately mismatched scenes multiply the creative range of existing objects while keeping the one-row mobile toolbar flow.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (267/267 passing); browser smoke ✓ (Ball selected and placed, Resize selected at toolbar end, body grew to 135%, mode toggled, body shrank to 100%, visible status feedback, 0 console errors/warnings); live ✓ (http://192.168.68.65:3003)
**Status:** shipped

## 2026-08-10T14:07:31Z — Shipped: Anchor tool
**Why:** Scene construction had ways to spawn, grab, connect, and erase objects, but no persistent per-object way to suspend a piece in space. Anchor turns any dynamic object into a fixed support and releases it with a second tap.
**Goal alignment:** "more fun, more surprising, more satisfying" — adds a compact construction verb for floating platforms, hanging obstacles, and improvised machines while preserving the existing mobile-friendly toolbar and canvas flow.
**Files changed:** .agent.md, index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (262/262 passing); browser smoke ✓ (Ball spawned, Anchor selected at toolbar end, body anchored and released, cyan marker visible, 0 console errors/warnings); live ✓ (http://192.168.68.65:3003)
**Status:** shipped

## 2026-06-28T14:03:53Z — Shipped: Impact combo rewards
**Why:** The destruction meter tracked total chaos, but rapid bursts of hard hits had no distinct payoff. A temporary combo callout now rewards streaks of energetic impacts with rising notes, extra confetti, milestone blasts, and a session-best target.
**Goal alignment:** "more surprising and more satisfying" — turns collision bursts into a readable reward loop without adding controls, dependencies, or layout changes.
**Files changed:** index.html, __tests__/chaos-engine.test.js, changelog.md, upgrade-log.json
**Verified:** tests ✓ (256/256 passing)
**Status:** shipped

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

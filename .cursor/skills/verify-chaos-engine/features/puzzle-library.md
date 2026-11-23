# Puzzle library and return visits

New players begin on the mixed-tool lesson path. The launcher remembers the last guided, numbered or work-order route on this browser. The level map finds machines by name, number, chapter and tools that act in a successful run.

## Sub-features

- The first four guided jobs introduce a bridge, a belt, a trampoline and a combined mechanism. Finishing a level counts on the numbered and guided routes.
- Reopening PUZZLES resumes an unfinished job or advances within the same route. Pre-existing numbered progress opens a numbered job. Direct level and workshop links keep their destinations.
- Find a machine searches the campaign, lessons and work orders. Several terms narrow the matches. A tool in the index took part in at least one recorded successful arrangement.
- Search can hide finished jobs and show more than twelve results. The lesson-number filter links directly to the guided route.
- Jump to a tool course expands a compact list of the powered, clockwork, rigging, paired and drivetrain course starts.

## How to get to it (user POV)

Choose PUZZLES from the sandbox. Use Level map and Find a machine, then enter a title, number or tool name. Choose Search in to limit the results to a route. Select a result to open its bench. Within Level map, choose Continue at the first unfinished numbered job or expand Jump to a tool course.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- Run `./scripts/verify-chaos-engine drive puzzle-library`. Enter the first guided job from the sandbox, complete its bridge and reopen PUZZLES to reach the conveyor.
- Search for gearbox and rack together, find an empty result, exclude the finished bridge and reveal a second page of matches. Open job 303, leave it unfinished and check the launcher returns to it.
- Find an order, make a real delivery and reopen the game to reach the next job in that book. Use the compact course list and open the third guided lesson by number. Capture the results on phone and desktop.
- Run `puzzle-campaign` for all numbered levels, `tool-lessons` for the mixed progression and `work-orders` for actual deliveries. Run `ui-layout` and `save-load` for the sandbox.

## Gotchas

- A missing spare can be a distractor. The search indexes tools that worked on a benchmark run.
- The same machine can have a numbered level and a different lesson number. The Search in setting determines which number a bare numeral looks up.
- Opening a direct link visits that exact machine. Opening the bare game address or PUZZLES button resumes the stored route. A downloadable file opens its enclosed challenge.

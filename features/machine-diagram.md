# Read machine diagram

Inspect the actual starting layout, mounting sockets, hardware and receiver rules. A player can read the whole machine with a keyboard or select a silhouette on the drawing.

## Sub-features

- Grouped, labeled objects describe the release position and installed fittings. Touching overlapping objects cycles the selection. The nearest socket or receiver link gives its distance and direction.
- Numbered receiver rules name the required moving body, ordered crossings, bin dwell and speed, entry direction, rotation and timed windows when present. The independent receiver clock previews the exact first and last open frames.
- Choosing a socket from an idle release diagram returns focus to the working parts drawer. Opening the diagram pauses an active run and closing it restores the player's prior playback state.

## How to get to it (user POV)

Choose **Read machine diagram** in the bench links or **Read diagram** inside the expanded workbench. Choose an object from **Parts at release**, use Previous and Next, or tap it in the drawing. Select a socket to choose its spare. For a timed receiver, adjust Preview a frame or select Next opening.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive machine-diagram`. Complete a keyboard-only repair, select a socket by touch, inspect nested focus and paused playback, check the accessibility tree and real timed window boundaries, read a two-load bin, and fit a downloaded machine offline. Verify the displayed object count and receiver rules across all 520 numbered machines.

## Gotchas

The diagram uses the current fittings and the release positions. Previewing a receiver clock keeps every body at release. Sorting bins accept loads independently; sequential chimes require the correct contact order. The socket handoff is available while the bench is idle. A running or paused attempt can be inspected without editing it.

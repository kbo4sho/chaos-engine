# Exchange working drawings

An author can pass an unfinished machine to another player. The recipient can inspect its stations, preview the complete and stripped machines, then decide whether to bring it into the editor.

## Sub-features

- Copy a drawing link or save a small JSON drawing file before issuing a puzzle. Each contains the starter and its physical edits.
- Review a drawing without changing a local draft. Scrub both versions, inspect the removable stations and check where the last delivery actor landed.
- Accepting the drawing enters the editor with an undo step back to the previous drawing. The usual seven-release press checks still apply before it can become a playable puzzle.

## How to get to it (user POV)

Open **Build a machine** and **Share a working drawing**. Choose **Copy editable link** or **Save drawing file**. Open the link or choose **Open drawing file** on another bench. Inspect the drawing, then choose **Use this drawing** or **Keep my drawing**. The recipient can adjust it and send back an editable drawing or issue a verified puzzle.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive drawing-exchange`. Send an unfinished duplicate-tool machine from a phone. Preview its film and stations in a separate profile with a previous drawing. Dismiss it, reopen it, accept, undo, redo and fix the failed design before issuing a real repair. Open a downloaded drawing with the network cut. Import a malformed file and follow a damaged link. Check that both preserve the local draft. Also run compound-designer, design-bench, offline-workshop, phone-bench, phone-startup, save-load and ui-layout.

## Gotchas

- An editable link opens the author's drawing for review. A verified puzzle link opens the machine for play. Each has its own address.
- The handoff contains the design settings only. An accepted drawing can be undone in the current editing session. Save a drawing file to keep a separate copy.
- Drawing files can be opened from an offline workshop. A shared link uses the same game origin where the author copied it.

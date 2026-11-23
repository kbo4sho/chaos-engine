# Expanded workbench and comparison film

Players can enlarge a working machine, zoom in on a mount and compare two different setups at the same physical time. The comparison uses recordings of the player's actual releases.

## Sub-features

- Expand moves the live drawing, socket controls and parts drawer into a full-viewport dialog. Zoom ranges from 100% to 250%. The scrollable drawing supports panning and focusing a socket brings it into view. Fit returns the whole machine to view.
- Compare last two setups appears after two distinct fittings have finished. The empty machine is a valid setup. Replaying the same repair preserves the earlier contrasting run.
- Solid tracks show the latest marble and parcel. Dashed tracks and outlines show the earlier release. The hardware selector switches the displayed assembly independently of the paths.
- The film opens on the first sustained separation of one marble or parcel radius. Frame buttons, a scrubber and playback operate over the common portion of both recordings. A measured tool-contact button seeks to a recorded event that differs between attempts.
- Classic tracks, bumpers, weights and dominoes register physical contact in the bench film and use the same collision observation in the tool lab.

## How to get to it (user POV)

Open PUZZLES. Choose Expand in the upper strip of the machine drawing. Zoom in, pan the diagram or use Tab to reach a socket. Close returns the same running, paused or repaired machine to the workbench. Run the opening machine empty, fit the bridge and run it again. Choose Compare last two setups. Use First separation to jump to the measured divergence or select the recorded contact to inspect the earlier interaction.

## Driving it with verify-chaos-engine

After launch and doctor, drive `attempt-film`. The journey enlarges the live bench on a phone, checks 200% zoom, reaches a socket, makes an actual empty attempt and repairs the machine. It compares both recordings, changes the visible hardware, jumps to the earlier bridge contact and steps one physics frame. It checks an exact replay keeps the previous distinct attempt, navigates to the next level and verifies the history clears. In landscape it inspects the enlarged layout. On desktop it compares a seven-tool delivery where the blue parcel diverges while the gold marble follows the same route.

Drive `paired-repairs`, `tool-lessons`, `puzzle-campaign` and the related tool courses to cover recording under their existing gameplay. Drive `ui-layout` and `save-load` for the sandbox routes.

## Gotchas

- Measurements use the same 60 Hz simulation clock at every playback speed. A separation must last three frames to be marked.
- Comparing stops at the end of the shorter recording. Gold and blue each have their own separation readout.
- The two setup recordings belong to the currently open level and tab. A saved successful repair and its downloadable replay remain available independently.

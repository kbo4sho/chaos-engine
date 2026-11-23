# Keep the workshop offline

Save the full numbered campaign, tool lessons, practice pairs, discovery lab, production stations and native Chaos Engine sandbox on this device. Reopen the usual public address, including bookmarked machine links.

## Sub-features

- Saving is optional. The level map reports progress and the size of the game files. A regular first visit opens the normal online game.
- Every file's size and SHA-256 digest must match the published edition before it becomes the active offline copy. An interrupted update keeps the previous complete edition. Cancel a download or refresh from another tab.
- Offline play includes repairing, the machine press, downloadable standalone machines, and linked stations. Removing the offline game files leaves the player's repair book accessible.

## How to get to it (user POV)

Open the level map, expand **Keep the workshop offline** and choose **Save for offline play**. Wait for **Ready for offline play**. Later open the same game address in this browser. Choose **Refresh offline copy** to pick up a published update or **Remove offline copy** to free the game storage.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass on localhost. Run `./scripts/verify-chaos-engine drive offline-workshop`. Cancel a real download, save the complete edition, reject a mixed-version update, then install a matching replacement. Cut the browser and worker's connection to the actual game, open new tabs, complete a repair, open Chaos Engine, run the machine press, download a standalone and visit each production station. Restore the connection and remove the game files while retaining the earned repair.

## Gotchas

Downloaded copies belong to the current browser and site address. The local server and the public site have separate copies. Browsers manage their available storage. On a new device, download the game and import the player's repair notebook. A downloaded single-machine HTML file remains a separate way to play or send one machine.

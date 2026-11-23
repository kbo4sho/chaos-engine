// A single history for the player's current machine. Record only changes to
// physical fittings, so selecting a part never consumes an undo.
export function editHistory(limit = 32) {
  const entries = [];
  function remember(before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    entries.push(before);
    if (entries.length > limit) entries.shift();
  }
  return {
    remember,
    get available() {
      return entries.length > 0;
    },
    undo() {
      return entries.pop();
    },
    clear() {
      entries.length = 0;
    },
  };
}

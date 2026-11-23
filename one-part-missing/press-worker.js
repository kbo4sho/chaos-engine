// A classic worker can load the exact same unmodified UMD build as the game.
importScripts('../vendor/matter-0.20.0.min.js');
self.onmessage = async ({ data }) => {
  try {
    const { resolveMachine, proveTarget } = await import('./workshop.js');
    const value = data.draft
      ? proveTarget(self.Matter, data.draft)
      : resolveMachine(self.Matter, data.id);
    self.postMessage({ value });
  } catch {
    self.postMessage({ error: true });
  }
};

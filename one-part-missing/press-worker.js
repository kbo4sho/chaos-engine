// A classic worker can load the exact same unmodified UMD build as the game.
importScripts('../vendor/matter-0.20.0.min.js');
self.onmessage = async ({ data }) => {
  try {
    const { pressRequest } = await import('./workshop.js');
    const value = pressRequest(self.Matter, data);
    self.postMessage({ value });
  } catch {
    self.postMessage({ error: true });
  }
};

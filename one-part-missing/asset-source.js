const sourceCache = new Map();
export async function readAsset(path) {
  if (!sourceCache.has(path)) {
    const result = fetch(new URL(path, document.baseURI))
      .then((response) => {
        if (!response.ok) throw new Error('Asset unavailable');
        return response.text();
      })
      .catch((error) => {
        sourceCache.delete(path);
        throw error;
      });
    sourceCache.set(path, result);
  }
  return sourceCache.get(path);
}

export function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

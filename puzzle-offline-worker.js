// One optional, complete offline edition for this deployment of Chaos Engine.
const base = new URL(self.registration.scope);
const prefix = 'chaos-puzzle-library:' + base.pathname + ':';
const metaName = prefix + 'index',
  metaURL = new URL('_puzzle_offline_index', base).href;
const manifestURL = new URL('one-part-missing/offline-library.json', base);
const directories = new Set([
  'one-part-missing',
  'one-part-missing/discovery',
  'one-part-missing/test-bay',
  'one-part-missing/fault-desk',
  'one-part-missing/control-room',
]);
let metadata,
  saving = null,
  removing = null;
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function gamePath(path) {
  return (
    [
      'index.html',
      'one-part-missing.html',
      'save-codec.js',
      'examples/chaos-examples.js',
      'puzzle-offline-worker.js',
      'vendor/VT323-Regular.woff2',
      'vendor/VT323-OFL.txt',
      'vendor/MATTER-LICENSE',
      'vendor/matter-0.20.0.min.js',
    ].includes(path) || /^one-part-missing\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:html|js|css)$/.test(path)
  );
}
async function installed() {
  if (metadata !== undefined) return metadata;
  if (!(await caches.has(metaName))) return (metadata = null);
  const res = await (await caches.open(metaName)).match(metaURL);
  const saved = res ? await res.json() : null;
  return (metadata = saved && (await caches.has(saved.cacheName)) ? saved : null);
}
const describe = (m) => (m ? { version: m.version, bytes: m.bytes, files: m.files } : null);
function info(job) {
  return {
    type: 'progress',
    done: job.done,
    total: job.total,
    bytes: job.bytes,
    fullSize: job.fullSize,
  };
}
function emit(port, value) {
  try {
    port.postMessage(value);
  } catch {}
}
function progress(job) {
  for (const p of job.ports) emit(p, info(job));
}
async function cleanExcept(name) {
  await Promise.all(
    (await caches.keys())
      .filter((n) => n.startsWith(prefix + 'files:') && n !== name)
      .map((n) => caches.delete(n)),
  );
}
async function save(job) {
  const old = await installed();
  let newName = null,
    committed = false;
  const check = () => job.cancel.signal.throwIfAborted();
  try {
    const response = await fetch(manifestURL, { cache: 'reload', signal: job.cancel.signal });
    if (!response.ok) throw Error('The offline list could not be downloaded.');
    const m = await response.json();
    if (
      m.format !== 1 ||
      !/^[a-f0-9]{16}$/.test(m.version) ||
      !Array.isArray(m.assets) ||
      !m.assets.length ||
      m.assets.some(
        (a) =>
          !gamePath(a.path) ||
          !Number.isSafeInteger(a.size) ||
          a.size < 0 ||
          !/^[a-f0-9]{64}$/.test(a.hash),
      )
    )
      throw Error('The published offline list is incomplete.');
    check();
    if (
      old?.version === m.version &&
      (await (await caches.open(old.cacheName)).keys()).length === m.assets.length
    )
      return { type: 'ready', saved: describe(old), unchanged: true };
    newName = prefix + 'files:' + m.version + ':' + crypto.randomUUID();
    const cache = await caches.open(newName);
    let index = 0,
      firstError = null;
    job.fullSize = m.bytes;
    job.total = m.assets.length;
    progress(job);
    async function copy() {
      while (index < m.assets.length) {
        check();
        const asset = m.assets[index++],
          url = new URL(asset.path, base);
        const versioned = new URL(url);
        versioned.searchParams.set('offline-hash', asset.hash.slice(0, 16));
        const r = await fetch(versioned, { cache: 'reload', signal: job.cancel.signal });
        if (!r.ok || r.url !== versioned.href) throw Error('A game file could not be downloaded.');
        const bytes = await r.clone().arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
          n.toString(16).padStart(2, '0'),
        ).join('');
        if (bytes.byteLength !== asset.size || hash !== asset.hash)
          throw Error('The published game changed during this download. Try again.');
        check();
        await cache.put(url, r);
        job.done++;
        job.bytes += bytes.byteLength;
        progress(job);
      }
    }
    await Promise.allSettled(
      Array.from({ length: Math.min(5, m.assets.length) }, () =>
        copy().catch((e) => {
          if (!firstError) firstError = e;
          job.cancel.abort();
        }),
      ),
    );
    if (firstError) throw firstError;
    check();
    if (job.done !== m.assets.length || job.bytes !== m.bytes)
      throw Error('The download is incomplete.');
    const next = {
      cacheName: newName,
      version: m.version,
      benchVersion: m.benchVersion,
      files: job.done,
      bytes: job.bytes,
    };
    const meta = await caches.open(metaName);
    await meta.put(
      metaURL,
      new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } }),
    );
    metadata = next;
    committed = true;
    await cleanExcept(newName).catch(() => {});
    return { type: 'ready', saved: describe(next) };
  } catch (e) {
    return {
      type: job.userCanceled ? 'canceled' : 'failed',
      saved: describe(old),
      message: job.userCanceled
        ? 'Download canceled.'
        : e.name === 'TypeError'
          ? 'Reconnect to finish downloading the workshop.'
          : e.message,
    };
  } finally {
    if (newName && !committed) await caches.delete(newName);
  }
}
function startSave(port) {
  if (!saving) {
    const job = {
      ports: new Set(),
      cancel: new AbortController(),
      userCanceled: false,
      done: 0,
      total: 0,
      bytes: 0,
      fullSize: 0,
    };
    saving = job;
    job.promise = save(job).finally(() => {
      if (saving === job) saving = null;
    });
  }
  saving.ports.add(port);
  emit(port, info(saving));
  return saving.promise;
}
function cancel() {
  if (saving) {
    saving.userCanceled = true;
    saving.cancel.abort();
  }
  return saving?.promise;
}
async function remove() {
  await cancel();
  const meta = await caches.open(metaName);
  await meta.delete(metaURL);
  metadata = null;
  await cleanExcept(null);
  await caches.delete(metaName);
  return { type: 'removed', saved: null };
}
async function notifyOtherTabs(sender) {
  const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const tab of tabs)
    if (tab.id !== sender) tab.postMessage({ app: 'one-part-missing', type: 'offline-copy-changed' });
}
self.addEventListener('message', (event) => {
  const port = event.ports[0];
  if (!port || event.data?.app !== 'one-part-missing') return;
  event.waitUntil(
    (async () => {
      let result;
      try {
        if (event.data.action === 'remove') {
          removing ??= remove().finally(() => {
            removing = null;
          });
          result = await removing;
        } else {
          if (removing) await removing;
          if (event.data.action === 'save') result = await startSave(port);
          else if (event.data.action === 'cancel')
            result = (await cancel()) || { type: 'status', saved: describe(await installed()) };
          else if (event.data.action === 'status') {
            if (saving) {
              saving.ports.add(port);
              emit(port, info(saving));
              result = await saving.promise;
            } else result = { type: 'status', saved: describe(await installed()) };
          } else return;
        }
      } catch {
        result = {
          type: 'failed',
          message: 'This browser could not store the offline workshop.',
          saved: describe(await installed().catch(() => null)),
        };
      }
      if (
        (event.data.action === 'save' && result.type === 'ready' && !result.unchanged) ||
        (event.data.action === 'remove' && result.type === 'removed')
      )
        await notifyOtherTabs(event.source?.id).catch(() => {});
      emit(port, result);
      port.close();
    })(),
  );
});
async function fallback(request, asset, directory) {
  if (!self.navigator.onLine) {
    const local = await cachedResponse(request, asset, directory);
    if (local) return local;
  }
  try {
    const response = await fetch(request);
    if (response.status < 500) return response;
    const cached = await cachedResponse(request, asset, directory);
    return cached || response;
  } catch (error) {
    const cached = await cachedResponse(request, asset, directory);
    if (cached) return cached;
    throw error;
  }
}
async function cachedResponse(request, asset, directory) {
  const m = await installed();
  if (!m) return null;
  if (directory) {
    const address = new URL(request.url);
    address.pathname += '/';
    return Response.redirect(address.href, 308);
  }
  const version = new URL(request.url).searchParams.get('v');
  if (asset === 'one-part-missing/bench-release.js' && version && version !== m.benchVersion)
    return null;
  return (await caches.open(m.cacheName)).match(new URL(asset, base));
}
self.addEventListener('fetch', (event) => {
  const req = event.request,
    u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== base.origin || !u.pathname.startsWith(base.pathname)) return;
  const path = u.pathname.slice(base.pathname.length),
    directory = directories.has(path);
  const asset = path.endsWith('/') || !path ? path + 'index.html' : path;
  if (directory || gamePath(asset)) event.respondWith(fallback(req, asset, directory));
});

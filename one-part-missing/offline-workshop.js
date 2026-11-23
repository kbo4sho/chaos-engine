// Registration is deliberately user initiated. Merely playing a puzzle keeps
// the normal network path and does not download the workshop.
export function setupOfflineWorkshop(el) {
  const panel = el('offline-workshop'),
    save = el('offline-save'),
    remove = el('offline-remove'),
    cancel = el('offline-cancel'),
    bar = el('offline-progress'),
    state = el('offline-status'),
    detail = el('offline-progress-text');
  if (document.body.dataset.portable) {
    panel.hidden = true;
    return;
  }
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'caches' in window;
  if (!supported) {
    save.disabled = true;
    state.textContent = 'Open the secure public game or localhost to save an offline copy.';
    return;
  }
  const base = new URL('../', document.baseURI),
    script = new URL('puzzle-offline-worker.js', base);
  let busy = false,
    revision = 0,
    saved = null;
  const mb = (n) => (n / 1000000).toFixed(1) + ' MB';
  function controls() {
    save.textContent = saved ? 'Refresh offline copy' : 'Save for offline play';
    save.disabled = busy;
    remove.hidden = !saved || busy;
    cancel.hidden = !busy;
    bar.hidden = !busy;
    detail.hidden = !busy;
    if (saved) panel.dataset.version = saved.version;
    else delete panel.dataset.version;
  }
  function working(value) {
    busy = true;
    controls();
    if (value.total > 0) {
      bar.max = value.total;
      bar.value = value.done;
      const progress =
        value.done + ' of ' + value.total + ' files · ' + mb(value.bytes) + ' of ' + mb(value.fullSize);
      detail.textContent = progress;
      bar.setAttribute('aria-valuetext', progress);
    } else {
      bar.removeAttribute('value');
      detail.textContent = 'Reading the workshop file list…';
    }
    if (state.textContent !== 'Saving the workshop…') state.textContent = 'Saving the workshop…';
  }
  function finish(value, action) {
    busy = false;
    saved = value.saved || null;
    controls();
    const summary = saved ? saved.files + ' files · ' + mb(saved.bytes) + '.' : '';
    switch (value.type) {
      case 'ready':
        state.textContent =
          (value.unchanged ? 'Offline copy is up to date. ' : 'Ready for offline play. ') + summary;
        break;
      case 'removed':
        state.textContent = 'Offline game files removed.';
        save.focus({ preventScroll: true });
        break;
      case 'failed':
        state.textContent =
          (value.message || 'The workshop could not be downloaded.') +
          (saved ? ' Your previous offline copy is ready.' : '');
        break;
      case 'canceled':
        state.textContent =
          'Download canceled.' + (saved ? ' Your previous offline copy is ready.' : '');
        break;
      default:
        state.textContent = saved
          ? 'Ready for offline play. ' + summary
          : 'No offline copy on this device.';
    }
    if (action === 'cancel') save.focus({ preventScroll: true });
  }
  async function worker(install) {
    let reg = await navigator.serviceWorker.getRegistration(base.href);
    if (reg?.scope !== base.href) reg = null;
    if (!reg && !install) return null;
    if (install)
      reg = await navigator.serviceWorker.register(script.href, {
        scope: base.href,
        updateViaCache: 'none',
      });
    if (reg.active?.state === 'activated') return reg.active;
    const candidate = reg.installing || reg.waiting || reg.active;
    if (!candidate) throw Error('The offline worker could not start. Try again.');
    return new Promise((resolve, reject) => {
      const check = () => {
        if (candidate.state === 'activated') {
          clearTimeout(timer);
          candidate.removeEventListener('statechange', check);
          resolve(candidate);
        } else if (candidate.state === 'redundant') fail();
      };
      const fail = () => {
        clearTimeout(timer);
        candidate.removeEventListener('statechange', check);
        reject(Error('The offline worker could not start. Try again.'));
      };
      const timer = setTimeout(fail, 25000);
      candidate.addEventListener('statechange', check);
      check();
    });
  }
  async function command(action) {
    const current = ++revision;
    if (action === 'save') working({ done: 0, total: 0, bytes: 0, fullSize: 0 });
    if (action === 'cancel') cancel.disabled = true;
    if (action === 'remove') remove.disabled = true;
    let port, timer;
    try {
      const target = await worker(action === 'save');
      if (current !== revision) return;
      if (!target) {
        finish({ type: 'status', saved: null }, action);
        return;
      }
      const result = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        port = channel.port1;
        const heartbeat = () => {
          clearTimeout(timer);
          timer = setTimeout(
            () =>
              reject(
                Error('The offline worker stopped responding. Reopen the panel to check the copy.'),
              ),
            90000,
          );
        };
        port.onmessage = (e) => {
          heartbeat();
          if (e.data?.type === 'progress') {
            if (current === revision) working(e.data);
          } else resolve(e.data);
        };
        heartbeat();
        target.postMessage({ app: 'one-part-missing', action }, [channel.port2]);
      });
      if (current === revision) finish(result, action);
    } catch (e) {
      if (current === revision)
        finish(
          {
            type: 'failed',
            saved,
            message: e.message || 'This browser could not save the offline workshop.',
          },
          action,
        );
    } finally {
      clearTimeout(timer);
      port?.close();
      if (current === revision) {
        cancel.disabled = false;
        remove.disabled = false;
      }
    }
  }
  panel.addEventListener('toggle', () => {
    if (panel.open && !busy) void command('status');
  });
  save.onclick = () => command('save');
  cancel.onclick = () => command('cancel');
  remove.onclick = () => command('remove');
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (
      e.data?.app === 'one-part-missing' &&
      e.data.type === 'offline-copy-changed' &&
      panel.open &&
      !busy
    )
      void command('status');
  });
}

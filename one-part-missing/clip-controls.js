// The film is generated only on request. Keep an actual download link so a
// phone can save it from a user gesture after the encoder finishes.
export function clipControls(root, specification) {
  const make = root.querySelector('[data-clip-make]'),
    download = root.querySelector('[data-clip-save]'),
    status = root.querySelector('[data-clip-status]'),
    share = root.querySelector('[data-clip-share]');
  let pending = null,
    address = null,
    file = null;
  function clear() {
    pending?.abort();
    pending = null;
    if (address) URL.revokeObjectURL(address);
    address = null;
    file = null;
    download.hidden = true;
    download.removeAttribute('href');
    share.hidden = true;
    make.hidden = false;
    make.textContent = 'Make replay GIF';
    status.textContent = '';
  }
  make.addEventListener('click', async () => {
    if (pending) {
      clear();
      status.textContent = 'Export canceled.';
      return;
    }
    const plan = specification();
    if (!plan) return;
    const controller = new AbortController();
    pending = controller;
    make.textContent = 'Cancel GIF';
    status.textContent = 'Preparing replay…';
    try {
      const { makeClip } = await import('./replay-clip.js');
      if (controller.signal.aborted) return;
      let last = -1;
      const blob = await makeClip(plan, controller.signal, (progress) => {
        const step = Math.floor(progress * 5);
        if (last === step) return;
        last = step;
        status.textContent = 'Drawing film · ' + step * 20 + '%';
      });
      if (controller.signal.aborted) return;
      const name = plan.filename + '.gif';
      address = URL.createObjectURL(blob);
      download.href = address;
      download.download = name;
      download.textContent = 'Save GIF · ' + Math.ceil(blob.size / 1024) + ' KB';
      download.hidden = false;
      file = new File([blob], name, { type: 'image/gif' });
      share.hidden = !navigator.canShare?.({ files: [file] });
      make.hidden = true;
      status.textContent = 'Replay GIF ready.';
      if (root.contains(document.activeElement)) download.focus({ preventScroll: true });
    } catch {
      if (!controller.signal.aborted) status.textContent = 'The film could not be drawn. Try again.';
    } finally {
      if (pending === controller) {
        pending = null;
        make.textContent = 'Make replay GIF';
      }
    }
  });
  share.addEventListener('click', async () => {
    if (!file) return;
    const current = file;
    try {
      await navigator.share({ files: [current] });
    } catch (e) {
      if (file === current && e.name !== 'AbortError')
        status.textContent = 'Use Save GIF to share the file.';
    }
  });
  return { clear };
}

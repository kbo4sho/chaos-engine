import {
  notebookFile,
  readNotebook,
  inspectNotebook,
  mergeNotebook,
  maxNotebookBytes,
} from './repair-notebook-file.js';

export function notebookTransfer(el, services, refresh) {
  const panel = el('repair-transfer'),
    input = el('notebook-file'),
    status = el('notebook-file-status'),
    apply = el('notebook-merge'),
    stop = el('notebook-cancel');
  let operation = null,
    ready = null;
  function clear() {
    operation?.abort();
    operation = null;
    ready = null;
    input.value = '';
    apply.hidden = true;
    stop.hidden = true;
  }
  function count(n, label, plural = label + 's') {
    return n + ' ' + (n === 1 ? label : plural);
  }
  el('notebook-export').addEventListener('click', () => {
    const file = notebookFile(services);
    const link = document.createElement('a'),
      url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
    link.href = url;
    link.download = 'one-part-missing-repair-notebook.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent =
      'Downloaded ' +
      count(file.repairs.length, 'repair') +
      ' and ' +
      count(file.drafts.length, 'unfinished build') +
      '.';
  });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    clear();
    const controller = new AbortController();
    operation = controller;
    stop.hidden = false;
    status.textContent = 'Reading notebook…';
    try {
      if (file.size > maxNotebookBytes) throw Error('Choose a notebook smaller than 2 MB.');
      const archive = readNotebook(await file.text());
      controller.signal.throwIfAborted();
      const verified = await inspectNotebook(archive, {
        ...services,
        signal: controller.signal,
        progress(i, total) {
          status.textContent = 'Checking machine ' + i + ' of ' + total + '…';
        },
      });
      controller.signal.throwIfAborted();
      ready = verified;
      const total =
        verified.repairs.length +
        verified.drafts.length +
        verified.orders.length +
        verified.contacts.length;
      const extra = verified.skipped
        ? ' · ' + count(verified.skipped, 'unavailable entry', 'unavailable entries')
        : '';
      status.textContent = total
        ? 'Ready to merge · ' +
          count(verified.repairs.length, 'verified repair') +
          ' · ' +
          count(verified.drafts.length, 'unfinished build') +
          extra +
          '.'
        : 'No usable fittings in this notebook' + extra + '.';
      apply.hidden = !total;
      stop.hidden = !total;
      if (total) apply.focus({ preventScroll: true });
    } catch (e) {
      if (controller.signal.aborted) return;
      status.textContent = e.message || 'This notebook could not be opened.';
      clear();
    }
  });
  stop.addEventListener('click', () => {
    clear();
    status.textContent = 'Import canceled. Your bench is ready.';
    input.focus({ preventScroll: true });
  });
  apply.addEventListener('click', () => {
    if (!ready) return;
    const result = mergeNotebook(ready, services);
    clear();
    refresh();
    status.textContent =
      'Merged ' +
      count(result.repairs, 'repair') +
      ', ' +
      count(result.unfinished, 'unfinished build') +
      ', ' +
      count(result.contacts, 'tool mark') +
      ' and ' +
      count(result.scores, 'order record') +
      '.' +
      (result.kept ? ' Kept ' + count(result.kept, 'existing entry', 'existing entries') + '.' : '') +
      (result.full
        ? ' The generated-machine shelf is full for ' + count(result.full, 'additional print') + '.'
        : '') +
      (result.skipped ? ' Skipped ' + result.skipped + ' unavailable.' : '');
    input.focus({ preventScroll: true });
  });
  return {
    enter(personal) {
      clear();
      status.textContent = '';
      panel.hidden = !personal;
      if (!personal) panel.open = false;
    },
  };
}

// A completed run lights the same glass annunciator on either workbench.
// The existing status region on each bench announces the result to screen readers.
export function repairSignal() {
  let panel;
  let timer;

  function clear() {
    clearTimeout(timer);
    panel?.remove();
    panel = null;
  }

  function show(machineTitle) {
    clear();
    panel = document.createElement('div');
    panel.id = 'repair-signal';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('popover', 'manual');
    panel.innerHTML = `
      <div class="repair-circuit">
        <span class="repair-terminal"></span><i></i><span class="repair-terminal"></span>
      </div>
      <strong>REPAIRED</strong>
      <span class="repair-name"></span>`;
    panel.querySelector('.repair-name').textContent = machineTitle;
    // Keep the signal above the expanded workbench, including in older browsers.
    (document.querySelector('dialog[open]') || document.body).append(panel);
    panel.showPopover?.();
    timer = setTimeout(clear, 2400);
  }

  return { show, clear };
}

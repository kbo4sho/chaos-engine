// Move the existing controls into a modal, so zoom and pan preserve a live attempt.
export function setupFocus(el) {
  const modal = el('focus-view'),
    body = el('focus-content'),
    port = el('stage-port'),
    stage = el('stage'),
    opener = el('focus-open');
  const cabinet = opener.closest('.cabinet'),
    drawer = document.querySelector('.drawer');
  const anchors = [cabinet, drawer].map((node) => {
    const anchor = document.createComment('bench position');
    node.before(anchor);
    return [anchor, node];
  });
  const zooms = [1, 1.5, 2, 2.5];
  let zoom = 0,
    entered = false,
    scrollY = 0;
  function scale(next, center) {
    zoom = Math.max(0, Math.min(zooms.length - 1, next));
    stage.style.width = zooms[zoom] * 100 + '%';
    el('focus-scale').value = Math.round(100 * zooms[zoom]) + '%';
    el('focus-in').disabled = zoom === zooms.length - 1;
    el('focus-out').disabled = zoom === 0;
    if (center) {
      port.scrollLeft = center.x * stage.offsetWidth - port.clientWidth / 2;
      port.scrollTop = center.y * stage.offsetHeight - port.clientHeight / 2;
    }
  }
  function resize(delta) {
    const center = {
      x: (port.scrollLeft + port.clientWidth / 2) / stage.offsetWidth,
      y: (port.scrollTop + port.clientHeight / 2) / stage.offsetHeight,
    };
    scale(zoom + delta, center);
  }
  function restore() {
    if (!entered) return;
    entered = false;
    port.removeAttribute('tabindex');
    port.removeAttribute('role');
    port.removeAttribute('aria-label');
    stage.style.removeProperty('width');
    port.scrollLeft = 0;
    port.scrollTop = 0;
    for (const [anchor, node] of anchors) anchor.after(node);
    document.documentElement.classList.remove('expanded-bench');
    opener.focus({ preventScroll: true });
    window.scrollTo(0, scrollY);
  }
  function close() {
    if (modal.open) modal.close();
    restore();
  }
  opener.addEventListener('click', () => {
    if (entered) return;
    scrollY = window.scrollY;
    entered = true;
    el('focus-title').textContent = el('machine-title').textContent;
    body.append(cabinet, drawer);
    port.tabIndex = 0;
    port.setAttribute('role', 'region');
    port.setAttribute('aria-label', 'Scrollable machine diagram');
    document.documentElement.classList.add('expanded-bench');
    modal.showModal();
    scale(0);
    port.scrollTo(0, 0);
    modal.scrollTo(0, 0);
    el('focus-close').focus({ preventScroll: true });
  });
  el('focus-close').addEventListener('click', close);
  modal.addEventListener('close', restore);
  el('focus-in').addEventListener('click', () => resize(1));
  el('focus-out').addEventListener('click', () => resize(-1));
  el('focus-fit').addEventListener('click', () => {
    scale(0);
    port.scrollTo(0, 0);
  });
  return { close };
}

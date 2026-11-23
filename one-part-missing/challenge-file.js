// Preparing a file can outlast a route change. Only expose the most recent
// request, and release its object URL when the player leaves the challenge.
export function challengeFile(button, link, status, prepare) {
  let address = null,
    revision = 0;
  function clear() {
    revision++;
    if (address) URL.revokeObjectURL(address);
    address = null;
    link.hidden = true;
    link.removeAttribute('href');
    status.textContent = '';
    button.disabled = false;
  }
  button.addEventListener('click', async () => {
    clear();
    const at = revision;
    button.disabled = true;
    status.textContent = 'Packing the playable machine…';
    try {
      const file = await prepare();
      if (at !== revision) return;
      if (!file) {
        clear();
        return;
      }
      address = URL.createObjectURL(file.blob);
      link.href = address;
      link.download = file.name;
      link.textContent = file.action;
      link.hidden = false;
      status.textContent = file.message;
      link.focus({ preventScroll: true });
    } catch {
      if (at !== revision) return;
      button.disabled = false;
      status.textContent = 'The file could not be prepared. Try again.';
    }
  });
  return { clear };
}

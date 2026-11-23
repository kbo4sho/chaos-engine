import { resolveMachine, proveTarget } from './workshop.js';

// Generation and the exhaustive repair trials can take longer on phones.
export function usePress(M, request, signal) {
  const local = () => (request.draft ? proveTarget(M, request.draft) : resolveMachine(M, request.id));
  if (document.body.dataset.portable) return Promise.resolve(local());
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./press-worker.js', import.meta.url));
    } catch {
      resolve(local());
      return;
    }
    const clean = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      clean();
      reject(signal.reason);
    };
    const fallback = () => {
      clean();
      try {
        resolve(local());
      } catch (error) {
        reject(error);
      }
    };
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.error) {
        fallback();
        return;
      }
      clean();
      resolve(data.value);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fallback();
    };
    worker.postMessage(request);
  });
}

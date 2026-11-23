import { challengeFile } from './challenge-file.js';
import { portableFile } from './portable.js';
import { orderById } from './work-orders.js';
import { stamp, readStamp } from './fit-stamp.js';
import { recordSimulation } from './attempt-film.js';
import { raceBook, racePrefix } from './race-book.js';

export function raceRoute(machine, host, reply = null) {
  if (!orderById.has(machine.id)) return null;
  const first = stamp(machine, host),
    second = reply && stamp(machine, reply);
  if (!first || (reply && !second)) return null;
  return ['race', '1', machine.id, first, ...(reply ? [second] : [])].join('/');
}
export function readRace(M, route) {
  if (route.length > 120) return null;
  const [tag, version, id, first, second, ...extra] = route.split('/');
  const machine = orderById.get(id);
  if (tag !== 'race' || version !== '1' || !machine || extra.length || !first) return null;
  const proof = (token) => {
    const move = readStamp(machine, token);
    if (!move) return null;
    const { run, film } = recordSimulation(M, machine, move);
    return run.state === 'won' ? { move, film, tick: run.tick } : null;
  };
  const host = proof(first);
  if (!host) return null;
  const reply = second === undefined ? null : proof(second);
  if (second !== undefined && !reply) return null;
  return { machine, host, reply };
}
const time = (ticks) => (ticks / 60).toFixed(2) + ' s';
const score = (entry) => time(entry.tick) + ' · ' + (entry.move.second ? '2 parts' : '1 part');
function margin(host, reply) {
  const delta = reply.tick - host.tick;
  return delta === 0
    ? 'Same delivery time.'
    : (delta < 0 ? 'Reply' : 'Challenger') + ' arrived ' + time(Math.abs(delta)) + ' earlier.';
}
export function setupRace(el, films) {
  const panel = el('race-panel'),
    copy = el('race-copy'),
    compare = el('race-watch'),
    feedback = el('race-feedback'),
    manual = el('race-url');
  let machine, host, reply, earned;
  const portable = document.body.dataset.portable,
    offlineRace = portable?.startsWith('race/1/');
  const file=challengeFile(el('race-pack'),el('race-file'),el('race-file-status'),async()=>{
    const first=host?.move || earned?.move;
    if(!first)return null;
    const returned=Boolean(reply),name=(returned?'race-reply-':'race-invite-')+machine.id+'.html';
    const blob=await portableFile(machine,null,raceRoute(machine,first,reply?.move));
    return {blob,name,action:returned?'Save reply file':'Save challenge file',
      message:returned?'Both runs are in the file.':'Ready to play without a connection.'};
  });
  const book = raceBook(() => localStorage);
  function renderBook() {
    const list = el('race-list'),
      rows = book.recent().filter((row) => orderById.has(row.route.split('/')[2]));
    el('race-recent').hidden = !rows.length;
    list.replaceChildren(
      ...rows.map((row) => {
        const m = orderById.get(row.route.split('/')[2]);
        const a = document.createElement('a');
        a.href = '#' + row.route;
        a.textContent =
          m.title +
          ' · ' +
          { sent: 'Your invitation', opened: 'Open invitation', returned: 'Return replay' }[row.source];
        return a;
      }),
    );
  }
  function keep(route, source) {
    if (portable) return;
    book.keep(route, source);
    renderBook();
  }
  renderBook();
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key.startsWith(racePrefix)) renderBook();
  });
  el('race-pass').addEventListener('click', () => {
    const invite = raceRoute(machine, earned.move);
    keep(invite, 'sent');
    location.hash = invite;
  });
  function render() {
    const active = Boolean(machine?.contract) && (!portable || offlineRace);
    panel.hidden = !active;
    el('race-target').hidden = !host;
    if (!active) return;
    if (host)
      el('race-target').textContent = reply
        ? 'Returned challenge · ' + margin(host, reply)
        : 'Friend challenge · beat ' + time(host.tick);
    el('race-title').textContent = host ? 'Friend challenge' : 'Challenge a friend';
    el('race-score').textContent = host
      ? 'Challenger ' +
        score(host) +
        (reply
          ? ' / Reply ' + score(reply) + '. ' + margin(host, reply)
          : '. Make a delivery to reveal both routes.')
      : earned
        ? 'Your delivery ' + score(earned)
        : 'Make a delivery to set the time to beat.';
    compare.hidden = !reply;
    copy.hidden = !!portable;
    el('race-files').hidden = !(host || earned);
    el('race-pack').textContent = reply ? 'Prepare reply file' : 'Prepare challenge file';
    if (offlineRace && reply) el('race-files').open = true;
    el('race-pass').hidden = !!host || !earned;
    copy.disabled = !(host ? reply : earned);
    copy.textContent = host ? 'Copy reply link' : 'Copy challenge link';
  }
  function resetFeedback() {
    manual.hidden = true;
    manual.value = '';
    feedback.textContent = '';
  }
  copy.addEventListener('click', async () => {
    const route = raceRoute(machine, host?.move || earned.move, reply?.move);
    const url = new URL(location.href);
    url.hash = route;
    keep(route, host ? 'returned' : 'sent');
    const current = machine,
      first = host,
      second = reply,
      source = earned;
    const same = () => machine === current && first === host && second === reply && source === earned;
    resetFeedback();
    try {
      await navigator.clipboard.writeText(url.href);
      if (same())
        feedback.textContent = host
          ? 'Reply copied. The link opens both runs.'
          : 'Challenge copied. Your fittings stay hidden until a delivery.';
    } catch {
      if (!same()) return;
      feedback.textContent = 'Select and copy this link.';
      manual.hidden = false;
      manual.value = url.href;
      manual.focus();
      manual.select();
    }
  });
  function watchReturn() {
    if (host && reply) films.comparePair(reply.film, host.film, true);
  }
  compare.addEventListener('click', watchReturn);
  return {
    watchReturn,
    get blind() {
      return !!host && !reply;
    },
    useRecord(row) {
      if (!host && row) {
        file.clear();
        earned = row;
        resetFeedback();
        render();
      }
    },
    navigate(next, race, record) {
      file.clear();
      el('race-files').open = false;
      machine = next;
      host = race?.host;
      reply = race?.reply;
      earned = race ? null : record;
      if (host) keep(raceRoute(machine, host.move, reply?.move), reply ? 'returned' : 'opened');
      resetFeedback();
      render();
    },
    delivered(move, tick, film) {
      if (!machine?.contract || (portable && !offlineRace)) return;
      file.clear();
      // The live bench keeps animating after receipt. A race ends at delivery.
      earned = { move, tick, film: { ...film, frames: film.frames.slice(0, tick + 1) } };
      if (host) {
        reply = earned;
        const route = raceRoute(machine, host.move, reply.move);
        if (!portable) history.replaceState(null, '', '#' + route);
        keep(route, 'returned');
      }
      resetFeedback();
      render();
    },
  };
}

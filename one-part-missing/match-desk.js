import { challengeFile } from './challenge-file.js';
import { portableFile } from './portable.js';
import {
  cards,
  featuredCard,
  matchBook,
  matchRoute,
  matchPrefix,
  ruleNames,
  ruleText,
  scoreLine,
  compareScore,
} from './match-cards.js';
import { recordSimulation } from './attempt-film.js';

export function setupMatches(el, M, films) {
  const panel = el('match-panel'),
    nav = el('match-rounds'),
    summary = el('match-result');
  const book = matchBook(() => localStorage, M);
  let match = null,
    entries = [],
    revision = 0;
  const offline = Boolean(document.body.dataset.portable);
  const file = challengeFile(el('match-pack'), el('match-file'), el('match-file-status'), async () => {
    if (!match) return null;
    const mode = el('match-file-kind').value,
      own = entries
        .filter(Boolean)
        .map((e) => e.code)
        .join('~');
    const { card, returned, host, reply } = match;
    const route =
      mode === 'invite'
        ? matchRoute(card, 0, own)
        : mode === 'reply'
          ? matchRoute(card, 0, host, returned ? reply : own)
          : matchRoute(card, 0, host);
    const blob = await portableFile(card.rounds[0], null, route);
    return {
      blob,
      name: 'match-' + card.id + '-' + mode + '.html',
      action: 'Save card file',
      message:
        mode === 'reply'
          ? 'Three returned runs are ready to watch offline.'
          : 'Three blind rounds are ready to play offline.',
    };
  });
  el('match-file-kind').addEventListener('change', file.clear);
  const choose = el('match-select');
  for (const card of cards) choose.add(new Option(card.title, card.id));
  const today = featuredCard();
  choose.value = today.id;
  function selectedCard() {
    const card = cards.find((c) => c.id === choose.value);
    el('match-enter').href = '#' + matchRoute(card, 0);
    el('match-program').textContent = card.rounds.map((m) => m.title).join(' / ');
  }
  el('match-today').textContent = 'Today’s card · ' + today.title + ' →';
  el('match-today').href = '#' + matchRoute(today, 0);
  choose.addEventListener('change', selectedCard);
  selectedCard();
  function clearCopy() {
    revision++;
    el('match-url').value = '';
    el('match-url').hidden = true;
    el('match-feedback').textContent = '';
  }
  function render() {
    if (!match) return;
    const { card, round, opponent, returned, host } = match;
    entries = returned || card.rounds.map((_, i) => book.best(match, i));
    const guest = returned ? 'Reply' : 'You',
      rival = host === 'house' ? 'House' : 'Challenger';
    const done = entries.filter(Boolean).length;
    const roundWords = (entry) => scoreLine(card, round, entry);
    const standings = [0, 0, 0];
    for (const [i, entry] of entries.entries())
      if (entry) {
        const d = compareScore(card, i, entry, opponent[i]);
        standings[d < 0 ? 0 : d > 0 ? 1 : 2]++;
      }
    el('match-receipt').hidden = !entries[round];
    el('match-target').textContent = rival + ' · ' + roundWords(opponent[round]);
    el('match-personal').textContent = entries[round]
      ? guest + ' · ' + roundWords(entries[round])
      : 'Your delivery is open.';
    const verdict =
      standings[0] === standings[1]
        ? 'Card drawn'
        : standings[0] > standings[1]
          ? (returned ? 'Reply wins' : 'You win') + ' the card'
          : rival + ' wins the card';
    summary.textContent =
      (done === 3 ? verdict : done + ' of 3 delivered') +
      ' · ' +
      guest +
      ' ' +
      standings[0] +
      ' / ' +
      rival +
      ' ' +
      standings[1] +
      (standings[2] ? ' / ' + standings[2] + ' tied' : '');
    nav.replaceChildren(
      ...card.rounds.map((m, i) => {
        const a = document.createElement('a');
        a.href = '#' + matchRoute(card, i, host, match.reply);
        a.textContent = i + 1 + '. ' + m.title;
        if (i === round) a.setAttribute('aria-current', 'step');
        const small = document.createElement('small'),
          entry = entries[i];
        const d = entry ? compareScore(card, i, entry, opponent[i]) : null;
        small.textContent =
          ruleNames[i] +
          ' · ' +
          (entry ? (d === 0 ? 'Tied' : d < 0 ? guest + ' ahead' : rival + ' ahead') : 'Open');
        a.append(small);
        return a;
      }),
    );
    el('match-watch').hidden = !entries[round];
    el('match-share').hidden = done !== 3 || !!returned || offline;
    const kinds = el('match-file-kind'),
      old = kinds.value;
    const options = [['blank', 'Blank challenge']];
    if (!returned && done === 3) options.push(['invite', 'Challenge with my three runs']);
    if (returned || done === 3) options.push(['reply', 'Return with all six runs']);
    kinds.replaceChildren(...options.map(([v, label]) => new Option(label, v)));
    kinds.value = options.some(([v]) => v === old) ? old : returned ? 'reply' : 'blank';
    el('match-send').textContent = 'Challenge with my card';
    el('match-return').hidden = host === 'house';
    const next = el('match-next'),
      i = entries.findIndex((entry, i) => !entry && i !== round);
    next.hidden = !entries[round] || i < 0 || !!returned;
    if (!next.hidden) {
      next.href = '#' + matchRoute(card, i, host);
      next.textContent = 'Next round →';
      next.setAttribute('aria-label', 'Next round, ' + card.rounds[i].title);
    }
    const tryOwn = el('match-try');
    tryOwn.hidden = !returned;
    tryOwn.href = '#' + matchRoute(card, round, host);
  }
  async function share(returned) {
    if (!match || match.returned || !entries.every(Boolean)) return;
    clearCopy();
    const version = revision,
      own = entries.map((e) => e.code).join('~');
    const route = returned ? matchRoute(match.card, 0, match.host, own) : matchRoute(match.card, 0, own);
    const url = new URL(location.href);
    url.hash = route;
    try {
      await navigator.clipboard.writeText(url.href);
      if (revision === version)
        el('match-feedback').textContent = returned
          ? 'Return card copied. All three replays are enclosed.'
          : 'Challenge copied. Your three fittings stay hidden until each delivery.';
    } catch {
      if (revision !== version) return;
      const input = el('match-url');
      input.hidden = false;
      input.value = url.href;
      input.focus();
      input.select();
      el('match-feedback').textContent = 'Select and copy this card link.';
    }
  }
  el('match-send').addEventListener('click', () => share(false));
  el('match-return').addEventListener('click', () => share(true));
  el('match-watch').addEventListener('click', () => {
    if (!match || !entries[match.round]) return;
    const { round, opponent, card } = match,
      m = card.rounds[round];
    const runs = [entries[round], opponent[round]].map((e) => recordSimulation(M, m, e.move).film);
    const names = [
      match.returned ? 'Reply' : 'Your run',
      match.host === 'house' ? 'House' : 'Challenger',
    ];
    const delta = compareScore(card, round, entries[round], opponent[round]);
    const verdict =
      ruleNames[round] + ' · ' + (delta === 0 ? 'Round tied' : names[delta < 0 ? 0 : 1] + ' wins');
    films.comparePair(...runs, true, { title: card.title + ' · round ' + (round + 1), names, verdict });
  });
  window.addEventListener('storage', (event) => {
    if (match && !match.returned && (event.key === null || event.key.startsWith(matchPrefix))) {
      file.clear();
      clearCopy();
      render();
    }
  });
  return {
    get active() {
      return !!match;
    },
    get viewing() {
      return !!match?.returned;
    },
    get objective() {
      return match ? ruleText(match.card, match.round) : '';
    },
    navigate(next) {
      match = next;
      document.body.classList.toggle('in-match', !!next);
      el('match-receipt').hidden = true;
      file.clear();
      el('match-files').open = false;
      el('match-file-kind').replaceChildren();
      clearCopy();
      document.body.classList.toggle('returned-card', !!next?.returned);
      panel.hidden = !next;
      el('match-target').hidden = !next;
      if (next) {
        choose.value = next.card.id;
        selectedCard();
        render();
        el('match-sheet').open = !!next.returned;
      }
    },
    deliver(move) {
      if (!match || match.returned) return;
      book.keep(match, move);
      file.clear();
      clearCopy();
      render();
      el('match-sheet').open = true;
    },
  };
}

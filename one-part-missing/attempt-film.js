import { eventLine } from './tool-evidence.js';
import { pathReader, filmPaths } from './path-reader.js';
import { clipControls } from './clip-controls.js';
import { atFrame, draw, drawActors, snapshot } from './drawing.js';
import { parts, WIDTH, HEIGHT, fittings, createRun, advance } from './machines.js';

const clock = (t) => (t / 60).toFixed(2) + ' s';
export function recordAttempt(machine, run, move, frames) {
  const placed = fittings(machine, move);
  const label =
    placed
      .map(
        (f) =>
          String.fromCharCode(65 + f.socket) +
          ' · ' +
          parts[f.part].name +
          (f.flipped ? ' reversed' : ''),
      )
      .join(' + ') || 'Empty machine';
  const actors = Object.fromEntries(
    ['marble', 'cargo']
      .map((kind) => [kind, run.items.findIndex((it) => it.shape.kind === kind)])
      .filter(([, i]) => i >= 0),
  );
  return {
    machine: machine.id,
    key: JSON.stringify(placed),
    label,
    outcome: run.state === 'won' ? 'Repaired' : 'Missed',
    frames,
    // Only display metadata and positions belong in a comparison. The physics world can be collected.
    items: run.items.map((it) => ({ shape: it.shape })),
    uses: run.uses.map((u) => ({ ...u })),
    actors,
  };
}
export function recordSimulation(M,machine,move=null) {
  const run=createRun(M,machine,move),frames=[snapshot(run)];
  while(run.state==='running'){advance(M,run);frames.push(snapshot(run));}
  return {run,frames,film:recordAttempt(machine,run,move,frames)};
}
export function keepAttempts(history, next) {
  if (!history || next.machine !== history.latest.machine) return { latest: next, previous: null };
  return { latest: next, previous: history.latest.key === next.key ? history.previous : history.latest };
}
function gapAt(a, b, kind, t) {
  const ia = a.actors[kind],
    ib = b.actors[kind],
    ap = a.frames[Math.min(t, a.frames.length - 1)].poses[ia],
    bp = b.frames[Math.min(t, b.frames.length - 1)].poses[ib];
  const distance = Math.hypot(ap[0] - bp[0], ap[1] - bp[1]);
  if (a.items[ia].shape.flywheel) {
    const rim = 2 * a.items[ia].shape.r * Math.abs(Math.sin((ap[2] - bp[2]) / 2));
    return Math.max(distance, rim);
  }
  return distance;
}
function actorName(film, kind) {
  return kind === 'cargo'
    ? 'Parcel'
    : film.items[film.actors[kind]].shape.flywheel
      ? 'Input rim'
      : 'Marble';
}
export function compareAttempts(a, b) {
  const end = Math.min(a.frames.length, b.frames.length) - 1;
  let first = null;
  // Require a marble radius of separation for three successive physics steps.
  // This locates a visible change without promoting tiny numerical differences.
  for (let t = 0; t <= end - 2 && !first; t++) {
    for (const kind of ['marble', 'cargo']) {
      if (a.actors[kind] === undefined || b.actors[kind] === undefined) continue;
      const radius = a.items[a.actors[kind]].shape.r;
      if ([0, 1, 2].every((delta) => gapAt(a, b, kind, t + delta) >= radius)) {
        first = { tick: t, kind };
        break;
      }
    }
  }
  let contact = null;
  if (first) {
    for (const [whose, film, other] of [
      ['Latest', a, b],
      ['Previous', b, a],
    ]) {
      for (const u of film.uses) {
        if (
          u.tick > first.tick ||
          other.uses.some(
            (v) =>
              v.kind === u.kind &&
              v.actor === u.actor &&
              v.action === u.action &&
              Math.abs(v.tick - u.tick) <= 1,
          )
        )
          continue;
        if (!contact || u.tick > contact.tick) contact = { whose, kind: u.kind, tick: u.tick };
      }
    }
  }
  return { end, first, contact };
}
function drawTrails(c, attempt, t, previous) {
  for (const [kind, index] of Object.entries(attempt.actors)) {
    const jumps = new Set(
      attempt.uses
        .filter((u) => u.kind === 'portal' && (u.actor || 'marble') === kind)
        .map((u) => u.tick),
    );
    c.save();
    c.lineWidth = previous ? 2.5 : 2;
    c.lineJoin = 'round';
    c.strokeStyle = previous ? '#c3cfd9' : kind === 'cargo' ? '#82ccef' : '#ffc857';
    if (previous) c.setLineDash([5, 5]);
    const start = Math.max(0, t - 75);
    c.beginPath();
    for (let i = start; i <= t; i++) {
      const [x, y] = attempt.frames[i].poses[index];
      if (i === start || jumps.has(i)) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    if (previous) {
      const [x, y, heading] = attempt.frames[t].poses[index],
        r = attempt.items[index].shape.r + 2;
      c.beginPath();
      if (kind === 'cargo') {
        c.moveTo(x, y - r);
        c.lineTo(x + r, y);
        c.lineTo(x, y + r);
        c.lineTo(x - r, y);
        c.closePath();
      } else {
        c.arc(x, y, r, 0, Math.PI * 2);
        if (attempt.items[index].shape.flywheel) {
          c.moveTo(x, y);
          c.lineTo(x + r * Math.cos(heading), y + r * Math.sin(heading));
        }
      }
      c.stroke();
    }
    c.restore();
  }
}
export function setupFilms(el) {
  const modal = el('attempt-film'),
    open = el('compare-attempts'),
    range = el('compare-frame'),
    canvas = el('compare-diagram'),
    c = canvas.getContext('2d');
  let history = null,
    viewing = null,
    study = null,
    t = 0,
    raf = 0,
    origin = null;
  const path=pathReader(el('compare-path'),canvas,{frame:()=>t,seek:go,redraw:paint});
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    origin = null;
    el('compare-play').textContent = 'Play';
  };
  function scene(c, t, hardware) {
    const {latest,previous} = viewing, cursor = film => Math.min(t, film.frames.length - 1);
    draw(c, atFrame(hardware, hardware.frames[cursor(hardware)]), {showActors:false});
    c.save();
    c.setTransform(c.canvas.width/WIDTH,0,0,c.canvas.height/HEIGHT,0,0);
    drawTrails(c,latest,cursor(latest),false);
    drawActors(c,atFrame(latest,latest.frames[cursor(latest)]));
    drawTrails(c,previous,cursor(previous),true);
    c.restore();
  }
  const clips=clipControls(el('compare-clip'),()=>{
    if(!study || !viewing)return null;
    const {latest,previous,race}=viewing, first=study.first?.tick,
      a=latest.frames.length-1,b=previous.frames.length-1;
    const hardware=el('compare-hardware').value==='previous'?previous:latest;
    const names=viewing.names;
    const caption=t=>{
      if(viewing.observation){
        const row=viewing.observation.row;
        const events=[{kind:row.kind,tick:row.tick},...(row.partner?[{kind:row.partner,tick:row.partnerTick}]:[])];
        const active=events.filter(e=>t>=e.tick).sort((a,b)=>b.tick-a.tick)[0];
        return active?parts[active.kind].name+' acted at '+clock(active.tick)+'.':'Watch for the first working spare.';
      }
      if(viewing.card && t>=Math.max(a,b))return viewing.card.verdict;
      if(race && t>=Math.max(a,b))return a===b?'Both deliveries arrived together.':names[a<b?0:1]+' arrived '+clock(Math.abs(b-a))+' earlier.';
      if(race && t>=Math.min(a,b))return names[a<b?0:1]+' arrived. The other load is still in transit.';
      if(first!=null && t>=first)return 'Paths separate at '+clock(first)+'.';
      return race?'Both runs share one release clock.':'Two setups on the same machine.';
    };
    return {title:viewing.observation?.machine.title||el('machine-title').textContent,label:viewing.observation?'TOOL CONTACT':viewing.card?'MATCH CARD':race?'FRIEND CHALLENGE':'COMPARE SETUPS',
      filename:race?'challenge-'+latest.machine:'comparison-'+latest.machine.split('~')[0],
      end:study.end,highlights:[first,a,b],scene:(ctx,t)=>scene(ctx,t,hardware),caption,
      legend:race?[names[0]+' '+clock(a),names[1]+' '+clock(b)]:names};
  });
  function paint() {
    if (!study) return;
    const { latest, previous } = viewing,
      hardware = el('compare-hardware').value === 'previous' ? previous : latest;
    scene(c,t,hardware);
    path.draw(c,t);
    el('compare-time').value = clock(t);
    range.value = t;
    range.setAttribute('aria-valuetext', clock(t) + ', frame ' + t);
    const gaps = Object.keys(latest.actors).map(
      (kind) =>
        actorName(latest, kind) + ' ' + Math.round(gapAt(latest, previous, kind, t)) + ' units apart',
    );
    el('compare-distance').textContent = gaps.join(' · ');
    if (viewing.race) {
      el('compare-receipts').textContent = [latest, previous].map((film,i) =>
        viewing.names[i] + (t >= film.frames.length - 1 ? ' arrived' : ' in transit'),
      ).join(' · ');
    }
    el('compare-back').disabled = t === 0;
    el('compare-forward').disabled = t === study.end;
  }
  function go(frame) {
    stop();
    t = Math.max(0, Math.min(study.end, frame));
    paint();
  }
  function animate(now) {
    origin ??= now - (t * 1000) / 60;
    t = Math.min(study.end, Math.floor(((now - origin) * 60) / 1000 + 1e-5));
    paint();
    if (t < study.end) raf = requestAnimationFrame(animate);
    else stop();
  }
  function comparePair(latest, previous, race = false, card = null, observation = null) {
    if (!latest || !previous) return;
    clips.clear();
    const names = observation ? ['Your repair','Empty bench'] : card?.names || (race ? ['Reply','Challenger'] : ['Latest','Previous']);
    const [latestName,previousName] = names;
    viewing = { latest, previous, race, names, card, observation };
    path.ready(()=>[...filmPaths(latest,names[0]),...filmPaths(previous,names[1],true)].map(trace=>({...trace,points:trace.points.slice(0,study.end+1)})));
    el('compare-title').textContent = observation ? parts[observation.row.kind].name+' · '+observation.machine.title : card ? card.title : race ? 'Challenge replay' : 'Compare setups';
    el('compare-finishes').hidden = !race;
    const options = el('compare-hardware').options;
    options[0].textContent = latestName + ' setup';
    options[1].textContent = previousName + ' setup';
    study = compareAttempts(latest, previous);
    if (observation) study.contact={whose:'Latest',kind:observation.row.kind,tick:observation.row.tick};
    if (race || observation) study.end = Math.max(latest.frames.length, previous.frames.length) - 1;
    const { first, end } = study;
    range.max = end;
    el('compare-change').disabled = !first;
    el('compare-findings').textContent = first
      ? 'The ' +
        actorName(latest, first.kind).toLowerCase() +
        ' separates by one radius at ' +
        clock(first.tick) +
        '.'
      : 'The paths stay within one radius for the shared recording.';
    if(observation)el('compare-findings').textContent=eventLine(observation.row);
    if(card)el('compare-findings').textContent += ' ' + card.verdict + '.';
    const partner=observation?.row.partner;
    el('compare-partner').hidden=!partner;
    if(partner)el('compare-partner').textContent=parts[partner].name+' contact · '+clock(observation.row.partnerTick);
    el('compare-contact').hidden = !study.contact;
    if (study.contact) {
      const u = study.contact;
      el('compare-contact').textContent =
        (u.whose === 'Latest' ? latestName : previousName) + ' tool contact · ' + parts[u.kind].name + ' · ' + clock(u.tick);
    }
    el('compare-overlap').textContent = (observation ? 'Recorded interval · ' : race ? 'Both deliveries · ' : 'Shared recording · ') + clock(end);
    if (race) {
      el('compare-reply-arrival').textContent = latestName + ' arrival · ' + clock(latest.frames.length - 1);
      el('compare-host-arrival').textContent = previousName + ' arrival · ' + clock(previous.frames.length - 1);
    }
    el('compare-latest').textContent =
      latestName + ' · ' + latest.label + ' · ' + latest.outcome;
    el('compare-previous').textContent =
      previousName + ' · ' + previous.label + ' · ' + previous.outcome;
    el('compare-hardware').value = 'latest';
    modal.showModal();
    go(observation?.row.tick ?? first?.tick ?? 0);
    el('compare-close').focus({ preventScroll: true });
  }
  open.addEventListener('click', () => comparePair(history?.latest, history?.previous));
  el('compare-reply-arrival').addEventListener('click', () => go(viewing.latest.frames.length - 1));
  el('compare-host-arrival').addEventListener('click', () => go(viewing.previous.frames.length - 1));
  range.addEventListener('input', () => go(Number(range.value)));
  el('compare-hardware').addEventListener('change', paint);
  el('compare-back').addEventListener('click', () => go(t - 1));
  el('compare-forward').addEventListener('click', () => go(t + 1));
  el('compare-contact').addEventListener('click', () => go(study.contact.tick));
  el('compare-partner').addEventListener('click',()=>go(viewing.observation.row.partnerTick));
  el('compare-change').addEventListener('click', () => go(study.first.tick));
  el('compare-play').addEventListener('click', () => {
    if (raf) {
      stop();
      return;
    }
    if (t === study.end) t = 0;
    el('compare-play').textContent = 'Pause';
    raf = requestAnimationFrame(animate);
  });
  el('compare-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    path.clear();
    clips.clear();
    stop();
    const opener=viewing?.observation?.opener;
    study = null;
    viewing = null;
    if(opener?.isConnected)opener.focus({preventScroll:true});
  });
  return {
    comparePair,
    add(machine, run, move, tape) {
      history = keepAttempts(history, recordAttempt(machine, run, move, tape));
      open.hidden = !history.previous;
      return history.latest;
    },
    clear() {
      if (modal.open) modal.close();
      history = null;
      study = null;
      open.hidden = true;
    },
    duringRun(busy) {
      open.disabled = busy;
    },
  };
}

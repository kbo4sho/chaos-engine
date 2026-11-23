import { parts } from './machines.js';

// Read contacts from the actual fitted bodies. A fixed station with the same
// kind must never earn a mark for a spare, including during film inspection.
export function setupFittingLedger(el,inspect){
 const panel=el('fitting-events');let shown='',current=null,entries=[];
 return {draw(run,tick,finished){
  if(current!==run){current=run;shown='';entries=run.items.flatMap((it,i)=>it.shape.fitted?[{kind:it.shape.kind,item:i}]:[]);}
  const contacts=entries.map(row=>run.uses.find(e=>e.item===row.item&&e.tick<=tick));
  const key=String(finished)+'/'+contacts.map(e=>e?e.tick:'-').join(',');
  if(key===shown)return;shown=key;
  if(!entries.length){panel.textContent='Fit a spare to trace its first contact.';return;}
  panel.replaceChildren(...entries.map((row,i)=>{
    const e=contacts[i],b=document.createElement('button');
    b.type='button';b.className='quiet'+(e?' acted':'');b.disabled=!finished||!e;
    b.textContent=parts[row.kind].name+' · '+(e?(e.tick/60).toFixed(2)+' s':'Waiting');
    if(e){b.title='First contact with '+(e.actor==='cargo'?'the blue parcel':'the gold marble');b.addEventListener('click',()=>inspect(e.tick));}
    return b;
  }));
 }};
}

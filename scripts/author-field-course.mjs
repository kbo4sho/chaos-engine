// Place service stations on the actual evolving route. A plate is retained only
// when every station matters, the empty machine misses and the drawer is unique.
import fs from 'node:fs';
import M from 'matter-js';
import {parts,createRun,advance,trial} from '../one-part-missing/machines.js';
import {fieldParts,electrode} from '../one-part-missing/fields.js';
import {dist,inside,of,g,trace} from './lib/station-traces.mjs';
const stock=[
 'pulse','swirl','lift','gyro','phase','positive','negative','positive ground','swirl','pulse',
 'pulse swirl','lift ground','positive ground','negative swirl','gyro phase','phase pulse','lift bank','swirl gyro','positive negative','lift unload',
 'positive','negative','positive ground','negative positive','positive swirl','negative bank','positive lift','negative phase','positive pulse','negative ground swirl',
 'phase swirl','positive ground pulse','gyro lift','swirl bank phase','positive ground swirl','negative pulse lift','phase gyro bank','positive negative swirl','negative ground phase','positive ground swirl phase'
];
function build(i,salt=0){
 let seed=Math.imul(281723,i+1)+salt*42983;
 const random=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
 const n=(a,b)=>a+Math.floor(random()*(b-a+1)),pick=xs=>xs[n(0,xs.length-1)],shuffle=xs=>{const a=[...xs];for(let j=a.length-1;j>0;j--){const k=n(0,j);[a[j],a[k]]=[a[k],a[j]];}return a;};
 const line=stock[i].split(' '),dual=i>=20&&i<30,parcel=[30,31,34,35,38,39].includes(i),actor=parcel?'cargo':'marble';
 const counters=Array(7).fill(0);
 for(let attempt=0;attempt<2600;attempt++){
  const dir=random()<.78?1:-1,launch={kind:actor,r:n(8,12),x:dir>0?n(63,150):n(566,648),y:n(55,133),vx:dir*n(29,57)/10,vy:n(-23,19)/10,a:(dir===1?0:Math.PI)+n(-80,80)/100,spin:n(-16,18)/120};
  if(parcel){launch.y=54;launch.vx=0;launch.vy=0;launch.spin=0;}
  const ball=parcel?{kind:'marble',x:dir>0?590:130,y:40,r:9,vx:.4*dir}:launch;
  const fixtures=[],stages=[];
  if(parcel)fixtures.push(of('switch',{x:ball.x+dir*8,y:n(91,110)}),of('hatch',{x:launch.x,y:launch.y+launch.r+5,dir}),launch,of('conveyor',{x:launch.x+dir*37,y:132,dir}));
  if(dual){fixtures.push({kind:'cargo',r:n(10,15),x:launch.x+dir*n(73,125),y:launch.y+n(-5,63),vx:dir*n(-31,25)/10,vy:n(-13,4)/10,sign:i%3===1?1:-1});}
  if(line[0]==='ground'||(line.includes('ground')&&!line.includes('positive')&&!line.includes('negative')))launch.sign=1;
  if(line.includes('gyro'))fixtures.push(of('thruster',{x:launch.x,y:launch.y}));
  let board={ball,fixtures,sockets:[],tray:[],goals:[g({x:1700,y:1500},actor)]};
  let result=trace(board,actor),last=parcel?(result.uses.find(e=>e.kind==='conveyor'&&e.actor===actor)?.tick??30):0;
  const hasCharge=line.some(k=>['positive','negative','ground'].includes(k));
  if(hasCharge&&!dual){
   const ref=result.points[Math.min(result.points.length-1,last+n(13,25))];
   const x=Math.max(30,Math.min(680,ref.x+dir*n(34,96))),y=Math.max(35,Math.min(345,ref.y+n(-74,65)));
   fixtures.push(electrode(Math.round(x),Math.round(y),random()<.5?1:-1));result=trace(board,actor);
  }
  for(const [j,k] of line.entries()){
   const choices=shuffle(result.points.filter(p=>inside(p)&&p.t>last+(j?6:2)&&p.t<last+(j?45:48)&&p.y>45&&p.y<305&&Math.hypot(p.vx,p.vy)>1.3&&stages.every(st=>dist(st,p)>54)));
   let placed=false;
   for(const p of choices.slice(0,20)){
    const st=of(k,{x:Math.round(p.x+n(-6,6)),y:Math.round(p.y+n(-6,6)),dir:random()<.5?1:-1}),extra=[];
    if(k==='phase'){
     const q=result.points[Math.min(result.points.length-1,p.t+n(4,9))];if(!inside(q))continue;
     extra.push({kind:'rail',x:Math.round(q.x),y:Math.round(q.y),w:n(75,130),h:n(7,11),a:Math.atan2(q.vy,q.vx)+Math.PI/2});
    }
    const baseline=extra.length?trace({...board,fixtures:[...fixtures,...extra]},actor):result;
    const next=trace({...board,fixtures:[...fixtures,...extra,st]},actor);
    const seen=next.uses.find(e=>e.kind===k&&e.actor===actor&&e.tick>last);
    if(!seen||stages.some(s=>!next.uses.some(e=>e.kind===s.kind&&e.actor===actor)))continue;
    if(!next.points.some(q=>q.t>seen.tick+2&&inside(q)&&baseline.points[q.t]&&dist(q,baseline.points[q.t])>13))continue;
    fixtures.push(...extra,st);stages.push(st);last=seen.tick;result=next;placed=true;break;
   }
   if(!placed)break;
  }
  if(stages.length!==line.length)continue;counters[0]++;
  const removed=i<8?stages.at(-1):pick(stages),mount={x:removed.x,y:removed.y,dir:removed.dir};
  const count=i<8?2:i<30?3:4,sockets=[mount];for(let z=0;z<40&&sockets.length<count;z++){const v={x:n(62,658),y:n(55,320),dir:random()<.5?1:-1};if(sockets.every(s=>dist(s,v)>66)&&stages.every(s=>dist(s,v)>43))sockets.push(v);}
  if(sockets.length<count)continue;
  const other=shuffle((i<5?['trampoline','syrup','fan','pulse','lift']:Object.keys(fieldParts).concat('bank','thruster','keel','fan','trampoline')).filter(k=>k!==removed.kind));
  board={...board,fixtures:fixtures.filter(s=>s!==removed),sockets:shuffle(sockets),tray:shuffle([removed.kind,...other.slice(0,i<5?1:i<30?2:3)])};
  const fit={part:removed.kind,socket:board.sockets.indexOf(mount)};
  const targets=shuffle(result.points.filter(q=>inside(q)&&q.t>last+7&&q.t<last+85&&dist(q,launch)>55&&stages.every(s=>dist(q,s)>29)));
  for(const q of targets.slice(0,20)){
   const goals=[g(q,actor)];if(i>=12){const before=result.points.filter(p=>p.t>9&&p.t<q.t-8&&inside(p)&&dist(p,q)>65&&dist(p,launch)>40);if(before.length)goals.unshift(g(pick(before),actor,'chime'));}
   const m={...board,goals},win=(move,offset=0,board=m)=>trial(M,board,move,offset).state==='won';
   if(i>=30&&i%2===1){const r=trial(M,m,fit);if(r.state!=='won')continue;goals.at(-1).window={start:Math.max(0,r.tick-3),duration:8,period:153};}
   if(!win(fit)||win(null))continue;counters[1]++;
   const r=createRun(M,m,fit);while(r.state==='running')advance(M,r);
   if(line.some(k=>!r.uses.some(u=>u.kind===k&&u.actor===actor)))continue;
   const active=m.fixtures.filter(s=>parts[s.kind]);
   if(active.some(s=>!r.uses.some(u=>u.item===r.items.findIndex(it=>it.shape===s))||win(fit,0,{...m,fixtures:m.fixtures.map(f=>s===f?{...f,disabled:true}:f)})))continue;counters[2]++;
   if(dual&&win(fit,0,{...m,fixtures:m.fixtures.map(s=>s.kind==='cargo'?{...s,sign:0}:s)}))continue;
   if(hasCharge&&!dual&&win(fit,0,{...m,fixtures:m.fixtures.filter(s=>s.kind!=='electrode')}))continue;
   if([-3,-2,-1,1,2,3].some(o=>!win(fit,o)||win(null,o)))continue;counters[3]++;
   if(m.tray.some(part=>m.sockets.some((_,socket)=>(part!==fit.part||socket!==fit.socket)&&[0,-2,2,-3,3,-1,1].some(o=>win({part,socket},o)))))continue;
   return {board:m,fit,tick:r.tick,uses:r.uses.map(u=>[u.kind,u.action,u.actor,u.tick]),attempt};
  }
 }
 throw Error('No field plate '+i+' '+counters.join('/'));
}
const [start='0',end='40',dir,salt='0']=process.argv.slice(2),rows=[];if(dir)fs.mkdirSync(dir,{recursive:true});
for(let i=+start;i<+end;i++){const r=build(i,+salt);rows.push(r.board);if(dir)fs.writeFileSync(dir+'/'+i+'.json',JSON.stringify(r));console.log(i,r.fit,r.tick,r.uses.map(e=>e[0]),r.attempt);}
if(!dir&&rows.length===40)fs.writeFileSync(new URL('../one-part-missing/field-boards.js',import.meta.url),'// Generated by scripts/author-field-course.mjs.\nexport const fieldBoards = [\n'+rows.map(r=>'  '+JSON.stringify(r)+',').join('\n')+'\n];\n');

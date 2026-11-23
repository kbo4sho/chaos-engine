// Contact plates operate on the moving Matter body. Electric pairs use one
// equal-and-opposite force, including when both poles are free to travel.
export const fieldParts={
 pulse:{name:'Pulse coil',description:'Kick away from the center of the coil'},
 swirl:{name:'Swirl coil',description:'Kick tangent to the coil’s radius'},
 lift:{name:'Lift harness',description:'Reverse the pull of gravity while the harness is attached'},
 gyro:{name:'Gyroscope',description:'Steer the body back to its nearest quarter-turn heading'},
 phase:{name:'Phase gate',description:'Pass through solid surfaces for a short interval'},
 positive:{name:'Positive terminal',description:'Give the load a positive electric charge'},
 negative:{name:'Negative terminal',description:'Give the load a negative electric charge'},
 ground:{name:'Grounding brush',description:'Remove the load’s charge and release it from the electric field'},
};
for(const [kind,part] of Object.entries(fieldParts))part.shape={kind,r:18,field:true};
export const electrode=(x,y,sign)=>({kind:'electrode',x,y,sign,r:10,field:true});
export const fieldGear={lift:32,gyro:64};
export const phaseFrames=21;
function fieldKick(M,b,mount,kind,dir) {
 const dx=b.position.x-mount.x,dy=b.position.y-mount.y,d=Math.hypot(dx,dy),rx=d>.001?dx/d:kind==='swirl'?1:0,ry=d>.001?dy/d:kind==='swirl'?0:-1;
 const impulse=11*(1-d/83)**2,turn=dir===-1?-1:1;
 M.Body.setVelocity(b,{x:b.velocity.x+impulse*(kind==='swirl'?-ry*turn:rx),y:b.velocity.y+impulse*(kind==='swirl'?rx*turn:ry)});
}
export function fieldPair(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
 if(!a.sign||!b.sign||d<=16||d>=240)return null;
 const strength=.0016*(1-d/240)**2*(a.sign===b.sign?-1:1);
 return {x:dx/d*strength,y:dy/d*strength};
}
export function fieldState(body){return {charge:body.render.fieldCharge||0,phase:body.render.phaseFrames||0};}
export function installFields(M,engine,getScene,onUse){
 let previous,stations=[],poles=[];
 M.Events.on(engine,'beforeUpdate',()=>{
  const scene=getScene();if(scene.tools!==previous){previous=scene.tools;stations=previous.filter(s=>fieldParts[s.shape.kind]&&!s.shape.disabled);poles=previous.filter(s=>s.shape.kind==='electrode');}
  if(!stations.length&&!poles.length&&!scene.marbles.some(b=>b.render.phaseFrames||b.render.fieldCharge))return;
  const charged=poles.map(p=>({x:p.body.position.x,y:p.body.position.y,sign:p.shape.sign,body:p.body}));
  for(const body of scene.marbles){
   if(body.isStatic||body.isSensor)continue;
   const v=body.render;
   if(v.phaseFrames>0&&--v.phaseFrames===0){
    body.collisionFilter.mask=v.phaseBaseMask??0xffffffff;body.collisionFilter.group=v.phaseBaseGroup??0;
    delete v.phaseBaseMask;delete v.phaseBaseGroup;
   }
   const already=v.fieldContacts||[],now=[];
   for(const st of stations){
    const s=st.shape,k=s.kind,id=k+'/'+s.x+'/'+s.y;
    if(Math.hypot(body.position.x-st.body.position.x,body.position.y-st.body.position.y)>s.r+(body.circleRadius||10)*.5)continue;
    now.push(id);if(already.includes(id))continue;
    let action;
    if(k==='swirl'||k==='pulse'){fieldKick(M,body,st.body.position,k,s.dir);action=k==='swirl'?'turned':'pulsed';}
    else if(k==='lift'||k==='gyro'){if((v.gearMask||0)&fieldGear[k])continue;v.gearMask=(v.gearMask||0)|fieldGear[k];if(k==='gyro')v.gyroHeading=Math.round(body.angle/(Math.PI/2))*Math.PI/2;action='attached';}
    else if(k==='phase'){
     if(!v.phaseFrames){v.phaseBaseMask=body.collisionFilter.mask;v.phaseBaseGroup=body.collisionFilter.group;}
     body.collisionFilter.mask=0;body.collisionFilter.group=0;v.phaseFrames=phaseFrames;action='phased';
    }else{
     const sign=k==='positive'?1:k==='negative'?-1:0;
     if((v.fieldCharge||0)===sign)continue;v.fieldCharge=sign;action=sign?'charged':'grounded';
    }
    onUse?.(st,body,action);
   }
   if(now.length)v.fieldContacts=now;else if(already.length)delete v.fieldContacts;
   if(v.fieldCharge)charged.push({x:body.position.x,y:body.position.y,sign:v.fieldCharge,body});
  }
  for(let i=0;i<charged.length;i++)for(let j=i+1;j<charged.length;j++){
   const a=charged[i],b=charged[j];if(a.body.isStatic&&b.body.isStatic)continue;
   const force=fieldPair(a,b);if(!force)continue;
   if(!a.body.isStatic)M.Body.applyForce(a.body,a.body.position,force);
   if(!b.body.isStatic)M.Body.applyForce(b.body,b.body.position,{x:-force.x,y:-force.y});
  }
 });
}

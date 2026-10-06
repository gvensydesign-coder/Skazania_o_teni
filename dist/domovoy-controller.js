// Imported animations are in place; movement uses the same navigation as Vlad.
window.createDomovoyController=(T,root,gltf,api)=>{
 const mixer=new T.AnimationMixer(gltf.scene),actions={};
 for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
 const home={x:8,z:4},forest={x:14,z:51},patrol=[{x:6,z:3},{x:8,z:1},{x:10,z:3},home];
 let owner,current,route=[],goal=null,mode='',version=0,pending=false,wait=0,index=0,revision=-1;
 const scale=api.scale||1;
 function play(name){const next=actions[name]||actions.Idle;if(!next||next===current)return;next.reset().setLoop(T.LoopRepeat,Infinity).play();if(current)current.crossFadeTo(next,.25,false);current=next}
 function night(s){return s.ui.sceneTime==='night'||['combat','defeat','waveDialogue'].includes(s.phase)}
 function cancel(){version++;pending=false;route=[]}
 async function plan(target){goal=target;const request=++version;pending=true;route=[];const path=await api.navigation.findPath(root.position,target,true,()=>request!==version);if(request!==version)return;pending=false;if(path&&path.length){route=path;goal=path.target||path[path.length-1]}else wait=2}
 function save(s){s.domovoy.scene={x:root.position.x,z:root.position.z,rotation:root.rotation.y,hidden:!root.visible}}
 function reset(s){cancel();owner=s;mode='';goal=null;wait=0;const p=s.domovoy.scene;root.position.set(p?.x??home.x,api.navigation.height(p?.x??home.x,p?.z??home.z),p?.z??home.z);root.rotation.y=p?.rotation||0;root.visible=!p?.hidden;revision=api.navigation.revision()}
 function tick(dt){const s=api.state();if(owner!==s)reset(s);if(s.screen!=='game')return;
 const next=night(s)?'leave':!root.visible||mode==='leave'||mode==='hidden'||mode==='return'?'return':'patrol';
 if(next!==mode&&mode!=='hidden'){cancel();mode=next;wait=0;root.visible=true;goal=null}
 if(mode==='hidden'){if(!night(s)){mode='return';root.visible=true;goal=null}else return}
 if(api.navigation.revision()!==revision){revision=api.navigation.revision();cancel();wait=.2;goal=null}
 // Keep the merchant still while the player interacts with him.
 if(s.ui.openModal||s.ui.placing||s.ui.oakEncounterActive){play(s.ui.openModal?.type==='domovoyTrade'?'Talk':'Idle');mixer.update(dt);return}
 if(mode==='patrol'&&api.near()){play('Beckon');mixer.update(dt);return}
 if(wait>0){wait-=dt;play('Idle');mixer.update(dt);return}
 if(!route.length&&!pending){if(goal){const distance=Math.hypot(root.position.x-goal.x,root.position.z-goal.z);if(distance<1){if(mode==='leave'){root.visible=false;mode='hidden';save(s);return}if(mode==='return'){mode='patrol';index=0}if(mode==='patrol'){index=(index+1)%patrol.length;wait=2.5;goal=null;save(s);return}}}plan(mode==='leave'?forest:mode==='return'?home:patrol[index])}
 const point=route[0];if(point){const dx=point.x-root.position.x,dz=point.z-root.position.z,distance=Math.hypot(dx,dz),speed=(mode==='leave'?.7:.625)*scale,step=Math.min(distance,speed*dt);const x=root.position.x+dx/(distance||1)*step,z=root.position.z+dz/(distance||1)*step;
 if(api.navigation.walkable(x,z,root.position.y,root.position.x,root.position.z)){root.position.set(x,api.navigation.height(x,z,root.position.y),z);const angle=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(angle-root.rotation.y),Math.cos(angle-root.rotation.y));root.rotation.y+=delta*Math.min(1,dt*9);play('Walk');if(current)current.timeScale=speed/(.625*scale);if(distance<=step+.01)route.shift()}else{cancel();goal=null;wait=.5;play('Idle')}}else play('Idle');
 const info=root.userData.villageObject;info.x=root.position.x;info.z=root.position.z;mixer.update(dt);save(s)
 }
 play('Idle');return {tick,available:()=>root.visible&&!night(api.state())&&mode==='patrol'};
};

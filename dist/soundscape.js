/* User supplied music and sound pack; decoded OGG with MP3 fallback. */
window.storyAudio=(()=>{
 let ctx,master,music,effects,state,unlocked=false,pending=false,track,modeKey,sceneKey,sceneGain,ambientGain,ambientTimer,ambientKey,duckTimer,ducked=false,trackGeneration=0,gameTrack=0;
 const buffers=new Map(),asset=(name,isMusic)=>`audio/${isMusic?'muzyka':'zvuki'}/${name}`;
 const musicalLevels={'novel-part-1':1,'vlad-flashback':1,'menu-title':.5,izba:1,svirel:.95,pryalka:.8,pogost:1.3,horovod:.7};
 function fade(node,value,time=.3){if(!node)return;if(node.gain.cancelAndHoldAtTime)node.gain.cancelAndHoldAtTime(ctx.currentTime);else{const held=node.gain.value;node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setValueAtTime(held,ctx.currentTime)}node.gain.setTargetAtTime(value,ctx.currentTime,time)}
 async function buffer(name,isMusic=false){const key=asset(name,isMusic);if(!buffers.has(key))buffers.set(key,(async()=>{for(const ext of ['ogg','mp3'])try{const r=await fetch(`${key}.${ext}`);if(!r.ok)continue;return await ctx.decodeAudioData(await r.arrayBuffer())}catch{}return null})());return buffers.get(key)}
 function levels(){if(!ctx||!state)return;fade(master,document.hidden||state.settings.muted?0:(state.settings.master??80)/100,.2);fade(music,(state.settings.music??65)/100*(ducked?.55:1));fade(effects,(state.settings.effects??75)/100)}
 function duck(){ducked=true;clearTimeout(duckTimer);levels();duckTimer=setTimeout(()=>{ducked=false;levels()},5000)}
 // Scene buses own their sources, including delayed cues and pending decodes.
 function soundBus(){const bus=ctx.createGain();bus.sources=new Set();bus.retired=false;bus.gain.value=0;bus.connect(effects);fade(bus,1,.3);return bus}
 function retireBus(bus){if(!bus||bus.retired)return;bus.retired=true;fade(bus,0,.4);const end=ctx.currentTime+2.4;for(const source of bus.sources)try{source.stop(end)}catch{}setTimeout(()=>bus.disconnect(),2600)}
 async function effect(name,{bus=effects,level=1,delay=0,rate=1}={}){
  if(!ctx||document.hidden||bus.retired)return;const b=await buffer(name);if(!b||document.hidden||bus.retired)return;
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;source.playbackRate.value=rate;
  const start=ctx.currentTime+delay,duration=b.duration/rate,soft=bus!==effects;
  if(soft){const attack=Math.min(/bells|dogs|ryk|shepot/.test(name)?.65:.35,duration*.25),release=Math.min(.8,duration*.3);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);gain.gain.setValueAtTime(level,start+duration-release);gain.gain.linearRampToValueAtTime(0,start+duration)}else gain.gain.value=level;
  source.connect(gain).connect(bus);bus.sources?.add(source);source.onended=()=>{bus.sources?.delete(source);source.disconnect();gain.disconnect()};source.start(start);return source;
 }
 function getMode(s){if(s.screen==='exit')return 'silent';if(s.screen==='loading'||s.screen==='menu'||(s.screen==='settings'&&!s.ui.sessionStarted))return 'menu';if(s.phase==='combat')return 'story';if(s.screen==='novel'&&(s.ui.oakActive||s.ui.waveTalk))return 'game';if(s.screen==='novel'&&s.defense?.stage==='dialogue')return 'story';if(s.screen==='novel')return s.ui.memoryActive?'memory':'novel';if(['prologue','chapter','death'].includes(s.screen))return 'story';if(['atlas','threads','scout'].includes(s.screen)){const place=s.ui.mapSelection;return place==='cemetery'||place==='pogost'||place==='ruins'?'pogost':place==='swamp'||place==='marsh'?'swamp':'game'}return 'game'}
 async function startTrack(mode){const generation=++trackGeneration;const names={memory:'vlad-flashback',novel:'novel-part-1',menu:'menu-title',story:'izba',dawn:'svirel',pogost:'pogost',swamp:'svirel',game:['pryalka','svirel','horovod','izba'][gameTrack%4]};
  if(track){const old=track;old.source.onended=null;fade(old.gain,0,.7);setTimeout(()=>{try{old.source.stop()}catch{}old.gain.disconnect()},4500);track=null}
  if(mode==='silent')return;const name=names[mode],b=await buffer(name,true);if(!b||generation!==trackGeneration)return;
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;source.loop=true;gain.gain.value=0;source.connect(gain).connect(music);source.start();fade(gain,musicalLevels[name],.8);track={source,gain};
  source.onended=()=>{source.disconnect();gain.disconnect();if(generation===trackGeneration&&mode==='game'){track=null;gameTrack++;startTrack(mode)}};
 }
 function ambience(s){const memory=s.screen==='novel'&&s.ui.memoryActive?window.CHURCH_MEMORY[s.ui.novelIndex]:null;const key=s.ui.oakActive||s.ui.waveTalk||s.defense?.stage==='dialogue'?'none':memory?memory.ambience||'none':s.screen==='loading'?'fire':s.screen==='prologue'&&[2,3].includes(s.ui.prologueIndex)?'forest':s.screen==='novel'&&s.ui.novelIndex<17?'night':s.screen==='exit'||!['menu','novel','prologue','chapter','death'].includes(s.screen)?'none':'wind';if(key===ambientKey)return;ambientKey=key;clearInterval(ambientTimer);
  retireBus(ambientGain);ambientGain=soundBus();const bus=ambientGain;let step=0;
  const play=()=>{if(document.hidden)return;
   if(key==='fire')effect('fire-new',{bus,level:.45});
   if(key==='night')effect('rain-thunder-new',{bus,level:.55});
   if(key==='forest')effect('forest-new',{bus,level:.45});
   if(key==='wind')effect('wind-new',{bus,level:.22});
  };
  if(key!=='none'){play();ambientTimer=setInterval(play,15000)}
 }
 function scenes(s){const key=s.screen+':'+(s.defense?.stage==='dialogue'?'wave:'+s.defense.wave+':':s.ui.waveTalk?'wave-talk:'+s.ui.waveTalk.id+':':s.ui.memoryActive?'memory:':s.ui.oakActive?'oak:'+s.ui.oakMode+':':'opening:')+(s.screen==='novel'?s.ui.novelIndex:s.screen==='prologue'?s.ui.prologueIndex:'')+':'+(s.ui.openModal?.type==='night'?s.day:'');if(key===sceneKey)return;sceneKey=key;
  retireBus(sceneGain);sceneGain=soundBus();const bus=sceneGain,cue=(name,delay=0,level=1)=>effect(name,{bus,delay,level});let hasCue=false;
  const play=(name,delay=0,level=1)=>{hasCue=true;cue(name,delay,level)};
  if(s.screen==='prologue'){if(s.ui.prologueIndex===1)play('bells-calm-new');if(s.ui.prologueIndex===3)play('wind-new',0,.8);if(s.ui.prologueIndex===4)play('dogs-new',0,.85)}
  if(s.screen==='novel'&&s.ui.oakActive&&s.ui.oakMode==='first'){const line=window.OAK_FIRST_LINES[s.ui.novelIndex];for(const cue of line?.cues||[])play(cue.name,cue.delay,cue.level)}
  if(s.screen==='novel'&&s.ui.memoryActive){const line=window.CHURCH_MEMORY[s.ui.novelIndex];for(const cue of line.cues||[])play(cue.name,cue.delay,cue.level)}
  if(s.screen==='novel'&&!s.ui.memoryActive&&!s.ui.oakActive&&!s.ui.waveTalk&&s.defense?.stage!=='dialogue'){const n=s.ui.novelIndex;
   if(n===2)play('dogs-new',0,1.1);
   if(n===5)play('knock-new',0,1.25); // The supplied recording contains the knock sequence.
   if(n===8){play('door-new',0,1.1);play('pol_shagi',1)}
   if(n===10){play('fight-new',0,1);play('door-new',.5,.65)}
   if(n===11)play('door-new',.3,.45);if(n===12){play('pol_shagi',0,.85);play('pol_tyazhelo',1.3,.7)}if(n===13){play('pol_shag',.2,.65);play('door-new',1,.45)}
   if(n===14){play('ryk',0,1.1);play('bells-alarm-new',1,.65)}if(n===15){play('pol_shagi');play('door-new',.5,.9)}
   if(n===16)play('ryk',0,.55);if(n===17)play('bells-calm-new',0,1.1);
   if(n===25||n===26)play('sneg',0,.75);
  }
  if(s.ui.openModal?.type==='night'){const n=(s.day-1)%3;play(['tsep','door-new','ryk'][n])}
  if(hasCue)duck();
 }
 function sync(s){state=s;if(!ctx)return;levels();const mode=getMode(s);if(mode!==modeKey){modeKey=mode;startTrack(mode)}ambience(s);if(!document.hidden)scenes(s)}
 async function unlock(){if(unlocked||pending)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;pending=true;try{ctx=new C();master=ctx.createGain();music=ctx.createGain();effects=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=5;master.connect(limiter).connect(ctx.destination);music.connect(master);effects.connect(master);master.gain.value=0;await ctx.resume();unlocked=true;if(state)sync(state)}catch{}finally{pending=false}}
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden){levels();clearInterval(ambientTimer);ambientKey=null;ctx.suspend().catch(()=>{})}else ctx.resume().then(()=>{if(state)sync(state)}).catch(()=>{})});
 let lastHover=0;
 let lastCombatSound=0;return {sync,combat:kind=>{if(Date.now()-lastCombatSound<180)return;lastCombatSound=Date.now();effect(kind==='hit'?'fight-new':'pol_tyazhelo',{level:kind==='hit'?.55:.65})},ui:()=>effect('klik',{level:.7}),hover:()=>{if(Date.now()-lastHover<90)return;lastHover=Date.now();effect('navedenie',{level:.4})},action:kind=>{if(kind==='build')effect('treshchotka',{level:.75});if(kind==='buy')effect('lozhki',{level:.75})}};
})();

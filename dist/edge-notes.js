/* Authored marginal sketches: persistent background, never a game overlay. */
(()=>{
 const layer=document.createElement('div');layer.className='edge-notes';layer.setAttribute('aria-hidden','true');
 const anchors=[[-13,-15,35,0],[77,-12,30,1],[-17,66,36,2],[80,64,33,3],[-19,27,29,4],[87,24,25,5]];
 let screen='',raf=0,x=0,y=0,tx=0,ty=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function frame(){x+=(tx-x)*.035;y+=(ty-y)*.035;layer.style.setProperty('--notes-x',x.toFixed(2)+'px');layer.style.setProperty('--notes-y',y.toFixed(2)+'px');raf=requestAnimationFrame(frame)}
 addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches)return;tx=(e.clientX/innerWidth-.5)*12;ty=(e.clientY/innerHeight-.5)*10},{passive:true});
 addEventListener('blur',()=>{tx=ty=0});
 const ornaments=new Map();
 function place(panel,notes){const r=panel.getBoundingClientRect(),p=panel.id==='toast'?{left:0,top:0}:panel.parentElement.getBoundingClientRect();notes.style.left=(r.left-p.left)+'px';notes.style.top=(r.top-p.top)+'px';notes.style.width=r.width+'px';notes.style.height=r.height+'px';notes.style.setProperty('--window-ink',getComputedStyle(panel).getPropertyValue('--voice').trim()||'#d15b43');notes.hidden=panel.id==='toast'&&!panel.classList.contains('show')}
 const sizes=new ResizeObserver(entries=>entries.forEach(({target})=>{const notes=ornaments.get(target);if(notes)place(target,notes)}));
 function decorate(root){
  for(const [panel,notes] of ornaments){if(!panel.isConnected){sizes.unobserve(panel);notes.remove();ornaments.delete(panel)}}
  root.querySelectorAll('.dialogue-box,.modal,#toast').forEach(panel=>{
   if(ornaments.has(panel)){place(panel,ornaments.get(panel));return}
   const notes=document.createElement('div');notes.className='window-notes'+(panel.id==='toast'?' toast-notes':'');notes.setAttribute('aria-hidden','true');
   [2,5,8].forEach((id,i)=>{const art=document.createElement('i');art.style.cssText=`--art:url("assets/edge-notes/0${id}.svg");--delay:${i*.65}s;--duration:${12+i*4}s;--angle:${i*13-12}deg`;notes.append(art)});
   panel.before(notes);ornaments.set(panel,notes);sizes.observe(panel);place(panel,notes);requestAnimationFrame(()=>{if(panel.isConnected)place(panel,notes)});
  })
 }
 document.addEventListener('animationend',e=>{const notes=ornaments.get(e.target);if(notes)place(e.target,notes)});
 addEventListener('resize',()=>ornaments.forEach((notes,panel)=>place(panel,notes)),{passive:true});
 const watcher=new MutationObserver(()=>decorate(document));watcher.observe(document.getElementById('toast'),{attributes:true,childList:true});decorate(document);
 window.edgeNotes={mount(app,next){
  decorate(app);
  if(next==='game'){layer.remove();cancelAnimationFrame(raf);raf=0;return}
  if(screen!==next){screen=next;const seed=[...next].reduce((n,c)=>n+c.charCodeAt(0),0);layer.replaceChildren();
   layer.style.setProperty('--notes-ink',({rules:'#8ca393',villagers:'#7c9d90',atlas:'#779c9b',threads:'#779c9b',scout:'#729594',settings:'#829f9a'})[next]||'');
   layer.dataset.tone=['prologue','novel','chapter'].includes(next)?'story':next==='loading'?'ember':'gold';
   const positions=anchors.map(([left,top,size,depth],i)=>[left+((seed*(i+3))%11-5),top+((seed*(i+7))%17-8),size+((seed+i)%7-3),depth]);
   positions.forEach(([left,top,size,depth],i)=>{const n=document.createElement('i');const asset=String((seed+i*2)%9+1).padStart(2,'0');n.style.cssText=`left:${left}%;top:${top}%;width:${size}%;--depth:${.45+depth*.14};--delay:${.3+i*.8}s;--duration:${19+i*3}s;--drift-duration:${27+i*5}s;--angle:${i%2?8:-9}deg;--art:url("assets/edge-notes/${asset}.svg")`;layer.append(n)});
  }
  if(next==='loading'){layer.classList.add('on-loading');app.querySelector('.loading-night').append(layer)}else{layer.classList.remove('on-loading');const shell=app.querySelector('.screen-shell');(shell||app).append(layer)}if(!raf&&!reduced.matches)raf=requestAnimationFrame(frame);
 }};
 reduced.addEventListener('change',()=>{cancelAnimationFrame(raf);raf=0;tx=ty=x=y=0;layer.style.setProperty('--notes-x','0px');layer.style.setProperty('--notes-y','0px');if(!reduced.matches&&layer.isConnected)raf=requestAnimationFrame(frame)});
})();

/* Adapted from the player's "Багровые чары" canvas study for this interface. */
(()=>{
  const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  const colors={ember:'rgba(180,76,60,',hot:'rgba(225,164,122,',ash:'rgba(105,55,43,'};
  let frameId=0,observer=null,items=[];
  function glow(ctx,x,y,r,a,hot=false){if(a<=0||r<=0)return;let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,hot?`rgba(255,221,174,${a})`:`rgba(208,102,76,${a})`);g.addColorStop(.22,hot?`rgba(224,153,104,${a*.55})`:`rgba(164,65,51,${a*.45})`);g.addColorStop(1,'rgba(100,35,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill()}
  function size(item){const r=item.canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);item.w=Math.max(1,r.width);item.h=Math.max(1,r.height);item.canvas.width=Math.round(item.w*dpr);item.canvas.height=Math.round(item.h*dpr);item.ctx.setTransform(dpr,0,0,dpr,0,0)}
  function spark(it,t){const {ctx,w,h}=it,cx=w/2,cy=h/2,c=t%5.2,smooth=x=>x*x*(3-2*x);let e=c<.9?.12*smooth(c/.9):c<1.9?.12+.88*smooth(c-.9):c<4.3?1:Math.max(0,1-smooth((c-4.3)/.9));e*=.46;const breath=.9+.1*Math.sin(t*2.4);glow(ctx,cx,cy,Math.min(23,h*.42)*e*1.6,e*.38);glow(ctx,cx,cy,8*e*breath,e*.8,true);glow(ctx,cx,cy,2.1,e*.8,true)}
  function thread(it,t){const {ctx,w,h}=it,N=110,p=(t*.12)%1.22,draw=Math.min(1,p),y=u=>h*(.52+.16*Math.sin(u*6.4+.4)+.07*Math.sin(u*17.3+1.2));ctx.lineCap='round';ctx.setLineDash([2,8]);ctx.strokeStyle='rgba(178,121,95,.19)';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=N;i++){let u=i/N,x=w*(.09+.82*u);i?ctx.lineTo(x,y(u)):ctx.moveTo(x,y(u))}ctx.stroke();ctx.setLineDash([]);if(draw<=0)return;const trail=new Path2D();for(let i=0;i<=Math.round(N*draw);i++){let u=i/N,x=w*(.09+.82*u);i?trail.lineTo(x,y(u)):trail.moveTo(x,y(u))}ctx.strokeStyle='rgba(157,75,61,.18)';ctx.lineWidth=10;ctx.stroke(trail);ctx.strokeStyle='rgba(190,105,76,.57)';ctx.lineWidth=2.2;ctx.stroke(trail);ctx.strokeStyle='rgba(228,175,121,.8)';ctx.lineWidth=.65;ctx.stroke(trail);let x=w*(.09+.82*draw),yy=y(draw);glow(ctx,x,yy,17,.36);glow(ctx,x,yy,4,.74,true);for(let k=0;k<6;k++){const u=((t*.075+k/6)%1)*draw;glow(ctx,w*(.09+.82*u),y(u),2.6,.19,true)}}
  function burn(it,t,progress){
    const {ctx,w,h}=it,dt=Math.min(.05,Math.max(0,t-(it.burnTime??t))),x0=it.canvas.dataset.edgeInset!==undefined?Number(it.canvas.dataset.edgeInset):Math.max(15,w*.045),x1=w-x0,cy=h*.68;
    it.burnTime=t;const f=Math.max(0,Math.min(1,progress)),fx=x0+f*(x1-x0),prev=it.burnProgress??0;
    if(f<prev){it.flames=[];it.smoke=[];it.sparks=[];it.ignited=[]}
    it.burnProgress=f;it.flames??=[];it.smoke??=[];it.sparks??=[];it.ignited??=[];
    const M=Math.max(100,Math.floor((x1-x0)/3)),seg=(x1-x0)/M;
    for(let i=Math.floor(prev*M);i<Math.floor(f*M);i++)if(it.ignited[i]==null)it.ignited[i]=t;
    const spawn=(rate,fn)=>{let n=dt*rate;while(n-->=1)fn();if(Math.random()<n+1)fn()};
    if(f>0&&f<1){
      spawn(58,()=>it.flames.push({x:fx+rand(-7,3),y:cy+rand(-2,2),vx:rand(-13,10),vy:-rand(35,85),age:0,life:rand(.38,.8),r:rand(3.5,8),phase:rand(0,6)}));
      spawn(9,()=>it.smoke.push({x:fx+rand(-13,0),y:cy-9,vx:rand(-7,7),vy:-rand(13,28),age:0,life:rand(1.2,2.3),r:rand(8,16)}));
      spawn(19,()=>it.sparks.push({x:fx,y:cy,vx:rand(-48,42),vy:-rand(55,135),age:0,life:rand(.55,1.15)}));
    }
    it.flames.forEach(p=>{p.age+=dt;p.x+=(p.vx+Math.sin(t*7+p.phase)*10)*dt;p.y+=p.vy*dt});it.flames=it.flames.filter(p=>p.age<p.life);
    it.smoke.forEach(p=>{p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=dt*9});it.smoke=it.smoke.filter(p=>p.age<p.life);
    it.sparks.forEach(p=>{p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=145*dt});it.sparks=it.sparks.filter(p=>p.age<p.life&&p.y<h+8);
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle='rgba(51,22,20,.72)';ctx.fillRect(fx,cy-1.6,Math.max(0,x1-fx),3.2);
    const notchStep=(x1-x0)/14;
    for(let x=x0;x<=x1+1;x+=notchStep){if(x<=fx)continue;ctx.fillStyle='rgba(89,34,28,.65)';ctx.beginPath();ctx.moveTo(x,cy-6);ctx.lineTo(x+4,cy);ctx.lineTo(x,cy+6);ctx.lineTo(x-4,cy);ctx.closePath();ctx.fill()}
    for(const p of it.smoke){let k=(1-p.age/p.life)*Math.min(1,p.age*4);const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);g.addColorStop(0,`rgba(75,52,48,${.16*k})`);g.addColorStop(1,'rgba(46,38,37,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<M;i++){
      const lit=it.ignited[i];if(lit==null)break;
      const age=t-lit,heat=Math.exp(-age*.9),flicker=.5+.5*Math.sin(i*1.93+t*6)*Math.sin(i*.71-t*2.3);
      ctx.fillStyle=`rgba(${Math.round(125+115*heat)},${Math.round(17+69*heat)},${Math.round(12+38*heat)},${.48+.4*heat+.1*flicker})`;
      ctx.fillRect(x0+i*seg,cy-1.5,seg+.8,3);
      if(i%6===0)glow(ctx,x0+i*seg,cy,5+8*heat,(.08+.22*heat)*(.6+.4*flicker));
    }
    for(let x=x0;x<=fx;x+=notchStep){ctx.fillStyle='rgba(245,71,44,.82)';ctx.beginPath();ctx.moveTo(x,cy-6);ctx.lineTo(x+4,cy);ctx.lineTo(x,cy+6);ctx.lineTo(x-4,cy);ctx.closePath();ctx.fill();glow(ctx,x,cy,10,.13)}
    if(f>0&&f<1){const flicker=1+.16*Math.sin(t*28)*Math.sin(t*11);glow(ctx,fx,cy,37*flicker,.4);glow(ctx,fx,cy,12*flicker,.92,true);glow(ctx,fx,cy-3,5,.96,true)}
    for(const p of it.flames){const k=p.age/p.life,a=(1-k)*.65;glow(ctx,p.x,p.y,p.r*1.7,a*.43);glow(ctx,p.x,p.y,p.r*.7,a,k<.35)}
    for(const p of it.sparks){const k=1-p.age/p.life;glow(ctx,p.x,p.y,3.1,k*.42);glow(ctx,p.x,p.y,1.2,k*.75,true)}
    ctx.globalCompositeOperation='source-over';
  }
  function dot(it,t){const {ctx,w,h}=it,cx=w/2,cy=h/2,c=it.phase<0?0:Math.min(3,t-it.phase),r=Math.min(w,h)*.26;if(it.phase<0){glow(ctx,cx,cy,3,.18);return}if(c<.65){for(let k=0;k<9;k++){let a=k*TAU/9+t*.9,rr=r*(1-c/.65);glow(ctx,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,2.5,.35,true)}}let e=c<.65?.2+c/.65*.65:Math.max(0,1-(c-.65)/2.35);glow(ctx,cx,cy,Math.max(4,r*.8*e),.28*e);glow(ctx,cx,cy,4+5*e,.67*e,true);if(c>.65){let ring=Math.min(1,(c-.65)/.4)*Math.max(0,1-(c-1.4)/1.6);ctx.strokeStyle=`rgba(194,116,82,${.38*ring})`;ctx.setLineDash([2,7]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r*.74,0,TAU);ctx.stroke();ctx.setLineDash([]);if(c<1.2){ctx.strokeStyle=`rgba(226,164,113,${(1-(c-.65)/.55)*.55})`;ctx.beginPath();ctx.arc(cx,cy,r*(c-.65)*2,0,TAU);ctx.stroke()}}if(c>=3)it.phase=-1}
  function render(now){const t=now/1000;for(const it of items){if(!it.canvas.isConnected)continue;let ctx=it.ctx;ctx.clearRect(0,0,it.w,it.h);if(it.mode==='spark')spark(it,t);else if(it.mode==='thread')thread(it,t);else if(it.mode==='burn')burn(it,t,it.progress());else dot(it,t)}if(!reduced&&items.some(it=>it.canvas.isConnected)&&!document.hidden)frameId=requestAnimationFrame(render);else frameId=0}
  function mount(root,progress){cancelAnimationFrame(frameId);frameId=0;observer?.disconnect();items=[];for(const canvas of root.querySelectorAll('canvas[data-charm]')){const ctx=canvas.getContext('2d');if(!ctx)continue;const item={canvas,ctx,mode:canvas.dataset.charm,progress,w:0,h:0,phase:-1};size(item);items.push(item)}if(!items.length)return;observer=new ResizeObserver(entries=>{for(const entry of entries){const it=items.find(x=>x.canvas===entry.target);if(it)size(it)}if(reduced)render(performance.now())});items.forEach(it=>observer.observe(it.canvas));if(reduced)render(performance.now());else frameId=requestAnimationFrame(render)}
  function choose(button){const it=items.find(x=>x.canvas.closest('button')===button);if(!it||it.mode!=='dot')return;it.phase=performance.now()/1000;if(reduced)render(performance.now());else if(!frameId)frameId=requestAnimationFrame(render)}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!frameId&&!reduced&&items.some(it=>it.canvas.isConnected))frameId=requestAnimationFrame(render)});
  window.storyCharms={mount,choose,refresh:()=>{if(reduced)render(performance.now())}};
})();

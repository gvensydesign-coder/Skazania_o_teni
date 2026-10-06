(()=>{

const EXPORT=true;
const TAU=Math.PI*2, PI=Math.PI, W0=1280, H0=720;
const P={I:1,Z:1,speed:1,T:4,bg:'alpha',pal:'amber'};

/* ---------- утилиты ---------- */
const fract=x=>x-Math.floor(x);
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const sstep=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x)};
function rnd(n,s=0){let h=Math.imul(n|0,0x9E3779B1)^Math.imul((s|0)+1,0x85EBCA6B);h^=h>>>15;h=Math.imul(h,0x2C1B3C6D);h^=h>>>12;h=Math.imul(h,0x297A2D39);h^=h>>>15;return (h>>>0)/4294967296}
const add=g=>{g.globalCompositeOperation='lighter'};
const nrm=g=>{g.globalCompositeOperation='source-over'};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
// мерцание: сумма целых гармоник цикла → период ровно один цикл
const nz=(u,s)=>.34*Math.sin(TAU*(3*u+rnd(s,1)))+.26*Math.sin(TAU*(7*u+rnd(s,2)))+.2*Math.sin(TAU*(13*u+rnd(s,3)))+.14*Math.sin(TAU*(23*u+rnd(s,4)))+.06*Math.sin(TAU*(31*u+rnd(s,5)));
const fl=(u,s,k=.28)=>1+k*nz(u,s);

/* ---------- палитры ---------- */
const PALS={
  amber:{core:[255,244,205],mid:[255,176,64],outer:[196,84,16]},
  fire:{core:[255,228,180],mid:[255,120,40],outer:[160,28,8]},
  gold:{core:[255,252,225],mid:[255,214,90],outer:[200,140,20]}
};
let PAL=PALS.amber;

/* ---------- текстуры ---------- */
function hash2(x,y,s){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,2147483647);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
const fbm=(x,y,s)=>vnoise(x,y,s)*.5+vnoise(x*2,y*2,s+1)*.3+vnoise(x*4,y*4,s+2)*.2;

const SMOKE=[];
function buildSmoke(){
  const S=160;
  for(let t=0;t<4;t++){
    const c=mk(S,S),g=c.getContext('2d'),id=g.createImageData(S,S);
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const nx=(x-S/2)/(S/2),ny=(y-S/2)/(S/2),r=Math.hypot(nx,ny);
      const wx=x+(vnoise(x/26,y/26,t*7+3)-.5)*30,wy=y+(vnoise(x/26+9,y/26,t*7+4)-.5)*30;
      const n=fbm(wx/32,wy/32,t*11),a=clamp((1-sstep(.15,.98,r))*(n*2.1-.3));
      const i=(y*S+x)*4;id.data[i]=196;id.data[i+1]=182;id.data[i+2]=168;id.data[i+3]=a*255;
    }
    g.putImageData(id,0,0);SMOKE.push(c);
  }
}
const GL={};let BEAM,CONE,RAYS,COALS=[];
function buildPalette(){
  const S=256;
  const mkg=(stops)=>{const c=mk(S,S),g=c.getContext('2d'),gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,S,S);return c};
  GL.core=mkg([[0,rgba(PAL.core,1)],[.25,rgba(PAL.core,.6)],[.6,rgba(PAL.mid,.14)],[1,rgba(PAL.mid,0)]]);
  GL.mid=mkg([[0,rgba(PAL.mid,1)],[.35,rgba(PAL.mid,.45)],[.7,rgba(PAL.outer,.12)],[1,rgba(PAL.outer,0)]]);
  GL.outer=mkg([[0,rgba(PAL.outer,1)],[.45,rgba(PAL.outer,.4)],[1,rgba(PAL.outer,0)]]);
  GL.halo=mkg([[0,rgba(PAL.mid,.6)],[.2,rgba(PAL.mid,.3)],[.55,rgba(PAL.outer,.1)],[1,rgba(PAL.outer,0)]]);
  GL.dark=mkg([[0,'rgba(0,0,0,.9)'],[.5,'rgba(0,0,0,.5)'],[1,'rgba(0,0,0,0)']]);
  const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  // пучок (снизу вверх)
  {const w=128,h=512,c=mk(w,h),g=c.getContext('2d'),id=g.createImageData(w,h);
   for(let y=0;y<h;y++){const hh=1-y/(h-1),top=1-sstep(.5,1,hh),sig=.16+.18*(1-hh)+.06*hh;
     for(let x=0;x<w;x++){const dx=(x/(w-1))*2-1,a=Math.exp(-(dx*dx)/(sig*sig))*top*(.35+.65*Math.pow(1-hh,.6)),cc=Math.exp(-(dx*dx)/(sig*sig*.14));
       const col=mixc(PAL.mid,PAL.core,cc),i=(y*w+x)*4;id.data[i]=col[0];id.data[i+1]=col[1];id.data[i+2]=col[2];id.data[i+3]=clamp(a)*255}}
   g.putImageData(id,0,0);BEAM=c;}
  // конус (сверху вниз), источник вверху
  {const w=256,h=512,c=mk(w,h),g=c.getContext('2d'),id=g.createImageData(w,h);
   for(let y=0;y<h;y++){const t=y/(h-1),sig=.07+.5*t;
     for(let x=0;x<w;x++){const dx=(x/(w-1))*2-1,e=Math.exp(-Math.pow(Math.abs(dx)/sig,2.2)),a=e*Math.pow(1-t,1.15)*.8*sstep(0,.03,t),cc=Math.exp(-(dx*dx)/(sig*sig*.2))*(1-t);
       const col=mixc(PAL.mid,PAL.core,cc),i=(y*w+x)*4;id.data[i]=col[0];id.data[i+1]=col[1];id.data[i+2]=col[2];id.data[i+3]=clamp(a)*255}}
   g.putImageData(id,0,0);CONE=c;}
  // радиальные лучи
  {const S=512,c=mk(S,S),g=c.getContext('2d'),id=g.createImageData(S,S),N=44,N2=113;
   const cyc=(t,n,seed)=>{const i0=Math.floor(t),f=t-i0,a=rnd(((i0%n)+n)%n,seed),b=rnd((((i0+1)%n)+n)%n,seed),s=f*f*(3-2*f);return a+(b-a)*s};
   for(let y=0;y<S;y++)for(let x=0;x<S;x++){
     const dx=(x-S/2)/(S/2),dy=(y-S/2)/(S/2),r=Math.hypot(dx,dy),i=(y*S+x)*4;
     if(r>=1){id.data[i+3]=0;continue}
     const an=(Math.atan2(dy,dx)/TAU+.5),v=Math.pow(cyc(an*N,N,77),3)*.85+Math.pow(cyc(an*N2,N2,91),2.5)*.4;
     const a=v*Math.pow(1-r,1.4)*sstep(0,.06,r),col=mixc(PAL.mid,PAL.core,Math.pow(1-r,2));
     id.data[i]=col[0];id.data[i+1]=col[1];id.data[i+2]=col[2];id.data[i+3]=clamp(a)*255;}
   g.putImageData(id,0,0);RAYS=c;}
  // угли
  COALS=[];
  for(let k=0;k<2;k++){const w=256,h=128,c=mk(w,h),g=c.getContext('2d'),id=g.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const v=fbm(x/11,y/8,k*13+5),gl=sstep(.5,.78,v),hot=sstep(.7,.92,v),i=(y*w+x)*4;
      id.data[i]=40+215*gl;id.data[i+1]=8+100*gl+110*hot;id.data[i+2]=4+20*gl+70*hot;id.data[i+3]=255}
    g.putImageData(id,0,0);COALS.push(c)}
}
let GA=1;
function glow(g,kind,x,y,rx,a,ry){
  a*=GA;if(a<=.004)return;ry=ry||rx;g.globalAlpha=clamp(a);g.drawImage(GL[kind],x-rx,y-ry,rx*2,ry*2);
}
function smoke(g,t,x,y,r,a,rot){
  a*=GA;if(a<=.004)return;g.save();g.translate(x,y);g.rotate(rot||0);g.globalAlpha=clamp(a);g.drawImage(SMOKE[t%4],-r,-r,2*r,2*r);g.restore();
}

/* ---------- фон ---------- */
function backdrop(g,W,H){
  g.globalAlpha=1;nrm(g);
  if(P.bg==='alpha'){g.clearRect(0,0,W,H);return}
  const base=P.bg==='black'?'#050403':P.bg==='forest'?'#0c1712':'#0b0908';
  g.fillStyle=base;g.fillRect(0,0,W,H);
  if(P.bg!=='black'){
    const gr=g.createRadialGradient(W/2,H*.8,10,W/2,H*.8,W*.6);
    gr.addColorStop(0,P.bg==='forest'?'rgba(40,66,52,.55)':'rgba(46,34,26,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    const fl2=g.createLinearGradient(0,H*.72,0,H);
    fl2.addColorStop(0,'rgba(0,0,0,0)');fl2.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=fl2;g.fillRect(0,H*.72,W,H*.28);
  }
}

/* ---------- огонь из частиц ---------- */
function flame(g,u,bx,by,sc,n,seed,I){
  [['outer',1.55,.20],['mid',1.05,.30],['core',.6,.42]].forEach(([k,rs,al],pi)=>{
    for(let i=0;i<n;i++){
      const p=fract(u*2+i/n);
      if(pi===2&&p>.55)continue;
      const H=270*(.6+.5*rnd(i,seed+1))*sc,ph=rnd(i,seed+3);
      const y=by-Math.pow(p,.85)*H;
      const sway=Math.sin(TAU*(u*3+rnd(i,seed+2)+p*.8))*22*p*sc+Math.sin(TAU*(u*5+ph))*8*p*sc;
      const x=bx+(rnd(i,seed+4)-.5)*70*sc*Math.pow(1-p,.9)+sway;
      const r=(34*Math.pow(1-p,.75)+5)*rs*sc*(.7+.5*rnd(i,seed+5));
      glow(g,k,x,y,r,al*I*(.4+.6*(1-p))*sstep(0,.06,p)*(1-sstep(.82,1,p)));
    }
  });
}
function sparks(g,u,bx,by,n,seed,reach,spread,I){
  for(let i=0;i<n;i++){
    const p=fract(u*(1+i%2)+rnd(i,seed)),e=1-Math.pow(1-p,1.5);
    const x=bx+(rnd(i,seed+1)-.5)*spread*(.3+e)+Math.sin(TAU*(rnd(i,seed+2)+p*1.3))*14*p;
    const y=by-e*reach*(.4+.6*rnd(i,seed+3));
    const a=Math.sin(PI*p)*(.55+.45*Math.sin(TAU*(u*3+rnd(i,seed+4))));
    glow(g,p<.5?'core':'mid',x,y,3+4*rnd(i,seed+5),a*.9*I);
  }
}

/* ============ 1. Пламя светильника ============ */
function fx1(g,u){
  const I=P.I,f=fl(u,1),by=600;
  add(g);
  glow(g,'halo',640,470,470*f,.6*I,340*f);
  glow(g,'mid',640,by+16,360,.5*I*f,58);
  flame(g,u,640,by,1.3+.06*f,84,10,I*Math.min(1.15,f));
  glow(g,'core',640,by-20,84,.75*I*f);
  glow(g,'mid',640,by-90,120*f,.35*I);
  sparks(g,u,640,by-40,22,30,330,120,I);
}

/* ============ 2. Тёплый пучок ============ */
function fx2(g,u){
  const I=P.I,f=fl(u,2),cx=640,gy=610;
  add(g);
  glow(g,'halo',cx,gy-120,420*f,.4*I,330);
  glow(g,'mid',cx,gy,340,.55*I*f,60);
  glow(g,'core',cx,gy-6,80,.7*I*f,22);
  const rays=[[-.34,.45,380],[-.22,.6,470],[-.1,.85,560],[0,1,640],[.1,.85,570],[.22,.6,470],[.34,.45,380],[-.03,.4,420],[.05,.5,440]];
  rays.forEach(([ang,wd,hh],k)=>{
    const ff=fl(u,20+k,.4),sw=.035*Math.sin(TAU*(u*(1+k%3)+k*.3));
    g.save();g.translate(cx,gy-4);g.rotate(ang+sw);g.globalAlpha=clamp(.5*ff*I*GA);
    const w=200*wd*(.85+.15*ff),h=hh*(.9+.1*ff);g.drawImage(BEAM,-w/2,-h,w,h);g.restore();
  });
  sparks(g,u,cx,gy-10,30,40,420,150,I);
}

/* ============ 3. Объёмные лучи ============ */
function fx3(g,u){
  const I=P.I,f=fl(u,3),cx=640,cy=340;
  add(g);
  glow(g,'halo',cx,cy,560*f,.55*I);
  [[TAU*u,900,.55+.25*Math.sin(TAU*u*2)],[-TAU*u,1180,.42+.22*Math.cos(TAU*u*3)],[TAU*u*2,640,.3+.2*Math.sin(TAU*(u*5+.3))]].forEach(([rot,size,a])=>{
    g.save();g.translate(cx,cy);g.rotate(rot);g.globalAlpha=clamp(a*I*f*GA);g.drawImage(RAYS,-size/2,-size/2,size,size);g.restore();
  });
  glow(g,'mid',cx,cy,240*f,.75*I);
  glow(g,'core',cx,cy,90*f,.9*I);
  glow(g,'core',cx,cy,34,1*I);
  for(let i=0;i<46;i++){
    const p=fract(u+rnd(i,1)),a0=TAU*rnd(i,2)+Math.sin(TAU*(u+rnd(i,3)))*.15,r=90+p*520*(.4+.6*rnd(i,4));
    const tw=.5+.5*Math.sin(TAU*(u*3+rnd(i,5)));
    glow(g,'core',cx+Math.cos(a0)*r,cy+Math.sin(a0)*r*.75,2.5+3*rnd(i,6),Math.sin(PI*p)*tw*.9*I);
  }
}

/* ============ 4. Конус лампы с пылью ============ */
function fx4(g,u){
  const I=P.I,f=fl(u,4),cx=640,ly=118;
  add(g);
  glow(g,'halo',cx,ly+30,300*f,.6*I);
  [[0,980,580,.85],[-.12,760,540,.42],[.12,760,540,.42],[-.24,620,500,.25],[.24,620,500,.25]].forEach(([ang,w,h,a],k)=>{
    const ff=fl(u,40+k,.35);
    g.save();g.translate(cx,ly+22);g.rotate(ang+.012*Math.sin(TAU*(u*2+k*.4)));g.globalAlpha=clamp(a*ff*I*GA);g.drawImage(CONE,-w/2,0,w,h);g.restore();
  });
  glow(g,'mid',cx,632,340,.6*I*f,56);
  glow(g,'core',cx,632,130,.55*I*f,24);
  for(let i=0;i<54;i++){
    const p=fract(u+rnd(i,1)),y=ly+60+p*470,spread=(y-ly)*.55,xo=(rnd(i,2)-.5)*2*spread*(.9);
    const x=cx+xo+Math.sin(TAU*(u*2+rnd(i,3)))*12;
    const inCone=Math.exp(-Math.pow(xo/(spread*.9+20),2));
    const tw=.45+.55*Math.sin(TAU*(u*3+rnd(i,4)));
    glow(g,'core',x,y,2+3*rnd(i,5),Math.sin(PI*p)*tw*inCone*I);
  }
}

/* ============ 5. Свеча ============ */
function fx5(g,u){
  const I=P.I,f=fl(u,5,.22),cx=640,by=560,fx=cx,fy=by-150,lean=Math.sin(TAU*u*3)*5+Math.sin(TAU*u*5+1)*3+Math.sin(TAU*u*11+2)*1.5;
  const hgt=80*(1+.14*nz(u,6)),wd=17*(1+.08*nz(u,7));
  nrm(g);g.globalAlpha=GA;
  // свеча
  const wg=g.createLinearGradient(cx-24,0,cx+24,0);wg.addColorStop(0,'#8a7a62');wg.addColorStop(.35,'#e8dcc0');wg.addColorStop(1,'#6b5c48');
  g.fillStyle=wg;g.beginPath();g.moveTo(cx-24,by-146);g.lineTo(cx+24,by-146);g.lineTo(cx+26,by);g.lineTo(cx-26,by);g.closePath();g.fill();
  g.fillStyle='rgba(255,220,150,.55)';g.beginPath();g.ellipse(cx,by-146,24,6,0,0,TAU);g.fill();
  g.strokeStyle='#1a120c';g.lineWidth=3;g.beginPath();g.moveTo(cx,by-148);g.quadraticCurveTo(cx+lean*.2,by-158,cx+lean*.35,by-164);g.stroke();
  // дым
  for(let i=0;i<9;i++){const p=fract(u+i/9);
    smoke(g,i,fx+lean+Math.sin(TAU*(p*2.2+i*.13))*(8+34*p),fy-hgt-p*230,12+46*p,Math.sin(PI*p)*.16*(.6+.4*I),i+p);}
  add(g);
  glow(g,'halo',fx,fy-40,340*(1+.05*nz(u,8)),.75*I*f);
  glow(g,'mid',fx,fy-40,150*f,.7*I);
  glow(g,'mid',cx,by+10,260,.35*I*f,44);
  // пламя
  g.save();g.translate(fx,fy);
  const drop=(w,h,col0,col1,a,dy)=>{
    const gr=g.createLinearGradient(0,dy,0,-h);gr.addColorStop(0,rgba(col0,a));gr.addColorStop(.55,rgba(col1,a*.8));gr.addColorStop(1,rgba(col1,0));
    g.fillStyle=gr;g.beginPath();g.moveTo(0,dy);
    g.bezierCurveTo(w,dy-h*.12,w*.7,-h*.6,lean,-h);g.bezierCurveTo(-w*.7,-h*.6,-w,dy-h*.12,0,dy);g.fill()};
  g.globalAlpha=GA*clamp(I);
  drop(wd*1.35,hgt*1.08,PAL.mid,PAL.outer,.7,4);
  drop(wd,hgt*.92,PAL.core,PAL.mid,.85,3);
  drop(wd*.6,hgt*.6,PAL.core,PAL.core,.95,2);
  g.fillStyle='rgba(120,160,255,.5)';g.beginPath();g.ellipse(0,-3,wd*.42,10,0,0,TAU);g.fill();
  g.restore();
  glow(g,'core',fx+lean*.3,fy-hgt*.3,36*f,.7*I);
}

/* ============ 6. Жаровня ============ */
function fx6(g,u){
  const I=P.I,f=fl(u,6),cx=640,cy=600;
  add(g);
  glow(g,'halo',cx,cy-140,520*f,.55*I,380);
  glow(g,'mid',cx,cy+20,420,.5*I*f,70);
  // чаша и угли
  nrm(g);g.globalAlpha=GA;
  g.fillStyle='#120d0a';g.beginPath();g.ellipse(cx,cy+14,214,54,0,0,TAU);g.fill();
  g.fillStyle='#231a13';g.beginPath();g.ellipse(cx,cy,205,46,0,0,TAU);g.fill();
  g.save();g.beginPath();g.ellipse(cx,cy,190,38,0,0,TAU);g.clip();
  const m=.5+.5*Math.sin(TAU*u*2);
  g.globalAlpha=GA;g.drawImage(COALS[0],cx-200,cy-46,400,92);
  g.globalAlpha=GA*clamp((.25+.6*m)*I);g.drawImage(COALS[1],cx-200,cy-46,400,92);
  g.restore();
  add(g);
  glow(g,'mid',cx,cy-4,200,.55*I*f,34);
  // нижнее пламя
  flame(g,u,cx-60,cy-6,.36,26,50,I*.9);flame(g,u,cx+64,cy-4,.34,26,60,I*.9);flame(g,u,cx,cy-10,.46,34,70,I);
  // искры
  for(let i=0;i<cnt(70);i++){
    const p=fract(u*(1+(i%2))+rnd(i,80)),e=1-Math.pow(1-p,1.4);
    const ox=(rnd(i,81)-.5)*300,wind=Math.sin(TAU*(rnd(i,82)+p*.8))*40*p+p*p*60;
    const x=cx+ox*(1-.5*p)+wind,y=cy-e*(160+380*rnd(i,83));
    const p2=Math.max(0,p-.03),e2=1-Math.pow(1-p2,1.4),x2=cx+ox*(1-.5*p2)+Math.sin(TAU*(rnd(i,82)+p2*.8))*40*p2+p2*p2*60,y2=cy-e2*(160+380*rnd(i,83));
    const a=Math.sin(PI*p)*(.6+.4*Math.sin(TAU*(u*4+rnd(i,84))));
    g.strokeStyle=rgba(p<.45?PAL.core:PAL.mid,1);g.lineWidth=1.6+1.6*rnd(i,85);g.lineCap='round';g.globalAlpha=clamp(a*.85*I*GA);
    g.beginPath();g.moveTo(x2,y2);g.lineTo(x,y);g.stroke();
    glow(g,'mid',x,y,7+5*rnd(i,86),a*.5*I);
  }
}
const cnt=n=>n;

/* ---------- каталог ---------- */
const FX=[
  {n:'Пламя светильника',d:'Тёплый пучок света в форме живого огня: языки, искры и мягкое пятно на поверхности.',a:'Для факелов, масляных ламп и очагов.',f:fx1,z:[640,470],box:[150,40,980,660]},
  {n:'Тёплый пучок',d:'Веер лучей поднимается из одной точки. Каждый луч мерцает и покачивается отдельно, как огонь.',a:'Для магических светильников и порталов.',f:fx2,z:[640,610],box:[200,0,880,700]},
  {n:'Объёмные лучи',d:'Мягкий шар света, от которого расходятся вращающиеся лучи. Сквозь них плывёт пыль.',a:'Для окон, люстр и вспышек.',f:fx3,z:[640,340],box:[140,0,1000,720]},
  {n:'Конус лампы',d:'Свет падает из плафона вниз конусом. В нём висит пыль, на полу тёплое пятно.',a:'Для подвесных ламп и фонарей над дорогой.',f:fx4,z:[640,120],box:[220,20,840,700]},
  {n:'Свеча',d:'Одно маленькое пламя с ореолом, лёгкое дыхание света и тонкий дым.',a:'Для свечей, лучин и лампад.',f:fx5,z:[640,410],box:[300,60,680,660]},
  {n:'Жаровня',d:'Чаша с тлеющими углями, низкое пламя и искры, которые сносит ветром.',a:'Для костров, жаровен и кузниц.',f:fx6,z:[640,600],box:[180,80,920,640]},
];

/* ---------- отрисовка ---------- */
function render(g,fx,u,w,h,power=1){
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;nrm(g);
  g.save();g.scale(w/W0,h/H0);
  backdrop(g,W0,H0);
  GA=power;
  const z=P.Z*(.9+.1*power);
  g.translate(fx.z[0],fx.z[1]);g.scale(z,z);g.translate(-fx.z[0],-fx.z[1]);
  fx.f(g,u);
  GA=1;g.restore();g.globalAlpha=1;nrm(g);
}


buildSmoke();buildPalette();
const active=new Map();let lastFrame=-1;
window.authoredLight={texture(type){if(active.has(type))return active.get(type).texture;const canvas=mk(256,144),texture=new window.THREE.CanvasTexture(canvas);texture.encoding=window.THREE.sRGBEncoding;active.set(type,{canvas,context:canvas.getContext('2d'),texture,fx:FX[type]});render(canvas.getContext('2d'),FX[type],0,256,144);return texture},tick(seconds){const frame=Math.floor(seconds*18);if(frame===lastFrame)return;lastFrame=frame;for(const entry of active.values()){render(entry.context,entry.fx,fract(seconds/P.T),256,144);entry.texture.needsUpdate=true}},flicker(seconds,seed){return fl(fract(seconds/P.T),seed,.28)}};
})();

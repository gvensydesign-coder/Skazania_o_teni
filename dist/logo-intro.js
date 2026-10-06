/* The attached logo animation, adapted to the game's loading screen. */
async function startLogoIntro(holder, emberBox){
  if(!holder)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{
    const response=await fetch('assets/logo-intro.svg');
    if(!response.ok)throw new Error('Logo unavailable');
    holder.innerHTML=await response.text();
    const svg=holder.querySelector('svg');
    if(!svg)throw new Error('Logo unavailable');
    const paths=[...svg.querySelectorAll('#live path')];
    const part=id=>svg.querySelector('#'+id);
    if(reduce||!Element.prototype.animate){
      paths.forEach(path=>{path.style.fill='#e7e4db';path.style.opacity='1'});
      part('glowLayer').setAttribute('opacity','.45');
      part('sigilHalo').setAttribute('opacity','.5');
      part('eyes').setAttribute('opacity','1');
      holder.classList.add('revealed');
      return;
    }
    const centerX=1930,centerY=1760;
    const distances=paths.map(path=>{const b=path.getBBox();return Math.hypot(b.x+b.width/2-centerX,(b.y+b.height/2-centerY)*1.15)});
    const max=Math.max(...distances);
    const play=(node,frames,options)=>node.animate(frames,{fill:'forwards',...options});
    const fogA=document.querySelector('.fog-a'),fogB=document.querySelector('.fog-b');
    play(fogA,[{opacity:0},{opacity:1}],{duration:2600,easing:'ease-out'});
    play(fogB,[{opacity:0},{opacity:.8}],{duration:3000,delay:600,easing:'ease-out'});
    fogA.animate([{transform:'translateX(-3%)'},{transform:'translateX(3%)'}],{duration:16000,direction:'alternate',iterations:Infinity,easing:'ease-in-out'});
    fogB.animate([{transform:'translateX(4%)'},{transform:'translateX(-4%)'}],{duration:21000,direction:'alternate',iterations:Infinity,easing:'ease-in-out'});
    const spark=part('spark');spark.style.transformOrigin='1930px 1760px';
    play(spark,[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.1)',offset:.35},{opacity:.9,transform:'scale(.9)',offset:.6},{opacity:0,transform:'scale(2.6)'}],{duration:1500,delay:500,easing:'ease-out'});
    paths.forEach((path,n)=>play(path,[{fill:'#000',opacity:0},{fill:'#7d4540',opacity:1,offset:.18},{fill:'#b4665e',opacity:1,offset:.4},{fill:'#e7e4db',opacity:1}],{duration:1500,delay:1100+distances[n]/max*2600+((n*97)%23)*11,easing:'ease-out'}));
    play(part('glowLayer'),[{opacity:0},{opacity:.95,offset:.45},{opacity:.45}],{duration:2600,delay:3400,easing:'ease-in-out'});
    play(part('sigilHalo'),[{opacity:0},{opacity:1,offset:.3},{opacity:.45}],{duration:2200,delay:4200,easing:'ease-out'});
    play(part('eyes'),[{opacity:0},{opacity:1,offset:.2},{opacity:.2,offset:.3},{opacity:1}],{duration:900,delay:5000});
    play(part('sheen'),[{transform:'skewX(-12deg) translateX(0)'},{transform:'skewX(-12deg) translateX(5600px)'}],{duration:1800,delay:5500,easing:'cubic-bezier(.45,.05,.3,1)'});
    for(let k=0;k<18;k++){const dot=document.createElement('i');dot.style.left=((k*47)%100)+'%';dot.style.animationDelay=(3.2+(k*397)%6000/1000)+'s';dot.style.animationDuration=(7+(k*613)%5000/1000)+'s';emberBox.appendChild(dot)}
    await new Promise(resolve=>setTimeout(resolve,6200));
    holder.classList.add('revealed');
    part('glowLayer').animate([{opacity:.45},{opacity:.7},{opacity:.45}],{duration:4200,iterations:Infinity,easing:'ease-in-out'});
    part('sigilHalo').animate([{opacity:.45},{opacity:.8},{opacity:.45}],{duration:3400,iterations:Infinity,easing:'ease-in-out'});
    part('eyes').animate([{opacity:1},{opacity:1,offset:.9},{opacity:0,offset:.93},{opacity:1,offset:.96}],{duration:5200,iterations:Infinity});
  }catch(error){holder.innerHTML='<img src="assets/game-logo.svg" alt="Сказание о Тени">';holder.classList.add('revealed');await new Promise(resolve=>setTimeout(resolve,500))}
}

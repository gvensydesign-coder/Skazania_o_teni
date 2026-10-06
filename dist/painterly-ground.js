(()=>{const THREE=window.THREE;

const VERT=`
varying vec2 vUv;
varying vec3 vWorld;
uniform sampler2D uMask;
uniform float uTime;
uniform float uHeight;
uniform float uWave;
uniform float uKind;
uniform float uScale;
void main(){
  vUv=uv;
  vec3 p=position;
  float m=texture2D(uMask,(uv-.5)*uScale+.5).r;
  p.z+=uHeight*m;
  if(uKind>1.5){p.z+=uWave*.012*(sin(uv.x*27.+uTime*.8)+sin(uv.y*21.-uTime*.65))*.5;}
  vec4 world=modelMatrix*vec4(p,1.);
  vWorld=world.xyz;
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

const FRAG=`
uniform sampler2D uSceneShadow;
uniform mat4 uSceneShadowMatrix;
uniform float uHasSceneShadow;
uniform float uSceneShadowBias;
uniform vec2 uSceneShadowTexel;
uniform vec3 uAmbientTint;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;
uniform float uSunIntensity;
uniform vec3 uHorizonTint;
uniform vec4 uLamps[32];
uniform vec3 uLampColors[32];
#include <packing>
uniform sampler2D uColor;
uniform sampler2D uReflect;
uniform sampler2D uNormal;
uniform sampler2D uMask;
uniform sampler2D uPaint;
uniform sampler2D uShadow;
uniform sampler2D uPuddleColor;
uniform sampler2D uPuddleRegions;
uniform float uTime;
uniform float uKind;
uniform float uDensity;
uniform float uScale;
uniform float uSeed;
uniform float uRandomness;
uniform float uOpacity;
uniform float uLampIntensity;
uniform float uSkyIntensity;
uniform float uHatch;
uniform float uBlur;
uniform float uWave;
uniform float uWetness;
uniform float uPaintWeight;
uniform float uPuddleScale;
uniform vec3 uLampA;
uniform vec3 uLampB;
varying vec2 vUv;
varying vec3 vWorld;
float sceneShadow(){
 if(uHasSceneShadow<.5)return 1.;
 vec4 q=uSceneShadowMatrix*vec4(vWorld,1.);vec3 p=q.xyz/q.w;
 if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z<0.||p.z>1.)return 1.;
 float total=0.;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){
 float d=unpackRGBAToDepth(texture2D(uSceneShadow,p.xy+vec2(float(x),float(y))*uSceneShadowTexel));
 total+=step(p.z+uSceneShadowBias,d);
 }}return mix(.24,1.,total/9.);
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
vec4 blurred(sampler2D map,vec2 uv,float radius){
  vec4 c=texture2D(map,uv)*.4;
  c+=texture2D(map,uv+vec2(radius,0.))*.15;
  c+=texture2D(map,uv-vec2(radius,0.))*.15;
  c+=texture2D(map,uv+vec2(0.,radius))*.15;
  c+=texture2D(map,uv-vec2(0.,radius))*.15;
  return c;
}
void main(){
  vec2 uv=(vUv-.5)*uScale+.5;
  float jitter=noise(vUv*vec2(35.,29.)+uSeed);
  if(uKind>1.5){uv+=uWave*.003*vec2(sin(uTime*.7+uv.y*18.),cos(uTime*.5+uv.x*16.));}
  vec4 colorTex=uKind>1.5?blurred(uColor,uv,uBlur*.0025):texture2D(uColor,uv);
  vec4 refTex=uKind>1.5?blurred(uReflect,uv,uBlur*.004):texture2D(uReflect,uv);
  vec3 normalTex=texture2D(uNormal,uv).rgb*2.-1.;
  vec4 mask=texture2D(uMask,uv);
  vec3 paint=texture2D(uPaint,vUv).rgb;
  // Continuous, warped coverage: no hard 5x5 cell boundaries on the ground.
  vec2 warp=vec2(noise(vUv*5.7+uSeed*1.3),noise(vUv*5.7+uSeed*4.1))-.5;
  vec2 coverUv=vUv+warp*.085*uRandomness;
  float field=noise(coverUv*vec2(4.2,4.6)+vec2(uSeed*2.7,uSeed*.9));
  field=mix(field,noise(coverUv*vec2(10.7,8.9)+uSeed*4.7),.24*uRandomness);
  float region=texture2D(uPuddleRegions,vWorld.xz/190.+.5).r;
  float density=uKind>1.5?uDensity*region:uDensity;
  float survive=smoothstep(1.-density-.18,1.-density+.14,field)*step(.001,density);
  float alpha=1.;
  if(uKind>.5){
    float chosen=paint.r;
    if(uKind>1.5)chosen=paint.g;
    alpha=max(colorTex.a*mask.r*survive,chosen*uPaintWeight*.62*(.72+.28*jitter));
    alpha*=1.-paint.b;
    if(uKind>1.5)alpha*=smoothstep(.0,.08,region);
    if(uKind<1.5){
      float puddle=texture2D(uPuddleColor,(vUv-.5)*uPuddleScale+.5).a;
      alpha*=1.-max(puddle,paint.g)*region*.9;
    }
  }
  alpha*=uOpacity;
  if(alpha<.012)discard;
  vec3 base=colorTex.rgb;
  if(uKind>1.5)base=mix(vec3(.18,.24,.23),base,clamp(colorTex.a*1.4,0.,1.));
  if(uKind>.5&&uKind<1.5)base=mix(vec3(.29,.20,.13),base,clamp(colorTex.a*1.3,0.,1.));
  vec3 n=normalize(vec3(normalTex.x*.67,normalTex.z,-normalTex.y*.67));
  if(uKind>1.5)n=normalize(mix(n,vec3(0.,1.,0.),.50));
  vec3 v=normalize(cameraPosition-vWorld);
  vec3 lampA=uLampA,lampB=uLampB,colA=vec3(0.),colB=vec3(0.);float bestA=1e6,bestB=1e6;
 for(int i=0;i<32;i++){float d=length(uLamps[i].xyz-vWorld);if(uLamps[i].w>0.&&d<uLamps[i].w){if(d<bestA){bestB=bestA;lampB=lampA;colB=colA;bestA=d;lampA=uLamps[i].xyz;colA=uLampColors[i];}else if(d<bestB){bestB=d;lampB=uLamps[i].xyz;colB=uLampColors[i];}}}
 vec3 a=normalize(lampA-vWorld),b=normalize(lampB-vWorld);
  float distA=length(lampA-vWorld),distB=length(lampB-vWorld);
  float attenA=1./(1.+distA*distA*.11),attenB=1./(1.+distB*distB*.12);
  float sky=max(.18,n.y)*uSkyIntensity;
  float diffuse=.40+sky*.32+max(dot(n,a),0.)*attenA*uLampIntensity*.18*max(max(colA.r,colA.g),colA.b);
  float shadow=min(texture2D(uShadow,vUv).r,sceneShadow());
  base*=diffuse*(uAmbientTint+uSunColor*uSunIntensity*max(dot(n,uSunDirection),0.)*.32)*shadow;
  float reflectivity=dot(refTex.rgb,vec3(.333));
  float level=uKind>1.5?3.8:(uKind>.5?.4:.07);
  if(uKind>1.5)level*=1.-paint.g*(1.-colorTex.a)*.67;
  level*=mix(.65,1.4,reflectivity)*uWetness;
  float power=uKind>1.5?13.:(uKind>.5?24.:40.);
  float specA=pow(max(dot(reflect(-a,n),v),0.),power)*attenA;
  float specB=pow(max(dot(reflect(-b,n),v),0.),power)*attenB;
  float broadA=pow(max(dot(reflect(-a,n),v),0.),4.)*attenA;
  float broadB=pow(max(dot(reflect(-b,n),v),0.),4.)*attenB;
  vec3 gleam=(colA*(specA*.85+broadA*.17)+colB*(specB*.85+broadB*.23))*level*uLampIntensity;
  gleam+=uAmbientTint*pow(max(dot(n,v),0.),5.)*sky*level*.23;
  if(uKind>1.5){
    float wet=reflectivity*(.35+.65*max(n.y,0.));
    gleam+=(colA*attenA*.65*uLampIntensity+colB*attenB*.40*uSkyIntensity)*wet;
  }
  float strokes=step(.82,fract(vUv.x*107.+vUv.y*33.+noise(vUv*90.)*.5));
  gleam*=1.+strokes*uHatch*.75;
  base+=gleam*shadow;
  gl_FragColor=vec4(base,alpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  float horizon=smoothstep(60.,88.,max(abs(vWorld.x),abs(vWorld.z)));
  gl_FragColor.rgb=mix(gl_FragColor.rgb,uHorizonTint,horizon);
}`;

const F={
  grass:'01_grass_soil/01_grass_soil_',
  mud:'02_mud_patches/02_mud_patches_',
  puddle:'03_puddles/03_puddles_'
};

async function createGroundSurface({assetBase='./assets/',size=10,segments=96}={}){
  const loader=new THREE.TextureLoader();
  const jobs=[];
  for(const [kind,prefix] of Object.entries(F))for(const [part,suffix] of [['color','color.png'],['reflection','reflection.png'],['normal','normal_opengl.png']])jobs.push([`${kind}-${part}`,assetBase+prefix+suffix]);
  for(const name of ['mud-large-mask','mud-fine-mask','puddle-large-mask','puddle-fine-mask'])jobs.push([name,assetBase+name+'.png']);
  const textures=Object.fromEntries(await Promise.all(jobs.map(async([key,url])=>[key,await loader.loadAsync(url)])));
  for(const [name,t] of Object.entries(textures)){t.encoding=name.endsWith('-color')?THREE.sRGBEncoding:THREE.LinearEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;}
  const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
  const paintCanvas=document.createElement('canvas');paintCanvas.width=paintCanvas.height=512;
  const ctx=paintCanvas.getContext('2d');ctx.fillStyle='rgb(0,0,0)';ctx.fillRect(0,0,512,512);
  const paintTexture=new THREE.CanvasTexture(paintCanvas);paintTexture.encoding=THREE.LinearEncoding;
  const settings={mudAmount:.74,mudScale:1,mudHeight:.022,particleCount:.52,particleSize:1.1,puddleAmount:.14,puddleScale:1,puddleHeight:.012,randomness:.72,wetness:1,skyIntensity:1,lampIntensity:1.15,hatch:.75,puddleBlur:.65,wave:.45,speed:.55,explode:false};
  const group=new THREE.Group(),layers=[];
  const geo=new THREE.PlaneGeometry(size,size,segments,segments);
  let time=0;
  const lampA=new THREE.Vector3(3.7,3.4,2.4),lampB=new THREE.Vector3(-3.2,5,-2.2);
  const specs=[
    {key:'grass',kind:0,mask:'grass-reflection',y:0,opacity:1,seed:0},
    {key:'mud',kind:1,mask:'mud-large-mask',y:.022,opacity:.98,seed:1.1},
    {key:'mud',kind:1,mask:'mud-fine-mask',y:.026,opacity:.82,seed:2.7,fine:true},
    {key:'puddle',kind:2,mask:'puddle-large-mask',y:.013,opacity:.96,seed:3.4},
    {key:'puddle',kind:2,mask:'puddle-fine-mask',y:.016,opacity:.8,seed:5.1,fine:true}
  ];
  for(let i=0;i<specs.length;i++){
    const spec=specs[i],key=spec.key;
    const u={uSceneShadow:{value:white},uSceneShadowMatrix:{value:new THREE.Matrix4()},uHasSceneShadow:{value:0},uSceneShadowBias:{value:0},uSceneShadowTexel:{value:new THREE.Vector2()},uAmbientTint:{value:new THREE.Color(1,1,1)},uSunColor:{value:new THREE.Color(1,1,1)},uSunDirection:{value:new THREE.Vector3(0,1,0)},uSunIntensity:{value:1},uHorizonTint:{value:new THREE.Color()},uLamps:{value:Array.from({length:32},()=>new THREE.Vector4())},uLampColors:{value:Array.from({length:32},()=>new THREE.Color(0,0,0))},uColor:{value:textures[key+'-color']},uReflect:{value:textures[key+'-reflection']},uNormal:{value:textures[key+'-normal']},uMask:{value:textures[spec.mask]},uPaint:{value:paintTexture},uShadow:{value:white},uPuddleRegions:{value:white},uPuddleColor:{value:textures['puddle-color']},uTime:{value:0},uHeight:{value:0},uWave:{value:0},uKind:{value:spec.kind},uDensity:{value:1},uScale:{value:1},uSeed:{value:spec.seed},uRandomness:{value:0},uOpacity:{value:spec.opacity},uLampIntensity:{value:1},uSkyIntensity:{value:1},uHatch:{value:1},uBlur:{value:0},uWetness:{value:1},uPaintWeight:{value:spec.fine?0:1},uPuddleScale:{value:1},uLampA:{value:lampA},uLampB:{value:lampB}};
    const mat=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:u,transparent:spec.kind!==0,depthWrite:spec.kind===0,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=spec.y;mesh.renderOrder=i;mesh.frustumCulled=false;group.add(mesh);layers.push({...spec,mesh});
  }
  const brush={mode:'camera',radius:.06};
  function paintAt(uv,mode=brush.mode,radius=brush.radius){
    if(mode==='camera'||!uv)return;
    const x=uv.x*512,y=(1-uv.y)*512,r=Math.max(2,radius*512);
    const color=mode==='mud'?'255,0,0':mode==='puddle'?'0,255,0':'0,0,255';
    const gradient=ctx.createRadialGradient(x,y,r*.12,x,y,r);
    gradient.addColorStop(0,`rgba(${color},1)`);gradient.addColorStop(.55,`rgba(${color},.85)`);gradient.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();paintTexture.needsUpdate=true;
  }
  function clearPaint(){ctx.fillStyle='rgb(0,0,0)';ctx.fillRect(0,0,512,512);paintTexture.needsUpdate=true;}
  function importPaintMap(image){ctx.fillStyle='rgb(0,0,0)';ctx.fillRect(0,0,512,512);ctx.drawImage(image,0,0,512,512);paintTexture.needsUpdate=true;}
  function update(dt){
    time+=Math.min(.07,Math.max(0,dt))*settings.speed;
    for(const layer of layers){
      const {key,fine,mesh,opacity}=layer,u=mesh.material.uniforms;
      u.uTime.value=time;u.uWave.value=key==='puddle'?settings.wave:0;
      u.uLampIntensity.value=settings.lampIntensity;u.uSkyIntensity.value=settings.skyIntensity;
      u.uHatch.value=settings.hatch;u.uWetness.value=settings.wetness;
      u.uRandomness.value=key==='grass'?0:settings.randomness;
      u.uDensity.value=key==='mud'?(fine?settings.particleCount:settings.mudAmount):key==='puddle'?(fine?settings.puddleAmount*.8:settings.puddleAmount):1;
      u.uScale.value=key==='mud'?(fine?settings.mudScale*settings.particleSize:settings.mudScale):key==='puddle'?settings.puddleScale:1;
      u.uPuddleScale.value=settings.puddleScale;
      u.uOpacity.value=opacity;
      u.uHeight.value=key==='mud'?settings.mudHeight: key==='puddle'?settings.puddleHeight:0;
      u.uBlur.value=key==='puddle'?settings.puddleBlur:0;
      mesh.position.y=(key==='mud'?(.022+(fine?.004:0)+settings.mudHeight*.12):key==='puddle'?(.013+(fine?.003:0)+settings.puddleHeight*.1):0)+(settings.explode?layers.indexOf(layer)*.16:0);
    }
  }
  update(0);
  return {group,settings,layers,update,brush,paintAt,clearPaint,importPaintMap,paintCanvas,setPuddleRegions(t){for(const l of layers)l.mesh.material.uniforms.uPuddleRegions.value=t||white},setPaintTexture(t){for(const l of layers)l.mesh.material.uniforms.uPaint.value=t||paintTexture},setShadowTexture(t){for(const l of layers)l.mesh.material.uniforms.uShadow.value=t||white},setLampPositions(a,b){lampA.copy(a);lampB.copy(b)},dispose(){for(const l of layers)l.mesh.material.dispose();geo.dispose();Object.values(textures).forEach(t=>t.dispose());paintTexture.dispose();white.dispose()}};
}

window.createGroundSurface=createGroundSurface;})();

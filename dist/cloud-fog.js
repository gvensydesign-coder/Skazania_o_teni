(()=>{const THREE=window.THREE;let resources;function loadResources(atlasUrl,profilesUrl){return resources??=Promise.all([fetch(profilesUrl).then(r=>{if(!r.ok)throw Error('Fog profiles unavailable');return r.json()}),new THREE.TextureLoader().loadAsync(atlasUrl)])}

const VERT = `
attribute vec2 fogUV;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
uniform float uWind;
uniform float uPhase;
void main(){
  vUv=fogUV;
  vec3 p=position;
  float sway=sin(p.x*1.7+uTime*.65+uPhase)*.055+sin(p.x*3.9-uTime*.8+uPhase)*.018;
  p.x+=uWind*sin(uTime*.55+uPhase)*.07 + sway*(.4+max(p.y,0.));
  p.y+=sin(p.x*2.4+uTime*.9+uPhase)*.035*(.3+max(p.y,0.));
  p.z+=cos(p.x*1.9-uTime*.62+uPhase)*.045;
  vNormal=normalize(normalMatrix*normal);
  vPosition=p;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const FRAG = `
uniform sampler2D uAtlas;
uniform float uTime;
uniform float uFrame;
uniform float uDensity;
uniform float uGlow;
uniform float uPhase;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
vec4 frame(float n,vec2 uv){vec2 cell=vec2(mod(n,6.),floor(n/6.));return texture2D(uAtlas,(cell+clamp(uv,vec2(.002),vec2(.998)))/vec2(6.,4.));}
void main(){
  float tick=mod(uFrame,24.);
  vec2 drift=vec2(sin(uTime*.25+vUv.y*7.+uPhase)*.012,cos(uTime*.18+vUv.x*9.)*.008);
  vec4 paint=mix(frame(floor(tick),vUv+drift),frame(mod(floor(tick)+1.,24.),vUv+drift),fract(tick));
  float grain=noise(vUv*vec2(28.,13.)+vec2(uTime*.15,uPhase));
  float fine=noise(vUv*vec2(98.,52.)-vec2(uTime*.45,0.));
  vec3 ink=vec3(.105,.16,.225);
  vec3 base=mix(ink,vec3(.30,.41,.53),smoothstep(.15,1.4,vPosition.y));
  vec3 color=mix(base,paint.rgb*.77,clamp(paint.a*1.15,0.,1.));
  float light=max(0.,dot(normalize(vNormal),normalize(vec3(-.3,.8,1.))));
  color*=.62+.38*light;
  color+=vec3(.12,.21,.29)*(grain-.5)*.32;
  float hatch=step(.94,fract(vUv.x*105.+vUv.y*31.+fine*.28+uTime*.18));
  color*=1.-hatch*.10;
  float front=clamp(vNormal.z*.6+.4,.15,1.);
  float rim=pow(1.-abs(dot(normalize(vNormal),vec3(0.,0.,1.))),3.);
  float bottom=1.-smoothstep(-.12,.25,vPosition.y);
  vec3 cyan=vec3(.025,.87,1.);
  color+=cyan*uGlow*(rim*.22+bottom*.13)*(0.75+0.25*sin(uTime*1.4+vPosition.x*3.));
  float alpha=clamp((.64+paint.a*.30+grain*.06)*uDensity,0.,1.);
  alpha*=mix(.82,1.,front);
  alpha*=mix(.7,.18*smoothstep(.05,.42,paint.a),front);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

// A painted screen-space layer uses the PNG alpha itself as the exact silhouette.
// The volume remains visible at oblique angles; the 2D layer fades away there.
const OVERLAY_VERT = `
varying vec2 vUv;
varying float vFacing;
varying vec3 vFogWorld;
void main(){
  vUv=uv;vFogWorld=(modelMatrix*vec4(position,1.)).xyz;
  vFacing=normalize(normalMatrix*vec3(0.,0.,1.)).z;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
const OVERLAY_FRAG = `
uniform sampler2D uAtlas;
uniform float uFrame;
uniform float uTime;
uniform vec3 uAmbientTint;
uniform vec3 uFogTint;
uniform vec4 uLampPosition[8];
uniform vec3 uLampColor[8];
uniform float uRoughness;
uniform float uNoise;
uniform float uGlow;
uniform float uDensity;
uniform float uPhase;
varying vec2 vUv;
varying float vFacing;
varying vec3 vFogWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
vec4 frame(float n,vec2 uv){vec2 cell=vec2(mod(n,6.),floor(n/6.));return texture2D(uAtlas,(cell+clamp(uv,vec2(.002),vec2(.998)))/vec2(6.,4.));}
void main(){
  float tick=mod(uFrame,24.);
  vec2 flow=vec2(uTime*.045+uPhase*3.,-uTime*.025);
  float broad=noise(vUv*vec2(23.,37.)+flow);
  float detail=noise(vUv*vec2(118.,93.)-flow*2.);
  vec2 warp=vec2(broad-.5,detail-.5)*(.004+.014*uRoughness);
  vec2 uv=vUv+warp;
  vec4 a=frame(floor(tick),uv),b=frame(mod(floor(tick)+1.,24.),uv);
  vec4 paint=mix(a,b,fract(tick));
  float contour=max(a.a,b.a);
  float torn=contour + uRoughness*((broad-.5)*.15+(detail-.5)*.11);
  float alpha=smoothstep(.08,.28,torn)*paint.a;
  float speckle=hash(floor(vUv*vec2(780.,350.)+uTime*vec2(6.,-4.)));
  alpha*=1.-uNoise*.32*smoothstep(.78,1.,speckle)*(1.-smoothstep(.3,.85,paint.a));
  alpha*=smoothstep(.02,.65,vFacing)*clamp(uDensity,0.,1.);
  if(alpha<.006)discard;
  float wash=noise(vUv*vec2(63.,35.)+flow*.7);
  vec3 color=paint.rgb*(.82+uNoise*(wash-.5)*.20);
  float paper=noise(vUv*vec2(220.,104.)-flow);
  color+=vec3(.12,.18,.23)*(paper-.5)*uNoise*.22;
  float lower=1.-smoothstep(.04,.18,vUv.y);
  color*=uAmbientTint;
  for(int i=0;i<8;i++){float reach=max(uLampPosition[i].w,.01);float d=distance(vFogWorld,uLampPosition[i].xyz);float falloff=pow(max(0.,1.-d/reach),2.);color+=uLampColor[i]*falloff*paint.a*.32;}
  float radius=max(abs(vFogWorld.x),abs(vFogWorld.z));
  color=mix(color,uFogTint,smoothstep(23.,65.,radius)*.85);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

function makeVolume(profiles, sides=12){
  const stations=profiles[0].length, count=stations*sides;
  const positions=new Float32Array(count*3), uvs=new Float32Array(count*2), indices=[];
  for(let i=0;i<stations;i++)for(let j=0;j<sides;j++){
    const n=i*sides+j,u=i/(stations-1);uvs[n*2]=u;
    // UV is updated along with shape; this is its initial height.
    uvs[n*2+1]=.5;
    if(i<stations-1){let a=n,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;indices.push(a,c,b,b,c,d);}
  }
  for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);let k=(stations-1)*sides;indices.push(k,k+j,k+j+1);}
  const geo=new THREE.BufferGeometry();geo.setIndex(indices);
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('fogUV',new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage));
  return geo;
}

function shape(geo, profiles, phase, time, sides=12){
  const stations=profiles[0].length, a=geo.attributes.position,b=geo.attributes.fogUV;
  const value=(time*.28+phase)%profiles.length, first=Math.floor(value), next=(first+1)%profiles.length;
  let blend=value-first;blend=blend*blend*(3-2*blend);
  for(let i=0;i<stations;i++){
    const u=i/(stations-1), top=THREE.MathUtils.lerp(profiles[first][i],profiles[next][i],blend);
    const taper=Math.max(.055,Math.pow(Math.max(0,1-(2*u-1)**2),.6));
    for(let j=0;j<sides;j++){
      const angle=j*2*Math.PI/sides, vertical=(Math.sin(angle)+1)*.5,n=i*sides+j;
      const y=-.13+(top+.13)*vertical;
      a.setXYZ(n,(u-.5)*6.8,y,Math.cos(angle)*(.14+.75*taper)*(.75+.25*vertical));
      b.setXY(n,u,THREE.MathUtils.clamp((y+.18)/2,0,1));
    }
  }
  a.needsUpdate=true;b.needsUpdate=true;geo.computeVertexNormals();
}

window.createCloudFog=async function createCloudFog({atlasUrl='./fog-flipbook.png',profilesUrl='./profiles.json',layers=2,phaseOffset=0}={}){
  const [data,atlas]=await loadResources(atlasUrl,profilesUrl);
  atlas.encoding=THREE.sRGBEncoding;atlas.wrapS=atlas.wrapT=THREE.ClampToEdgeWrapping;
  atlas.minFilter=THREE.LinearFilter;atlas.magFilter=THREE.LinearFilter;
  const group=new THREE.Group(), meshes=[];
  const settings={speed:.8,wind:.25,density:1.05,glow:.8,roughness:.8,noise:.75,layers,wireframe:false};
  for(let i=0;i<Math.max(1,Math.min(2,layers));i++){
    const geo=makeVolume(data.profiles,data.sides);
    const uniforms={uAtlas:{value:atlas},uTime:{value:0},uFrame:{value:0},uWind:{value:settings.wind},uDensity:{value:settings.density},uGlow:{value:settings.glow},uPhase:{value:i*1.37}};
    const material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms,transparent:true,depthWrite:false,side:THREE.FrontSide});
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set((i-2)*.2,-i*.075,-i*.38);
    mesh.scale.set(1-i*.075,1-i*.11,1-i*.06);
    mesh.renderOrder=i;
    mesh.userData.phase=i*1.2;
    const overlayUniforms={uAmbientTint:{value:new THREE.Color(1,1,1)},uFogTint:{value:new THREE.Color(.15,.22,.23)},uLampPosition:{value:Array.from({length:8},()=>new THREE.Vector4())},uLampColor:{value:Array.from({length:8},()=>new THREE.Color(0,0,0))},uAtlas:{value:atlas},uTime:{value:0},uFrame:{value:0},uRoughness:{value:settings.roughness},uNoise:{value:settings.noise},uGlow:{value:settings.glow},uDensity:{value:settings.density},uPhase:{value:i*1.37}};
    const overlay=new THREE.Mesh(new THREE.PlaneGeometry(6.8,2),new THREE.ShaderMaterial({vertexShader:OVERLAY_VERT,fragmentShader:OVERLAY_FRAG,uniforms:overlayUniforms,transparent:true,depthWrite:false,side:THREE.FrontSide}));
    overlay.position.set(0,.82,.96);
    overlay.renderOrder=5+i;
    mesh.add(overlay);
    mesh.userData.overlay=overlay;
    mesh.userData.navigationIgnore=overlay.userData.navigationIgnore=true;mesh.userData.outlineIgnore=overlay.userData.outlineIgnore=true;mesh.frustumCulled=overlay.frustumCulled=false;mesh.raycast=overlay.raycast=()=>{};group.add(mesh);meshes.push(mesh);
  }
  let elapsed=phaseOffset;
  function update(dt){
    elapsed+=Math.min(.06,Math.max(0,dt))*settings.speed;
    meshes.forEach((mesh,i)=>{
      mesh.visible=i<settings.layers;
      if(!mesh.visible)return;
      if(settings.wireframe)shape(mesh.geometry,data.profiles,mesh.userData.phase,elapsed,data.sides);
      const u=mesh.material.uniforms;
      u.uTime.value=elapsed;u.uFrame.value=(elapsed*.28+mesh.userData.phase)*4;
      u.uWind.value=settings.wind;u.uDensity.value=settings.density;u.uGlow.value=settings.glow;
      // Keep the animated volume as the carrier, but draw it only on request.
      // Its smooth shell must never show behind the painted silhouette.
      mesh.material.visible=settings.wireframe;
      mesh.material.wireframe=settings.wireframe;
      mesh.userData.overlay.visible=!settings.wireframe;
      const o=mesh.userData.overlay.material.uniforms;
      o.uTime.value=elapsed;o.uFrame.value=u.uFrame.value;
      o.uRoughness.value=settings.roughness;o.uNoise.value=settings.noise;
      o.uGlow.value=settings.glow;o.uDensity.value=settings.density;
      mesh.position.x=(i-2)*.2+Math.sin(elapsed*.23+i)*.11;
    });
  }
  update(0);
  return {group,settings,update,meshes,texture:atlas,dispose(){meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();m.userData.overlay.geometry.dispose();m.userData.overlay.material.dispose()});/* Shared atlas remains available to other clouds. */}};
}

})();

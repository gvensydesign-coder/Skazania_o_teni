(()=>{const THREE=window.THREE;

const vertexShader=`varying vec3 vDir; void main(){vDir=position; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`;
const fragmentShader=`
uniform float uBlend;
uniform float uTime;
uniform float uGlow;
varying vec3 vDir;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
  vec3 d=normalize(vDir); float h=clamp(d.y*.95+.42,0.,1.);
  vec3 night=mix(vec3(.15,.23,.34),vec3(.012,.028,.055),smoothstep(.08,1.,h));
  vec3 evening=mix(vec3(.21,.33,.30),vec3(.016,.045,.052),smoothstep(.04,1.,h));
  vec3 col=mix(night,evening,uBlend);
  vec3 q=d*vec3(3.5,5.,3.5);
  float cloud=noise(q+vec3(uTime*.008,0.,0.))* .65+noise(q*2.6-vec3(uTime*.015,0.,0.))*.35;
  float brush=step(.53,cloud)*(.5+.5*noise(q*12.));
  col*=1.-brush*(.20+.13*uBlend)*smoothstep(-.1,.22,d.y);
  float strokes=step(.82,noise(q*16.))*step(.4,cloud)*.10;
  col+=mix(vec3(.35,.46,.64),vec3(.33,.52,.48),uBlend)*strokes;
  vec3 source=normalize(mix(vec3(-.26,.32,-.90),vec3(.42,.19,-.89),uBlend));
  float halo=pow(max(dot(d,source),0.),mix(18.,12.,uBlend));
  col+=mix(vec3(.23,.32,.49),vec3(.20,.37,.32),uBlend)*halo*uGlow*.35;
  float grain=(hash(floor(d*900.))-.5)*.012;
  gl_FragColor=vec4(col+grain,1.);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

const night={hemiSky:0x839cbd,hemiGround:0x17201c,hemi:.4,key:0x9ebee3,keyPower:1.05,rim:0x6094b8,rimPower:.4,fog:0x243344,fogDensity:.022,skyPower:.68,lampPower:.48,skyTint:0x779fc4,coolTint:0x8bb7d1,exposure:.77};
const evening={hemiSky:0xabc8bb,hemiGround:0x293021,hemi:.7,key:0xa7d3bc,keyPower:1.6,rim:0x8dbdaf,rimPower:.67,fog:0x344c48,fogDensity:.027,skyPower:1.04,lampPower:.85,skyTint:0x9fc8b8,coolTint:0xa6d8cb,exposure:.94};
const blendColor=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
function createSkyLighting(scene,{ground,renderer,hemi:existingHemi,key:existingKey,onAtmosphere}={}){
  const uniforms={uBlend:{value:0},uTime:{value:0},uGlow:{value:1}};
  const dome=new THREE.Mesh(new THREE.SphereGeometry(200,48,24),new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,side:THREE.BackSide,depthWrite:false,fog:false}));
  dome.userData.outlineIgnore=dome.userData.navigationIgnore=true;dome.frustumCulled=false;dome.renderOrder=-1000;scene.add(dome);
  const hemi=existingHemi||new THREE.HemisphereLight(0xffffff,0x17201c,1),key=existingKey||new THREE.DirectionalLight(0xffffff,1),rim=new THREE.DirectionalLight(0xffffff,1);
  key.position.set(-7,10,-8);rim.position.set(6,5,8);scene.add(hemi,key,rim);
  const fog={color:new THREE.Color(0x34475d),density:.022};
  let target=0,blend=0,time=0,skyIntensity=1,warmIntensity=1,fogAmount=1,enabled=true;
  function setBlend(value,immediate=false){target=THREE.MathUtils.clamp(value,0,1);if(immediate)blend=target;}
  function setState(value,immediate=false){setBlend(value==='evening'?1:0,immediate);}
  function update(dt,camera){if(!enabled)return;time+=Math.min(dt,.1);blend=THREE.MathUtils.damp(blend,target,3.5,dt);uniforms.uBlend.value=blend;uniforms.uTime.value=time;
    if(camera)dome.position.copy(camera.position);
    const n=night,e=evening,t=blend;
    hemi.color.copy(blendColor(n.hemiSky,e.hemiSky,t));hemi.groundColor.copy(blendColor(n.hemiGround,e.hemiGround,t));hemi.intensity=THREE.MathUtils.lerp(n.hemi,e.hemi,t)*skyIntensity;
    key.position.set(-7,10,-8);key.color.copy(blendColor(n.key,e.key,t));key.intensity=THREE.MathUtils.lerp(n.keyPower,e.keyPower,t)*skyIntensity;
    rim.color.copy(blendColor(n.rim,e.rim,t));rim.intensity=THREE.MathUtils.lerp(n.rimPower,e.rimPower,t)*skyIntensity;
    fog.color.copy(blendColor(n.fog,e.fog,t));fog.density=THREE.MathUtils.lerp(n.fogDensity,e.fogDensity,t)*fogAmount;
    onAtmosphere?.(fog.color,fog.density);
    if(renderer)renderer.toneMappingExposure=THREE.MathUtils.lerp(n.exposure,e.exposure,t);
    if(ground){ground.settings.skyIntensity=THREE.MathUtils.lerp(n.skyPower,e.skyPower,t)*skyIntensity;ground.settings.lampIntensity=THREE.MathUtils.lerp(n.lampPower,e.lampPower,t)*warmIntensity;}
  }
  update(0);
  return {dome,hemi,key,rim,setGround(g){ground=g},setEnabled(v){enabled=v;dome.visible=v;if(!v)rim.intensity=0},get lampPower(){return THREE.MathUtils.lerp(night.lampPower,evening.lampPower,blend)*warmIntensity},setBlend,setState,update,get blend(){return blend},get skyIntensity(){return skyIntensity},set skyIntensity(v){skyIntensity=v},get warmIntensity(){return warmIntensity},set warmIntensity(v){warmIntensity=v},get fogAmount(){return fogAmount},set fogAmount(v){fogAmount=v},get glow(){return uniforms.uGlow.value},set glow(v){uniforms.uGlow.value=v},dispose(){scene.remove(dome,rim);if(!existingHemi)scene.remove(hemi);if(!existingKey)scene.remove(key);dome.geometry.dispose();dome.material.dispose();scene.fog=null;}};
}

window.createSkyLighting=createSkyLighting;})();

(()=>{const THREE=window.THREE;

const VERT = `
varying vec2 vUv;
varying vec3 vWaterWorld;
uniform float uTime;
uniform float uWave;
uniform float uPhase;
void main(){
  vUv=uv;
  vec3 p=position;
  float edge=sin(uv.x*3.14159)*sin(uv.y*3.14159);
  p.z+=edge*uWave*(sin(p.x*2.4+uTime*.9+uPhase)+.45*sin(p.y*3.1-uTime*1.3))*.055;
  vWaterWorld=(modelMatrix*vec4(p,1.)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const COMMON = `
uniform sampler2D uNormal;
uniform sampler2D uShadow;
uniform sampler2D uSceneShadow;
uniform mat4 uSceneShadowMatrix;
uniform float uHasSceneShadow;
uniform float uSceneShadowBias;
uniform vec2 uSceneShadowTexel;
#include <packing>
varying vec3 vWaterWorld;
float sceneShadow(){
 if(uHasSceneShadow<.5)return 1.;
 vec4 q=uSceneShadowMatrix*vec4(vWaterWorld,1.);vec3 p=q.xyz/q.w;
 if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;
 float sum=0.;
 for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){
 float d=unpackRGBAToDepth(texture2D(uSceneShadow,p.xy+vec2(float(x),float(y))*uSceneShadowTexel));
 sum+=step(p.z+uSceneShadowBias,d);
 }}
 return mix(.24,1.,sum/9.);
}
uniform float uTime;
uniform float uMotion;
uniform float uNormalStrength;
uniform float uShadowStrength;
uniform vec3 uLight;
varying vec2 vUv;
uniform vec3 uAtmosphere;
uniform samplerCube uEnvironment;
uniform samplerCube uEnvironmentNext;
uniform samplerCube uRiverEnvironment;
uniform samplerCube uRiverEnvironmentNext;
uniform vec2 uReflectionBlend;
vec3 reflectedEnvironment(vec3 direction){vec3 pond=mix(textureCube(uEnvironment,direction).rgb,textureCube(uEnvironmentNext,direction).rgb,uReflectionBlend.x);vec3 river=mix(textureCube(uRiverEnvironment,direction).rgb,textureCube(uRiverEnvironmentNext,direction).rgb,uReflectionBlend.y);float pondWeight=1.-smoothstep(.5,1.4,length((vWaterWorld.xz-vec2(-8.,-24.))/vec2(12.,14.)));return mix(river,pond,pondWeight);}
uniform vec4 uLamps[8];
uniform vec3 uLampColors[8];
float basin(){float river=abs(vWaterWorld.x-(-15.+4.*sin(vWaterWorld.z*.035)))/(3.+.25*sin(vWaterWorld.z*.15));float pond=length((vWaterWorld.xz-vec2(-8.,-24.))/vec2(12.,14.));return min(river,pond);}
vec3 atmosphere(vec3 paint){vec3 c=paint*uAtmosphere;for(int i=0;i<8;i++){float d=length(vWaterWorld-uLamps[i].xyz);c+=uLampColors[i]*pow(max(0.,1.-d/max(.01,uLamps[i].w)),2.)*.12;}return c;}
vec2 current(vec2 uv){
  vec2 a=texture2D(uNormal,uv*1.12+vec2(uTime*.013,-uTime*.009)).rg*2.-1.;
  vec2 b=texture2D(uNormal,uv*.83+vec2(-uTime*.007,uTime*.012)).rg*2.-1.;
  return (a+b*.65)*uMotion*.008;
}
float lighting(vec2 uv){
  vec3 n=texture2D(uNormal,uv+vec2(uTime*.009,-uTime*.006)).rgb*2.-1.;
  vec3 world=normalize(vec3(n.r*uNormalStrength*.55,1.,n.g*uNormalStrength*.55));
  float diffuse=.55+.45*max(dot(world,normalize(uLight)),0.);
  float shadow=mix(1.,texture2D(uShadow,vec2(vWaterWorld.x/190.+.5,.5-vWaterWorld.z/190.)).r,uShadowStrength);
  return diffuse*min(shadow,sceneShadow());
}
`;

const LAYER_FRAG = COMMON + `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uTiling;
uniform float uBrightness;
void main(){
  if(basin()>1.)discard;
  vec2 uv=vWaterWorld.xz/12.*uTiling;
  vec2 flow=current(uv);
  vec4 paint=texture2D(uMap,uv+flow);
  float light=lighting(uv);
  vec3 color=atmosphere(paint.rgb*(.72+.43*light)*uBrightness);
  gl_FragColor=vec4(color,max(paint.a,.18)*uOpacity*(1.-smoothstep(.88,1.,basin()))*(1.-smoothstep(60.,88.,max(abs(vWaterWorld.x),abs(vWaterWorld.z)))));
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

// This material deliberately blurs only the painted water maps. Floating
// objects are separate meshes rendered afterward, so they remain sharp.
const SURFACE_FRAG = COMMON + `
uniform sampler2D uBottom;
uniform sampler2D uReflect;
uniform sampler2D uSurface;
uniform float uBlur;
uniform float uOpacity;
uniform float uReflectAmount;
uniform float uBottomAmount;
vec4 soft(sampler2D tex,vec2 uv,float radius){
  vec4 color=texture2D(tex,uv)*.40;
  color+=texture2D(tex,uv+vec2(radius,0.))*.15;
  color+=texture2D(tex,uv-vec2(radius,0.))*.15;
  color+=texture2D(tex,uv+vec2(0.,radius))*.15;
  color+=texture2D(tex,uv-vec2(0.,radius))*.15;
  return color;
}
void main(){
  if(basin()>1.)discard;
  vec2 uv=vWaterWorld.xz/12.+current(vWaterWorld.xz/12.);
  vec4 bottom=soft(uBottom,uv,uBlur*.004);
  vec4 reflection=soft(uReflect,uv+vec2(uTime*.003,-uTime*.002),uBlur*.004);
  vec4 surface=texture2D(uSurface,uv);
  float light=lighting(uv);
  float pond=1.;
  float reflectionMask=reflection.a*uReflectAmount*max(.28,light);
  vec3 water=mix(bottom.rgb*uBottomAmount,reflection.rgb,clamp(reflectionMask*.35,0.,.5));
  water=mix(water,surface.rgb,.50);
  water*=.66+.38*light;
  float sparkle=pow(max(0.,light-.82),3.)*reflectionMask;
  water+=vec3(.31,.42,.43)*sparkle;
  vec3 n=texture2D(uNormal,uv).rgb*2.-1.;
  vec3 N=normalize(vec3(n.r*uNormalStrength*.3,1.,n.g*uNormalStrength*.3));
  vec3 V=normalize(vWaterWorld-cameraPosition);
  vec3 reflected=reflectedEnvironment(reflect(V,N));
  float fresnel=.08+.28*pow(1.-abs(dot(-V,N)),3.);
  water=mix(atmosphere(water),reflected,fresnel*uReflectAmount)*sceneShadow();
  gl_FragColor=vec4(water,pond*uOpacity*(1.-smoothstep(.88,1.,basin()))*(1.-smoothstep(60.,88.,max(abs(vWaterWorld.x),abs(vWaterWorld.z)))));
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

const OBJECT_FRAG = COMMON + `
uniform sampler2D uMap;
uniform float uOpacity;
void main(){vec4 c=texture2D(uMap,vUv);if(c.a<.015)discard;gl_FragColor=vec4(atmosphere(c.rgb)*sceneShadow(),c.a*uOpacity*(1.-smoothstep(60.,88.,max(abs(vWaterWorld.x),abs(vWaterWorld.z)))));
#include <tonemapping_fragment>
#include <encodings_fragment>
}`;

const RIPPLE_FRAG = COMMON + `
uniform sampler2D uMap;
uniform float uIntensity;
uniform float uPhase;
void main(){
  vec2 p=(vUv-.5)*2.;
  float r=length(p);
  float wave=sin(r*31.-uTime*3.2+uPhase);
  float rings=smoothstep(.74,.94,wave)*(1.-smoothstep(.3,.95,r));
  vec4 brush=texture2D(uMap,vUv+current(vUv)*.8);
  float alpha=(rings*.28+brush.a*.28)*uIntensity*(1.-smoothstep(.62,.98,r));
  gl_FragColor=vec4(mix(vec3(.11,.31,.32),brush.rgb,.65)*lighting(vUv),alpha*(1.-smoothstep(60.,88.,max(abs(vWaterWorld.x),abs(vWaterWorld.z)))));
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

const URLS={bottom:'bottom.png',deep:'bottom-deep.png',detail:'bottom-detail.png',reflect:'reflections.png',soft:'reflection-soft.png',bright:'reflection-bright.png',reaction:'reactions.png',ring:'reaction-ring.png',surface:'surface.png',normal:'normal.png',objects:['object-lily.png','object-leaves.png','object-branch.png','object-duckweed.png']};
function rand(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};

async function createWaterPond({assetBase='./assets/',size=10,segments=64,objectCount=10}={}){
  const loader=new THREE.TextureLoader();
  const entries=Object.entries(URLS).filter(([key])=>key!=='objects');
  const loaded=await Promise.all([...entries.map(async([key,file])=>[key,await loader.loadAsync(assetBase+file)]),...URLS.objects.map(async(file,i)=>['object'+i,await loader.loadAsync(assetBase+file)])]);
  const textures=Object.fromEntries(loaded);
  for(const [key,t] of Object.entries(textures)){t.encoding=key==='normal'?THREE.LinearEncoding:THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;}
  const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
  const settings={speed:.55,wave:.8,bottomIntensity:1,detailIntensity:.65,reflectionIntensity:.8,reflectionScale:1,objectCount,objectScale:1,randomness:.75,rippleIntensity:.85,surfaceOpacity:.62,blur:.65,normalStrength:.8,shadowStrength:0,lightAngle:.8,lightHeight:1.4};
  const group=new THREE.Group(),layers=[],objects=[],ripples=[];
  let elapsed=0;
  const geometry=new THREE.PlaneGeometry(size,size,segments,segments);
  function uniforms(phase=0){return {uSceneShadow:{value:white},uSceneShadowMatrix:{value:new THREE.Matrix4()},uHasSceneShadow:{value:0},uSceneShadowBias:{value:-.0006},uSceneShadowTexel:{value:new THREE.Vector2(1/2048,1/2048)},uAtmosphere:{value:new THREE.Color(1,1,1)},uEnvironment:{value:null},uEnvironmentNext:{value:null},uRiverEnvironment:{value:null},uRiverEnvironmentNext:{value:null},uReflectionBlend:{value:new THREE.Vector2(1,1)},uLamps:{value:Array.from({length:8},()=>new THREE.Vector4())},uLampColors:{value:Array.from({length:8},()=>new THREE.Color(0,0,0))},uTime:{value:0},uWave:{value:settings.wave},uPhase:{value:phase},uMotion:{value:settings.wave},uNormal:{value:textures.normal},uNormalStrength:{value:settings.normalStrength},uShadow:{value:white},uShadowStrength:{value:0},uLight:{value:new THREE.Vector3(.6,1.4,.55)}}}
  function plane(material,y,geo=geometry){const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.frustumCulled=false;group.add(mesh);return mesh}
  const specs=[
    ['deep',-.034,.88,1],['detail',-.022,.72,1],
    ['soft',-.008,.53,1],['bright',.007,.75,1],
    ['reaction',.022,.35,1],['ring',.031,.26,1]
  ];
  for(let i=0;i<specs.length;i++){
    const [key,y,opacity,tiling]=specs[i];
    const u={...uniforms(i*.8),uMap:{value:textures[key]},uOpacity:{value:opacity},uTiling:{value:tiling},uBrightness:{value:1}};
    const material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:LAYER_FRAG,uniforms:u,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    const mesh=plane(material,y);mesh.renderOrder=i;layers.push({key,mesh,baseOpacity:opacity});
  }
  const surfaceUniforms={...uniforms(1.2),uBottom:{value:textures.bottom},uReflect:{value:textures.reflect},uSurface:{value:textures.surface},uBlur:{value:settings.blur},uOpacity:{value:settings.surfaceOpacity},uReflectAmount:{value:settings.reflectionIntensity},uBottomAmount:{value:settings.bottomIntensity}};
  const surface=plane(new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:SURFACE_FRAG,uniforms:surfaceUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide}),.055);surface.renderOrder=10;
  for(let i=0;i<112;i++){
    const kind=i%4,texture=textures['object'+kind],aspect=texture.image.width/texture.image.height;
    const sizeBase=kind===2?1.7:kind===3?1.35:1.18;
    const width=sizeBase*aspect, height=sizeBase;
    const ob=plane(new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:OBJECT_FRAG,uniforms:{uMap:{value:texture},uOpacity:{value:1},uSceneShadow:{value:white},uSceneShadowMatrix:{value:new THREE.Matrix4()},uHasSceneShadow:{value:0},uSceneShadowBias:{value:-.0006},uSceneShadowTexel:{value:new THREE.Vector2(1/2048,1/2048)},uAtmosphere:{value:new THREE.Color(1,1,1)},uEnvironment:{value:null},uEnvironmentNext:{value:null},uRiverEnvironment:{value:null},uRiverEnvironmentNext:{value:null},uReflectionBlend:{value:new THREE.Vector2(1,1)},uLamps:{value:Array.from({length:8},()=>new THREE.Vector4())},uLampColors:{value:Array.from({length:8},()=>new THREE.Color(0,0,0))},uTime:{value:0},uWave:{value:0},uPhase:{value:0},uLight:{value:new THREE.Vector3(.6,1.4,.55)}},transparent:true,depthWrite:false,side:THREE.DoubleSide}),.115,new THREE.PlaneGeometry(width,height,1,1));
    ob.renderOrder=20+i;objects.push(ob);
    const ripple=plane(new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:RIPPLE_FRAG,uniforms:{...uniforms(i*.7),uMap:{value:textures.ring},uIntensity:{value:settings.rippleIntensity}},transparent:true,depthWrite:false,side:THREE.DoubleSide}),.082,new THREE.PlaneGeometry(Math.max(1.6,width*1.4),Math.max(1.6,height*1.4),12,12));
    ripple.renderOrder=11+i;ripples.push(ripple);
  }
  const anchors=[];
  function arrange(){
    const random=rand(22491);
    for(let i=0;i<112;i++){
      const col=i%4,row=Math.floor(i/4);
      const x=(col-1.5)*2.12+(random()-.5)*settings.randomness*1.35;
      const z=(row-1.5)*2.12+(random()-.5)*settings.randomness*1.35;
      let ax,az;
      if(i<80){az=-91+Math.floor(i/2)*4.6+(random()-.5)*1.8;const half=3+.25*Math.sin(az*.15);ax=-15+4*Math.sin(az*.035)+(i%2?1:-1)*half*(.80+random()*.1);}
      else if(i<104){const angle=(i-80)/24*Math.PI*2+(random()-.5)*.12;const radius=.83+random()*.08;ax=-8+Math.cos(angle)*12*radius;az=-24+Math.sin(angle)*14*radius;}
      else{az=-78+(i-104)*22;ax=-15+4*Math.sin(az*.035)+(random()-.5)*1.7;if(i>108){const angle=random()*Math.PI*2;ax=-8+Math.cos(angle)*6;az=-24+Math.sin(angle)*7;}}
      anchors[i]=[ax,az,random()*Math.PI*2,random()*Math.PI*2];
    }
  }
  arrange();let lastRandomness=settings.randomness;
  function update(dt){
    elapsed+=Math.min(.07,Math.max(0,dt))*settings.speed;
    if(lastRandomness!==settings.randomness){arrange();lastRandomness=settings.randomness}
    const light=new THREE.Vector3(Math.cos(settings.lightAngle),settings.lightHeight,Math.sin(settings.lightAngle)).normalize();
    for(const {key,mesh,baseOpacity} of layers){
      const u=mesh.material.uniforms;u.uTime.value=elapsed;u.uWave.value=settings.wave;u.uMotion.value=settings.wave;u.uNormalStrength.value=settings.normalStrength;u.uShadowStrength.value=settings.shadowStrength;u.uLight.value.copy(light);
      u.uOpacity.value=baseOpacity*(key==='deep'?settings.bottomIntensity:key==='detail'?settings.detailIntensity:key==='soft'||key==='bright'?settings.reflectionIntensity:settings.rippleIntensity);
      u.uBrightness.value=key==='bright'?1.2:1;
      u.uTiling.value=key==='soft'||key==='bright'?settings.reflectionScale:1;
    }
    const s=surface.material.uniforms;s.uTime.value=elapsed;s.uWave.value=settings.wave;s.uMotion.value=settings.wave;s.uNormalStrength.value=settings.normalStrength;s.uShadowStrength.value=settings.shadowStrength;s.uLight.value.copy(light);s.uBlur.value=settings.blur;s.uOpacity.value=settings.surfaceOpacity;s.uReflectAmount.value=settings.reflectionIntensity;s.uBottomAmount.value=settings.bottomIntensity;
    for(let i=0;i<112;i++){
      const [x,z,phase,angle]=anchors[i],active=i<settings.objectCount;
      const ob=objects[i],rip=ripples[i];ob.visible=rip.visible=true;ob.material.uniforms.uOpacity.value+=(Number(active)-ob.material.uniforms.uOpacity.value)*Math.min(1,dt*.5);if(ob.material.uniforms.uOpacity.value<.005){ob.visible=rip.visible=false;continue;}
      const px=x+Math.sin(elapsed*.24+phase)*.12,pz=z+Math.cos(elapsed*.19+phase)*.09;
      ob.position.set(px,.115+Math.sin(elapsed*1.2+phase)*.012,pz);
      ob.rotation.z=angle*.25+Math.sin(elapsed*.35+phase)*.045;
      ob.scale.setScalar(settings.objectScale*(.83+.24*(i%3)));
      rip.position.set(px,.082,pz);rip.rotation.z=ob.rotation.z;
      rip.scale.setScalar(settings.objectScale*(1+.07*Math.sin(elapsed*.8+phase)));
      const u=rip.material.uniforms;u.uTime.value=elapsed;u.uMotion.value=settings.wave;u.uNormalStrength.value=settings.normalStrength;u.uShadowStrength.value=settings.shadowStrength;u.uLight.value.copy(light);u.uIntensity.value=settings.rippleIntensity*ob.material.uniforms.uOpacity.value;
    }
  }
  update(0);
  return {group,settings,update,layers,objects,ripples,surface,texture:textures,setShadowTexture(texture){for(const entry of layers)entry.mesh.material.uniforms.uShadow.value=texture||white;surface.material.uniforms.uShadow.value=texture||white;for(const ripple of ripples)ripple.material.uniforms.uShadow.value=texture||white},dispose(){group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});Object.values(textures).forEach(t=>t.dispose());white.dispose()}};
}

window.createWaterPond=createWaterPond;})();

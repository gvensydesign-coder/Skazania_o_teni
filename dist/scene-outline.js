/* Adapted from the supplied AnimatedOutline package for Three.js r128.
   Back-facing ink hulls support skeletal animation and shared forest instances. */
window.createSceneOutline=function(THREE,root){
 const uniforms={uTime:{value:0},uWidth:{value:.04},uWarp:{value:.29},uFrequency:{value:9},uColor:{value:new THREE.Color(0x100d19)}};
 const noise=`float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
 const vertexShader=`uniform float uTime,uWidth,uWarp,uFrequency;varying float vInk;
 #include <common>
 #include <morphtarget_pars_vertex>
 #include <skinning_pars_vertex>
 ${noise}
 void main(){
 #include <beginnormal_vertex>
 #include <morphnormal_vertex>
 #include <skinbase_vertex>
 #include <skinnormal_vertex>
 #include <defaultnormal_vertex>
 #ifdef FLIP_SIDED
 transformedNormal=-transformedNormal;
 #endif
 #include <begin_vertex>
 #include <morphtarget_vertex>
 #include <skinning_vertex>
 #include <project_vertex>
 vec4 samplePosition=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 samplePosition=instanceMatrix*samplePosition;
 #endif
 vec3 p=(modelMatrix*samplePosition).xyz;
 float detail=noise3(p*uFrequency+vec3(uTime*.7,-uTime,uTime*.4));
 float fine=noise3(p*uFrequency*2.13+vec3(-uTime*.4,uTime*.2,uTime));
 float wobble=(detail*.72+fine*.28-.5)*2.;
 mvPosition.xyz+=normalize(transformedNormal)*uWidth*max(.08,1.+uWarp*wobble);
 gl_Position=projectionMatrix*mvPosition;vInk=detail;
 }`;
 const fragmentShader=`uniform vec3 uColor;varying float vInk;void main(){gl_FragColor=vec4(uColor*(.90+.10*vInk),1.);}`;
 const materials=new Map(),entries=new Map();let elapsed=0,scanTime=0;
 function material(source){const key=(source.isSkinnedMesh?'skin':'static')+(source.morphTargetInfluences?'morph':'');if(!materials.has(key))materials.set(key,new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,side:THREE.BackSide,depthTest:true,depthWrite:false,skinning:!!source.isSkinnedMesh,morphTargets:!!source.morphTargetInfluences,morphNormals:!!source.geometry.morphAttributes.normal?.length}));return materials.get(key)}
 function refresh(){const sources=[];root.traverse(o=>{if(!o.isMesh||o.userData.inkOutline||o.userData.navigationIgnore||o.userData.outlineIgnore||!o.geometry?.attributes.normal)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m.transparent||m.side===THREE.DoubleSide))return;sources.push(o)});
 for(const source of sources){if(entries.has(source))continue;let outline;
 if(source.isInstancedMesh){outline=new THREE.InstancedMesh(source.geometry,material(source),source.count);outline.instanceMatrix=source.instanceMatrix;}
 else if(source.isSkinnedMesh){outline=new THREE.SkinnedMesh(source.geometry,material(source));outline.skeleton=source.skeleton;outline.bindMode=source.bindMode;outline.bindMatrix.copy(source.bindMatrix);outline.bindMatrixInverse.copy(source.bindMatrixInverse);}
 else outline=new THREE.Mesh(source.geometry,material(source));
 outline.name='Animated ink outline';outline.userData.inkOutline=true;outline.userData.navigationIgnore=true;outline.userData.outlineIgnore=true;outline.frustumCulled=false;outline.renderOrder=source.renderOrder-1;outline.castShadow=false;outline.receiveShadow=false;outline.raycast=()=>{};source.add(outline);entries.set(source,outline);}
 for(const [source,outline] of entries){let o=source;while(o&&o!==root)o=o.parent;if(!o){outline.parent?.remove(outline);entries.delete(source)}}
 }
 refresh();return {uniforms,refresh,update(dt){elapsed+=dt;uniforms.uTime.value=elapsed*.8;scanTime+=dt;if(scanTime>.5){refresh();scanTime=0}for(const [source,outline] of entries){if(source.isInstancedMesh)outline.count=source.count;if(source.morphTargetInfluences)outline.morphTargetInfluences=source.morphTargetInfluences;}},dispose(){for(const o of entries.values())o.parent?.remove(o);for(const m of materials.values())m.dispose();entries.clear();materials.clear()}};
};

/* Authored ground settings; scene integration only. */
window.createVillageGround=async({T,scene,world,sun,hemi,ambient,height,terrain,mist})=>{
 const ground=await window.createGroundSurface({assetBase:'assets/painterly-ground/',size:600,segments:240});
 Object.assign(ground.settings,{mudAmount:.68,mudScale:1,mudHeight:.02,particleCount:1,particleSize:1.15,puddleAmount:.5,puddleScale:.75,puddleHeight:.04,randomness:1,wetness:.25,skyIntensity:1,lampIntensity:1.15,hatch:.75,puddleBlur:.65,wave:.45,speed:2});

 // Four puddle densities: original, 60%, 30%, dry. Stable randomized regions.
 const puddleLevels=[1,.6,.3,0];
 const N=19,cell=10,wetCells=90,pixels=512,data=new Uint8Array(pixels*pixels*4);
 let seed=271828;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const candidates=[];for(let z=0;z<N;z++)for(let x=0;x<N;x++){const wx=-90+x*cell,wz=-90+z*cell,river=-15+4*Math.sin(wz*.035),nearWater=Math.abs(wx-river)<14||Math.hypot((wx+8)/12,(wz+24)/14)<1.6,nearVillage=Math.max(Math.abs(wx),Math.abs(wz))<42;const weight=nearWater?2.2:nearVillage?1.7:1;candidates.push({x,z,rank:-Math.log(Math.max(.000001,random()))/weight})}
 candidates.sort((a,b)=>a.rank-b.rank);const regions=new Map();for(const c of candidates.slice(0,wetCells))regions.set(c.z*N+c.x,{density:puddleLevels[Math.floor(random()*3)],cx:(random()-.5)*.8,cz:(random()-.5)*.8});
 for(let j=0;j<pixels;j++)for(let i=0;i<pixels;i++){const x=(i+.5)/pixels*190-95,z=(j+.5)/pixels*190-95,gx=Math.floor((x+95)/cell),gz=Math.floor((z+95)/cell),r=regions.get(gz*N+gx),idx=(j*pixels+i)*4;let amount=0;if(r){const cx=-90+gx*cell+r.cx,cz=-90+gz*cell+r.cz,d=Math.hypot((x-cx)/4.5,(z-cz)/4.5),fade=Math.max(0,Math.min(1,(1-d)/.18));amount=r.density*fade*fade*(3-2*fade)}data[idx]=data[idx+1]=data[idx+2]=Math.round(amount*255);data[idx+3]=255}
 const puddleRegions=new T.DataTexture(data,pixels,pixels,T.RGBAFormat);puddleRegions.magFilter=puddleRegions.minFilter=T.LinearFilter;puddleRegions.needsUpdate=true;ground.setPuddleRegions(puddleRegions);
 for(const l of ground.layers)mist?.(l.mesh.material,'vWorld');
 const geo=ground.layers[0].mesh.geometry,p=geo.attributes.position,uv=geo.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i);p.setZ(i,height(x,z));uv.setXY(i,x/5+.5,z/-5+.5)}p.needsUpdate=uv.needsUpdate=true;geo.computeVertexNormals();
 ground.group.traverse(o=>{o.userData.outlineIgnore=o.userData.navigationIgnore=true;o.raycast=()=>{}});world.add(ground.group);terrain.material.visible=false;
 return {ground,update(dt){ground.update(dt);const lamps=[];scene.traverse(o=>{if(!o.isPointLight||o.intensity<=0)return;for(let p=o;p;p=p.parent)if(!p.visible)return;lamps.push(o)});lamps.sort((a,b)=>b.intensity-a.intensity);const fireflyLights=lamps.filter(l=>l.userData.firefly).slice(0,6),regularLights=lamps.filter(l=>!l.userData.firefly);lamps.splice(0,lamps.length,...regularLights.slice(0,26),...fireflyLights);const tint=hemi.color.clone().multiplyScalar(hemi.intensity*.65).add(ambient.color.clone().multiplyScalar(ambient.intensity));
 for(const l of ground.layers){const u=l.mesh.material.uniforms;u.uAmbientTint.value.copy(tint);u.uSunColor.value.copy(sun.color);u.uSunDirection.value.copy(sun.position).normalize();u.uSunIntensity.value=sun.intensity;u.uHorizonTint.value.copy(scene.background);
 if(sun.shadow.map){u.uSceneShadow.value=sun.shadow.map.texture;u.uSceneShadowMatrix.value.copy(sun.shadow.matrix);u.uHasSceneShadow.value=1;u.uSceneShadowBias.value=sun.shadow.bias;u.uSceneShadowTexel.value.set(1/sun.shadow.mapSize.x,1/sun.shadow.mapSize.y)}
 for(let i=0;i<32;i++){const lamp=lamps[i];if(lamp){const p=lamp.getWorldPosition(new T.Vector3());u.uLamps.value[i].set(p.x,p.y,p.z,lamp.distance||15);u.uLampColors.value[i].copy(lamp.color).multiplyScalar(lamp.intensity)}else{u.uLamps.value[i].set(0,0,0,0);u.uLampColors.value[i].setRGB(0,0,0)}}}
 },dispose(){world.remove(ground.group);ground.dispose();puddleRegions.dispose();terrain.material.visible=true}};
};

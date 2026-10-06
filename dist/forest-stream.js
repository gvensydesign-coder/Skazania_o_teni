/* Tree coordinates persist; meshes, instance buffers and picking proxies exist
   only in fog-visible cells. Shared tree atlases are loaded once. */
window.createForestStream=function(api){
 const cells=new Map();let locations=[];
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 function visible(p,fog){const crown=4,r=Math.max(0,Math.max(Math.abs(p.x),Math.abs(p.z))-crown),exposure=Math.max(api.exposure(p.x,p.z),api.exposure(p.x-crown,p.z),api.exposure(p.x+crown,p.z),api.exposure(p.x,p.z-crown),api.exposure(p.x,p.z+crown));const mist=Math.min(.98,smooth(23,65,r-2.3)*fog*(1-exposure)*(.85+.15*Math.exp(-Math.max(p.height||0,0)*.12))),horizon=smooth(60,88,r)*(1-exposure);return (1-mist)*(1-horizon)>.08}
 function sync(fog=1){const desired=new Map();for(const p of locations){if(api.removed(p.key)||!visible(p,fog))continue;const key=Math.floor(p.x/16)+':'+Math.floor(p.z/16);if(!desired.has(key))desired.set(key,[]);desired.get(key).push(p)}let changed=false;for(const [key,cell] of cells){const list=desired.get(key);if(list&&cell.signature===list.map(p=>p.key).join('|')){desired.delete(key);continue}api.unload(cell.handle);cells.delete(key);changed=true}for(const [key,list] of desired){cells.set(key,{signature:list.map(p=>p.key).join('|'),handle:api.load(list)});changed=true}if(changed)api.changed?.();return stats()}
 function stats(){return {catalog:locations.length,trees:[...cells.values()].reduce((n,c)=>n+c.signature.split('|').length,0),cells:cells.size}}
 return {setCatalog(list){locations=list},sync,stats,dispose(){for(const cell of cells.values())api.unload(cell.handle);cells.clear()}};
};

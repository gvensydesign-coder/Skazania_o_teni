/* Keep standard/physical material shaders within mobile and ANGLE light limits.
   Emissive windows, rune sprites and lantern glows remain visible independently. */
window.createSceneLightBudget=function(T,scene,limit=8){
 const position=new T.Vector3();
 return {update(focus,budget=limit){const cap=Math.max(1,Math.min(limit,Math.floor(budget)||limit));const candidates=[];scene.traverse(o=>{if(!o.isPointLight)return;if(o.userData.lightBudgetHidden){o.visible=true;delete o.userData.lightBudgetHidden}if(!o.visible)return;for(let p=o.parent;p;p=p.parent)if(!p.visible)return;o.getWorldPosition(position);const distance=(position.x-focus.x)**2+(position.z-focus.z)**2;const power=Number.isFinite(o.intensity)?Math.max(0,o.intensity):0;candidates.push({light:o,score:power/(9+distance)});});candidates.sort((a,b)=>b.score-a.score||a.light.id-b.light.id);for(let i=cap;i<candidates.length;i++){const light=candidates[i].light;light.visible=false;light.userData.lightBudgetHidden=true}return Math.min(cap,candidates.length)}};
};

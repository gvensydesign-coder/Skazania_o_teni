/* Zoom quality controls effects only. Geometry, texture sources and gameplay stay intact. */
(function(root){
 const profiles=[{name:'Общий вид',shadow:1024,lights:4,reflection:4},{name:'Деревня',shadow:2048,lights:6,reflection:2.5},{name:'Рядом',shadow:2048,lights:8,reflection:1.8},{name:'Крупно',shadow:4096,lights:8,reflection:1.3}];
 function create(){let level=1,pending=1,elapsed=0;return {update(zoom,dt,mode='Автоматически'){const forced=profiles.findIndex(p=>p.name===mode);let next=forced>=0?forced:zoom<1?0:zoom<1.5?1:zoom<2.3?2:3;if(forced<0&&next!==level){const thresholds=[1,1.5,2.3];const boundary=thresholds[next>level?level:level-1];if(next>level&&zoom<boundary*1.1||next<level&&zoom>boundary*.9)next=level;}if(next!==pending){pending=next;elapsed=0;}elapsed+=Math.max(0,dt);if(forced>=0||elapsed>=.25)level=pending;return {...profiles[level],level}},get:()=>({...profiles[level],level})};}
 root.SceneQuality={profiles,create};if(typeof module!=='undefined')module.exports=root.SceneQuality;
})(typeof window!=='undefined'?window:globalThis);

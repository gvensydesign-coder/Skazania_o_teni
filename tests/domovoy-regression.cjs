const assert=require('assert'),fs=require('fs'),vm=require('vm'),{T,parse}=require('./character-assets.cjs');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/domovoy-controller.js','utf8'),ctx);
(async()=>{const gltf=await parse('dist/assets/domovoy/domovoy-animated.glb');for(const name of ['Idle','Walk','Talk','Beckon'])assert(gltf.animations.some(c=>c.name===name));
let state={screen:'game',phase:'day',ui:{sceneTime:'evening'},domovoy:{}},near=false,revision=1;const root=new T.Group();root.userData.villageObject={};root.add(gltf.scene);const c=ctx.window.createDomovoyController(T,root,gltf,{state:()=>state,scale:1,near:()=>near,navigation:{revision:()=>revision,height:()=>0,walkable:()=>true,findPath:async(a,b)=>[{...b}]}});
async function advance(seconds){for(let n=0;n<seconds*20;n++){c.tick(.05);await Promise.resolve()}}
await advance(12);assert(Math.hypot(root.position.x-8,root.position.z-4)<5);near=true;const p=root.position.clone();await advance(2);assert(root.position.distanceTo(p)<.001);near=false;
state.ui.sceneTime='night';await advance(90);assert(!root.visible);assert(!c.available());assert(state.domovoy.scene.hidden);
state=JSON.parse(JSON.stringify(state));await advance(2);assert(!root.visible,'loaded night remains hidden');state.ui.sceneTime='evening';await advance(90);assert(root.visible);assert(c.available());assert(root.position.z<8,'returns home rather than stopping at forest');
state.ui.openModal={type:'domovoyTrade'};const q=root.position.clone();await advance(3);assert(root.position.distanceTo(q)<.001);delete state.ui.openModal;revision++;await advance(2);assert(Number.isFinite(root.position.x));
console.log('PASS authored Domovoy clips, local patrol, proximity/trade pause, night departure, hidden-night save reload, evening return and navigation revision');})().catch(e=>{console.error(e);process.exitCode=1});

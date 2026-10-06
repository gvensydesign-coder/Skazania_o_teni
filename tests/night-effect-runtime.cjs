const fs=require('fs'),vm=require('vm'),assert=require('assert');
const grad={addColorStop(){}};const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>grad,createLinearGradient:()=>grad},{get:(o,k)=>o[k]||(()=>{})});
const canvas=()=>({style:{},getContext:()=>context});
const svg={style:{},set innerHTML(v){this.paths=[...v.matchAll(/<path data-g="(.*?)" d="(.*?)"/g)].map(([,g,d])=>({dataset:{g},getBBox:()=>{throw Error("SVG layout unavailable")},getAttribute:()=>d,setAttribute(){},cloneNode(){return {setAttribute(){},removeAttribute(){}}}}))},querySelectorAll(){return this.paths},insertBefore(){}};
const root={set innerHTML(v){},getElementById:id=>id==='logo'?svg:canvas()};
class Path2D{constructor(d){}addPath(){}}
const sandbox={window:{},document:{createElement:canvas},Path2D,console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/night-effect.js','utf8'),sandbox);
for(const n of [1,2,3]){const render=sandbox.window.createNightEffect({attachShadow:()=>root},n);assert.equal(typeof render,'function');for(const t of [0,.5,2.5,4,5.8,6.9,7])render(t)}console.log('PASS native effect factory and all three full animation timelines');

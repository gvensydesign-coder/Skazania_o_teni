/* Measure UI only when its size changes; no per-frame DOM scans. */
(()=>{
 let game,hudNode,dockNode,observer,frame=0;
 const queued=()=>{if(!frame)frame=requestAnimationFrame(measure)};
 function measure(){frame=0;if(!game?.isConnected)return;const bounds=game.getBoundingClientRect(),hud=game.querySelector('.hud-top'),dock=game.querySelector('.bottom-tray');const top=hud?Math.max(0,hud.getBoundingClientRect().bottom-bounds.top):0;const height=dock&&getComputedStyle(dock).visibility!=='hidden'?dock.getBoundingClientRect().height:0;game.style.setProperty('--hud-bottom',Math.ceil(top)+'px');game.style.setProperty('--dock-height',Math.ceil(height)+'px');const safe={top:Math.ceil(top+12),bottom:Math.ceil(height+24)};const changed=game.uiSafeInsets?.top!==safe.top||game.uiSafeInsets?.bottom!==safe.bottom;game.uiSafeInsets=safe;if(changed)window.village3D?.relayout?.();}
 function bind(){const next=document.querySelector('.game'),hud=next?.querySelector('.hud-top'),dock=next?.querySelector('.bottom-tray');if(next===game&&hud===hudNode&&dock===dockNode){queued();return}observer?.disconnect();game=next;hudNode=hud;dockNode=dock;if(!game)return;observer=new ResizeObserver(queued);for(const node of [game,hudNode,dockNode])if(node)observer.observe(node);queued();}
 window.gameResponsive={refresh:bind};
 const app=document.querySelector('#app');if(app)new MutationObserver(bind).observe(app,{childList:true});window.addEventListener('resize',queued,{passive:true});window.visualViewport?.addEventListener('resize',queued,{passive:true});document.fonts?.ready.then(queued);bind();
})();

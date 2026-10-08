/* One read-only projection of canonical game state, shared by information screens. */
(function(root){
 function snapshot(g){const p=g.villageProgress||{},r=p.repairs||{},layout=g.villageLayout||[],story=g.story||{};
 const repairs=Object.values(r),towers=layout.filter(o=>o.id==='tower'),guards=(p.guards||[]).filter(s=>towers.some(t=>t.x===s.x&&t.z===s.z)&&(g.villagers||[]).some(v=>v.id===s.id&&v.job==='guard'&&v.alive!==false));
 return {coins:g.hero?.coins??g.resources?.silver??0,items:(g.hero?.bag||[]).filter(i=>i.qty>0),resources:Object.entries(g.resources||{}).filter(([k])=>k!=='silver'),nodes:[
 {id:'church',title:'Церковь',done:repairs.some(r=>r.id==='chapel'),text:'Восстановление укрывает жителей; воспоминание открывается у входа.'},
 {id:'market',title:'Торговое место',done:repairs.some(r=>['market_ruin','tent_ruin'].includes(r.id)),text:'Ремонт открывает покупку и обмен у Домового.'},
 {id:'trade',title:'Первый обмен',done:!!p.domovoyMet&&p.trades>0,text:'Разговор и первая сделка знакомят с припасами Домового.'},
 {id:'homes',title:'Дома и свидетельства',done:repairs.filter(r=>r.id==='house_ruin').length>=2&&(p.homeTalked||[]).length>=2,text:'Домов восстановлено: '+repairs.filter(r=>r.id==='house_ruin').length+'; хозяев выслушано: '+(p.homeTalked||[]).length+'.'},
 {id:'guards',title:'Дозорные посты',done:guards.length>=4,text:'Действующих постов: '+guards.length+' / 4.'},
 {id:'ritual',title:'След обряда',done:!!story.ritualMemoryCompleted,text:story.ritualMemoryCompleted?(story.ritualDismantled?'Круг разобран; порча земли остаётся.':'Воспоминание записано; круг можно разобрать.'):'Осмотри круг у лесной кромки.'},
 {id:'nights',title:'Защита Выселок',done:(g.defense?.completed||0)>=3,text:'Отражено ночей: '+(g.defense?.completed||0)+' / 3.'}
 ]};}
 root.ProgressLinks={snapshot};if(typeof module!=='undefined')module.exports=root.ProgressLinks;
})(typeof window!=='undefined'?window:globalThis);
function progressLinksView(){const p=window.ProgressLinks.snapshot(game);return `<section class="progress-links"><h3 class="subhead">Восстановление Выселок</h3>${p.nodes.map(n=>`<p><strong>${n.done?'✓ ':''}${esc(n.title)}</strong> · ${esc(n.text)}</p>`).join('')}<div class="row"><button class="ghost" data-action="map">Нити судьбы</button><button class="ghost" data-action="hero">Профиль и снаряжение</button><button class="ghost" data-action="journal">Дневник</button></div></section>`}
function progressInventoryView(){const p=window.ProgressLinks.snapshot(game);return `<section class="progress-links"><h3 class="subhead">Запасы и кошелёк</h3><p>Серебро Влада: ${p.coins}. Материалы ниже принадлежат деревне.</p>${p.resources.map(([k,n])=>`<p>${esc(RES[k]?.[0]||k)} · ${n}</p>`).join('')}<p>Оберег бережника: ${game.domovoy?.upgrades?.ward?'приобретён':'не приобретён'}. Благосклонность Домового: ${game.domovoy?.favour||0} / 100.</p></section>`}

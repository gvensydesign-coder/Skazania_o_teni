window.BattleNarrative=(()=>{
 const opening=[
 ['Леший','Отдай мне дитя, человек. Не заставляй лес брать его вместе с теми, кто прячет.'],
 ['Влад','Какое дитя? Я никого не прячу. Ты пришёл к почти пустой деревне — оглянись!'],
 ['Леший','Оно гниёт. Пока дышит — гниль расползается. Ему не место ни под этой крышей, ни на этой земле.'],
 ['Влад','Я не видел здесь ребёнка. Остались несколько людей, которые боятся дожить до утра. А ты добиваешь тех, кто ещё жив!'],
 ['Леший','Я чувствую землю. Под домом — чёрное. Мне сказали: дитя вырастет, и лес умрёт. Не дам ему вырасти.','warning'],
 ['Влад','Кто тебе сказал? Те, что приходили ночью? Ты чувствуешь беду — а виновного тебе назвали другие. Тогда чувствуй лучше!']
 ];
 const closing=[
 ['Леший','За тобой Тьма. Я чую её на твоём следе. Ты привёл её — и теперь прикрываешь словами.'],
 ['Влад','Тьма здесь была раньше меня! Я вернулся к тому, что она оставила. Ты бьёшься со мной, а тот, кто отравил землю, остаётся в стороне.'],
 ['Леший','Ложь. Люди с огнём показали мне дом. Назвали дитя. Сказали: вырви его — и земля очистится.','manipulation'],
 ['Дуб с цепями','Нет.'],
 ['Леший','Ты тоже чувствуешь чёрное, старый. Не говори, что корни твои слепы.'],
 ['Дуб с цепями','Корни помнят. Люди с огнём рыли возле дома. Прятали в земле чужое. Там, где зарыли, земля начала умирать.','taint'],
 ['Дуб с цепями','Порча старше дитя. Живое пришло после. Ты услышал боль земли, лесной. Но чужие слова сказали тебе, кого винить.','roots'],
 ['Влад','Слышал? Боль настоящая. Только цель тебе выбрали другие. Хватит ломать деревню за них.']
 ];
 const roles={'Леший':'leshy','Влад':'vlad','Дуб с цепями':'oak'};
 function state(g){return g.defense.battleStory??={part:'opening',index:0,time:0,openingDone:false,closingDone:false}}
 function duration(line){return Math.max(5,Math.min(9,2+line[1].length/20))}
 function active(g,b){return g.defense.wave===3&&g.defense.stage==='active'&&b?.mode==='duel'&&b.hp>0}
 function line(g){const s=g.defense.battleStory;if(!s||s.part==='waiting'||s.part==='done')return null;return (s.part==='opening'?opening:closing)[s.index]}
 function remember(g,l,part,index){g.story.leshyBattleFacts??=[];const id=`leshy-battle-${part}-${index}`;g.story.leshyBattleRead??=[];if(!g.story.leshyBattleRead.includes(id)){g.story.leshyBattleRead.push(id);const noteId='leshy-battle-'+part;let note=g.dialogueNotes.find(n=>n.id===noteId);if(!note){note={id:noteId,villagerId:'leshy',speaker:'Влад, Леший и Дуб',title:'Бой с Лешим · '+(part==='opening'?'Чужое предупреждение':'Корни помнят'),text:'',place:'Выселки · третья ночь',day:g.day};g.dialogueNotes.push(note)}note.text+=(note.text?'\n\n':'')+l[0]+': '+l[1];}if(l[2]&&!g.story.leshyBattleFacts.includes(l[2])){g.story.leshyBattleFacts.push(l[2]);const facts={warning:'Леший ищет ребёнка: ему сообщили, что тот погубит лес.',manipulation:'Леший признал: люди с огнём указали ему дом и назвали ребёнка источником порчи.',taint:'Дуб помнит: люди с огнём рыли возле дома и зарыли там чужое. После этого земля начала умирать.',roots:'По памяти Дуба, порча старше ребёнка. Леший почувствовал настоящую Тьму, но ошибся в её источнике.'};g.journal.push(facts[l[2]]);if(typeof discoverCreature==='function'){discoverCreature('leshy','battle-'+l[2]);if(['taint','roots'].includes(l[2]))discoverCreature('ancient_oak','battle-'+l[2])}}}
 function tick(g,dt,b){
 if(active(g,b)){
 const s=state(g);
 if(s.part==='waiting'&&b.hp<=1){s.part='closing';s.index=0;s.time=0}
 const l=line(g);
 if(l){s.time+=dt;if(s.time>=duration(l)+.6){
 remember(g,l,s.part,s.index);s.time=0;s.index++;
 const list=s.part==='opening'?opening:closing;
 if(s.index>=list.length){if(s.part==='opening'){s.openingDone=true;s.part='waiting'}else{s.closingDone=true;s.part='done';b.stunnedUntil=g.defense.elapsed+5}}
 if(typeof autoSave==='function')autoSave();
 }}
 }
 paint(g,b)
 }
 function canHit(g,b){return !active(g,b)||b.hp>1||!!g.defense.battleStory?.closingDone}
 function hold(g,b){return active(g,b)&&b.hp<=1&&!g.defense.battleStory?.closingDone}
 function tips(g,b){const moving='Нажми на свободную землю, чтобы отойти. Двойной щелчок — бежать.';if(hold(g,b))return ['Леший остановился. Слушай: Дуб отвечает из деревни.','Корни помнят то, чего не увидел лес.'];if(b?.mode==='duel')return ['Леший в бою. Выбери его щелчком — Влад приблизится и начнёт атаковать.', 'Красный круг под ногами — ловушка. Отойди до вспышки.',moving,'После замаха Лешего отступай: удар может оттолкнуть тебя в ловушку.','У Лешего три сердца. После его прыжка снова сблизься для удара.'];return ['Выбери врага щелчком — Влад подойдёт и атакует.',moving,'Зелёные круги отмечают нападающих. Не подпускай их к жителям.','Лечебный корень в нижней панели восстановит до двух сердец.','Фонарь задержит ближайших врагов. Для вспышки нужна свеча.']}
 function paint(g,b){if(typeof document==='undefined')return;const panel=document.getElementById('battle-dialogue'),tip=document.getElementById('night-tip');const visible=g.screen==='game'&&g.phase==='combat'&&g.defense.stage==='active'&&!g.ui.openModal;const s=g.defense.battleStory,l=visible&&active(g,b)?line(g):null;
 if(panel){const key=l?`${s.part}:${s.index}`:'';if(panel.dataset.key!==key){panel.dataset.key=key;panel.className='battle-dialogue'+(l?' voice-'+roles[l[0]]:'');panel.innerHTML=l?`<span class="speaker">${typeof speakerMark==='function'?speakerMark(l[0]):''}<span>${l[0]}</span></span><p class="dialogue-text"></p>`:'';if(l)panel.querySelector('p').textContent=l[1]}panel.hidden=!l;panel.style.opacity=l?String(Math.min(1,s.time/.3,(duration(l)+.6-s.time)/.35)):0}
 if(tip){const show=visible&&g.settings?.hints!==false;const list=tips(g,b),clock=g.defense.elapsed||0,index=Math.floor(clock/9)%list.length;const text=show?(g.hero.hp<=2&&Math.floor(clock/9)%3===0?'Мало жизней. Используй лечебный корень в нижней панели.':list[index]):'';if(tip.textContent!==text)tip.textContent=text;tip.hidden=!show;tip.style.opacity=show?String(Math.min(1,(clock%9)/.35,(9-clock%9)/.5)):0}}
 function knowledge(g,id){const facts=g.story.leshyBattleFacts||[];if(id==='leshy'){const out=[];if(facts.includes('warning'))out.push('Охотился за ребёнком после предупреждения о гибели леса.');if(facts.includes('manipulation'))out.push('Люди с огнём указали ему дом и цель.');if(facts.includes('roots'))out.push('Чувствовал настоящую порчу, но принял живое существо за её источник. Дуб опроверг его убеждение.');return out.join(' ')}if(id==='ancient_oak'&&facts.includes('roots'))return 'Помнит заражение земли возле дома и различает старую порчу и живое существо, появившееся позже.';return ''}
 return {tick,canHit,hold,line,duration,opening,closing,knowledge,paint};
})();

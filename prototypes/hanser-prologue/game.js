(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PrologueState=api;})(globalThis,()=>{
  'use strict';
  const phases=['returning','disc','firstBattle','bedside','investigate','resolve','tower','secondBattle','purification','depart','complete'];
  const skillIds=['strike','flurry','expose','empower','heal','ward'];
  const flags=['arrival','broadcast','disc','firstBattle','companion','residentA','residentB','poster','resolve','secondBattle','ending'];
  const journalIds=['arrival','broadcast','firstBattle','bedside','gift','companion','residentA','residentB','poster','resolve','secondBattle','ending'];
  function fresh(){return {version:1,phase:'returning',map:'outskirts',x:22.5,y:27.5,dir:'up',flags:{},journal:[],loadout:['strike','flurry','heal','ward'],ultimate:'surge',seconds:0,battles:[],walking:false};}
  function transition(current,event){
    const s=JSON.parse(JSON.stringify(current));let changed=false;
    const add=id=>{if(!s.journal.includes(id))s.journal.push(id);};
    const flag=id=>{s.flags[id]=true;add(id);changed=true;};
    if(event==='arrival'&&!s.flags.arrival){flag('arrival');}
    if(event==='broadcast'&&s.phase==='returning'){flag('broadcast');s.phase='disc';s.x=16.5;s.y=14.5;}
    if(event==='pickup'&&s.phase==='disc'){s.flags.disc=true;changed=true;s.phase='firstBattle';}
    if(event==='firstVictory'&&s.phase==='firstBattle'){flag('firstBattle');s.phase='bedside';}
    if(event==='bedside'&&s.phase==='bedside'){flag('companion');add('bedside');add('gift');s.phase='investigate';s.map='outskirts';s.x=16.5;s.y=14.5;s.dir='down';}
    if(['residentA','residentB'].includes(event)&&s.flags.companion&&!s.flags[event]){flag(event);if(s.flags.residentA&&s.flags.residentB&&s.phase==='investigate')s.phase='resolve';}
    if(event==='poster'&&s.flags.companion&&!s.flags.poster)flag('poster');
    if(event==='resolve'&&s.phase==='resolve'&&s.flags.residentA&&s.flags.residentB){flag('resolve');s.phase='tower';}
    if(event==='gate'&&s.phase==='tower'){s.phase='secondBattle';changed=true;}
    if(event==='secondVictory'&&s.phase==='secondBattle'){flag('secondBattle');s.phase='purification';}
    if(event==='purified'&&s.phase==='purification'){s.phase='depart';changed=true;}
    if(event==='exit'&&s.phase==='depart'){flag('ending');s.phase='complete';}
    return changed?s:current;
  }
  function restore(raw){
    try{
      const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==1||!phases.includes(s.phase)||!['outskirts','town'].includes(s.map))return null;
      if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<.8||s.x>43||s.y<1||s.y>(s.map==='town'?35:34))return null;
      if(!s.flags||typeof s.flags!=='object'||!Array.isArray(s.journal)||!Array.isArray(s.loadout)||s.loadout.length!==4||new Set(s.loadout).size!==4||s.loadout.some(id=>!skillIds.includes(id))||!['surge','nova'].includes(s.ultimate))return null;
      const clean=fresh();clean.phase=s.phase;clean.map=s.map;clean.x=s.x;clean.y=s.y;clean.dir=['up','down','left','right'].includes(s.dir)?s.dir:'down';
      for(const f of flags)if(s.flags[f]===true)clean.flags[f]=true;clean.journal=[...new Set(s.journal.filter(id=>journalIds.includes(id)))];clean.loadout=[...s.loadout];clean.ultimate=s.ultimate;clean.seconds=Number.isFinite(s.seconds)?Math.max(0,Math.min(s.seconds,1e7)):0;
      clean.battles=Array.isArray(s.battles)?s.battles.slice(0,2).map(v=>({actions:Math.max(0,Number(v.actions)||0),dodges:Math.max(0,Number(v.dodges)||0),parries:Math.max(0,Number(v.parries)||0)})):[];
      const rank=phases.indexOf(s.phase);
      if(rank>=1&&!clean.flags.broadcast||rank>=2&&!clean.flags.disc||rank>=3&&!clean.flags.firstBattle||rank>=4&&!clean.flags.companion||rank>=5&&(!clean.flags.residentA||!clean.flags.residentB)||rank>=6&&!clean.flags.resolve||rank>=8&&!clean.flags.secondBattle||rank>=10&&!clean.flags.ending)return null;
      if(!clean.flags.companion&&s.map==='town')return null;return clean;
    }catch{return null;}
  }
  return {fresh,transition,restore,phases};
});

if(typeof document!=='undefined')(() => {
  'use strict';
  const S=PrologueState,W=PrologueWorld,D=PrologueStory,H=HanserDuel,$=id=>document.getElementById(id),show=(id,on)=>{$(id).hidden=!on;},set=(id,text)=>{if($(id).textContent!==String(text))$(id).textContent=text;};
  const SAVE='trails-of-hanser-prologue-v1',renderer=new W.Renderer($('world'));
  let state=S.fresh(),mode='title',dialogue=null,panel=null,path=[],pendingTarget=null,scene={},last=performance.now(),lastSave=0,toastUntil=0,bannerUntil=0,fadeUntil=0,nearest=null,returnFocus=null,saveError=false,audio=null,soundOn=false,footstep=0;
  const keys=new Set();let heldAction=new Set(),trace=[];
  const battle=new PrologueBattle({pause,result:battleResult,sound:kind=>tone(kind)});
  function readSave(){try{const value=S.restore(localStorage.getItem(SAVE));return value&&W.walkable(value.map,value.x,value.y)?value:null;}catch{return null;}}
  const existing=readSave();show('continue-game',!!existing);if(existing)set('continue-game','继续旅途 · '+(existing.phase==='complete'?'序章已完成':W.maps[existing.map].name));
  function save(){if(mode==='title')return;try{localStorage.setItem(SAVE,JSON.stringify({...state,walking:false}));}catch{if(!saveError){saveError=true;toast('浏览器未允许保存。当前旅途仍可继续，刷新后将重新开始。',6000);}}}
  function commit(event){const previous=state;state=S.transition(state,event);if(previous!==state){trace.push({event,phase:state.phase,map:state.map});save();}updateHud();}
  function toast(text,duration=2700){set('toast',text);show('toast',true);toastUntil=performance.now()+duration;}
  function banner(text){set('area-banner',text);show('area-banner',true);bannerUntil=performance.now()+2500;}
  function clearMovement(){keys.clear();path=[];pendingTarget=null;state.walking=false;scene.destination=null;}
  function tone(kind='step'){
    if(!soundOn)return;
    try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type=['step','damage'].includes(kind)?'triangle':'sine';const f={step:140,dialogue:530,parry:760,perfect:890,dodge:620,heal:660,damage:190,save:700};osc.frequency.setValueAtTime(f[kind]||430,now);osc.frequency.exponentialRampToValueAtTime((f[kind]||430)*.75,now+.09);gain.gain.setValueAtTime(kind==='step'?.012:.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.11);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(now+.12);}catch{soundOn=false;set('sound-button','声音：关');}}
  function updateHud(){
    set('location-name',scene.home?'家中':W.maps[state.map].name);let objective=D.objectives[state.phase];if(state.phase==='investigate')objective=state.map==='outskirts'?'沿东侧道路进入镇内街区，寻找熟悉的居民。':`调查小镇居民（${Number(!!state.flags.residentA)+Number(!!state.flags.residentB)} / 2），顺序由你决定。`;
    set('objective',objective);show('walk-help',mode==='explore');show('explore-hud',['explore','dialogue'].includes(mode));show('interact-hint',mode==='explore'&&!!nearest);if(nearest)set('interact-label',nearest.label);
    $('journal-button').disabled=mode!=='explore';$('pause-button').disabled=mode==='dialogue';
  }
  function setCue(cue){
    if(!cue)return;scene.cue=cue;scene.cueAt=performance.now();scene.hideMarkers=true;
    if(['broadcast','chase','disc','pickup','transform','purify','collapse'].includes(cue)){scene.focus={x:18,y:15};}
    if(cue==='home'){scene.home=true;flash();}
    if(cue==='arrival'){scene.focus=null;}
    if(['resolve','notebook'].includes(cue))scene.focus={x:state.x,y:state.y};
    if(cue==='companion')tone('heal');
    if(cue.startsWith('purify'))tone('heal');
    if(cue==='gate')scene.focus={x:22.5,y:10};
    if(cue==='depart')scene.focus={x:22.5,y:4.5};
    updateHud();
  }
  function flash(){if(renderer.reduced)return;$('fade').classList.add('on');fadeUntil=performance.now()+320;}
  function play(id,done){clearMovement();mode='dialogue';scene.hideMarkers=true;dialogue={id,lines:D.scripts[id],index:0,done,shownAt:performance.now(),drawn:false};show('dialogue',true);show('walk-help',false);show('interact-hint',false);show('choices',false);drawLine();updateHud();$('next-dialogue').focus({preventScroll:true});}
  function portrait(name){const c=$('portrait').getContext('2d');c.clearRect(0,0,64,72);c.imageSmoothingEnabled=false;const kind=name==='满穗'?'mansui':name==='守卫'?'mage':name==='居民'?'resident':'hero';if(['旁白','广播'].includes(name)){c.strokeStyle='#c4d2cf';c.fillStyle='#839eaa';c.lineWidth=2;if(name==='广播'){c.fillRect(16,29,15,19);c.beginPath();c.moveTo(31,29);c.lineTo(45,21);c.lineTo(45,56);c.lineTo(31,48);c.stroke();c.beginPath();c.arc(44,39,15,-.6,.6);c.stroke();}else{c.fillStyle='#667e8b';c.fillRect(12,17,42,44);c.fillStyle='#ddcaa0';c.fillRect(15,20,35,37);c.fillStyle='#8c927f';for(let i=0;i<5;i++)c.fillRect(20,26+i*5,23,1);c.fillStyle='#bbaa85';c.fillRect(13,20,3,37);}return;}W.actor(c,32,65,kind,'down',0,2.7,state.flags.disc);}
  function drawLine(){const l=dialogue.lines[dialogue.index];setCue(l.cue);set('speaker',l.speaker);portrait(l.speaker);set('dialogue-text','');set('dialogue-count',`${dialogue.index+1} / ${dialogue.lines.length}`);dialogue.shownAt=performance.now();dialogue.drawn=false;dialogue.full=l.text;tone('dialogue');}
  function nextDialogue(){if(mode!=='dialogue'||!dialogue)return;if(!dialogue.drawn){set('dialogue-text',dialogue.full);dialogue.drawn=true;return;}dialogue.index++;if(dialogue.index<dialogue.lines.length){drawLine();return;}const done=dialogue.done;dialogue=null;show('dialogue',false);scene={};mode='explore';nearest=null;done?.();updateHud();}
  function begin(reset){clearMovement();state=reset?S.fresh():readSave()||S.fresh();trace=[];mode='explore';scene={snap:true};show('title-screen',false);show('ending',false);show('panel',false);show('battle-hud',false);show('battle-world',false);banner(W.maps[state.map].name);updateHud();
    if(state.phase==='complete'){finish();return;}
    if(state.phase==='firstBattle'||state.phase==='secondBattle'){startBattle(state.phase==='firstBattle'?1:2,true);return;}
    if(state.phase==='purification'){play('purified',()=>commit('purified'));return;}
    if(state.phase==='bedside'){play('rescue',()=>{commit('bedside');flash();banner('归乡路 · 暮色');});return;}
    if(!state.flags.arrival)play('arrival',()=>{commit('arrival');toast('沿石路回家。走近家门按 E，或直接点击家门。',4500);});else save();
  }
  function changeMap(name){clearMovement();state.map=name;if(name==='town'){state.x=3.5;state.y=24.5;state.dir='right';}else{state.x=39.5;state.y=16.5;state.dir='left';}scene={snap:true};renderer.lastMap=null;flash();save();banner(W.maps[name].name);updateHud();}
  function interact(id){
    if(mode!=='explore')return;clearMovement();
    if(id==='home'){if(state.phase==='returning'){state.x=16.5;state.y=13.5;state.dir='up';play('broadcast',()=>{commit('broadcast');scene={cue:'disc',cueAt:performance.now()};toast('魔导盘落在门前。靠近并拾起它。');});}else play('homeAgain');return;}
    if(id==='disc'&&state.phase==='disc'){play('pickup',()=>{commit('pickup');startBattle(1);});return;}
    if(id==='east'&&state.flags.companion){changeMap('town');return;}if(id==='west'){changeMap('outskirts');return;}
    if(id==='residentA'||id==='residentB'){if(!state.flags.companion)return;const repeat=state.flags[id];play(repeat?(id==='residentA'?'repeatA':'repeatB'):id,()=>{if(!repeat){commit(id);if(state.phase==='resolve')toast('两处调查已完成。到街区中央的路口停一停。',4200);}});return;}
    if(id==='poster'){play('poster',()=>commit('poster'));return;}
    if(id==='resolve'&&state.phase==='resolve'){play('resolve',()=>{commit('resolve');banner('向前一步');toast('沿北侧石路向憨塔出发。可先在「旅途」中调整技能。',4400);});return;}
    if(id==='gate'&&state.phase==='tower'){play('gate',()=>{commit('gate');startBattle(2);});return;}
    if(id==='exit'&&state.phase==='depart'){play('departure',()=>{commit('exit');finish();});return;}
    if(['guard','closed'].includes(id))play(id);
  }
  function startBattle(number,resuming=false){
    clearMovement();mode='battle';scene={};show('dialogue',false);show('explore-hud',false);show('walk-help',false);show('interact-hint',false);battle.start(number,state.loadout,state.ultimate);save();
    const first=number===1;
    const introduction=first?`<p>满穗的声音从魔导盘传来：“别急。我会护着你，一步一步来。”</p><p>跟着左侧提示，先试一次普通攻击。之后再练习技能、应对和药剂，最后用大招结束战斗。</p><p class="battle-hint">本场使用基础招式。反应练习会在有效时机等你，按早或按错都能重试。${resuming?'本场教学从第一步重新开始，之前的剧情仍保留。':'不用一次记住全部操作，跟着亮起的指令就好。'}</p>`:`<p>${resuming?'从本场战斗开始处恢复；之前完成的剧情和调查均保留。':'守卫的法术会逐击到来。观察红光，让满穗有机会净化他。'}</p><div class="controls-list"><div><b>选择行动</b>点击菜单，或 ↑ ↓ / 1–4 选择。Enter 确认目标，Esc 返回。</div><div><b>闪避与格挡</b>标记接近右侧亮区时按 J 闪避；K 格挡更精确，并恢复技力。</div><div><b>红光攻击</b>只能闪避。同组的每一击都可以重新应对。</div><div><b>共鸣与大招</b>Space 为技能增加奖励；R 预约大招，等完整行动结束后释放。</div></div><p class="battle-hint">这场战斗不会停在亮区等待。技能漏按共鸣仍有基础效果；普攻恢复技力，药剂和治疗恢复生命。</p>`;
    openPanel(resuming?'继续战斗':first?'借来的力量':'这一次，主动向前',introduction,[{label:first?'跟着满穗试一试':'走向守卫',primary:true,action:closePanel}],{kind:'battleIntro'});
  }
  function battleResult(result,number,stats){
    if(result==='victory'){
      openPanel('攻击停下来了',`<p>${number===1?'追兵的武器落地。满穗正在向他走来。':'光芒散去。现在，满穗终于能靠近守卫。'}</p>${number===1?'<p>七步练习完成：攻击、闪避、技能共鸣、格挡、药剂、红光应对和大招。之后可在「旅途」中自由搭配能力。</p>':''}<p>行动 ${stats.actions} 次 · 闪避 ${stats.dodges} 次 · 精准格挡 ${stats.parries} 次</p>`,[{label:'继续剧情',primary:true,action:()=>{closePanel();battle.stop();mode='explore';state.battles.push(stats);if(number===1){commit('firstVictory');play('rescue',()=>{commit('bedside');flash();banner('归乡路 · 暮色');});}else{commit('secondVictory');play('purified',()=>{commit('purified');banner('道路已经让开');});}}}],{kind:'result'});
    }else openPanel('先缓一口气',`<p>满穗的声音仍在：“别急。我还在这里。”</p><p>重试会恢复本场初始生命、技力与药剂，已经完成的剧情和调查会保留。</p>`,[{label:'重试本场',primary:true,action:()=>{closePanel();startBattle(number,true);}},{label:'调整技能',action:()=>loadoutPanel(()=>startBattle(number,true))}],{kind:'defeat'});
  }
  function openPanel(title,html,actions,options={}){
    if(!panel)returnFocus=document.activeElement;clearMovement();battle.pause();panel={title,kind:options.kind||'general',onClose:options.onClose};set('panel-title',title);$('panel-content').innerHTML=html;$('panel-actions').replaceChildren();for(const a of actions){const button=document.createElement('button');button.textContent=a.label;if(a.primary)button.className='primary';if(a.disabled)button.disabled=true;button.onclick=a.action;$('panel-actions').append(button);}show('panel',true);$('panel-actions').querySelector('button:not(:disabled)')?.focus({preventScroll:true});$('dialogue').inert=true;$('explore-hud').inert=true;$('battle-hud').inert=true;}
  function closePanel(){const cb=panel?.onClose;show('panel',false);panel=null;$('dialogue').inert=false;$('explore-hud').inert=false;$('battle-hud').inert=false;battle.resume();last=performance.now();returnFocus?.focus?.({preventScroll:true});cb?.();}
  function pause(reason){if(panel||!['explore','battle'].includes(mode))return;save();openPanel('旅途暂歇',`<p>${typeof reason==='string'?reason:'当前进度已记下。可以休息一下，再继续向前。'}</p>`,[{label:'继续',primary:true,action:closePanel},{label:'操作说明',action:help},{label:'回到标题',action:()=>{closePanel();battle.stop();mode='title';scene={};show('title-screen',true);show('explore-hud',false);show('walk-help',false);show('interact-hint',false);show('continue-game',true);set('continue-game','继续旅途');}}],{kind:'pause'});}
  function help(){openPanel('操作说明',`<div class="controls-list"><div><b>探索</b>WASD / 方向键行走；E / Enter 调查；点击地面自动寻路，点击人物前往交谈。</div><div><b>对白</b>Enter / Space / E 或点“继续”；首按显示完整文字，再按进入下一句。</div><div><b>旅途</b>M 查看记录和调整能力；Esc 暂停。金色标记指向当前主线。</div><div><b>战斗</b>↑ ↓ / 数字键选招，Enter 确认；J 闪避，K 格挡，Space 共鸣，R 大招。</div></div><p>每段剧情结束后保存检查点。刷新时重播尚未结束的剧情段；战斗从本场开始处恢复。</p>`,[{label:'返回旅途',primary:true,action:closePanel}],{kind:'help'});}
  function journal(){if(mode==='dialogue'||mode==='battle')return;const entries=state.journal.map(id=>D.journal[id]).filter(Boolean);openPanel('旅途记录',`<p>${D.objectives[state.phase]}</p><ul class="journal-list">${entries.map(([title,description])=>`<li><strong>${title}</strong><p>${description}</p></li>`).join('')}</ul>`,[{label:'回到旅途',primary:true,action:closePanel},...(state.flags.disc&&mode!=='complete'?[{label:'调整拟态能力',action:()=>loadoutPanel()}]:[]),{label:'操作说明',action:help}],{kind:'journal'});}
  function loadoutPanel(onDone){
    const chosen=[...state.loadout];let ult=state.ultimate;
    function draw(){openPanel('魔导盘 · 拟态能力',`<p>选择四个普通技能与一个大招。序章能力均为满穗信物的玩法占位，不代表正式招式定稿。</p><h3>普通技能 <span id="equip-count">${chosen.length} / 4</span></h3><div class="equip-grid">${Object.entries(H.SKILLS).map(([id,s])=>`<button data-equip="${id}" class="${chosen.includes(id)?'selected':''}" aria-pressed="${chosen.includes(id)}">${s.name} · ${s.cost} 技力<small>${s.desc}</small></button>`).join('')}</div><h3>大招</h3><div class="equip-grid">${Object.entries(H.ULTS).map(([id,s])=>`<button data-ult="${id}" class="${ult===id?'selected':''}" aria-pressed="${ult===id}">${s.name}<small>${s.desc}</small></button>`).join('')}</div>`,[{label:onDone?'保存并重试':'保存搭配',primary:true,disabled:chosen.length!==4,action:()=>{state.loadout=[...chosen];state.ultimate=ult;save();closePanel();if(onDone)onDone();else toast('拟态能力已装配。');}},{label:'取消',action:()=>{closePanel();if(onDone)battleResult('defeat',battle.number,battle.game.stats);}}],{kind:'loadout'});
      $('panel-content').querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.equip,idx=chosen.indexOf(id);if(idx>=0)chosen.splice(idx,1);else if(chosen.length<4)chosen.push(id);else toast('四个槽位已满，先取消一个技能。');draw();});$('panel-content').querySelectorAll('[data-ult]').forEach(b=>b.onclick=()=>{ult=b.dataset.ult;draw();});}
    draw();
  }
  function finish(){clearMovement();battle.stop();mode='complete';show('explore-hud',false);show('walk-help',false);show('interact-hint',false);show('dialogue',false);show('ending',true);const mins=Math.floor(state.seconds/60),secs=Math.floor(state.seconds%60);set('ending-stats',`旅途用时 ${mins} 分 ${secs} 秒 · 两场战斗 · 两位居民${state.flags.poster?' · 一份旧约定':''}`);save();$('replay').focus({preventScroll:true});}
  function requestNewGame(){if(readSave())openPanel('重新开始旅途',`<p>重新开始会替换本浏览器中的序章检查点。现有旅途仍可从标题页继续。</p>`,[{label:'重新开始',primary:true,action:()=>{closePanel();begin(true);}},{label:'取消',action:closePanel}],{kind:'restart'});else begin(true);}
  function moveTo(point,target){
    let destination=point;
    if(target){const candidates=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p={x:Math.floor(point.x)+dx+.5,y:Math.floor(point.y)+dy+.5};if(W.walkable(state.map,p.x,p.y))candidates.push(p);}candidates.sort((a,b)=>Math.hypot(a.x-state.x,a.y-state.y)-Math.hypot(b.x-state.x,b.y-state.y));let found=null;for(const candidate of candidates){const route=W.findPath(state.map,state,candidate);if(route.length||Math.hypot(candidate.x-state.x,candidate.y-state.y)<1){found={candidate,route};break;}}if(!found){toast('从石路绕过去试试。');return;}destination=found.candidate;path=found.route;pendingTarget=target.id;}
    else {path=W.findPath(state.map,state,destination);pendingTarget=null;}
    if(!path.length){if(target&&Math.hypot(target.x-state.x,target.y-state.y)<2.1)interact(target.id);else if(!target)toast('那里走不过去，试试旁边的道路。');return;}scene.destination=destination;
  }
  function mapClick(e){if(mode!=='explore'||panel)return;const rect=$('world').getBoundingClientRect(),point=renderer.screenToWorld(e.clientX-rect.left,e.clientY-rect.top);const all=W.interactions(state);
    // Tall sprites are clicked above their ground anchor, while ground markers remain clickable.
    const target=all.filter(t=>Math.hypot(point.x-t.x,point.y-t.y)<1.35||Math.abs(point.x-t.x)<.9&&point.y>t.y-2&&point.y<t.y).sort((a,b)=>Math.hypot(point.x-a.x,point.y-a.y)-Math.hypot(point.x-b.x,point.y-b.y))[0];
    if(target)moveTo(target,target);else moveTo(point);
  }
  function updateMovement(dt,now){
    if(mode!=='explore'||panel)return;let dx=0,dy=0;const down=k=>keys.has(k);
    if(down('ArrowLeft')||down('a'))dx--;if(down('ArrowRight')||down('d'))dx++;if(down('ArrowUp')||down('w'))dy--;if(down('ArrowDown')||down('s'))dy++;
    if(dx||dy){path=[];pendingTarget=null;scene.destination=null;}
    else if(path.length){const p=path[0],vx=p.x-state.x,vy=p.y-state.y,d=Math.hypot(vx,vy);if(d<.08){state.x=p.x;state.y=p.y;path.shift();}else{dx=vx/d;dy=vy/d;}}
    state.walking=!!(dx||dy);if(state.walking){const len=Math.hypot(dx,dy)||1,speed=(keys.has('Shift')?5.3:3.8)*dt/1000;dx/=len;dy/=len;state.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';let step=speed;if(path.length)step=Math.min(step,Math.hypot(path[0].x-state.x,path[0].y-state.y));const nx=state.x+dx*step,ny=state.y+dy*step;
      if(W.walkable(state.map,nx,state.y))state.x=nx;if(W.walkable(state.map,state.x,ny))state.y=ny;if(now-footstep>340){tone('step');footstep=now;}}
    if(!path.length&&pendingTarget){const target=W.interactions(state).find(t=>t.id===pendingTarget);pendingTarget=null;scene.destination=null;if(target&&Math.hypot(target.x-state.x,target.y-state.y)<2.2){interact(target.id);return;}}
    nearest=W.interactions(state).filter(t=>Math.hypot(t.x-state.x,t.y-state.y)<1.8).sort((a,b)=>Math.hypot(a.x-state.x,a.y-state.y)-Math.hypot(b.x-state.x,b.y-state.y))[0]||null;
    if(state.map==='outskirts'&&state.flags.companion&&state.x>41.6&&state.y>13&&state.y<20){changeMap('town');return;}
    if(state.map==='town'&&state.x<1.7&&state.y>21&&state.y<28){changeMap('outskirts');return;}
    // The tower road stays sealed until both investigations and the decision are complete.
    if(state.map==='town'&&state.y<10.3&&!['depart','complete'].includes(state.phase)){state.y=10.3;path=[];if(state.phase==='tower'&&state.x>19&&state.x<25){interact('gate');return;}if(now-lastBarrier>2500){toast('先看看镇里的居民，再决定接下来怎么走。');lastBarrier=now;}}
    updateHud();if(now-lastSave>2500){save();lastSave=now;}
  }
  let lastBarrier=0;
  function tick(now){
    const dt=Math.min(80,Math.max(0,now-last));last=now;if(!panel&&!document.hidden&&['explore','dialogue','battle'].includes(mode))state.seconds+=dt/1000;
    if(fadeUntil&&now>fadeUntil){$('fade').classList.remove('on');fadeUntil=0;}
    if(toastUntil&&now>toastUntil){show('toast',false);toastUntil=0;}if(bannerUntil&&now>bannerUntil){show('area-banner',false);bannerUntil=0;}
    if(mode==='dialogue'&&dialogue&&!dialogue.drawn&&!panel){const count=renderer.reduced?dialogue.full.length:Math.floor((now-dialogue.shownAt)/22);set('dialogue-text',dialogue.full.slice(0,count));if(count>=dialogue.full.length)dialogue.drawn=true;}
    if(mode==='title'){const titleState={...state,map:'town',x:23,y:23,flags:{},dir:'up'};renderer.render(titleState,now,{hideMarkers:true,focus:{x:23,y:19}});}
    else if(mode==='battle')battle.frame();else{updateMovement(dt,now);renderer.render(state,now,{...scene,hideMarkers:mode!=='explore'});scene.snap=false;}
    // DOM diagnostics are read-only telemetry for browser regression checks.
    const debug=$('game').dataset;debug.mode=mode;debug.phase=state.phase;debug.map=state.map;debug.x=state.x.toFixed(3);debug.y=state.y.toFixed(3);debug.dialogue=dialogue?.id||'';debug.dialogueIndex=String(dialogue?.index??-1);debug.panel=panel?.kind||'';debug.cameraX=String(renderer.camera.x);debug.cameraY=String(renderer.camera.y);debug.scale=String(renderer.scale);
    if(battle.game){const bg=battle.game,hit=bg.action?.hits.find(h=>!h.done);debug.battleMode=bg.mode;debug.battleMenu=battle.menu.page;debug.actor=bg.action?.actor||'';debug.hitIn=hit?String(Math.round(hit.at-bg.now)):'';debug.attempted=String(!!hit?.attempted);debug.red=String(!!hit?.red);debug.playerHp=String(bg.player.hp);debug.enemyHp=String(bg.enemy.hp);debug.tp=String(bg.tp);debug.result=bg.result||'';}
    requestAnimationFrame(tick);
  }
  $('world').addEventListener('pointerdown',mapClick);$('next-dialogue').onclick=nextDialogue;$('interact-button').onclick=()=>nearest&&interact(nearest.id);$('new-game').onclick=requestNewGame;$('continue-game').onclick=()=>begin(false);$('journal-button').onclick=journal;$('pause-button').onclick=()=>pause();$('replay').onclick=requestNewGame;$('ending-journal').onclick=journal;
  $('sound-button').onclick=()=>{soundOn=!soundOn;set('sound-button',soundOn?'声音：开':'声音：关');$('sound-button').setAttribute('aria-pressed',soundOn);tone('dialogue');};
  document.addEventListener('keydown',e=>{
    const key=e.key,lower=key.toLowerCase();if(key==='Tab'&&panel){const focusable=[...$('panel').querySelectorAll('button:not(:disabled)')];if(focusable.length){const at=focusable.indexOf(document.activeElement),next=e.shiftKey?(at<=0?focusable.length-1:at-1):(at+1)%focusable.length;e.preventDefault();focusable[next].focus();}return;}
    if(key==='Tab')return;if(e.repeat&&['Enter',' ','e','j','k','r','Escape','m'].includes(lower==='escape'?'Escape':lower)){e.preventDefault();return;}
    if(panel){if(key==='Escape'&&['pause','journal','help','restart','general'].includes(panel.kind)){e.preventDefault();closePanel();}return;}
    if(mode==='title'||mode==='complete')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','Escape','w','a','s','d','e','j','k','r','m','1','2','3','4'].includes(key)||['w','a','s','d','e','j','k','r','m'].includes(lower))e.preventDefault();
    if(mode==='dialogue'){if(['Enter',' '].includes(key)||lower==='e')nextDialogue();return;}
    if(mode==='battle'){battle.key(key);return;}
    if(key==='Escape'){pause();return;}if(lower==='m'){journal();return;}
    if(['Enter',' '].includes(key)||lower==='e'){if(nearest)interact(nearest.id);else toast('靠近人物或金色标记后调查。');return;}
    keys.add(key.startsWith('Arrow')?key:lower==='shift'?'Shift':lower);
    if(!e.repeat&&(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)||['w','a','s','d'].includes(lower)))updateMovement(55,performance.now());
  });
  document.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.key.toLowerCase());heldAction.delete(e.key);});
  window.addEventListener('blur',()=>{clearMovement();if(!panel&&['battle','explore'].includes(mode))pause('窗口已失去焦点，旅途已暂停。');});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearMovement();if(!panel&&['battle','explore'].includes(mode))pause('页面已切换，旅途已暂停。');}});
  window.addEventListener('pagehide',()=>{if(mode==='explore')save();});
  // Read-only inspection surface for diagnostics. It cannot alter story progression or win battles.
  Object.defineProperty(window,'prologue',{value:Object.freeze({snapshot:()=>JSON.parse(JSON.stringify({state,mode,panel:panel?.kind||null,dialogue:dialogue?{id:dialogue.id,index:dialogue.index,done:dialogue.drawn}:null,scene,path: path.length,nearest:nearest?.id||null,battle:battle.game?{number:battle.number,mode:battle.game.mode,now:battle.game.now,hp:battle.game.player.hp,enemyHP:battle.game.enemy.hp,tp:battle.game.tp,energy:battle.game.energy,result:battle.game.result,menu:battle.menu.page,action:battle.game.action,stats:battle.game.stats}:null,trace})),camera:()=>({...renderer.camera,scale:renderer.scale})}),writable:false});
  requestAnimationFrame(tick);
})();

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('../game.js'),W=require('../world.js'),D=require('../story.js'),H=require('../duel-core.js');
const events=['arrival','broadcast','pickup','firstVictory','bedside','residentA','residentB','resolve','gate','secondVictory','purified','exit'];
const run=(list=events)=>list.reduce(S.transition,S.fresh());
test('all approved JavaScript files parse, and HTML has only local script dependencies',()=>{const dir=path.join(__dirname,'..');for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(dir,name),'utf8'));const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');for(const [,src]of html.matchAll(/<script src="([^"]+)"/g))assert.ok(fs.existsSync(path.join(dir,src)));assert.doesNotMatch(html,/<(?:script|link|img)[^>]+(?:src|href)="https?:/);});
test('full ordered story ends at departure, with two victories and two investigations',()=>{const s=run();assert.equal(s.phase,'complete');for(const f of ['firstBattle','companion','residentA','residentB','resolve','secondBattle','ending'])assert.equal(s.flags[f],true);assert.equal(s.journal.length,new Set(s.journal).size);});
test('residents can be investigated in either order with identical outcome',()=>{const a=run(),b=run(events.map(x=>x==='residentA'?'residentB':x==='residentB'?'residentA':x));assert.deepEqual(a.flags,b.flags);assert.equal(b.phase,'complete');});
test('premature battle, decision and departure events cannot bypass progress gates',()=>{let s=S.fresh();for(const e of ['pickup','firstVictory','bedside','resolve','gate','secondVictory','purified','exit'])assert.strictEqual(S.transition(s,e),s);s=run(events.slice(0,5));assert.strictEqual(S.transition(s,'resolve'),s);s=S.transition(s,'residentA');assert.strictEqual(S.transition(s,'resolve'),s);});
test('repeated interactions never regress or duplicate completed events',()=>{let s=run();const original=JSON.stringify(s);for(const e of events)s=S.transition(s,e);assert.equal(JSON.stringify(s),original);});
test('optional poster is independent of the required investigations',()=>{let s=run(events.slice(0,5));s=S.transition(s,'poster');assert.equal(s.phase,'investigate');assert.equal(s.flags.poster,true);assert.ok(s.journal.includes('poster'));assert.strictEqual(S.transition(s,'poster'),s);});
test('every checkpoint restores exactly, including each pending battle',()=>{let s=S.fresh();for(const e of events){s=S.transition(s,e);const r=S.restore(JSON.stringify(s));assert.ok(r,e);assert.equal(r.phase,s.phase);assert.deepEqual(r.flags,s.flags);assert.deepEqual(r.loadout,s.loadout);}});
test('invalid, partial and future saves are rejected safely',()=>{for(const raw of ['{',null,{}, {...S.fresh(),version:2},{...S.fresh(),phase:'complete'},{...S.fresh(),x:NaN},{...S.fresh(),loadout:['strike','strike','heal','ward']},{...S.fresh(),map:'town'}])assert.equal(S.restore(raw),null);});
test('save normalization removes unknown state and duplicate journals',()=>{const s=run(events.slice(0,5));s.journal.push('arrival','unknown');s.flags.unknown=true;s.walking=true;const r=S.restore(s);assert.equal(r.walking,false);assert.equal(r.flags.unknown,undefined);assert.equal(r.journal.includes('unknown'),false);assert.equal(r.journal.filter(x=>x==='arrival').length,1);});
test('required world anchors are walkable and connected',()=>{for(const [name,m]of Object.entries(W.maps)){const start=name==='outskirts'?{x:22.5,y:27.5}:{x:3.5,y:24.5};for(const [id,p]of Object.entries(m.points)){assert.ok(W.walkable(name,p.x,p.y),name+': '+id+' walkable');const route=W.findPath(name,start,p);assert.ok(route.length,name+': '+id+' reachable');for(const point of route)assert.ok(W.walkable(name,point.x,point.y));}}});
test('navigation cannot walk through buildings or beyond map edges',()=>{assert.equal(W.walkable('outskirts',15,9),false);assert.equal(W.walkable('town',8,17),false);assert.equal(W.walkable('town',-1,5),false);assert.deepEqual(W.findPath('outskirts',{x:22,y:27},{x:15,y:9}),[]);});
test('map markers match current objectives and disappear after completion',()=>{let s=S.fresh();assert.deepEqual(W.objectivePoints(s),[W.maps.outskirts.points.home]);s=run(events.slice(0,5));s.map='town';assert.equal(W.objectivePoints(s).length,2);s=S.transition(s,'residentB');assert.deepEqual(W.objectivePoints(s),[W.maps.town.points.residentA]);assert.deepEqual(W.objectivePoints(run()),[]);});
test('all scripts have named speakers, usable text and all core story beats',()=>{for(const [id,lines]of Object.entries(D.scripts)){assert.ok(lines.length,id);for(const l of lines){assert.ok(l.speaker);assert.ok(l.text.length>0);assert.ok(l.text.length<150,`${id}: ${l.text.length}`);}}const text=D.scripts.rescue.map(l=>l.text).join('');for(const word of ['人偶','卡带','银狼','净化','通道','感情','等后面','信物'])assert.ok(text.includes(word),word);assert.ok(D.scripts.resolve.some(l=>l.text.includes('休息很久')));assert.ok(D.scripts.gate.some(l=>l.text.includes('他也能恢复吗')));});
test('mage has distinct multi-hit and red-light patterns',()=>{assert.ok(H.ENEMY_MOVES.spell);assert.deepEqual(H.ENEMY_MOVES.cascade.red,[false,true,false]);assert.equal(H.ENEMY_MOVES.sparks.damage.length,3);new H.Duel({enemyPattern:['spell','sparks','seal','cascade']});});
function autoBattle(pattern,perfect){const g=new H.Duel({enemyHP:224,enemyPattern:pattern});let guard=0;while(!g.result&&guard++<500){if(g.mode==='choose'){if(g.energy>=H.ULTS[g.ultimate].cost)g.requestUltimate();else if(g.player.hp<65&&g.tp>=2)g.act('skill','heal');else if(g.tp>=3)g.act('skill','flurry');else g.act('attack');}else{const h=g.action.hits.find(h=>!h.done);if(h){if(perfect)g.advanceTo(h.at,g.action.actor==='enemy'?(h.red?'dodge':'parry'):g.action.spec.timing?'timing':undefined);else g.advanceTo(h.at);}else g.advanceTo(g.action.end);}}assert.ok(guard<500);return g;}
test('both enemy configurations can be defeated through actual timing rules',()=>{for(const pattern of [['single','combo','red'],['spell','sparks','seal','cascade']]){const g=autoBattle(pattern,true);assert.equal(g.result,'victory');assert.ok(g.stats.parries>0);}});
test('a failed battle can restart with clean resources and retained loadout',()=>{const g=new H.Duel({enemyHP:9999,playerHP:18,enemyPattern:['seal']});g.act('attack');while(!g.result)g.advanceTo(g.nextEvent());assert.equal(g.result,'defeat');const retry=new H.Duel({loadout:g.loadout,ultimate:g.ultimate});assert.equal(retry.player.hp,120);assert.equal(retry.tp,3);assert.equal(retry.energy,0);assert.deepEqual(retry.loadout,g.loadout);});
test('late inputs and repeated confirmations cannot duplicate an action',()=>{const g=new H.Duel(),menu=new H.BattleMenu(g);menu.activate('attack');assert.ok(menu.confirm());assert.equal(menu.confirm(),false);const end=g.action.end;g.advanceTo(end);assert.equal(g.stats.actions,1);});

function loadBattlePresentation(){
  const elements=new Map();
  const context=vm.createContext({HanserDuel:H,PrologueWorld:W,matchMedia:()=>({matches:false}),document:{getElementById(id){
    if(!elements.has(id))elements.set(id,{getContext:()=>({}),addEventListener(){}});
    return elements.get(id);
  }}});
  for(const file of ['duel-scene.js','battle.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return context;
}
function segmentHitsTriangle(from,to,a,b,c){
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const direction=sub(to,from),edge1=sub(b,a),edge2=sub(c,a),h=cross(direction,edge2),det=dot(edge1,h);
  if(Math.abs(det)<1e-8)return false;
  const inverse=1/det,s=sub(from,a),u=inverse*dot(s,h);
  if(u<0||u>1)return false;
  const q=cross(s,edge1),v=inverse*dot(direction,q);
  if(v<0||u+v>1)return false;
  const distance=inverse*dot(edge2,q);
  return distance>.001&&distance<.999;
}
test('town scenery never blocks actor sight lines during battle camera transitions',()=>{
  const context=loadBattlePresentation(),scene=new context.PrologueBattle({}).scene,poses={};
  for(const key of ['command','skills','targetEnemy','targetSelf','player','enemy','ultimate']){
    scene.camera(key,0,1920,919);scene.camera(key,650,1920,919);
    poses[key]=Array.from(scene.pose.eye);
  }
  const triangles=scene.geometry.filter(face=>face.p.some(p=>p[1]>.03))
    .flatMap(face=>face.p.slice(1,-1).map((p,i)=>[face.p[0],p,face.p[i+2]]));
  // Torso/head positions at rest, lunging, and dodging. Check the full path,
  // not only the final camera pose where the original wall filled the screen.
  const targets=[[-2,.9,2],[-2,1.8,2],[1.6,1.3,-2.6],[1.6,2.4,-2.6],[.7,1.2,-1.45],[-.63,1.3,.25],[-2.6,1.25,2.48]];
  for(const [from,a]of Object.entries(poses))for(const [to,b]of Object.entries(poses))for(let step=0;step<=20;step++){
    const eye=a.map((v,i)=>v+(b[i]-v)*step/20);
    for(const target of targets)assert.equal(triangles.some(t=>segmentHitsTriangle(eye,target,...t)),false,
      `scenery blocks ${from} -> ${to}, sample ${step}/20, actor ${target}`);
  }
});

function tutorialBattle(){
  const Battle=loadBattlePresentation().PrologueBattle;
  assert.equal(typeof Battle.createDuel,'function','first battle needs its guided rules');
  return {Battle,game:Battle.createDuel(1,['empower','expose','heal','ward'],'nova')};
}
function advanceLesson(game,input){
  game.advanceTo(game.now+20000);
  if(input){assert.equal(game.requiredInput,input);assert.equal(game.input(input),true);game.advanceTo(game.now+20000);}
}
test('tutorial uses a short protected first fight and preserves the normal second fight',()=>{
  const {Battle,game:g}=tutorialBattle();
  assert.equal(g.lesson,0);assert.equal(g.enemy.hp,90);assert.equal(g.player.hp,90);assert.equal(g.player.maxHP,120);
  assert.deepEqual(Array.from(g.loadout),['strike','flurry','heal','ward']);assert.equal(g.ultimate,'surge');
  const loadout=['empower','expose','heal','ward'],second=Battle.createDuel(2,loadout,'nova');
  assert.equal(second.lesson,undefined);assert.equal(second.enemy.hp,224);assert.equal(second.player.hp,120);
  assert.deepEqual(Array.from(second.loadout),loadout);assert.equal(second.ultimate,'nova');
  assert.deepEqual(Array.from(second.config.enemyPattern),['spell','sparks','seal','cascade']);
});
test('tutorial teaches seven lessons and ends with one ultimate after three normal actions',()=>{
  const {game:g}=tutorialBattle();
  assert.ok(g.act('attack'));advanceLesson(g,'dodge');assert.equal(g.lesson,2);
  assert.ok(g.act('skill','strike'));advanceLesson(g,'timing');assert.equal(g.lesson,3);
  advanceLesson(g,'parry');assert.equal(g.lesson,4);
  const hp=g.player.hp;assert.ok(g.act('item'));advanceLesson(g);assert.equal(g.player.hp,Math.min(120,hp+45));
  assert.equal(g.lesson,5);assert.ok(g.action.hits[0].red);advanceLesson(g,'dodge');
  assert.equal(g.lesson,6);assert.equal(g.energy,60);assert.ok(g.requestUltimate());advanceLesson(g);
  assert.equal(g.result,'victory');assert.equal(g.lesson,7);assert.equal(g.stats.actions,3);
  assert.equal(g.stats.dodges,2);assert.equal(g.stats.parries,1);assert.equal(g.stats.timings,1);assert.equal(g.stats.ultimates,1);
  assert.equal(g.items,2);assert.equal(g.player.hp,120);
});
test('tutorial waits at reaction windows and wrong or early keys remain retryable',()=>{
  const {game:g}=tutorialBattle();g.act('attack');g.advanceTo(g.action.end);
  assert.equal(g.input('dodge'),false);assert.equal(g.action.hits[0].attempted,false);
  g.advanceTo(g.now+60000);const waiting=g.now,hp=g.player.hp;
  assert.equal(g.waiting,true);assert.equal(g.action.hits[0].at-g.now,90);
  for(let i=0;i<8;i++){g.advanceTo(g.now+60000);assert.equal(g.input('parry'),false);}
  assert.equal(g.now,waiting);assert.equal(g.player.hp,hp);assert.equal(g.action.hits[0].attempted,false);
  assert.ok(g.input('dodge'));assert.equal(g.input('dodge'),false);g.advanceTo(g.now+60000);
  assert.equal(g.lesson,2);assert.equal(g.stats.dodges,1);
});
test('tutorial gates unrelated actions and premature ultimates without spending resources',()=>{
  const {game:g}=tutorialBattle();const before=[g.tp,g.items,g.player.hp,g.enemy.hp,g.energy];
  for(const [kind,id]of [['skill','strike'],['skill','heal'],['item']])assert.equal(g.act(kind,id),false);
  assert.equal(g.requestUltimate(),false);assert.deepEqual([g.tp,g.items,g.player.hp,g.enemy.hp,g.energy],before);
  g.act('attack');advanceLesson(g,'dodge');assert.equal(g.act('attack'),false);assert.equal(g.act('skill','flurry'),false);
  assert.ok(g.act('skill','strike'));
});
test('tutorial menu teaches selection and confirmation without allowing skipped lessons',()=>{
  const {Battle,game:g}=tutorialBattle();const menu=Battle.createMenu(g);
  assert.deepEqual(Array.from(menu.options().filter(o=>o.enabled),o=>o.id),['attack']);
  assert.equal(menu.activate('skills'),false);assert.ok(menu.activate('attack'));assert.ok(menu.back());assert.equal(g.stats.actions,0);
  menu.activate('attack');assert.ok(menu.confirm());assert.equal(menu.confirm(),false);advanceLesson(g,'dodge');menu.sync();
  assert.deepEqual(Array.from(menu.options().filter(o=>o.enabled),o=>o.id),['skills']);
  assert.equal(menu.current().id,'skills');menu.activate('skills');assert.deepEqual(Array.from(menu.options().filter(o=>o.enabled),o=>o.id),['strike']);
  menu.activate('strike');menu.confirm();advanceLesson(g,'timing');advanceLesson(g,'parry');menu.sync();
  assert.equal(menu.current().id,'items');menu.activate('items');menu.activate('potion');menu.confirm();advanceLesson(g,'dodge');menu.sync();
  assert.equal(menu.current().id,'ultimate');menu.activate('ultimate');assert.ok(menu.back());assert.equal(g.energy,60);
  menu.activate('ultimate');assert.ok(menu.confirm());assert.equal(menu.confirm(),false);advanceLesson(g);assert.equal(g.result,'victory');
});
test('tutorial pause and restart do not consume a waiting reaction or retain partial lessons',()=>{
  const {Battle,game:g}=tutorialBattle();g.act('attack');g.advanceTo(g.now+20000);const now=g.now;
  g.pause();g.advanceTo(now+60000,'dodge');assert.equal(g.input('dodge'),false);assert.equal(g.now,now);assert.equal(g.lesson,1);
  g.resume();assert.ok(g.input('dodge'));advanceLesson(g);assert.equal(g.lesson,2);
  const checkpoint=run(events.slice(0,3)),restored=S.restore(JSON.stringify(checkpoint));
  const retry=Battle.createDuel(1,restored.loadout,restored.ultimate);
  assert.equal(retry.lesson,0);assert.equal(retry.player.hp,90);assert.equal(retry.enemy.hp,90);assert.equal(retry.energy,0);assert.equal(retry.items,3);
  assert.equal(restored.phase,'firstBattle');assert.deepEqual(restored.flags,checkpoint.flags);
});

'use strict';
(() => {
  const H=HanserDuel,$=id=>document.getElementById(id),show=(id,value)=>{$(id).hidden=!value;},set=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=value;};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const LESSONS=[
    ['先试一次普通攻击','点击「攻击」或按 1，再按 Enter 确认目标。普通攻击不耗技力，还会恢复技力。'],
    ['看准时机，试试闪避','守卫挥刀时，等标记进入亮区，按 J 或点击「闪避」。成功就能避开这一击。'],
    ['让技能产生共鸣','按 2 打开技能，选择「碎光」并确认。随后在亮区按 Space 共鸣，增加伤害；正式战斗漏按仍有基础效果。'],
    ['这一次，用格挡','等标记进入亮区，按 K 或点击「格挡」。成功能挡住这一击，并恢复 1 点技力；正式战斗的窗口更短。'],
    ['用一份药剂恢复','按 3 打开物品，选择「暖光药剂」并确认。药剂恢复生命，占一次行动，不消耗技力。'],
    ['看见红光，就用闪避','这次是红光攻击，格挡无效。等标记进入亮区，再按 J 或点击「闪避」。'],
    ['最后，把力量集中起来','满穗补充了大招能量。按 R 或选择「大招」，确认后用「曙光一闪」结束战斗。大招不占普通行动。']
  ];
  class TutorialDuel extends H.Duel {
    constructor(){
      super({enemyHP:90,enemySpeed:95,loadout:['strike','flurry','heal','ward'],ultimate:'surge',enemyPattern:['single','single','red']});
      this.player.hp=90;this.lesson=0;this.tutorialHint='';
    }
    get requiredInput(){
      if(!this.action?.hits.some(h=>!h.done))return null;
      if(this.action.actor==='enemy')return this.lesson===3?'parry':'dodge';
      return this.action.kind==='skill'?'timing':null;
    }
    get waiting(){const h=this.action?.hits.find(h=>!h.done);return !!(this.requiredInput&&h&&!h.attempted&&this.now>=h.at-90);}
    act(kind,id){
      const allowed=this.lesson===0?kind==='attack':this.lesson===2?kind==='skill'&&id==='strike':this.lesson===4&&kind==='item';
      return allowed?super.act(kind,id):false;
    }
    requestUltimate(){return this.lesson===6?super.requestUltimate():false;}
    _begin(actor,kind,key,spec){
      // Tutorial enemies use harmless, slower single hits. Normal battle data
      // and the shared timing/damage implementation remain untouched.
      if(actor==='enemy')spec={...spec,damage:[4],windup:2000};
      super._begin(actor,kind,key,spec);
    }
    input(kind){
      if(this.paused||this.result)return false;
      const expected=this.requiredInput,h=this.action?.hits.find(h=>!h.done);
      if(!expected||!h||h.attempted)return false;
      if(kind!==expected){this.tutorialHint=this.lesson===5?'红光不能格挡，这次请用 J 闪避。':`这一步请${expected==='parry'?'按 K 格挡':expected==='timing'?'按 Space 共鸣':'按 J 闪避'}，可以再试。`;return false;}
      const window=expected==='parry'?this.config.parryWindow:expected==='timing'?this.config.timingWindow:this.config.dodgeWindow;
      if(h.at-this.now>window){this.tutorialHint='还早一点。等标记进入亮区再按，我会等你。';return false;}
      const accepted=super.input(kind);if(accepted)this.tutorialHint='成功了，继续看接下来的动作。';return accepted;
    }
    advanceTo(target,input){
      if(this.paused||this.result)return false;
      if(!Number.isFinite(target)||target<this.now)throw new Error('战斗时钟必须单调递增');
      // Walk event boundaries so even a large time step cannot skip a newly
      // started lesson. Only this introductory duel waits at reaction windows.
      while(this.now<target&&!this.result){
        const h=this.action?.hits.find(h=>!h.done);
        const hold=this.requiredInput&&h&&!h.attempted?h.at-90:Infinity;
        super.advanceTo(Math.max(this.now,Math.min(target,this.nextEvent(),hold)));
        if(this.now>=hold)break;
      }
      if(input)this.input(input);
      return true;
    }
    _finish(action){
      this.lesson++;this.tutorialHint='';
      if(this.lesson===6)this.energy=H.ULTS[this.ultimate].cost;
      super._finish(action);
    }
    _outcome(){super._outcome();if(this.result==='victory')this.lesson=7;}
  }
  class TutorialMenu extends H.BattleMenu {
    options(){
      const options=super.options();if(!(this.game instanceof TutorialDuel))return options;
      const lesson=this.game.lesson;
      const allowed=this.page==='target'?['confirm','back']:this.page==='skills'?(lesson===2?['strike']:[]):this.page==='items'?(lesson===4?['potion']:[]):({0:['attack'],2:['skills'],4:['items'],6:['ultimate']}[lesson]||[]);
      return options.map(option=>({...option,enabled:option.enabled&&allowed.includes(option.id)}));
    }
    sync(){super.sync();const options=this.options();if(!options[this.index]?.enabled)this.index=Math.max(0,options.findIndex(option=>option.enabled));}
  }
  class TownBattleScene extends DuelScene {
    build(){
      this.geometry=[];
      for(let x=-17;x<18;x+=1.5)for(let z=-20;z<16;z+=1.5){
        const road=Math.abs(x)<4||Math.abs(z+3)<2,seed=PrologueWorld.rand(x*37+z*13),n=Math.floor(seed*13);
        this.face([[x,0,z],[x+1.48,0,z],[x+1.48,0,z+1.48],[x,0,z+1.48]],road?`rgb(${113+n},${129+n},${136+n})`:`rgb(${65+n},${98+n},${94+n})`);
      }
      // Keep the right foreground beyond the action-camera sweep and its
      // sight lines to both fighters; the player shot reaches x = 7.7.
      for(const [x,z,w,h,d]of[[-9,-8,5,4,5],[5,-11,6,4.3,5],[-10,2,4,3.6,5],[10,1,5,4,6]]){
        this.box(x,0,z,w,h,d,['#a9b4af','#839d9f','#c6c7b4','#748d96']);
        const peak=h+1.9,roof='#547995',shade='#3c5b78';
        this.face([[x-.35,h,z-.35],[x+w+.35,h,z-.35],[x+w+.35,peak,z+d/2],[x-.35,peak,z+d/2]],roof);
        this.face([[x-.35,peak,z+d/2],[x+w+.35,peak,z+d/2],[x+w+.35,h,z+d+.35],[x-.35,h,z+d+.35]],shade);
        this.face([[x-.35,h,z-.35],[x-.35,peak,z+d/2],[x-.35,h,z+d+.35]],'#6e8792');
        this.face([[x+w+.35,h,z-.35],[x+w+.35,peak,z+d/2],[x+w+.35,h,z+d+.35]],'#48687e');
        for(let i=1;i<5;i++)this.face([[x-.4,h+i*.38,z-.35+i*d/10],[x+w+.4,h+i*.38,z-.35+i*d/10],[x+w+.4,h+i*.38+.025,z-.31+i*d/10],[x-.4,h+i*.38+.025,z-.31+i*d/10]],'#8da5ae');
        for(const wx of[x+.65,x+w-1.65])this.box(wx,1.5,z+d+.015,.9,1.2,.03,['#e0c696','#e0c696','#eddaad']);
        this.box(x+w/2-.5,0,z+d+.02,1,2,.05,['#5c707c','#5c707c','#7c8d94']);
      }
      for(const [x,z]of[[-5,-4],[9,2],[-4.7,5],[4.8,-7]]){this.box(x,0,z,.14,3,.14,['#42596b']);this.box(x-.2,2.8,z-.2,.55,.65,.55,['#cbb992','#ead8aa','#eee0b8']);this.box(x-.28,3.45,z-.28,.7,.12,.7,['#496678']);}
      for(let i=0;i<16;i++){const x=i%2?-12-(i%3):10+i%3,z=-15+i*2;this.box(x,0,z,.4,2,.4,['#5d6470']);this.box(x-1,1.6,z-1,2.6,2.3,2.6,['#406771','#3d6171','#739486']);this.box(x-.7,3.3,z-.7,2,1.3,2,['#557f7c','#4c7378','#8ba795']);}
    }
    enemy(p,pos,game){
      if(this.variant!==2)return super.enemy(p,pos,game);
      const c=this.ctx,s=p.scale,a=game?.action,hit=a?.actor==='enemy'?a.hits.find(v=>!v.done):null,red=!!hit?.red;
      c.save();c.translate(p.x,p.y);c.scale(s,s);
      c.fillStyle='#4f4868';c.beginPath();c.moveTo(-.32,-2.25);c.lineTo(.32,-2.25);c.lineTo(.77,-.05);c.lineTo(.2,-.2);c.lineTo(-.1,-.05);c.lineTo(-.7,-.15);c.closePath();c.fill();
      c.fillStyle='#8f80a1';c.fillRect(-.33,-1.95,.66,1.4);c.fillStyle='#c2ad96';c.fillRect(-.23,-2.4,.46,.48);c.fillStyle='#655574';c.fillRect(-.34,-2.52,.69,.24);c.fillRect(-.44,-2.35,.87,.12);
      c.fillStyle=red?'#ff9d8a':'#eed7b1';c.fillRect(-.16,-2.23,.08,.045);c.fillRect(.10,-2.23,.08,.045);c.strokeStyle='#b69e83';c.lineWidth=.065;c.beginPath();c.moveTo(.55,-.05);c.lineTo(.55,-2.6);c.stroke();
      this.ellipse(.55,-2.65,.18,.23,red?'#d97477':'#ac9bc9','#ded1dc');
      if(hit){const charge=clamp(1-(hit.at-game.now)/1600,0,1);c.strokeStyle=red?'#ff977d':'#d5c6e8';c.lineWidth=.025;c.beginPath();c.arc(.55,-2.65,.3+charge*.3,game.now*.004,game.now*.004+Math.PI*1.65);c.stroke();
        c.fillStyle=red?'#efa08e':'#d3c2e3';for(let i=0;i<5;i++){const an=i*Math.PI*.4+game.now*.002;c.fillRect(.55+Math.cos(an)*(.3+charge*.3),-2.65+Math.sin(an)*(.3+charge*.3),.055,.055);}}
      c.restore();
    }
  }
  class PrologueBattle{
    static createDuel(number,loadout,ultimate){return number===1?new TutorialDuel():new H.Duel({enemyHP:224,enemySpeed:105,loadout:[...loadout],ultimate,itemCount:3,enemyPattern:['spell','sparks','seal','cascade']});}
    static createMenu(game){return game instanceof TutorialDuel?new TutorialMenu(game):new H.BattleMenu(game);}
    constructor(callbacks){
      this.callbacks=callbacks;this.scene=new TownBattleScene($('battle-world'));this.game=null;this.last=0;this.menuKey='';this.seen=0;
      $('battle-options').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)this.select(b.dataset.action);});
      $('battle-back').onclick=()=>{this.sync();this.menu?.back();this.render();};
      for(const [id,input]of[['dodge','dodge'],['parry','parry'],['resonate','timing']])$(id).addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();this.sync(input);});
      $('ultimate-button').onclick=()=>this.ultimate();$('battle-pause').onclick=()=>callbacks.pause();
    }
    start(number,loadout,ultimate){
      this.number=number;this.scene.variant=number;this.scene.key='';this.game=PrologueBattle.createDuel(number,loadout,ultimate);
      this.menu=PrologueBattle.createMenu(this.game);this.last=performance.now();this.seen=0;this.menuKey='';this.finished=false;
      show('battle-world',true);show('battle-hud',true);set('battle-name',number===1?'家门前 · 追来的影子':'赴塔之路 · 向前一步');set('enemy-name',number===1?'受控卫兵':'受控守卫 · 法师');this.render();
    }
    stop(){this.game=null;show('battle-world',false);show('battle-hud',false);show('tutorial-guide',false);$('battle-hud').classList.remove('tutorial-active');}
    sync(input){
      const now=performance.now(),dt=Math.max(0,now-this.last);this.last=now;
      if(!this.game||this.game.paused||this.game.result)return;
      // Visible frames may be delayed by resizing or capture. Advance at most one
      // short slice after a stall; real blur/visibility changes pause explicitly.
      const elapsed=dt>250?80:dt;
      this.game.advanceTo(this.game.now+elapsed,input);
    }
    select(id){this.sync();if(!this.game||this.game.paused)return;this.menu.activate(id);this.render();}
    ultimate(){this.sync();if(!this.game||this.game.paused)return;if(this.game.mode==='choose'){this.menu.page='main';this.menu.activate('ultimate');}else this.game.requestUltimate();this.render();}
    pause(){this.game?.pause();}
    resume(){this.last=performance.now();this.game?.resume();}
    key(key){
      if(!this.game||this.game.paused)return;
      if(key==='Escape'){if(!this.menu.back())this.callbacks.pause();this.render();return;}
      if(key.toLowerCase()==='r'){this.ultimate();return;}
      if(this.game.mode==='action'){if(key===' ')this.sync('timing');if(key.toLowerCase()==='j')this.sync('dodge');if(key.toLowerCase()==='k')this.sync('parry');return;}
      if(['ArrowDown','s','S'].includes(key))this.menu.move(1);
      else if(['ArrowUp','w','W'].includes(key))this.menu.move(-1);
      else if(key==='Enter'||key===' ')this.menu.activate();
      else if(/^[1-4]$/.test(key)){const o=this.menu.options()[Number(key)-1];if(o)this.menu.activate(o.id);}
      this.render();
    }
    frame(){if(!this.game)return;this.sync();this.render();if(this.game.result&&!this.finished){this.finished=true;this.callbacks.result(this.game.result,this.number,{...this.game.stats});}}
    render(){
      const g=this.game;if(!g)return;this.menu.sync();this.scene.render(g,this.menu);
      const tutorial=g instanceof TutorialDuel,lesson=tutorial&&LESSONS[g.lesson];
      $('battle-hud').classList.toggle('tutorial-active',tutorial);show('tutorial-guide',!!lesson);
      if(lesson){
        $('tutorial-guide').dataset.lesson=String(g.lesson);$('tutorial-guide').dataset.waiting=String(g.waiting);
        set('tutorial-progress',`满穗的指引 · ${g.lesson+1} / ${LESSONS.length}`);set('tutorial-title',lesson[0]);
        set('tutorial-text',this.menu.page==='target'?'目标已选好。按 Enter 或点击「确认施放」；想重新选择可按 Esc 返回。':lesson[1]);
        set('tutorial-note',g.tutorialHint||(g.waiting?'现在按键即可 · 首战会等你，不必抢时间':g.requiredInput?'看标记靠近亮区，准备好再按。':'亮起的指令是这一步要练习的操作。'));
      }
      $('player-hp').style.width=(g.player.hp/g.player.maxHP*100)+'%';$('enemy-hp').style.width=(g.enemy.hp/g.enemy.maxHP*100)+'%';
      set('player-hp-text',`生命 ${g.player.hp} / ${g.player.maxHP}`);set('enemy-hp-text',`${g.enemy.hp} / ${g.enemy.maxHP}`);set('player-tp',`技力 ${g.tp} / ${g.config.maxTP}`);set('shield-text',g.shield?`绒幕护盾 ${g.shield}`:'');
      set('ultimate-label',g.pendingUltimate?'大招已预约':`${H.ULTS[g.ultimate].name}  ${g.energy} / ${H.ULTS[g.ultimate].cost}`);$('ultimate-button').disabled=g.energy<H.ULTS[g.ultimate].cost||g.pendingUltimate||!!g.result||g.action?.kind==='ultimate'||(tutorial&&g.lesson!==6);
      $('ultimate-button').classList.toggle('tutorial-required',tutorial&&g.lesson===6&&!g.result);
      const forecast=g.forecast(6).map(x=>x.actor),orderKey=forecast.join(',');if(this.orderKey!==orderKey){$('order').innerHTML=forecast.map((x,i)=>`<span class="${x==='enemy'?'enemy':''}">${i===0?'当前 · ':''}${x==='enemy'?'守卫':'毛怪'}</span>`).join('');this.orderKey=orderKey;}
      show('battle-menu',g.mode==='choose'&&!g.result);const a=g.action,h=a?.hits.find(x=>!x.done);
      set('battle-caption',a?a.spec.name:g.result?'':this.menu.page==='target'?'确认目标':'');
      if(g.mode==='choose'){
        const opts=this.menu.options(),key=JSON.stringify([this.menu.page,this.menu.index,opts,this.menu.pending]);
        if(key!==this.menuKey){this.menuKey=key;set('menu-title',this.menu.page==='target'?this.menu.pending.name+' · '+(this.menu.pending.target==='enemy'?'敌方':'自己'):this.menu.page==='skills'?'选择拟态能力':this.menu.page==='items'?'行囊':'毛怪的行动');show('target-desc',this.menu.page==='target');set('target-desc',this.menu.pending?.desc||'');$('battle-options').innerHTML=opts.map((o,i)=>`<button data-action="${o.id}" class="${i===this.menu.index?'selected':''}" ${o.enabled?'':'disabled'}><span>${i+1} · ${o.name}${o.cost!==undefined?'  / '+o.cost+' 技力':''}</span>${o.hint?`<small>${o.hint}</small>`:''}</button>`).join('');show('battle-back',this.menu.page!=='main');}
      }
      const responding=!!h&&(a.actor==='enemy'||a.spec.timing);show('response',responding);
      if(responding){
        const enemy=a.actor==='enemy',duration=h.at-Math.max(a.started,h.open),elapsed=g.now-Math.max(a.started,h.open),progress=clamp(elapsed/duration,0,1),window=enemy?g.config.dodgeWindow:g.config.timingWindow;
        $('response').classList.toggle('red',enemy&&h.red);$('timing-marker').style.left=`${progress*100}%`;$('timing-window').style.width=`${window/duration*100}%`;
        const near=h.at-g.now<=window;
        set('response-label',h.attempted?(h.success?'时机命中':h.red&&h.response==='parry'?'红光无法格挡':'过早 · 等待下一击'):near?(enemy?'现在应对！':'现在共鸣！'):enemy?(h.red?'红光 · 只能闪避':'观察蓄力，接近亮区再按'):'接近亮区时共鸣');
        show('dodge',enemy);show('parry',enemy);show('resonate',!enemy);$('dodge').disabled=h.attempted;$('parry').disabled=h.attempted||h.red;$('resonate').disabled=h.attempted;
        set('response-help',enemy?`第 ${a.hits.indexOf(h)+1} / ${a.hits.length} 击 · ${h.red?'红光不可格挡':'J 闪避 / K 精准格挡回技力'}`:'卡点为额外奖励；漏按仍有基础伤害。');
        if(tutorial){
          const expected=g.requiredInput;
          set('response-label',h.attempted?'做到了！':g.waiting?`现在${expected==='parry'?'按 K 格挡':expected==='timing'?'按 Space 共鸣':'按 J 闪避'}`:'看标记靠近亮区……');
          set('response-help',h.attempted?'成功，下一步马上开始。':g.waiting?'已在有效时机停住，等你完成这一步。':'首战会在亮区等你；按早了也能再试。');
          for(const [id,input]of[['dodge','dodge'],['parry','parry'],['resonate','timing']]){
            $(id).disabled=h.attempted||input!==expected;$(id).classList.toggle('tutorial-required',input===expected&&!h.attempted);
          }
          $('timing-window').style.width=`${(expected==='parry'?g.config.parryWindow:expected==='timing'?g.config.timingWindow:g.config.dodgeWindow)/duration*100}%`;
        }else for(const id of ['dodge','parry','resonate'])$(id).classList.remove('tutorial-required');
      }
      const e=g.events.at(-1);if(e&&e.id!==this.seen){this.seen=e.id;set('combat-feedback',e.kind==='action'?'':e.text+(e.value?' '+e.value:''));if(['damage','parry','perfect','dodge','heal'].includes(e.kind))this.callbacks.sound?.(e.kind);}
    }
  }
  globalThis.PrologueBattle=PrologueBattle;
})();

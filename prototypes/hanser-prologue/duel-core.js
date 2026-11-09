
'use strict';
(() => {
  const DEFAULTS = Object.freeze({ playerHP: 120, enemyHP: 260, playerSpeed: 110, enemySpeed: 100,
    maxTP: 6, initialTP: 3, attackTP: 2, parryTP: 1, attackEnergy: 8, skillEnergy: 12,
    timingEnergy: 4, dodgeWindow: 280, parryWindow: 110, timingWindow: 160,
    itemCount: 3, itemHeal: 45, enemyPattern: ['single', 'combo', 'red', 'mixed'] });
  const SKILLS = Object.freeze({
    strike: { name: '碎光', source: '碎晶信物', icon: '✦', cost: 2, type: 'attack', damage: [24], bonus: 8, timing: true, desc: '造成 24 伤害；卡点成功额外 +8。', tag: '单击 · 可选卡点' },
    flurry: { name: '回旋', source: '碎晶信物', icon: '≋', cost: 3, type: 'attack', damage: [10, 10, 10], bonus: 4, timing: true, desc: '连续三击，每击 10 伤害；成功点各 +4。', tag: '三连击 · 可选卡点' },
    expose: { name: '破绽', source: '余烬信物', icon: '◇', cost: 1, type: 'expose', timing: false, desc: '敌人下一次受到完整伤害行动时，伤害 ×1.35。', tag: '易伤 · 无需卡点' },
    empower: { name: '蓄光', source: '余烬信物', icon: '↑', cost: 1, type: 'empower', timing: false, desc: '下一次完整伤害行动的伤害 ×1.4。', tag: '强化 · 无需卡点' },
    heal: { name: '暖息', source: '绒羽信物', icon: '+', cost: 2, type: 'heal', amount: 32, timing: false, desc: '恢复 32 生命，上限 120；基础回能不受影响。', tag: '治疗 · 无需卡点' },
    ward: { name: '绒幕', source: '绒羽信物', icon: '⬡', cost: 2, type: 'ward', amount: 28, timing: false, desc: '获得 28 护盾，持续至吸收完伤害；不叠加。', tag: '护盾 · 无需卡点' }
  });
  const ULTS = Object.freeze({
    surge: { name: '曙光一闪', cost: 60, damage: [72], bonus: 0, timing: false, icon: '✧', desc: '72 伤害 · 无需卡点', type: 'attack' },
    nova: { name: '星屑共鸣', cost: 100, damage: [55, 55], bonus: 15, timing: true, icon: '✺', desc: '两击各 55 伤害 · 卡点各 +15', type: 'attack' }
  });
  const ENEMY_MOVES = Object.freeze({
    single: { name: '沉刃', damage: [18], red: [false], spacing: 900, windup: 1400 },
    combo: { name: '三叠斩', damage: [11, 11, 11], red: [false, false, false], spacing: 1000, windup: 1400 },
    red: { name: '赤芒突袭', damage: [24], red: [true], spacing: 900, windup: 1650 },
    mixed: { name: '三叠斩 · 赤芒', damage: [11, 14, 11], red: [false, true, false], spacing: 1000, windup: 1400 },
    spell: { name: '回响光束', damage: [17], red: [false], spacing: 1000, windup: 1700 },
    sparks: { name: '散落星火', damage: [10, 10, 10], red: [false, false, false], spacing: 1100, windup: 1600 },
    seal: { name: '赤色封印', damage: [23], red: [true], spacing: 1000, windup: 1900 },
    cascade: { name: '交错回响', damage: [10, 14, 10], red: [false, true, false], spacing: 1100, windup: 1700 }
  });
  class Duel {
    constructor(options = {}) {
      this.config = { ...DEFAULTS, ...options };
      for (const key of Object.keys(DEFAULTS).filter(k => k !== 'enemyPattern')) {
        if (!Number.isFinite(this.config[key]) || this.config[key] < 0) throw new Error('无效参数：' + key);
      }
      if (!this.config.playerSpeed || !this.config.enemySpeed || !this.config.playerHP || !this.config.enemyHP) throw new Error('生命与速度必须大于 0');
      if (!Array.isArray(this.config.enemyPattern) || !this.config.enemyPattern.length || this.config.enemyPattern.some(k => !ENEMY_MOVES[k])) throw new Error('无效的敌人招式');
      this.loadout = [...(options.loadout || ['strike', 'flurry', 'expose', 'heal'])];
      if (this.loadout.length !== 4 || new Set(this.loadout).size !== 4 || this.loadout.some(id => !SKILLS[id])) throw new Error('请选择四个不同的普通技能');
      this.ultimate = options.ultimate || 'surge';
      if (!ULTS[this.ultimate]) throw new Error('请选择一个大招');
      this.player = { hp: this.config.playerHP, maxHP: this.config.playerHP };
      this.enemy = { hp: this.config.enemyHP, maxHP: this.config.enemyHP };
      this.tp = Math.min(this.config.maxTP, this.config.initialTP);
      this.energy = 0; this.items = this.config.itemCount; this.shield = 0;
      this.exposed = false; this.empowered = false; this.pendingUltimate = false;
      this.interval = { player: 1000 / this.config.playerSpeed, enemy: 1000 / this.config.enemySpeed };
      this.due = { ...this.interval }; this.now = 0; this.paused = false;
      this.mode = 'choose'; this.result = null; this.action = null; this.sequence = 0; this.enemyTurns = 0;
      this.events = []; this.eventId = 0; this.stats = { actions: 0, dodges: 0, parries: 0, timings: 0, damage: 0, ultimates: 0 };
      this._nextNormal();
    }
    _emit(kind, text, value = 0, target = '') {
      this.events.push({ id: ++this.eventId, at: this.now, kind, text, value, target });
      if (this.events.length > 24) this.events.shift();
    }
    forecast(count = 7) {
      const due = { ...this.due }, list = [];
      for (let i = 0; i < count; i++) {
        const actor = due.player <= due.enemy + 1e-9 ? 'player' : 'enemy';
        list.push({ actor, at: due[actor] }); due[actor] += this.interval[actor];
      }
      return list;
    }
    _nextNormal() {
      if (this.result) return;
      if (this.due.player <= this.due.enemy + 1e-9) { this.mode = 'choose'; this.action = null; }
      else {
        const key = this.config.enemyPattern[this.enemyTurns % this.config.enemyPattern.length];
        this._begin('enemy', 'enemy', key, ENEMY_MOVES[key]);
      }
    }
    act(kind, id) {
      if (this.paused || this.mode !== 'choose' || this.result) return false;
      let spec;
      if (kind === 'attack') spec = { name: '绒团冲撞', type: 'attack', damage: [14], timing: false };
      else if (kind === 'skill') {
        spec = SKILLS[id];
        if (!this.loadout.includes(id) || !spec || this.tp < spec.cost) return false;
        this.tp -= spec.cost;
      } else if (kind === 'item') {
        if (this.items <= 0 || this.player.hp >= this.player.maxHP) return false;
        this.items--; spec = { name: '暖光药剂', type: 'heal', amount: this.config.itemHeal, timing: false };
      } else return false;
      this._begin('player', kind, id || kind, spec); return true;
    }
    _begin(actor, kind, key, spec) {
      let multiplier = 1;
      if (actor === 'player' && spec.damage) {
        multiplier = (this.exposed ? 1.35 : 1) * (this.empowered ? 1.4 : 1);
        this.exposed = false; this.empowered = false;
      }
      const windup = actor === 'enemy' ? spec.windup : (kind === 'ultimate' ? 1700 : spec.timing ? 1200 : 750);
      const spacing = actor === 'enemy' ? spec.spacing : 850;
      const hits = (spec.damage || [0]).map((damage, i) => ({ at: this.now + windup + i * spacing,
        open: this.now + (i ? windup + (i - 1) * spacing + 220 : 0), damage,
        red: !!spec.red?.[i], attempted: false, success: false, response: '', done: false }));
      this.mode = 'action';
      this.action = { id: ++this.sequence, actor, kind, key, spec, multiplier, started: this.now, hits, end: hits.at(-1).at + 600 };
      this._emit('action', spec.name, 0, actor);
    }
    requestUltimate() {
      if (this.paused || this.result || this.pendingUltimate || this.action?.kind === 'ultimate' || this.energy < ULTS[this.ultimate].cost) return false;
      this.pendingUltimate = true;
      this._emit('queue', '大招已预约 · 当前完整行动结束后释放');
      if (this.mode === 'choose') this._startUltimate();
      return true;
    }
    _startUltimate() {
      this.pendingUltimate = false;
      if (this.result || this.energy < ULTS[this.ultimate].cost) return false;
      this.energy -= ULTS[this.ultimate].cost; this.stats.ultimates++;
      this._begin('player', 'ultimate', this.ultimate, ULTS[this.ultimate]); return true;
    }
    input(kind) {
      if (this.paused || this.result || this.mode !== 'action') return false;
      const a = this.action, h = a.hits.find(h => !h.done);
      if (!h || h.attempted || this.now < h.open || this.now > h.at) return false;
      const enemy = a.actor === 'enemy';
      if (enemy ? !['dodge', 'parry'].includes(kind) : (kind !== 'timing' || !a.spec.timing)) return false;
      h.attempted = true; h.response = kind;
      const window = kind === 'dodge' ? this.config.dodgeWindow : kind === 'parry' ? this.config.parryWindow : this.config.timingWindow;
      h.success = h.at - this.now <= window && !(h.red && kind === 'parry');
      this._emit('input', h.success ? '时机命中' : h.red && kind === 'parry' ? '红光无法格挡' : '过早 · 下一击仍可应对', 0, enemy ? 'player' : 'enemy');
      return true;
    }
    nextEvent() {
      if (!this.action) return Infinity;
      return this.action.hits.find(h => !h.done)?.at ?? this.action.end;
    }
    // Events before the timestamp resolve first. At the exact timestamp input wins the tie.
    advanceTo(target, input) {
      if (this.paused || this.result) return false;
      if (!Number.isFinite(target) || target < this.now) throw new Error('战斗时钟必须单调递增');
      while (this.action && this.nextEvent() < target && !this.result) this._event();
      if (this.result) return false;
      this.now = target;
      if (input) this.input(input);
      while (this.action && this.nextEvent() <= target && !this.result) this._event();
      if (!this.result) this.now = target;
      return true;
    }
    _event() {
      const a = this.action, h = a.hits.find(h => !h.done);
      this.now = h ? h.at : a.end;
      if (h) { h.done = true; this._resolveHit(a, h); }
      else this._finish(a);
    }
    _energy(amount) { this.energy = Math.min(ULTS[this.ultimate].cost, this.energy + amount); }
    _resolveHit(a, h) {
      if (a.actor === 'enemy') {
        if (h.success) {
          if (h.response === 'parry') { this.tp = Math.min(this.config.maxTP, this.tp + this.config.parryTP); this.stats.parries++; }
          else this.stats.dodges++;
          this._emit(h.response, h.response === 'parry' ? '精准格挡 · 技力 +1' : '闪避成功', 0, 'player');
        } else {
          const absorbed = Math.min(this.shield, h.damage); this.shield -= absorbed;
          const damage = h.damage - absorbed; this.player.hp = Math.max(0, this.player.hp - damage);
          this._emit('damage', absorbed ? '护盾吸收 ' + absorbed : '受到伤害', damage, 'player');
        }
      } else if (a.spec.damage) {
        const damage = Math.round((h.damage + (h.success ? a.spec.bonus || 0 : 0)) * a.multiplier);
        this.enemy.hp = Math.max(0, this.enemy.hp - damage); this.stats.damage += damage;
        if (h.success) { this.stats.timings++; if (a.kind === 'skill') this._energy(this.config.timingEnergy); }
        this._emit(h.success ? 'perfect' : 'damage', h.success ? '共鸣命中' : '命中', damage, 'enemy');
      } else if (a.spec.type === 'heal') {
        const gain = Math.min(a.spec.amount, this.player.maxHP - this.player.hp); this.player.hp += gain;
        this._emit('heal', '生命恢复', gain, 'player');
      } else if (a.spec.type === 'ward') { this.shield = Math.max(this.shield, a.spec.amount); this._emit('buff', '绒幕 · 护盾 28', 0, 'player'); }
      else if (a.spec.type === 'empower') { this.empowered = true; this._emit('buff', '蓄光 · 下次伤害 ×1.4', 0, 'player'); }
      else if (a.spec.type === 'expose') { this.exposed = true; this._emit('buff', '破绽 · 下次承伤 ×1.35', 0, 'enemy'); }
      this._outcome();
    }
    _finish(a) {
      if (a.kind === 'attack') { this.tp = Math.min(this.config.maxTP, this.tp + this.config.attackTP); this._energy(this.config.attackEnergy); }
      else if (a.kind === 'skill') this._energy(this.config.skillEnergy);
      if (a.kind !== 'ultimate') { this.due[a.actor] += this.interval[a.actor]; if (a.actor === 'enemy') this.enemyTurns++; else this.stats.actions++; }
      this.action = null;
      if (this.pendingUltimate && this._startUltimate()) return;
      this._nextNormal();
    }
    _outcome() {
      if (this.player.hp > 0 && this.enemy.hp > 0) return;
      this.result = this.player.hp <= 0 ? 'defeat' : 'victory'; this.mode = 'result';
      this.action = null; this.pendingUltimate = false; this.paused = false;
      this._emit('result', this.result === 'victory' ? '战斗胜利' : '暂时退却');
    }
    pause() { if (this.result) return false; this.paused = true; return true; }
    resume() { if (this.result) return false; this.paused = false; return true; }
  }

  class BattleMenu {
    constructor(game) { this.game = game; this.page = 'main'; this.index = 0; this.pending = null; this.origin = 'main'; }
    available() { return this.game.mode === 'choose' && !this.game.paused && !this.game.result; }
    options() {
      const g = this.game;
      if (this.page === 'main') return [
        {id:'attack',name:'攻击',hint:'稳定恢复技力',enabled:true},
        {id:'skills',name:'技能',hint:'四种装备能力',enabled:true},
        {id:'items',name:'物品',hint:'暖光药剂 ×'+g.items,enabled:true},
        {id:'ultimate',name:'大招',hint:ULTS[g.ultimate].name,enabled:g.energy>=ULTS[g.ultimate].cost}
      ];
      if (this.page === 'skills') return g.loadout.map(id=>({id,name:SKILLS[id].name,hint:SKILLS[id].desc,enabled:g.tp>=SKILLS[id].cost,cost:SKILLS[id].cost}));
      if (this.page === 'items') return [{id:'potion',name:'暖光药剂',hint:'恢复 45 生命 · 剩余 '+g.items,enabled:g.items>0&&g.player.hp<g.player.maxHP}];
      return [{id:'confirm',name:'确认施放',enabled:true},{id:'back',name:'返回',enabled:true}];
    }
    current() { return this.options()[this.index]; }
    move(delta) {
      if (!this.available()) return false;
      const opts=this.options();
      for(let n=0;n<opts.length;n++) {
        this.index=(this.index+delta+opts.length)%opts.length;
        if(opts[this.index].enabled) return true;
      }
      return false;
    }
    activate(id = this.current()?.id) {
      if (!this.available()) return false;
      const entry=this.options().find(x=>x.id===id);
      if (!entry?.enabled) return false;
      if (id === 'back') return this.back();
      if (id === 'confirm') return this.confirm();
      this.index=this.options().findIndex(x=>x.id===id);
      if (this.page==='main' && (id==='skills'||id==='items')) { this.page=id;this.index=0;return true; }
      this.origin=this.page;
      const kind = this.page==='skills'?'skill':this.page==='items'?'item':id;
      const spec=kind==='skill'?SKILLS[id]:kind==='ultimate'?ULTS[this.game.ultimate]:null;
      this.pending={kind,id:kind==='skill'?id:undefined,name:spec?.name||(kind==='item'?'暖光药剂':'绒团冲撞'),
        desc:spec?.desc||(kind==='item'?'恢复 45 生命，消耗一份药剂与本次行动。':'造成 14 伤害，恢复 2 技力与 8 能量。'),
        target:kind==='item'||['heal','ward','empower'].includes(spec?.type)?'player':'enemy'};
      this.page='target';this.index=0;return true;
    }
    confirm() {
      if (!this.available() || this.page!=='target' || !this.pending) return false;
      const p=this.pending;
      const ok=p.kind==='ultimate'?this.game.requestUltimate():this.game.act(p.kind,p.id);
      if(ok) {this.page='main';this.index=0;this.pending=null;}
      return ok;
    }
    back() {
      if(!this.available()) return false;
      if(this.page==='target') {this.page=this.origin;this.index=0;this.pending=null;return true;}
      if(this.page!=='main') {this.page='main';this.index=0;return true;}
      return false;
    }
    sync() { if(this.game.mode!=='choose') {this.page='main';this.index=0;this.pending=null;} }
  }
  const sub3=(a,b)=>a.map((v,i)=>v-b[i]);
  const dot3=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit3=a=>{const len=Math.hypot(...a)||1;return a.map(v=>v/len);};
  function cameraFrame(pose) {
    const forward=unit3(sub3(pose.target,pose.eye));
    const right=unit3(cross3(forward,[0,1,0]));
    return {eye:pose.eye,forward,right,up:cross3(right,forward),focal:1/Math.tan(pose.fov*Math.PI/360)};
  }
  function projectPoint(point,frame,width,height) {
    const v=sub3(point,frame.eye),depth=dot3(v,frame.forward);
    if(depth<=.15) return null;
    const scale=height*.5*frame.focal/depth;
    return {x:width*.5+dot3(v,frame.right)*scale,y:height*.5-dot3(v,frame.up)*scale,depth,scale};
  }

  const api = { Duel, DEFAULTS, SKILLS, ULTS, ENEMY_MOVES, BattleMenu, cameraFrame, projectPoint };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.HanserDuel = api;
})();

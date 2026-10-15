const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '..', 'index.html');
const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const source = html.match(/<script id="duel-core">([\s\S]*?)<\/script>/)?.[1];
const sandbox = { module: { exports: {} } };
if (source) vm.runInNewContext(source, sandbox);
const H = sandbox.module.exports;
const plain = value => JSON.parse(JSON.stringify(value));
function game(options = {}) { assert.equal(typeof H.Duel, 'function', 'HTML must export the playable Duel core'); return new H.Duel(options); }
function finish(g) { const id = g.action?.id; let guard = 0; while (g.action?.id === id && g.mode !== 'result' && guard++ < 20) g.advanceTo(g.nextEvent()); assert.ok(guard < 20); }
function choose(g) { let guard = 0; while (g.mode === 'action' && guard++ < 20) finish(g); assert.equal(g.mode, 'choose'); }
function enemy(options = {}) { const g = game({ enemyHP: 999, ...options }); assert.ok(g.act('attack')); finish(g); assert.equal(g.action.actor, 'enemy'); return g; }
function hit(g, kind, lead = 0) { const h = g.action.hits.find(h => !h.done); g.advanceTo(h.at - lead, kind); g.advanceTo(h.at); return h; }

test('standalone HTML exports a core and all inline scripts parse', () => {
  assert.ok(source, 'duel-core script is required');
  for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:/);
});
test('six skills, two distinct ultimates, four unique equipped skills', () => {
  const g = game(); assert.equal(Object.keys(H.SKILLS).length, 6); assert.equal(Object.keys(H.ULTS).length, 2);
  assert.equal(g.loadout.length, 4); assert.equal(new Set(g.loadout).size, 4);
  assert.notEqual(H.ULTS.surge.cost, H.ULTS.nova.cost);
  assert.throws(() => game({ loadout: ['strike', 'strike', 'heal', 'ward'] }));
  assert.throws(() => game({ ultimate: 'missing' }));
});
test('speed forecast uses actual scheduling, ties favor player', () => {
  const g = game({ playerSpeed: 200, enemySpeed: 100, enemyHP: 999 });
  assert.deepEqual(plain(g.forecast(5).map(x => x.actor)), ['player', 'player', 'enemy', 'player', 'player']);
  g.act('attack'); finish(g); assert.equal(g.mode, 'choose');
  g.act('attack'); finish(g); assert.equal(g.action.actor, 'enemy');
  assert.equal(game({ playerSpeed: 100, enemySpeed: 100 }).mode, 'choose');
});
test('basic attack restores technique without timing input', () => {
  const g = game(); g.tp = 0; g.act('attack'); finish(g); assert.equal(g.tp, 2); assert.equal(g.energy, 8); assert.equal(g.enemy.hp, 246);
});
test('skill costs paid once and unavailable / unequipped skills reject without mutation', () => {
  const g = game(); g.tp = 1; assert.equal(g.act('skill', 'strike'), false); assert.equal(g.act('skill', 'ward'), false);
  g.tp = 6; assert.ok(g.act('skill', 'strike')); assert.equal(g.tp, 4); assert.equal(g.act('skill', 'strike'), false); assert.equal(g.tp, 4);
});
test('zero timing successes preserve all base multi-hit damage and base energy', () => {
  const g = game(); g.act('skill', 'flurry'); finish(g); assert.equal(g.enemy.hp, 230); assert.equal(g.energy, 12);
});
test('successful timing adds only configured bonus damage and energy', () => {
  const g = game(); g.act('skill', 'strike'); hit(g, 'timing', 80); finish(g); assert.equal(g.enemy.hp, 228); assert.equal(g.energy, 16);
});
test('one timing attempt per point; early input loses bonus, never base effect', () => {
  const g = game(); g.act('skill', 'strike'); g.input('timing'); hit(g, 'timing', 20); finish(g); assert.equal(g.enemy.hp, 236); assert.equal(g.energy, 12);
});
test('untimed healing grants complete effect and base energy', () => {
  const g = game(); g.player.hp = 40; g.act('skill', 'heal'); finish(g); assert.equal(g.player.hp, 72); assert.equal(g.energy, 12);
});
test('dodge protects only its own hit', () => {
  const g = enemy({ enemyPattern: ['combo'] }); hit(g, 'dodge', 220); assert.equal(g.player.hp, 120);
  hit(g, undefined); assert.equal(g.player.hp, 109); hit(g, undefined); assert.equal(g.player.hp, 98);
});
test('failed second reaction leaves third parry available and fully immune', () => {
  const g = enemy({ enemyPattern: ['combo'] }); g.tp = 0; hit(g, 'dodge', 180); hit(g, 'parry', 200); hit(g, 'parry', 70);
  assert.equal(g.player.hp, 109); assert.equal(g.tp, 1);
});
test('red hit rejects parry but accepts dodge', () => {
  const a = enemy({ enemyPattern: ['red'] }); const tp = a.tp; hit(a, 'parry', 40); assert.equal(a.player.hp, 96); assert.equal(a.tp, tp);
  const b = enemy({ enemyPattern: ['red'] }); hit(b, 'dodge', 160); assert.equal(b.player.hp, 120);
});
test('mixed combo applies red restriction only to red hit', () => {
  const g = enemy({ enemyPattern: ['mixed'] }); g.tp = 0; hit(g, 'parry', 50); hit(g, 'dodge', 150); hit(g, 'parry', 50);
  assert.equal(g.player.hp, 120); assert.equal(g.tp, 2);
});
test('early response cannot be replaced, but next hit unlocks', () => {
  const g = enemy({ enemyPattern: ['combo'] }); g.input('dodge'); hit(g, 'parry', 40); assert.equal(g.player.hp, 109); hit(g, 'dodge', 80); assert.equal(g.player.hp, 109);
});
test('inclusive boundaries accept input before impact at identical timestamp', () => {
  for (const [kind, lead] of [['parry', 110], ['dodge', 280], ['parry', 0]]) { const g = enemy(); hit(g, kind, lead); assert.equal(g.player.hp, 120); }
  const g = enemy(); hit(g, 'parry', 111); assert.equal(g.player.hp, 102);
});
test('late input cannot reverse already applied damage', () => {
  const g = enemy(); const at = g.action.hits[0].at; g.advanceTo(at + 1, 'dodge'); assert.equal(g.player.hp, 102);
});
test('ultimate waits for whole enemy combo, charges once and preserves next normal action', () => {
  const g = enemy({ enemyPattern: ['combo'] }); g.energy = 60; const due = plain(g.due);
  assert.ok(g.requestUltimate()); assert.equal(g.requestUltimate(), false); assert.equal(g.energy, 60);
  for (let i = 0; i < 3; i++) hit(g, 'dodge', 100);
  assert.equal(g.action.actor, 'enemy'); finish(g); assert.equal(g.action.kind, 'ultimate'); assert.equal(g.energy, 0);
  assert.equal(g.due.player, due.player); const before = plain(g.due); finish(g); assert.deepEqual(plain(g.due), before); assert.equal(g.mode, 'choose');
});
test('ultimate inserted in player choice does not advance normal schedule or self-recharge', () => {
  const g = game({ ultimate: 'nova', enemyHP: 999 }); g.energy = 100; const before = plain(g.due);
  g.requestUltimate(); hit(g, 'timing', 50); hit(g, 'timing', 50); finish(g);
  assert.deepEqual(plain(g.due), before); assert.equal(g.mode, 'choose'); assert.equal(g.energy, 0);
});
test('normal skill cannot spend ultimate energy, ultimate cannot spend technique', () => {
  const g = game(); g.tp = 0; g.energy = 60; assert.equal(g.act('skill', 'strike'), false); assert.ok(g.requestUltimate()); assert.equal(g.tp, 0);
});
test('energy caps at equipped ultimate requirement and insufficient requests reject', () => {
  const g = game(); g.energy = 59; assert.equal(g.requestUltimate(), false); g.act('attack'); finish(g); assert.equal(g.energy, 60);
});
test('items consume one normal action, no technique or energy, and reject at full health', () => {
  const g = game(); assert.equal(g.act('item'), false); g.player.hp = 50; const tp = g.tp; g.act('item'); finish(g);
  assert.equal(g.player.hp, 95); assert.equal(g.items, 2); assert.equal(g.tp, tp); assert.equal(g.energy, 0); assert.equal(g.action.actor, 'enemy');
});
test('three items maximum and healing is capped', () => {
  const g = game(); g.player.hp = 110; g.act('item'); finish(g); assert.equal(g.player.hp, 120);
  choose(g); g.items = 0; g.player.hp = 50; assert.equal(g.act('item'), false);
});
test('vulnerability and empowerment amplify the entire next damaging action then expire', () => {
  const g = game({ enemyHP: 999, loadout: ['expose', 'empower', 'flurry', 'ward'] }); g.tp = 6;
  g.act('skill', 'expose'); finish(g); choose(g); g.act('skill', 'empower'); finish(g); choose(g);
  assert.ok(g.exposed && g.empowered); g.act('skill', 'flurry'); finish(g);
  assert.equal(g.enemy.hp, 999 - 3 * Math.round(10 * 1.35 * 1.4)); assert.equal(g.exposed, false); assert.equal(g.empowered, false);
});
test('shield persists through dodges and absorbs subsequent damage to exhaustion', () => {
  const g = game({ loadout: ['strike', 'flurry', 'heal', 'ward'], enemyPattern: ['combo'] });
  g.act('skill', 'ward'); finish(g); hit(g, 'dodge', 150); assert.equal(g.shield, 28); hit(g); assert.equal(g.shield, 17); hit(g); assert.equal(g.shield, 6); assert.equal(g.player.hp, 120);
});
test('pause freezes timeline, blocks actions and inputs, resume retains next hit', () => {
  const g = enemy(); const before = g.now; g.pause(); assert.equal(g.advanceTo(g.now + 5000), false); assert.equal(g.input('dodge'), false); assert.equal(g.requestUltimate(), false); assert.equal(g.now, before);
  g.resume(); hit(g, 'dodge', 100); assert.equal(g.player.hp, 120);
});
test('large frame steps and fine steps yield identical outcomes', () => {
  const a = enemy({ enemyPattern: ['combo'] }), b = enemy({ enemyPattern: ['combo'] });
  a.advanceTo(a.now + 5000); for (let i = 0; i < 500; i++) b.advanceTo(b.now + 10);
  assert.deepEqual(plain([a.player, a.due, a.mode]), plain([b.player, b.due, b.mode]));
});
test('death cancels pending ultimate and rejects stale input or time advancement', () => {
  const g = enemy({ enemyPattern: ['combo'] }); g.player.hp = 1; g.energy = 60; g.requestUltimate(); hit(g);
  assert.equal(g.result, 'defeat'); assert.equal(g.pendingUltimate, false); assert.equal(g.action, null);
  const before = JSON.stringify(g); g.advanceTo(g.now + 99999); g.input('parry'); g.act('item'); g.requestUltimate(); assert.equal(JSON.stringify(g), before);
});
test('victory cancels remaining player hits and pending ultimate', () => {
  const g = game({ enemyHP: 5 }); g.energy = 60; g.act('skill', 'flurry'); g.requestUltimate(); hit(g);
  assert.equal(g.result, 'victory'); assert.equal(g.action, null); assert.equal(g.pendingUltimate, false);
});
test('fresh battle preserves chosen loadout but resets all transient resources', () => {
  const options = { loadout: ['ward', 'expose', 'empower', 'heal'], ultimate: 'nova' }; const a = game(options); a.player.hp = 1; a.tp = 0; a.energy = 90;
  const b = game(options); assert.deepEqual(plain(b.loadout), options.loadout); assert.equal(b.ultimate, 'nova'); assert.equal(b.tp, 3); assert.equal(b.energy, 0); assert.equal(b.items, 3); assert.equal(b.player.hp, 120);
});
test('invalid configuration and backward or nonfinite time are rejected', () => {
  for (const options of [{ playerSpeed: 0 }, { enemyHP: NaN }, { enemyPattern: ['missing'] }]) assert.throws(() => game(options));
  const g = game(); assert.throws(() => g.advanceTo(-1)); assert.throws(() => g.advanceTo(Infinity));
});

function menuFor(g = game()) { assert.equal(typeof H.BattleMenu, 'function', 'shared mouse / keyboard menu must exist'); return new H.BattleMenu(g); }
test('preview and cancellation never spend resources or advance an action', () => {
  const g = game(), m = menuFor(g), before = JSON.stringify(g);
  m.activate('skills'); assert.equal(m.page, 'skills'); m.activate('strike'); assert.equal(m.page, 'target');
  assert.equal(m.pending.target, 'enemy'); assert.equal(JSON.stringify(g), before);
  m.back(); assert.equal(m.page, 'skills'); m.back(); assert.equal(m.page, 'main'); assert.equal(JSON.stringify(g), before);
});
test('mouse selection and keyboard selection produce the same confirmed action', () => {
  const a = game(), b = game(), mouse = menuFor(a), keys = menuFor(b);
  mouse.activate('skills'); mouse.activate('strike'); mouse.confirm();
  keys.move(1); keys.activate(); keys.activate(); keys.confirm();
  assert.deepEqual(plain([a.tp,a.action.key,a.due]), plain([b.tp,b.action.key,b.due]));
});
test('double target confirmation cannot execute or charge twice', () => {
  const g = game(), m = menuFor(g); m.activate('skills'); m.activate('strike'); assert.ok(m.confirm());
  const before = JSON.stringify(g); assert.equal(m.confirm(), false); assert.equal(JSON.stringify(g), before);
});
test('disabled entries cannot open target confirmation; keyboard skips them', () => {
  const g = game(), m = menuFor(g); g.tp = 0; m.activate('skills');
  assert.equal(m.activate('strike'), false); assert.equal(m.pending, null); assert.equal(m.page, 'skills');
  m.back(); m.move(-1); assert.notEqual(m.current()?.id, 'ultimate');
});
test('self-target healing and items preview without spending and can be canceled', () => {
  const g = game(), m = menuFor(g); g.player.hp = 50; m.activate('skills'); m.activate('heal');
  assert.equal(m.pending.target, 'player'); m.back(); m.back(); m.activate('items'); m.activate('potion');
  assert.equal(m.pending.target, 'player'); assert.equal(g.items, 3); m.confirm(); assert.equal(g.items, 2);
});
test('pausing and stale target selection cannot start an action', () => {
  const g = game(), m = menuFor(g); m.activate('attack'); g.pause(); assert.equal(m.confirm(), false);
  g.resume(); g.act('attack'); assert.equal(m.confirm(), false); m.sync(); assert.equal(m.pending, null);
});
test('ultimate preview is cancelable and confirmation preserves normal schedule', () => {
  const g = game(), m = menuFor(g); g.energy = 60; const due = plain(g.due); m.activate('ultimate');
  assert.equal(g.energy, 60); m.back(); assert.equal(g.energy, 60); m.activate('ultimate'); m.confirm();
  assert.equal(g.energy, 0); assert.equal(g.action.kind, 'ultimate'); assert.deepEqual(plain(g.due), due);
});
test('perspective projects centered objects and scales nearer objects larger', () => {
  assert.equal(typeof H.cameraFrame, 'function'); assert.equal(typeof H.projectPoint, 'function');
  const camera = H.cameraFrame({eye:[0,0,10],target:[0,0,0],fov:60});
  const a = H.projectPoint([0,0,0], camera, 1000, 600), b = H.projectPoint([0,0,5], camera,1000,600);
  assert.equal(a.x,500); assert.equal(a.y,300); assert.ok(Math.abs(b.scale/a.scale-2)<1e-8);
  assert.equal(H.projectPoint([0,0,11], camera,1000,600),null);
  assert.ok(H.projectPoint([1,0,0],camera,1000,600).x>500);
});
test('changing camera changes parallax without changing battle state', () => {
  assert.equal(typeof H.cameraFrame, 'function'); const g = game(), before=JSON.stringify(g);
  const a = H.cameraFrame({eye:[0,3,8],target:[0,1,0],fov:52});
  const b = H.cameraFrame({eye:[6,3,4],target:[0,1,0],fov:52});
  assert.notEqual(H.projectPoint([-2,0,2],a,1280,720).x,H.projectPoint([-2,0,2],b,1280,720).x);
  assert.equal(JSON.stringify(g),before);
});

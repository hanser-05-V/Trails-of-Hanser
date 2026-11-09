
'use strict';
(() => {
  const {cameraFrame,projectPoint}=HanserDuel;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a+(b-a)*t, smooth=t=>t*t*(3-2*t);
  const PH=[-2,0,2], PE=[1.6,0,-2.6];
  const SHOTS={
    command:{eye:[-.2,2.8,7.7],target:[0,.9,-.9],fov:53,label:'01 / 斜后方 · 行动选择'},
    skills:{eye:[1.7,3.9,7.2],target:[-.7,.85,.1],fov:55,label:'02 / 侧移 · 展开技能'},
    targetEnemy:{eye:[.2,2.5,2.5],target:[1.6,1.3,-2.6],fov:52,label:'03 / 目标特写 · 确认施放'},
    targetSelf:{eye:[1.1,2.1,5.7],target:[-2,1,2],fov:54,label:'03 / 回望自身 · 确认施放'},
    player:{eye:[7.7,3.6,5.7],target:[-.2,1,0],fov:50,label:'04 / 侧向跟拍 · 你的招式'},
    enemy:{eye:[6.7,3.8,7],target:[-.3,1,0],fov:51,label:'05 / 双方构图 · 逐击应对'},
    ultimate:{eye:[6.4,2.3,4.7],target:[-.15,1,-.1],fov:53,label:'06 / 低机位 · 大招回响'}
  };
  class DuelScene {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.geometry=[];this.key='';this.pose=SHOTS.command;this.from=this.pose;this.to=this.pose;this.start=0;
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.build();
    }
    face(p,color,line){this.geometry.push({p,color,line});}
    box(x,y,z,w,h,d,colors){
      const v=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
      const c=colors||['#5b6960','#6d7868','#92947a','#435a53'];
      [[0,1,2,3],[5,4,7,6],[3,2,6,7],[4,0,3,7],[1,5,6,2]].forEach((ids,i)=>this.face(ids.map(j=>v[j]),c[i%c.length],'rgba(24,40,35,.12)'));
    }
    build(){
      const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
      // Everything below is positioned in one world coordinate system.
      for(let x=-12;x<12;x+=1.5)for(let z=-15;z<13;z+=1.5){
        const n=(x+40)*17+(z+40)*11,light=Math.floor(rand(n)*15);
        this.face([[x+.012,0,z+.012],[x+1.488,0,z+.012],[x+1.488,0,z+1.488],[x+.012,0,z+1.488]],'rgb('+(82+light)+','+(91+light)+','+(73+light)+')','rgba(202,197,154,.1)');
        if(rand(n+1)>.65)this.face([[x+.2,.008,z+.3],[x+.7,.008,z+.5],[x+.6,.008,z+1.2]],'rgba(42,66,48,.24)');
      }
      // Raised terrace, long steps and an open, broken arcade.
      this.box(-10,-.45,-12,20,.42,20,['#56665a','#3d5149','#6c7664']);
      this.box(-6,0,-8,12,.2,1.2,['#737c69','#52635a','#a2a17e']);
      this.box(-5.7,.2,-8.5,11.4,.25,.7,['#78816c','#56675a','#b1ad86']);
      for(const x of [-5.3,5.3])for(const z of [-7.7,-2,3.8]){
        const h=z===3.8?(x<0?3.5:1.8):z===-2?(x<0?4.7:3.1):6.1;
        this.box(x-.58,0,z-.58,1.16,.3,1.16);
        this.box(x-.35,.3,z-.35,.7,h,.7,['#7b8975','#596c62','#b4b18a','#4b6258']);
        this.box(x-.48,h+.3,z-.48,.96,.24,.96);
        this.box(x-.42,1.2,z-.42,.84,.14,.84,['#a3a184','#728372','#c9bd8f']);
      }
      for(const x of [-2.8,2.8]){
        this.box(x-.4,.45,-8.2,.8,3.7,.8);
        this.box(x-.6,4.1,-8.4,1.2,.3,1.2);
      }
      // Segmented arch, with a real opening through which the distant light is seen.
      for(let i=0;i<15;i++){
        const a=Math.PI*i/15,b=Math.PI*(i+1)/15;
        const pts=[[3.12*Math.cos(a),4.1+3.12*Math.sin(a),-8],
          [3.12*Math.cos(b),4.1+3.12*Math.sin(b),-8],
          [2.35*Math.cos(b),4.1+2.35*Math.sin(b),-8],[2.35*Math.cos(a),4.1+2.35*Math.sin(a),-8]];
        this.face(pts,i%2?'#778572':'#909780','rgba(36,57,46,.5)');
        this.face(pts.map(p=>[p[0],p[1],p[2]-.5]),'#536b5f');
        this.face([pts[0],pts[1],[pts[1][0],pts[1][1],-8.5],[pts[0][0],pts[0][1],-8.5]],'#b3b292');
      }
      for(let i=0;i<14;i++){
        const x=(rand(i+33)-.5)*22,z=-10-rand(i+39)*10;
        this.box(x,0,z,.6+rand(i)*1.4,2+rand(i+9)*7,.7,['#4e6a5e','#49645a','#7e8b72']);
      }
      for(let i=0;i<24;i++){
        const x=(rand(i+82)-.5)*18,z=(rand(i+91)-.5)*17;
        if(Math.abs(x)<3.4&&z>-4.5&&z<4.5)continue;
        this.box(x,0,z,.3+rand(i+2)*.6,.2+rand(i+7)*.35,.3+rand(i+23)*.7,['#73816c','#4f6558','#a1a083']);
      }
      for(let i=0;i<200;i++){
        const x=(rand(i+111)-.5)*22,z=(rand(i+21)-.5)*22,y=.012;
        const d=.05+rand(i+2)*.08;
        this.face([[x-d,y,z],[x,y,z+d*1.9],[x+d,y,z],[x,y,z-d]],['#bc9958','#9f9052','#d1ad65','#748052'][i%4]);
      }
      for(let i=0;i<90;i++){
        const x=(rand(i+511)-.5)*21,z=(rand(i+901)-.5)*22;
        if(Math.abs(x)<3.4&&z>-4.5&&z<4.5)continue;
        this.face([[x-.06,0,z],[x-.12,.26+rand(i)*.25,z-.05],[x+.09,0,z]],i%2?'#6e865b':'#a1a06b');
      }
    }
    camera(key,now,w,h){
      // Portrait framing widens the lens, preserving both participants.
      const base=SHOTS[key],goal={...base,fov:base.fov+(w/h<.95?16:0)};
      const id=key+':'+(w/h<.95?'narrow':'wide');
      if(this.key!==id){this.from=this.pose;this.to=goal;this.start=now;this.key=id;}
      const t=this.reduced?1:smooth(clamp((now-this.start)/650,0,1));
      this.pose={eye:this.to.eye.map((v,i)=>mix(this.from.eye[i],v,t)),target:this.to.target.map((v,i)=>mix(this.from.target[i],v,t)),fov:mix(this.from.fov,this.to.fov,t)};
      return cameraFrame(this.pose);
    }
    render(game,menu){
      const c=this.ctx,rect=this.canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=Math.min(devicePixelRatio||1,2);
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
      c.setTransform(dpr,0,0,dpr,0,0);
      const now=game?.now||0,a=game?.action;
      const key=a?(a.kind==='ultimate'?'ultimate':a.actor==='enemy'?'enemy':'player'):menu?.page==='target'?(menu.pending?.target==='player'?'targetSelf':'targetEnemy'):menu?.page==='skills'||menu?.page==='items'?'skills':'command';
      const f=this.camera(key,now,w,h),proj=p=>projectPoint(p,f,w,h);
      this.w=w;this.h=h;this.now=now;
      const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#4e6c62');sky.addColorStop(.48,'#b4b294');sky.addColorStop(1,'#283f37');c.fillStyle=sky;c.fillRect(0,0,w,h);
      const sun=proj([-1.8,7,-20])||{x:w*.5,y:h*.2},glow=c.createRadialGradient(sun.x,sun.y,10,sun.x,sun.y,w*.65);
      glow.addColorStop(0,'rgba(255,232,161,.7)');glow.addColorStop(.25,'rgba(245,218,147,.28)');glow.addColorStop(1,'rgba(213,205,151,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);
      // Distant silhouettes are also projected, so orbiting reveals different layers.
      for(let layer=0;layer<3;layer++){
        const points=[];for(let i=0;i<=16;i++)points.push([-35+i*4.5,1.5+Math.sin(i*1.7+layer)*1.3+layer*1.3,-29+layer*4]);
        points.push([37,-3,-29+layer*4],[-35,-3,-29+layer*4]);
        this.polygon(points.map(proj).filter(Boolean),['#657e6b','#71836b','#879074'][layer]);
      }
      const objects=[],ground=[];
      const baseFloor=[[-40,-.01,-40],[40,-.01,-40],[40,-.01,40],[-40,-.01,40]];
      const clipped=(pts)=>{const out=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],da=a.reduce((n,v,j)=>n+(v-f.eye[j])*f.forward[j],0),db=b.reduce((n,v,j)=>n+(v-f.eye[j])*f.forward[j],0);if(da>.16)out.push(a);if((da>.16)!==(db>.16)){const t=(.16-da)/(db-da);out.push(a.map((v,j)=>mix(v,b[j],t)));}}return out.map(proj).filter(Boolean);};
      this.polygon(clipped(baseFloor),'#485646');
      for(const g of this.geometry){
        const p=clipped(g.p);if(!p.length)continue;
        if(p.every(v=>v.x<0)||p.every(v=>v.x>w)||p.every(v=>v.y<0)||p.every(v=>v.y>h))continue;
        (g.p.every(v=>v[1]<=.03)?ground:objects).push({layer:Math.max(...g.p.map(v=>v[1])),depth:p.reduce((n,v)=>n+v.depth,0)/p.length,draw:()=>this.polygon(p,g.color,g.line)});
      }
      let hp=[...PH],ep=[...PE];
      const hit=a?.hits.find(v=>!v.done)||a?.hits.at(-1);
      if(a&&hit){
        const dt=now-hit.at;
        const attackAmount=dt<0?smooth(clamp((dt+520)/520,0,1)):1-smooth(clamp(dt/360,0,1));
        if(a.actor==='player'&&a.spec.damage){
          const amount=attackAmount*(a.kind==='ultimate'?.75:.66);
          hp=PH.map((v,i)=>mix(v,PE[i],amount));hp[1]=Math.sin(attackAmount*Math.PI)*.38;
        }else if(a.actor==='enemy'){
          ep=PE.map((v,i)=>mix(v,PH[i],attackAmount*.62));
          if(hit.success&&hit.response==='dodge')hp=[PH[0]-.6*attackAmount,Math.sin(attackAmount*Math.PI)*.35,PH[2]+.48*attackAmount];
        }
      }
      const addActor=(kind,pos,base)=>{
        const p=proj(pos);if(!p)return;
        const shadow=[];for(let i=0;i<24;i++){const ang=i*Math.PI/12;shadow.push(proj([pos[0]+Math.cos(ang)*.78,.02,pos[2]+Math.sin(ang)*.42]));}
        if(shadow.every(Boolean))ground.push({layer:.02,depth:p.depth+.06,draw:()=>this.polygon(shadow,'rgba(10,27,24,.46)')});
        objects.push({depth:p.depth,draw:()=>kind==='hero'?this.hero(p,pos,f,game):this.enemy(p,pos,game)});
      };
      addActor('hero',hp,PH);addActor('enemy',ep,PE);
      // A thin ground rune fixes the two actors to the floor.
      for(const pos of [PH,PE]){
        const pts=[];for(let i=0;i<48;i++){const an=i*Math.PI/24;pts.push(proj([pos[0]+Math.cos(an),.025,pos[2]+Math.sin(an)]));}
        if(pts.every(Boolean))ground.push({layer:.025,depth:proj(pos).depth+.07,draw:()=>{c.save();c.globalAlpha=.48;this.polygon(pts,null,'#b6c6a2');c.restore();}});
      }
      ground.sort((x,y)=>x.layer-y.layer||y.depth-x.depth);for(const obj of ground)obj.draw();
      objects.sort((x,y)=>y.depth-x.depth);for(const obj of objects)obj.draw();
      // Airborne motes travel at several depths, with perspective-scaled size.
      for(let i=0;i<35;i++){
        const z=-10+(i*3.7%18),x=-9+(i*2.61+now*.00013)%18,y=.7+(i*.71+now*.00007)%5;
        const p=proj([x,y,z]);if(!p)continue;
        c.fillStyle=i%3?'rgba(249,219,154,.55)':'rgba(211,236,207,.65)';c.beginPath();c.ellipse(p.x,p.y,Math.min(4,p.scale*.025),Math.min(2,p.scale*.012),i+now*.0002,0,Math.PI*2);c.fill();
      }
      const events=game?.events||[],e=[...events].reverse().find(v=>['damage','perfect','parry','dodge','heal','buff'].includes(v.kind));
      if(e&&now-e.at<500){
        const at=proj(e.target==='player'?[hp[0],.9,hp[2]]:[ep[0],1.3,ep[2]]);
        if(at)this.impact(at,e,(now-e.at)/500);
      }
      if(a?.kind==='ultimate'){
        c.fillStyle='rgba(4,17,18,.8)';const bar=Math.min(35,h*.045);c.fillRect(0,0,w,bar);c.fillRect(0,h-bar,w,bar);
      }
      const head=(pos,ht)=>proj([pos[0],ht,pos[2]]);
      return {w,h,key,label:SHOTS[key].label,player:proj(hp),enemy:proj(ep),playerBase:proj(PH),enemyBase:proj(PE),playerHead:head(hp,1.85),enemyHead:head(ep,2.55),playerTarget:head(PH,.8),enemyTarget:head(PE,1.25)};
    }
    polygon(p,fill,stroke){
      if(!p.length)return;const c=this.ctx;c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();
      if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
    }
    ellipse(x,y,rx,ry,fill,stroke){
      const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=.015;c.stroke();}
    }
    hero(p,pos,frame,game){
      const c=this.ctx,s=p.scale,breathe=this.reduced?0:Math.sin(this.now*.002)*.018;
      const look=[.616,0,-.788],view=[frame.eye[0]-pos[0],0,frame.eye[2]-pos[2]];
      const facing=(look[0]*view[0]+look[2]*view[2])/Math.hypot(view[0],view[2]),back=facing<-.28,side=Math.abs(facing)<.6;
      c.save();c.translate(p.x,p.y);c.scale(s,s);c.translate(0,-breathe);
      if(game?.shield){c.shadowColor='#bcf1d7';c.shadowBlur=15;this.ellipse(0,-.9,.97,1.08,'rgba(149,231,202,.1)','#b8e7cc');c.shadowBlur=0;}
      c.save();c.translate(-.25,-.45);c.rotate(-.2+Math.sin(this.now*.003)*.08);c.fillStyle='#486c65';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-.85,.12,-1.07,-.2);c.lineTo(-.9,.05);c.lineTo(-1.1,.13);c.quadraticCurveTo(-.6,.4,.2,.15);c.closePath();c.fill();c.restore();
      const fur=c.createLinearGradient(-.5,-1.75,.5,0);fur.addColorStop(0,'#fff9e6');fur.addColorStop(.5,'#e9ebd9');fur.addColorStop(1,'#aebfb0');
      c.beginPath();for(let i=0;i<=72;i++){const t=i/72*Math.PI*2,r=1+((i%2)?-.035:.035);const x=Math.cos(t)*.82*r,y=-.88+Math.sin(t)*.83*r;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.fillStyle=fur;c.fill();c.strokeStyle='#dce5cf';c.lineWidth=.025;c.stroke();
      c.beginPath();c.moveTo(-.23,-1.63);c.quadraticCurveTo(-.14,-1.97,.05,-2.02);c.quadraticCurveTo(-.01,-1.83,.11,-1.76);c.quadraticCurveTo(.28,-1.94,.31,-1.96);c.quadraticCurveTo(.38,-1.69,.22,-1.59);c.fillStyle='#f4f1dc';c.fill();
      c.beginPath();c.moveTo(-.71,-.53);c.quadraticCurveTo(.05,-.15,.71,-.58);c.lineTo(.64,-.34);c.quadraticCurveTo(0,.0,-.61,-.32);c.closePath();c.fillStyle='#416b61';c.fill();
      c.beginPath();c.moveTo(-.61,-.46);c.quadraticCurveTo(.1,-.15,.65,-.49);c.strokeStyle='#a9bc9b';c.lineWidth=.035;c.stroke();
      if(back){
        this.ellipse(.18,-.35,.15,.14,'#a1b39a');
        c.strokeStyle='rgba(120,145,126,.28)';c.lineWidth=.012;
        for(let i=0;i<14;i++){const x=Math.sin(i*2.4)*.57,y=-.65-(i%4)*.22;c.beginPath();c.moveTo(x,y);c.lineTo(x+.06,y+.08);c.lineTo(x+.13,y+.025);c.stroke();}
      }else{
        const shift=side?.17:0;
        this.ellipse(-.24+shift,-1.0,.046,.075,'#233e37');this.ellipse(.23+shift,-1.0,.046,.075,'#233e37');
        this.ellipse(-.25+shift,-1.026,.013,.022,'#f6fff0');this.ellipse(.22+shift,-1.026,.013,.022,'#f6fff0');
        this.ellipse(-.4+shift,-.84,.10,.04,'rgba(224,163,140,.4)');this.ellipse(.38+shift,-.84,.10,.04,'rgba(224,163,140,.4)');
        c.beginPath();c.moveTo(-.055+shift,-.87);c.quadraticCurveTo(shift,-.82,.055+shift,-.87);c.strokeStyle='#5b7567';c.lineWidth=.018;c.stroke();
      }
      c.restore();
    }
    enemy(p,pos,game){
      const c=this.ctx,s=p.scale,a=game?.action,h=a?.actor==='enemy'?(a.hits.find(v=>!v.done)||a.hits.at(-1)):null;
      const red=!!h?.red,charge=h?clamp((this.now-h.at+950)/950,0,1):0,dt=h?this.now-h.at:-9999;
      c.save();c.translate(p.x,p.y);c.scale(s,s);
      if(red){c.shadowColor='#ff695b';c.shadowBlur=24;}
      const cape=c.createLinearGradient(-.6,-2.2,.6,0);cape.addColorStop(0,'#637970');cape.addColorStop(.3,'#263f3a');cape.addColorStop(1,'#1c2e2c');
      c.fillStyle=cape;c.beginPath();c.moveTo(-.3,-2.25);c.lineTo(-.61,-1.68);c.quadraticCurveTo(-.51,-.7,-.88,-.05);c.lineTo(-.51,-.2);c.lineTo(-.21,-.04);c.lineTo(.05,-.16);c.lineTo(.35,-.03);c.lineTo(.82,-.2);c.quadraticCurveTo(.44,-1.03,.51,-1.72);c.lineTo(.3,-2.25);c.closePath();c.fill();
      c.shadowBlur=0;c.strokeStyle='#8c9d83';c.lineWidth=.025;c.beginPath();c.moveTo(-.3,-2.1);c.lineTo(-.38,-1.2);c.lineTo(-.67,-.25);c.moveTo(.29,-2.13);c.lineTo(.35,-1.2);c.lineTo(.61,-.23);c.stroke();
      c.fillStyle='#546f63';c.beginPath();c.moveTo(-.42,-1.95);c.lineTo(0,-2.18);c.lineTo(.44,-1.91);c.lineTo(.24,-1.16);c.lineTo(-.27,-1.16);c.closePath();c.fill();
      c.fillStyle='#b7b28c';c.beginPath();c.moveTo(-.24,-2.27);c.lineTo(-.2,-2.57);c.lineTo(.16,-2.61);c.lineTo(.29,-2.3);c.lineTo(.08,-2.05);c.lineTo(-.12,-2.11);c.closePath();c.fill();
      c.strokeStyle='#29463f';c.lineWidth=.035;c.beginPath();c.moveTo(-.18,-2.42);c.lineTo(-.03,-2.35);c.lineTo(.19,-2.43);c.moveTo(.01,-2.36);c.lineTo(.05,-2.15);c.stroke();
      c.fillStyle=red?'#ff8469':'#b8edcd';this.ellipse(-.09,-2.39,.045,.017,c.fillStyle);this.ellipse(.13,-2.40,.04,.017,c.fillStyle);
      c.strokeStyle=red?'#cf6554':'#9da780';c.lineWidth=.04;c.beginPath();c.moveTo(-.16,-1.8);c.lineTo(.03,-1.95);c.lineTo(.21,-1.77);c.lineTo(.03,-1.58);c.closePath();c.stroke();
      // Windup raises the blade; its fall and trail share the hit's timestamp.
      c.save();c.translate(.39,-1.73);c.rotate(dt>=0&&dt<300?-.9+dt*.003:charge*1.65-.4);
      c.strokeStyle='#637e6c';c.lineWidth=.16;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(.3,.3);c.lineTo(.53,.14);c.stroke();
      c.translate(.53,.14);c.rotate(-.3);c.fillStyle='#b5b68e';c.fillRect(-.18,-.09,.36,.07);c.fillStyle='#243e36';c.fillRect(-.04,-.06,.08,.26);
      const metal=c.createLinearGradient(-.08,-1.3,.1,0);metal.addColorStop(0,red?'#ffac88':'#e6e6c5');metal.addColorStop(.45,red?'#be5947':'#b7c0a1');metal.addColorStop(1,'#536a60');c.fillStyle=metal;
      c.beginPath();c.moveTo(-.055,-.08);c.lineTo(-.08,-1.05);c.lineTo(.02,-1.43);c.lineTo(.11,-1.07);c.lineTo(.07,-.08);c.closePath();c.fill();c.restore();
      if(h&&charge>.5){c.globalAlpha=(charge-.5)*1.5;c.strokeStyle=red?'#ff8a72':'#dfd9a1';c.lineWidth=.018;c.beginPath();c.arc(.15,-1.4,1.15,-2.6,-.4);c.stroke();c.globalAlpha=1;}
      c.restore();
    }
    impact(p,e,t){
      const c=this.ctx,color=['dodge','parry','heal','buff'].includes(e.kind)?'#b9f5d9':e.kind==='perfect'?'#ffdf94':'#f8efd3';
      c.save();c.translate(p.x,p.y);c.globalAlpha=1-t;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2*(1-t)+1;
      const r=(.15+t*.9)*p.scale;
      c.beginPath();c.ellipse(0,0,r,r*.65,-.3,0,Math.PI*2);c.stroke();
      for(let i=0;i<9;i++){const a=i*2.4;c.beginPath();c.moveTo(Math.cos(a)*r*.6,Math.sin(a)*r*.6);c.lineTo(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5);c.stroke();}
      c.restore();
    }
  }
  globalThis.DuelScene=DuelScene;
})();

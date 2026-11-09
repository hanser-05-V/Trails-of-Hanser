(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PrologueWorld=api;})(globalThis,()=>{
  'use strict';
  const T=24,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const maps={
    outskirts:{name:'归乡路',w:44,h:35,paths:[[20,0,5,35],[3,14,41,5],[15,11,3,7],[31,4,3,14]],houses:[{x:12,y:7,w:7,h:5,name:'你的家',color:'blue'},{x:29,y:5,w:7,h:5,name:'旧书屋',color:'slate'},{x:5,y:23,w:7,h:4,name:'',color:'red'},{x:31,y:22,w:7,h:5,name:'',color:'blue'}],trees:[],props:[],points:{home:{x:16.5,y:13.5,label:'家门'},disc:{x:17.5,y:15.5,label:'拾起魔导盘'},east:{x:42,y:16.5,label:'前往镇内街区'},closed:{x:22.5,y:32,label:'归乡通道'},guard:{x:18.5,y:14,label:'查看卫兵'}}},
    town:{name:'毛怪小镇',w:44,h:36,paths:[[0,22,44,4],[21,2,3,33],[7,19,4,6],[29,15,7,10],[3,30,34,3]],houses:[{x:4,y:15,w:8,h:5,name:'街角杂货铺',color:'blue'},{x:6,y:27,w:8,h:4,name:'',color:'slate'},{x:30,y:9,w:8,h:6,name:'',color:'red'},{x:31,y:28,w:8,h:5,name:'',color:'blue'},{x:5,y:3,w:7,h:5,name:'',color:'slate'}],trees:[],props:[],points:{west:{x:1.5,y:24,label:'返回归乡路'},residentA:{x:9,y:21,label:'与熟悉的居民交谈'},residentB:{x:32,y:18,label:'与等待的居民交谈'},poster:{x:35,y:24.5,label:'查看旧公告栏'},resolve:{x:22.5,y:18,label:'停在路口'},gate:{x:22.5,y:9.5,label:'走近守卫'},exit:{x:22.5,y:4.5,label:'前往憨塔'}}}
  };
  const within=(x,y,r)=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3];
  function pathAt(map,x,y){return map.paths.some(r=>within(x,y,r));}
  for(const [name,m] of Object.entries(maps)){
    for(let y=1;y<m.h-1;y+=2)for(let x=1;x<m.w-1;x+=2){
      const border=x<3||x>m.w-5||y<3||y>m.h-4;
      const patch=name==='outskirts'?(x<10&&y<13||x>27&&y>29):(x<17&&y>32||x>37&&y<21||x<4&&y<21);
      if(!(border||patch)||pathAt(m,x,y)||pathAt(m,x+1,y+1)||m.houses.some(h=>within(x,y,[h.x-2,h.y-2,h.w+4,h.h+4])))continue;
      m.trees.push({x:x+.5+rand(x+y*9)*.5,y:y+1,size:1+rand(x*7+y)*.2});
    }
  }
  for(const [x,y]of[[17,24],[18,27],[27,28],[28,25],[16,20],[9,19],[7,13],[26.5,11],[27,7],[38,10],[38,23],[36,30],[10,9]])maps.outskirts.trees.push({x,y,size:1.1});
  for(const [x,y]of[[16,15],[17,13],[27,16],[27,12],[17,28],[18,31],[28,30],[29,27],[12,10],[31,3],[38,20],[40,27],[15,6],[17,7]])maps.town.trees.push({x,y,size:1.1});
  maps.outskirts.props=[{kind:'lamp',x:19,y:13},{kind:'lamp',x:26,y:23},{kind:'lamp',x:38,y:14},{kind:'sign',x:26,y:18,text:'毛怪小镇 →'},{kind:'flowers',x:13,y:13},{kind:'flowers',x:19,y:11},{kind:'mailbox',x:13,y:12},{kind:'bench',x:32,y:12},{kind:'gate',x:22.5,y:31}];
  maps.town.props=[{kind:'lamp',x:18.5,y:22},{kind:'lamp',x:26,y:12},{kind:'lamp',x:34,y:20},{kind:'lamp',x:13,y:24},{kind:'bench',x:31,y:18.7},{kind:'poster',x:35,y:23.7},{kind:'fountain',x:27,y:24},{kind:'flowers',x:28,y:15},{kind:'flowers',x:30,y:15},{kind:'sign',x:25.5,y:8,text:'憨塔 ↑'},{kind:'tower',x:22.5,y:2},{kind:'mailbox',x:6,y:19}];
  function walkable(mapName,x,y){
    const m=maps[mapName];if(!m||!Number.isFinite(x)||!Number.isFinite(y)||x<.8||y<1||x>m.w-1||y>m.h-1)return false;
    if(m.houses.some(h=>within(x,y,[h.x-.2,h.y,h.w+.4,h.h+.2])))return false;
    if(m.trees.some(t=>Math.abs(x-t.x)<.55&&Math.abs(y-t.y)<.45))return false;
    if(m.props.some(p=>['fountain','tower','poster','lamp'].includes(p.kind)&&Math.hypot(x-p.x,y-p.y)<(p.kind==='fountain'?1.2:p.kind==='tower'?2:.38)))return false;
    return true;
  }
  function findPath(mapName,start,end){
    const m=maps[mapName];if(!m)return [];
    const sx=Math.floor(start.x),sy=Math.floor(start.y),tx=Math.floor(end.x),ty=Math.floor(end.y);
    if(!walkable(mapName,tx+.5,ty+.5))return [];
    const key=(x,y)=>y*m.w+x,seen=new Set([key(sx,sy)]),queue=[[sx,sy]],previous=new Map();let found=false;
    for(let i=0;i<queue.length&&i<m.w*m.h;i++){
      const [x,y]=queue[i];if(x===tx&&y===ty){found=true;break;}
      for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(seen.has(k)||!walkable(mapName,nx+.5,ny+.5))continue;seen.add(k);previous.set(k,[x,y]);queue.push([nx,ny]);}
    }
    if(!found)return [];
    const out=[];let at=[tx,ty];while(at[0]!==sx||at[1]!==sy){out.push({x:at[0]+.5,y:at[1]+.5});at=previous.get(key(...at));if(!at)return [];}
    return out.reverse();
  }
  function interactions(s){
    const p=maps[s.map]?.points;if(!p)return [];
    if(s.map==='outskirts')return [
      {...p.home,id:'home'},...(s.phase==='disc'?[{...p.disc,id:'disc'}]:[]),
      ...(s.flags.firstBattle?[{...p.guard,id:'guard'}]:[]),
      ...(s.flags.companion?[{...p.east,id:'east'},{...p.closed,id:'closed'}]:[])
    ];
    return [{...p.west,id:'west'},{...p.residentA,id:'residentA'},{...p.residentB,id:'residentB'},{...p.poster,id:'poster'},
      ...(s.phase==='resolve'?[{...p.resolve,id:'resolve'}]:[]),
      ...(s.phase==='tower'?[{...p.gate,id:'gate'}]:[]),...(s.phase==='depart'?[{...p.exit,id:'exit'}]:[])];
  }
  function objectivePoints(s){
    const p=maps[s.map]?.points;if(!p)return [];
    if(s.phase==='returning')return [p.home];if(s.phase==='disc')return [p.disc];
    if(['investigate','resolve','tower','depart'].includes(s.phase)&&s.map==='outskirts')return [p.east];
    if(s.phase==='investigate')return [!s.flags.residentA&&p.residentA,!s.flags.residentB&&p.residentB].filter(Boolean);
    if(s.phase==='resolve')return [p.resolve];if(s.phase==='tower')return [p.gate];if(s.phase==='depart')return [p.exit];return [];
  }
  function actor(c,x,y,kind='hero',dir='down',frame=0,scale=1,mimic=false){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
    const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    c.fillStyle='#182e4a66';c.beginPath();c.ellipse(0,0,9,3,0,0,Math.PI*2);c.fill();
    const step=Math.floor(frame)%2?1:0;
    if(['hero','resident','prayer'].includes(kind)){
      r(-6,-2+step,4,3,'#73858f');r(3,-2-step,4,3,'#73858f');
      r(-7,-16,14,13,'#aebfca');r(-9,-13,18,9,'#aebfca');r(-6,-18,11,2,'#e4e8df');r(-4,-20,3,3,'#e4e8df');r(1,-19,2,2,'#f5f1dd');
      r(-7,-15,14,10,kind==='hero'?'#f6f3df':'#cbd1c9');r(-8,-12,16,6,kind==='hero'?'#e9ebdc':'#bcc9c6');r(-5,-17,9,3,'#f8f4e0');r(-5,-5,12,2,'#8dabad');
      if(dir!=='up'){const off=dir==='left'?-2:dir==='right'?2:0;r(-4+off,-12,2,3,'#263746');r(3+off,-12,2,3,'#263746');r(-1+off,-8,2,1,'#957b78');r(-6+off,-9,2,1,'#d7b1a0');r(5+off,-9,2,1,'#d7b1a0');}
      if(kind==='hero'){
        r(-7,-5,15,2,mimic?'#d3ad66':'#557e89');r(-8,-5,3,6,mimic?'#be9153':'#446b79');
        if(dir==='up'||dir==='left'){r(1,-11,6,7,'#a78760');r(2,-10,4,5,'#ceb48a');r(3,-10,2,1,'#745c49');}
        if(mimic){r(-7,-15,3,3,'#e2b97c');r(-6,-15,1,2,'#fff0bd');}
      }
    }else if(kind==='mansui'){
      r(-4,-3,3,3,'#5a4a4d');r(2,-3,3,3,'#5a4a4d');r(-6,-14,12,11,'#56515c');r(-5,-16,10,12,'#3c3e4e');
      r(-4,-21,9,8,'#4b424b');r(-5,-18,11,7,'#514450');r(-3,-18,7,6,'#e8c5ac');r(-3,-21,7,3,'#403d4b');r(-5,-19,3,7,'#403d4b');r(4,-19,2,8,'#403d4b');
      r(-3,-14,7,8,'#d6b4ae');r(-4,-9,9,6,'#b88f94');r(-5,-6,12,3,'#c2a0a1');r(-1,-13,2,7,'#f0d9c0');r(-2,-17,1,2,'#443849');r(2,-17,1,2,'#443849');r(5,-18,2,2,'#c48076');r(-6,-12,2,6,'#dfc1a8');
    }else{
      const mage=kind==='mage';r(-6,-3+step,4,4,'#293c4c');r(3,-3-step,4,4,'#293c4c');r(-7,-16,14,14,mage?'#77647f':'#627985');r(-8,-7,16,4,mage?'#594e72':'#435f75');r(-5,-21,10,7,'#82929a');r(-4,-18,8,4,'#bdc5bc');r(-4,-22,9,3,mage?'#8b7296':'#778c9c');r(-2,-17,2,1,'#e9ab8e');r(3,-17,2,1,'#e9ab8e');r(-5,-14,11,2,'#b2a684');r(8,-18,2,18,mage?'#b89b77':'#b9c4c7');if(mage){r(6,-22,6,5,'#b5a2ce');r(7,-23,4,7,'#d2b9e1');}
    }
    c.restore();
  }
  class Renderer{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera={x:0,y:0};this.cache={};this.time=0;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
    resize(){const r=this.canvas.getBoundingClientRect(),scale=r.width<600?1.2:1.65,w=Math.ceil(r.width/scale),h=Math.ceil(r.height/scale);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.w=w;this.h=h;this.scale=r.width/w;this.ctx.imageSmoothingEnabled=false;}
    ground(name){
      if(this.cache[name])return this.cache[name];const m=maps[name],canvas=document.createElement('canvas');canvas.width=m.w*T;canvas.height=m.h*T;const c=canvas.getContext('2d');
      for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
        const n=x*13+y*911,road=pathAt(m,x+.5,y+.5);c.fillStyle=road?['#8f9da6','#939fa8','#95a1aa'][Math.floor(rand(n)*3)]:['#5f7d79','#627f7a','#64817b','#617d77'][Math.floor(rand(n)*4)];c.fillRect(x*T,y*T,T,T);
        if(road){for(let i=0;i<9;i++){const px=x*T+Math.floor(rand(n+i*3)*23),py=y*T+Math.floor(rand(n+i*7+5)*23);c.fillStyle=i%3?'#7e8e9b55':'#b7bdbd77';c.fillRect(px,py,i%3+1,1);}for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(!pathAt(m,x+.5+dx,y+.5+dy)){c.fillStyle='#455f6f';c.fillRect(x*T+(dx>0?22:0),y*T+(dy>0?22:0),dx?2:24,dy?2:24);c.fillStyle='#aab4b3';c.fillRect(x*T+(dx>0?20:dx<0?2:0),y*T+(dy>0?20:dy<0?2:0),dx?2:24,dy?2:24);}}
        else{for(let i=0;i<5;i++){const px=x*T+Math.floor(rand(n+i*19)*23),py=y*T+Math.floor(rand(n+i*23+5)*23);c.fillStyle=i%2?'#91a49266':'#456d6f77';c.fillRect(px,py,1,2);c.fillRect(px+1,py+1,2,1);}}
      }
      // Individual paving slabs establish entrances without covering the walking path.
      for(const h of m.houses){const x=(h.x+h.w/2-.9)*T,y=(h.y+h.h)*T;for(let j=0;j<2;j++){c.fillStyle='#697e8b';c.fillRect(x-2,y+j*7,44,7);c.fillStyle='#a2adb0';c.fillRect(x,y+j*7,40,4);}}
      if(name==='town'){c.fillStyle='#758a92';c.fillRect(29*T,15*T,7*T,5*T);for(let y=15;y<20;y++)for(let x=29;x<36;x++){c.strokeStyle='#9faba555';c.strokeRect(x*T+1,y*T+1,T-2,T-2);}c.fillStyle='#456270';c.fillRect(19*T,5*T,7*T,3);}
      this.cache[name]=canvas;return canvas;
    }
    tree(c,t){
      const x=t.x*T,y=t.y*T,s=t.size||1;c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#253e5166';c.fillRect(-15,-3,35,9);c.fillStyle='#4f4f59';c.fillRect(-3,-22,7,23);c.fillStyle='#818272';c.fillRect(-2,-20,2,18);
      const poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();};
      poly([[-19,-22],[-16,-30],[-19,-33],[-12,-39],[-13,-45],[-5,-48],[-2,-53],[6,-51],[10,-46],[16,-44],[15,-38],[22,-32],[18,-28],[20,-22],[12,-16],[3,-15],[-4,-17],[-12,-16]],'#294858');
      poly([[-18,-27],[-13,-32],[-15,-38],[-7,-42],[-7,-47],[2,-50],[9,-44],[14,-43],[12,-38],[19,-32],[15,-28],[16,-23],[8,-20],[0,-21],[-8,-22]],'#3d6670');
      poly([[-12,-36],[-7,-41],[-6,-46],[1,-48],[8,-42],[11,-41],[8,-36],[13,-32],[9,-27],[1,-28],[-4,-30],[-11,-29]],'#56847e');
      poly([[-6,-40],[-3,-44],[2,-46],[6,-41],[3,-38],[6,-35],[1,-34],[-4,-36]],'#789c8a');
      for(let i=0;i<24;i++){const xx=Math.floor((rand(i+t.x*6)-.5)*30),yy=-23-Math.floor(rand(i+t.y*9)*22);c.fillStyle=i%3?'#679088':'#87a597';c.fillRect(xx,yy,2,1);}c.restore();
    }
    house(c,h){
      const x=h.x*T,y=h.y*T,w=h.w*T,d=h.h*T,bottom=y+d,wallTop=y+d*.4,roofTop=y-29;
      const colors=h.color==='red'?['#6d5261','#a87c7d','#c09991']:h.color==='slate'?['#3c566b','#6d8393','#95a1a8']:['#304c68','#577c98','#83a0ae'];
      const r=(a,b,ww,hh,col)=>{c.fillStyle=col;c.fillRect(Math.round(a),Math.round(b),Math.round(ww),Math.round(hh));};
      r(x+8,bottom-4,w+9,15,'#203c5140');r(x,wallTop,w,d*.6,'#b7b9ac');r(x+w-12,wallTop,12,d*.6,'#7f9093');r(x,wallTop,7,d*.6,'#93a6a4');r(x,bottom-8,w,9,'#62798a');r(x+7,bottom-7,w-20,3,'#95a5a7');
      for(let row=0;row<6;row++){const yy=wallTop+12+row*12;if(yy>bottom-12)break;r(x+7,yy,w-19,1,'#94a5a055');for(let col=0;col<h.w;col++)r(x+13+col*24+(row%2?10:0),yy-6,1,6,'#94a5a055');}
      // Roof is stepped pixel geometry with visible tile rows and eaves.
      const roofBottom=wallTop+10;
      for(let yy=roofTop;yy<roofBottom;yy++){const t=(yy-roofTop)/(roofBottom-roofTop),inset=(1-t)*18;r(x-9+inset,yy,w+18-inset*2,1,colors[1]);}
      for(let yy=roofTop+4;yy<roofBottom;yy+=8){const t=(yy-roofTop)/(roofBottom-roofTop),inset=(1-t)*18;r(x-9+inset,yy,w+18-inset*2,2,colors[0]);for(let xx=x-8+inset;xx<x+w+8-inset;xx+=12){r(xx+(Math.floor(yy/8)%2?5:0),yy-5,1,5,colors[2]);r(xx+2,yy-4,7,1,colors[2]);}}
      r(x+9,roofTop-2,w-18,4,colors[2]);r(x-10,roofBottom,w+20,4,colors[0]);r(x-7,roofBottom+4,w+14,3,'#b7c2ba');r(x-7,roofBottom+7,w+14,3,'#5e737f');
      const doorX=x+w/2-11;r(doorX-3,bottom-36,28,30,'#647781');r(doorX,bottom-34,22,28,'#53616e');r(doorX+3,bottom-31,16,20,'#7f817a');r(doorX+15,bottom-19,2,2,'#e9ce93');r(doorX-3,bottom-6,29,3,'#c0c4b6');
      for(const wx of[x+22,x+w-44]){r(wx-3,bottom-39,26,25,'#6a8189');r(wx,bottom-36,20,19,'#decda2');r(wx+2,bottom-34,16,15,'#f1ddb0');r(wx+9,bottom-35,2,19,'#86968c');r(wx,bottom-27,20,2,'#86968c');r(wx-4,bottom-14,28,3,'#596f81');}
      // Chimney, flower boxes and small façade detail.
      r(x+w-37,roofTop-13,13,24,'#7d8a92');r(x+w-39,roofTop-14,17,4,'#a9b5b5');r(x+w-34,roofTop-10,7,2,'#586b7c');r(x+20,bottom-11,25,5,'#705d59');for(let i=0;i<6;i++){r(x+21+i*4,bottom-14,3,3,i%2?'#b9bd94':'#d5b5a4');}
      if(h.name){c.font='9px "Microsoft YaHei",sans-serif';c.textAlign='center';const sw=c.measureText(h.name).width+15;r(x+w/2-sw/2,bottom-51,sw,12,'#455e6d');c.fillStyle='#e2d5b7';c.fillText(h.name,x+w/2,bottom-42);}
    }
    prop(c,p,time){
      const x=p.x*T,y=p.y*T,r=(xx,yy,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x+xx),Math.round(y+yy),w,h);};
      if(p.kind==='lamp'){r(2,-2,6,4,'#2b4254');r(3,-37,3,37,'#4a5a67');r(0,-42,9,5,'#40576a');r(0,-40,9,10,'#9e9275');r(2,-38,5,6,'#f2d49c');r(-2,-43,13,2,'#6b7e89');}
      if(p.kind==='sign'||p.kind==='poster'){r(-2,-12,4,13,'#67767a');r(-17,-37,34,24,'#3d5969');r(-15,-35,30,20,'#b5b7a4');r(-12,-32,24,14,'#d6ceaf');c.fillStyle='#465566';c.textAlign='center';c.font='7px "Microsoft YaHei",sans-serif';c.fillText(p.kind==='poster'?'演 唱 会':p.text,x,y-23);if(p.kind==='poster'){r(-10,-18,8,1,'#8b8b7c');r(0,-18,9,1,'#8b8b7c');}}
      if(p.kind==='flowers'){r(-16,-7,32,9,'#537269');for(let i=0;i<15;i++){const xx=-14+rand(i+p.x)*28,yy=-13+rand(i+p.y)*12;r(xx,yy,3,3,i%3?'#c9c69e':'#d9ada6');r(xx+1,yy+1,1,1,'#efe3ae');}}
      if(p.kind==='mailbox'){r(-2,-11,4,12,'#6e6a67');r(-6,-20,13,12,'#6f899a');r(-5,-20,11,3,'#a8b4ad');r(-3,-15,7,2,'#344d60');}
      if(p.kind==='bench'){r(-21,-7,44,4,'#475c67');r(-20,-18,42,5,'#8b8979');r(-20,-11,42,4,'#a6a18a');r(-18,-7,3,9,'#495b68');r(17,-7,3,9,'#495b68');}
      if(p.kind==='gate'){r(-52,-4,15,12,'#586b7a');r(39,-4,15,12,'#586b7a');r(-49,-31,9,29,'#899b9e');r(42,-31,9,29,'#899b9e');r(-53,-34,17,5,'#b2bcae');r(38,-34,17,5,'#b2bcae');}
      if(p.kind==='fountain'){r(-26,-12,52,23,'#4e6678');r(-23,-15,46,22,'#8faaa9');r(-19,-12,38,16,'#4f8c9c');for(let i=0;i<7;i++){r(-16+rand(i)*30,-8+rand(i+5)*9,7,1,'#89b6be');}r(-5,-32,10,29,'#b0c1b5');r(-11,-35,22,5,'#ccceba');r(-2,-37,4,5,'#b8d8cb');}
      if(p.kind==='tower'){r(-70,-4,140,13,'#556c7f');r(-56,-20,112,16,'#698191');r(-42,-143,84,124,'#778f9b');r(21,-143,21,124,'#576f87');for(let i=0;i<10;i++){r(-40,-135+i*11,80,1,'#9da9aa');for(let j=0;j<4;j++)r(-34+j*18+(i%2?5:0),-134+i*11,1,10,'#607d8b');}r(-51,-147,102,8,'#b2b6ae');r(-45,-157,90,10,'#607b94');r(-34,-178,68,22,'#607b94');r(-19,-200,38,23,'#607b94');r(-4,-216,8,16,'#b7c2b4');r(-13,-51,26,33,'#354f67');r(-8,-49,16,30,'#264458');r(-10,-113,20,29,'#c9bc98');r(-5,-109,10,22,'#dfcda5');r(-1,-113,2,29,'#789396');r(-10,-99,20,2,'#789396');}
    }
    render(s,time,scene={}){
      this.resize();this.time=time;const c=this.ctx,w=this.w,h=this.h;
      if(scene.home){this.room(s,time,scene);return;}
      const m=maps[s.map]||maps.outskirts,target=scene.focus||s;
      const tx=clamp(target.x*T-w/2,0,Math.max(0,m.w*T-w)),ty=clamp(target.y*T-h*.53,0,Math.max(0,m.h*T-h));
      if(this.lastMap!==s.map||scene.snap||this.reduced){this.camera={x:tx,y:ty};this.lastMap=s.map;}else{this.camera.x+=(tx-this.camera.x)*.09;this.camera.y+=(ty-this.camera.y)*.09;}
      const cx=Math.round(this.camera.x),cy=Math.round(this.camera.y);c.fillStyle='#566f76';c.fillRect(0,0,w,h);c.save();c.translate(-cx,-cy);c.drawImage(this.ground(s.map),0,0);
      // Short timber fence sections frame gardens without blocking roads.
      for(const h of m.houses){c.fillStyle='#6c7b7e';for(let i=0;i<h.w*2;i++){const x=(h.x+i*.5)*T;if(i>h.w-3&&i<h.w+3)continue;c.fillRect(x,(h.y+h.h+.8)*T,3,10);c.fillStyle='#a4aa98';c.fillRect(x-1,(h.y+h.h+.8)*T,5,2);c.fillStyle='#6c7b7e';}c.fillRect(h.x*T,(h.y+h.h+.8)*T+3,h.w*T/2-20,2);c.fillRect((h.x+h.w/2)*T+20,(h.y+h.h+.8)*T+3,h.w*T/2-20,2);}
      const objects=[];for(const t of m.trees)objects.push({y:t.y*T,draw:()=>this.tree(c,t)});for(const house of m.houses)objects.push({y:(house.y+house.h)*T,draw:()=>this.house(c,house)});for(const p of m.props)objects.push({y:p.y*T,draw:()=>this.prop(c,p,time)});
      const addActor=(x,y,kind,dir,frame=0,mimic=false)=>objects.push({y:y*T,draw:()=>actor(c,x*T,y*T,kind,dir,frame,1.15,mimic)});
      if(s.map==='town'){
        addActor(9,21,'resident','down');addActor(32,18,'prayer','up');
        if(!s.flags.secondBattle)addActor(22.5,8.5,'mage','down');else addActor(25.5,10,'mage','left');
      }
      if(s.map==='outskirts'){
        if(['chase','disc','pickup','transform','purify','collapse'].includes(scene.cue)){
          let mx=18.8,my=15.6,gx=20.3,gy=15.7;
          if(scene.cue==='chase'){const t=clamp((time-scene.cueAt)/1900,0,1);mx=31-t*12.2;gx=34-t*13.7;}
          addActor(mx,my,'mansui','left',time/180);addActor(gx,gy,'guard','left',time/180);
        }else if(s.flags.firstBattle)addActor(18.5,14,'guard','down');
        if(s.phase==='disc'||scene.cue==='disc')objects.push({y:15.5*T,draw:()=>this.disc(c,17.5*T,15.5*T,time)});
      }
      addActor(s.x,s.y,'hero',s.dir,s.walking?time/140:0,s.flags.disc||scene.cue==='transform');
      objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
      if(s.flags.companion){const t=this.reduced?0:time*.002;c.fillStyle='#f4d7a3';c.fillRect(Math.round(s.x*T+13+Math.sin(t)*2),Math.round(s.y*T-24+Math.cos(t)*3),3,3);c.fillStyle='#fff0cc';c.fillRect(Math.round(s.x*T+14+Math.sin(t)*2),Math.round(s.y*T-23+Math.cos(t)*3),1,1);}
      // Dusk light is local to windows and lanterns; geometry remains readable.
      for(const p of m.props.filter(p=>p.kind==='lamp')){const g=c.createRadialGradient(p.x*T+4,p.y*T-34,2,p.x*T+4,p.y*T-34,38);g.addColorStop(0,'#ffda8e33');g.addColorStop(1,'#ffda8e00');c.fillStyle=g;c.fillRect(p.x*T-36,p.y*T-74,80,80);}
      if(scene.cue?.startsWith('purify')||scene.cue==='transform'){let at=scene.cue==='purifyA'?{x:9,y:21}:scene.cue==='purifyB'?{x:32,y:18}:scene.cue==='purifyMage'?{x:22.5,y:8.5}:scene.cue==='transform'?s:{x:20.3,y:15.7};for(let i=0;i<16;i++){const t=(time*.0003+i*.13)%1;c.fillStyle=i%2?'#e5d5a899':'#c4e5cc99';c.fillRect(Math.round(at.x*T+Math.sin(i*7)*14*(1-t)),Math.round(at.y*T-t*45),2,3);}}
      if(!scene.hideMarkers){for(const p of objectivePoints(s)){const bob=this.reduced?0:Math.sin(time*.003)*2;c.fillStyle='#233f51';c.fillRect(p.x*T-5,p.y*T-39+bob,11,11);c.fillStyle='#f1d49e';c.fillRect(p.x*T-3,p.y*T-37+bob,7,7);c.fillStyle='#263e4e';c.fillRect(p.x*T,p.y*T-36+bob,1,4);c.fillRect(p.x*T,p.y*T-31+bob,1,1);}}
      if(scene.destination){c.strokeStyle='#f4dbad';c.lineWidth=1;c.strokeRect(scene.destination.x*T-4,scene.destination.y*T-3,8,6);}
      c.restore();
      c.fillStyle=s.flags.residentA&&s.flags.residentB?'#35406e14':'#31507108';c.fillRect(0,0,w,h);
      if(scene.cue==='notebook'){c.save();c.translate(w/2,h*.3);c.rotate(-.08);c.fillStyle='#6e635d';c.fillRect(-29,-20,58,41);c.fillStyle='#ded2ad';c.fillRect(-26,-18,51,35);c.fillStyle='#8d967e';for(let j=0;j<5;j++){c.fillRect(-22,-13+j*6,17,1);c.fillRect(5,-13+j*6,16,1);}c.fillStyle='#b9ab87';c.fillRect(-1,-18,2,35);c.restore();}
    }
    disc(c,x,y,t){const r=this.reduced?0:Math.sin(t*.004)*2;c.fillStyle='#f5dba333';c.fillRect(x-10,y-11,20,13);c.fillStyle='#725e50';c.fillRect(x-5,y-6,11,7);c.fillStyle='#ddbc7c';c.fillRect(x-4,y-7,9,5);c.fillStyle='#f9e5b7';c.fillRect(x-2,y-6,4,3);c.fillRect(x-1,y-19+r,2,5);c.fillRect(x-3,y-17+r,6,1);}
    room(s,time,scene){const c=this.ctx,w=this.w,h=this.h;c.fillStyle='#253c4b';c.fillRect(0,0,w,h);const scale=Math.min(w/360,h/245),x=(w-340*scale)/2,y=Math.max(20,(h-220*scale)/2-15);c.save();c.translate(x,y);c.scale(scale,scale);c.fillStyle='#596875';c.fillRect(0,0,340,215);c.fillStyle='#a2a295';c.fillRect(7,7,326,71);c.fillStyle='#69777a';c.fillRect(7,73,326,6);for(let j=0;j<12;j++){c.fillStyle=j%2?'#8e8c7d':'#969383';c.fillRect(7,80+j*11,326,10);for(let i=0;i<6;i++){c.fillStyle='#7b7e76';const seam=i*65+(j%2?25:0);if(seam>7&&seam<333)c.fillRect(seam,80+j*11,1,10);}}c.fillStyle='#536c7d';c.fillRect(120,18,64,43);c.fillStyle='#a5c0c1';c.fillRect(125,23,54,33);c.fillStyle='#758c8c';c.fillRect(150,23,3,33);c.fillRect(125,39,54,2);c.fillStyle='#cfbc99';c.fillRect(114,16,9,49);c.fillRect(182,16,9,49);c.fillStyle='#c2a886';c.fillRect(213,93,80,61);c.fillStyle='#d1c7ab';c.fillRect(217,97,72,52);c.fillStyle='#ecdfbf';c.fillRect(223,100,58,12);if(scene.cue!=='companion')actor(c,253,132,'mansui','down',0,1.4);c.fillStyle='#8b9c9d';c.fillRect(219,128,68,24);c.fillStyle='#b6c2b4';c.fillRect(219,127,68,5);actor(c,195,145,'hero','right',0,1.5,true);c.fillStyle='#6d7374';c.fillRect(32,80,57,34);c.fillStyle='#b39d7b';c.fillRect(29,75,63,24);c.fillStyle='#d5c19c';c.fillRect(37,78,20,14);c.fillStyle='#71818a';c.fillRect(65,79,11,10);c.fillStyle='#c0a584';c.fillRect(25,20,58,45);c.fillStyle='#65767e';c.fillRect(29,24,50,35);for(let i=0;i<8;i++){c.fillStyle=['#96a99e','#c6b28d','#7a8a9e'][i%3];c.fillRect(31+i*6,27,4,27);}c.fillStyle='#b9a184';c.fillRect(24,60,61,4);if(scene.cue==='companion'){c.fillStyle='#f0d5a5';c.fillRect(196,112,4,4);}c.restore();}
    screenToWorld(x,y){return {x:(x/this.scale+this.camera.x)/T,y:(y/this.scale+this.camera.y)/T};}
  }
  return {T,maps,walkable,findPath,interactions,objectivePoints,Renderer,actor,rand};
});

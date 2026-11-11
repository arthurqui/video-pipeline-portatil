
import * as T from './assets/three.module.js';
const gsap=window.gsap;
const timing=await (await fetch('./timeline.json')).json();
const output=document.querySelector('canvas'),ctx=output.getContext('2d');
const W=540,H=960;
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setSize(W,H);
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
const camera=new T.PerspectiveCamera(43,W/H,.045,80);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const lerp=T.MathUtils.lerp, ease=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
const C={cream:0xf1d8a3,ink:0x20263b,gold:0xf6ad49,brass:0xad6630,teal:0x45e1c7,green:0x8ef38c,paper:0xffe5b4,red:0xfa6650};
const geometries={box:new T.BoxGeometry(),cyl:new T.CylinderGeometry(1,1,1,14),bead:new T.IcosahedronGeometry(1,1),tube:new T.CapsuleGeometry(.50,.58,3,10)};
const materials=new Map();
function mat(color,lit=true){
  const key=color+':'+lit;
  if(!materials.has(key))materials.set(key,lit?new T.MeshStandardMaterial({color,roughness:.7,flatShading:true}):new T.MeshBasicMaterial({color}));
  return materials.get(key);
}
function part(parent,type,color,x,y,z,sx,sy,sz,lit=true){
  const m=new T.Mesh(geometries[type],mat(color,lit));
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
}
const box=(p,c,x,y,z,a,b,d,lit=true)=>part(p,'box',c,x,y,z,a,b,d,lit);
const rod=(p,c,x,y,z,a,b,d)=>part(p,'cyl',c,x,y,z,a,b,d);
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function inst(parent,type,color,list,lit=true){
  const m=new T.InstancedMesh(geometries[type],mat(color,lit),list.length);
  const o=new T.Object3D();
  list.forEach(([x,y,z,sx,sy,sz],i)=>{o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
  parent.add(m);return m;
}
function room(color,floor,fill=0x91b9e6){
  const s=new T.Scene();s.background=new T.Color(color);s.fog=new T.FogExp2(color,.045);
  s.add(new T.HemisphereLight(fill,0x6b3a52,1.45));
  const key=new T.DirectionalLight(0xffe0a9,3.1);key.position.set(-5,8,4);s.add(key);
  const edge=new T.DirectionalLight(fill,1.65);edge.position.set(5,4,-6);s.add(edge);
  box(s,floor,0,-.11,0,24,.20,24);
  return s;
}
function look(x,y,z,tx,ty,tz){camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);}
function texture(w,h,draw){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;
}
function face(p,w,h,x,y,z,map){
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,side:T.DoubleSide,depthWrite:false}));
  m.position.set(x,y,z);p.add(m);return m;
}
const shadowTex=texture(128,128,(g,w,h)=>{
  const a=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  a.addColorStop(0,'#08081794');a.addColorStop(.48,'#08081759');a.addColorStop(1,'#08081700');
  g.fillStyle=a;g.fillRect(0,0,w,h);
});
function shadow(p,x,z,w,d,y=.004){face(p,w,d,x,y,z,shadowTex).rotation.x=-Math.PI/2;}
function cable(p,color,points,r=.035){
  const curve=new T.CatmullRomCurve3(points.map(a=>V(...a)));
  const m=new T.Mesh(new T.TubeGeometry(curve,30,r,7,false),mat(color));p.add(m);return curve;
}
function pulse(p,color,r=.057){return part(p,'bead',color,0,0,0,r,r,r,false);}
function board(p,w,h,x,y,z,lines,opt={}){
  const map=texture(448,256,(g,W,H)=>{
    g.fillStyle=opt.bg||'#182e38';g.fillRect(0,0,W,H);
    g.fillStyle=opt.fg||'#a7ffca';g.font=(opt.size||30)+'px Consolas';
    lines.forEach((s,i)=>g.fillText(s,22,46+i*40,W-40));
  });
  return face(p,w,h,x,y,z,map);
}
function actor(p,x,y,z,shirt,skin=0xd99876){
  const g=group(p,x,y,z);
  box(g,shirt,0,.65,0,.30,.40,.18);
  part(g,'bead',skin,0,.97,0,.13,.15,.12);
  part(g,'bead',0x42303c,0,1.04,-.02,.14,.10,.13);
  for(const side of [-1,1]){
    box(g,0x30364b,side*.082,.24,0,.123,.45,.136);
    box(g,0x24293c,side*.082,.045,.036,.14,.09,.20);
  }
  const arm=group(g,.17,.77,.03);
  box(arm,shirt,0,-.12,.05,.11,.27,.12);
  part(arm,'bead',skin,0,-.27,.10,.068,.073,.067);
  box(g,shirt,-.18,.64,.02,.10,.28,.12);
  return {g,arm};
}
function phone(p,x,y,z){
  const g=group(p,x,y,z);
  box(g,0x25364e,0,0,0,1.18,2.05,.16);
  box(g,0x111c31,0,0,.085,1.08,1.96,.035);
  const screen=texture(260,440,(g,w,h)=>{
    g.fillStyle='#163c48';g.fillRect(0,0,w,h);
    g.strokeStyle='#527f76';g.lineWidth=10;
    for(let i=0;i<7;i++){g.beginPath();g.moveTo(-20,68*i);g.lineTo(275,68*i+102);g.stroke();}
    for(let i=0;i<6;i++){g.beginPath();g.moveTo(40*i,-15);g.lineTo(40*i-110,450);g.stroke();}
    g.strokeStyle='#70fff0';g.lineWidth=11;g.lineJoin='round';g.beginPath();g.moveTo(51,351);g.lineTo(124,283);g.lineTo(97,195);g.lineTo(181,121);g.stroke();
    g.fillStyle='#ffcf6b';g.beginPath();g.arc(181,121,15,0,Math.PI*2);g.fill();
  });
  face(g,1.00,1.80,0,.025,.108,screen);
  box(g,0x1e2938,0,.94,.12,.30,.055,.024);
  return g;
}
const mobile=room(0x11223e,0x203755);
const modernPhone=phone(mobile,0,1.62,0);
const floatRings=[];
for(let i=0;i<5;i++){
  const m=new T.Mesh(new T.TorusGeometry(1.24+i*.40,.012,5,54),mat(i%2?0x42789f:0x3c9b9c,false));
  m.rotation.x=Math.PI/2;m.position.y=.022+i*.025;mobile.add(m);floatRings.push(m);
}
shadow(mobile,0,0,3,3);
const office=room(0x503751,0x645065,0x96bbef);
const desk=group(office,0,0,0);
box(desk,0xa77553,0,.94,0,3.32,.16,1.53);
for(const x of [-1.42,1.42])for(const z of [-.58,.58])box(desk,0x553b3e,x,.45,z,.14,.92,.15);
shadow(office,0,0,4.2,2.5);
const clerk=actor(office,-.64,.10,-.86,0x647898);clerk.g.scale.setScalar(1.40);clerk.g.rotation.y=.31;
const papers=[];
for(let i=0;i<4;i++){
  const g=group(desk,-.65+i*.45,1.029+i*.005,.11);
  const sheet=board(g,.45,.58,0,0,0,['128  574','079  631','207  139'],{bg:'#efe1be',fg:'#57475a',size:35});
  sheet.rotation.x=-Math.PI/2;g.rotation.y=(i-1.5)*.24;papers.push(g);
}
const errors=inst(desk,'box',C.red,Array.from({length:4},(_,i)=>[-.72+i*.45,1.043+i*.005,.20,.13,.013,.054]),false);
const lamps=group(office,1.10,1.04,-.31);
rod(lamps,C.brass,0,.02,0,.18,.04,.18);rod(lamps,C.brass,0,.27,0,.034,.52,.034);
const lamp=new T.Mesh(new T.ConeGeometry(.21,.24,12),mat(C.gold));lamp.position.y=.53;lamps.add(lamp);
function opening(t,p){
  if(p<.24){
    const f=p/.24;
    modernPhone.rotation.set(.08,.43-f*.63,-.08);
    look(lerp(2.3,.04,f),lerp(2.9,1.65,f),lerp(5.95,2.0,f),0,1.55,0);return mobile;
  }
  const f=(p-.24)/.76;
  clerk.arm.rotation.x=-.93+.30*Math.sin(t*5);
  errors.visible=f>.58;
  papers.forEach((g,i)=>g.position.x=-.65+i*.45+ease(.48+i*.07,.68+i*.07,f)*.22*i);
  look(lerp(-2.05,1.27,f),lerp(2.75,2.15,f),lerp(5.9,4.55,f),0,1.14,0);return office;
}
function clockwork(p,r,x,y,z,teeth){
  const g=group(p,x,y,z);
  const hub=rod(g,C.brass,0,0,0,r*.85,.16,r*.85);hub.rotation.x=Math.PI/2;
  const cap=rod(g,C.cream,0,0,.12,r*.15,.13,r*.15);cap.rotation.x=Math.PI/2;
  for(let i=0;i<teeth;i++){
    const a=i/teeth*Math.PI*2;
    const tooth=box(g,i%2?C.gold:C.brass,Math.sin(a)*r*.91,Math.cos(a)*r*.91,0,r*.25,r*.25,.18);
    tooth.rotation.z=-a;
  }
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;box(g,0x4c382e,Math.sin(a)*r*.48,Math.cos(a)*r*.48,.086,r*.16,r*.31,.021).rotation.z=-a;}
  return g;
}
const engine=room(0x302238,0x584454,0xa6b7ec);
shadow(engine,0,0,5,3);
box(engine,0x413142,0,.25,0,3.9,.44,1.18);
for(const x of [-1.76,1.76])box(engine,0x6a4b49,x,1.29,-.1,.16,2.32,.44);
const gears=[clockwork(engine,.60,-.93,1.08,.40,14),clockwork(engine,.45,.01,1.34,.40,11),clockwork(engine,.55,.89,1.06,.40,13),clockwork(engine,.36,-.08,2.03,.40,9)];
const sketch=group(engine,1.03,2.08,.32);
for(let i=0;i<3;i++){
  const m=new T.Mesh(new T.TorusGeometry(.26+i*.10,.011,5,32),mat(0x62cfdb,false));sketch.add(m);
}
const cardMap=texture(300,148,(g,w,h)=>{
  g.fillStyle='#eac183';g.fillRect(0,0,w,h);g.fillStyle='#32263a';
  for(let x=0;x<12;x++)for(let y=0;y<5;y++)if((x*3+y*2)%7<3)g.fillRect(13+x*23,15+y*25,8,13);
});
function paperCard(p,w,h,x,y,z){return face(p,w,h,x,y,z,cardMap);}
const engineCards=Array.from({length:8},(_,i)=>paperCard(engine,.53,.29,i*.44-1.5,2.65,.55));
function babbage(t,p){
  gears.forEach((g,i)=>g.rotation.z=(i%2?-1:1)*t*(.78+i*.12)+i*.4);
  engineCards.forEach((g,i)=>{g.position.x=((i*.49+t*.38)%3.92)-1.96;g.rotation.y=.17*Math.sin(t+i);});
  sketch.scale.setScalar(ease(.57,.89,p));
  look(lerp(2.1,-1.32,p),lerp(2.82,2.16,p),lerp(7.05,6.12,p),0,1.57,0);return engine;
}
const census=room(0x272940,0x424256,0x96cfda);
box(census,0x7b5145,0,.43,0,3.1,.81,1.44);shadow(census,0,0,4.5,2.8);
box(census,0x26404c,0,1.37,-.32,2.76,.94,.35);
const dials=[];
for(let i=0;i<5;i++){
  const x=(i-2)*.49;
  const m=rod(census,C.paper,x,1.52,-.11,.18,.05,.18);m.rotation.x=Math.PI/2;
  const g=group(census,x,1.52,-.072);box(g,C.red,0,.06,.009,.034,.14,.02);dials.push(g);
}
const plate=group(census,0,1.01,.36);
box(plate,0x486b70,0,0,0,1.46,.17,.85);
const sample=paperCard(plate,1.25,.60,0,.092,0);sample.rotation.x=-Math.PI/2;
const pins=group(census,0,1.77,.37);
box(pins,0x6a8385,0,.05,0,1.46,.15,.70);
inst(pins,'cyl',C.cream,Array.from({length:15},(_,i)=>[(i%5-2)*.23,-.11,(Math.floor(i/5)-1)*.18,.029,.24,.029]));
const censusTrack=gsap.timeline({paused:true});
censusTrack.to(pins.position,{y:1.28,duration:.33,ease:'power2.inOut'},.25).to(pins.position,{y:1.77,duration:.23,ease:'power2.out'},.68);
const circuit=cable(census,C.gold,[[0,1.10,.67],[1.11,.98,.67],[1.35,1.13,.25],[1.02,1.53,-.04]],.032);
const spark=pulse(census,C.teal);
for(let i=0;i<13;i++)box(census,C.paper,-1.14,1.01+i*.015,.60,.42,.012,.33).rotation.y=(i%4)*.06;
function cards(t,p){
  const cycle=(t*.48)%1;censusTrack.seek(cycle);
  sample.position.x=lerp(-.64,0,ease(0,.23,cycle));
  spark.visible=cycle>.51&&cycle<.79;spark.position.copy(circuit.getPoint(ease(.51,.79,cycle)));
  dials.forEach((g,i)=>g.rotation.z=-Math.floor(t*.48+(i%2)*.2)*.47-i*.62);
  look(lerp(-1.24,1.63,p),lerp(2.91,2.05,p),lerp(4.20,5.1,p),0,1.39,.27);return census;
}


function racks(p,count,style){
  const lamps=[], tubes=[];
  for(let i=0;i<count;i++){
    const side=i%2?1:-1,z=.48-Math.floor(i/2)*1.11,x=side*1.66;
    const g=group(p,x,0,z);g.rotation.y=side*-1.04;
    box(g,style.body,0,1.42,0,.92,2.83,.73);
    box(g,style.panel,0,1.58,.375,.80,2.32,.036);
    box(g,0x24263b,0,.31,.38,.76,.30,.038);
    shadow(p,x,z,1.5,1.16);
    for(let row=0;row<6;row++)for(let col=0;col<5;col++){
      const px=(col-2)*.135,py=.69+row*.30;
      const cx=x+Math.cos(g.rotation.y)*px+Math.sin(g.rotation.y)*.43;
      const cz=z-Math.sin(g.rotation.y)*px+Math.cos(g.rotation.y)*.43;
      lamps.push([cx,py,cz,.047,.040,.047]);
      tubes.push([cx,py+.09,cz,.045,.155,.045]);
    }
  }
  inst(p,'box',style.light,lamps,false);
  if(style.valves)inst(p,'tube',style.valves,tubes);
}
const relays=room(0x23233c,0x3f4058);
racks(relays,6,{body:0x57556c,panel:0x3c344c,light:0xdaa655,valves:0xb28159});
const colossus=room(0x1c343d,0x375055,0x86d7d5);
racks(colossus,6,{body:0x586763,panel:0x243739,light:0xffca69,valves:0xce754c});
function spool(p,x,y,z,color){
  const g=group(p,x,y,z);
  const d=rod(g,color,0,0,0,.36,.11,.36);d.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;box(g,0x292938,Math.cos(a)*.20,Math.sin(a)*.20,.071,.13,.07,.025).rotation.z=a;}
  const core=rod(g,C.cream,0,0,.11,.07,.11,.07);core.rotation.x=Math.PI/2;return g;
}
function reader(p,light){
  box(p,0x55556b,0,.51,0,1.75,1.05,.69);
  box(p,0x333e53,0,1.25,-.09,1.68,1.49,.29);
  const reels=[spool(p,-.53,1.78,.19,0xa87f68),spool(p,.53,1.78,.19,0xab876d)];
  const band=[];
  for(let i=0;i<9;i++)band.push(paperCard(p,.21,.12,0,1.24,.28));
  const led=pulse(p,light,.09);led.position.set(.0,1.42,.40);
  return {reels,band,led};
}
const z3=reader(relays,C.gold), col=reader(colossus,C.teal);
function war(t,p){
  const modern=p>.54, f=modern?(p-.54)/.46:p/.54;
  const unit=modern?col:z3, speed=modern?7:2.7;
  unit.reels.forEach((g,i)=>g.rotation.z=-t*speed*(i?.84:1));
  unit.band.forEach((g,i)=>g.position.x=((i*.17+t*(modern?2.8:1.0))%1.53)-.765);
  unit.led.scale.setScalar(.07+.025*Math.sin(t*speed*3));
  look(lerp(-1.85,1.25,f),lerp(2.65,1.86,f),lerp(5.65,5.0,f),0,1.50,-.38);
  return modern?colossus:relays;
}
const eniac=room(0x282339,0x51435a,0xafa7e6);
racks(eniac,8,{body:0x58566a,panel:0x323343,light:0xffbd68,valves:0xe29360});
const tech=[actor(eniac,-.92,.0,.51,0xa8707e),actor(eniac,.91,.0,-.87,0x6e90a5,0xa8725e)];
tech[0].g.scale.setScalar(1.28);tech[1].g.scale.setScalar(1.28);tech[0].g.rotation.y=.67;tech[1].g.rotation.y=1.12;
const panel=group(eniac,0,1.32,.28);
box(panel,0x444055,0,-.14,0,1.27,.78,.20);
inst(panel,'cyl',C.cream,Array.from({length:15},(_,i)=>[(i%5-2)*.21,.10-Math.floor(i/5)*.18,.12,.026,.048,.026]));
const wires=[];
for(let i=0;i<4;i++){
  const offset=i*.12-.19;
  wires.push(cable(eniac,[C.red,0xb5a463,0x78b6bd,0xbd86a9][i],[[offset,.96,.40],[-.12+i*.18,.52,.74],[-.77+i*.13,.76,.89],[-1.14+i*.1,1.42,.63]],.027));
}
const signal=wires.map((_,i)=>pulse(eniac,i%2?C.teal:C.gold,.047));
board(eniac,1.88,.76,0,2.43,-2.21,['TABELA DE TRAJETÓRIAS','DISTÂNCIA   ELEVAÇÃO'],{size:25});
const cablePlug=box(eniac,0xaee3dc,-.12,.92,.83,.12,.12,.20);
const plugTrack=gsap.timeline({paused:true}).to(cablePlug.position,{z:.41,duration:.20,ease:'power3.inOut'},.29).to(cablePlug.position,{x:-.17,duration:.15},.34);
function vacuum(t,p){
  plugTrack.seek(p);
  tech.forEach(({arm},i)=>{arm.rotation.x=-1.00+.18*Math.sin(t*3+i);arm.rotation.z=.30+.21*Math.cos(t*2+i);});
  signal.forEach((m,i)=>{m.visible=p>.42;m.position.copy(wires[i].getPoint((t*.75+i*.26)%1));});
  look(lerp(-1.32,1.05,p),lerp(2.52,2.25,p),lerp(6.2,4.50,p),0,1.44,-.47);return eniac;
}
const memory=room(0x172938,0x33495d,0x8adaee);
box(memory,0x687579,0,1.24,0,2.46,2.43,.76);shadow(memory,0,0,4,2.0);
box(memory,0x233844,0,1.65,.401,2.03,1.34,.08);
const monitor=box(memory,0x112630,0,1.65,.462,1.85,1.12,.041,false);
const memoryLeds=[];
for(let j=0;j<7;j++)for(let i=0;i<12;i++){
  const g=pulse(memory,(i+j)%3?0x83ffad:0x51ddbc,.034);
  g.position.set((i-5.5)*.139,1.65+(j-3)*.139,.507);memoryLeds.push(g);
}
const memSignal=[];
for(let i=0;i<3;i++){
  const wire=cable(memory,C.brass,[[-.85+i*.16,.70,.49],[-.84+i*.17,.38,.65],[.66+i*.07,.38,.64],[.73+i*.10,.70,.49]],.023);
  memSignal.push({wire,dot:pulse(memory,C.teal,.037)});
}
function stored(t,p){
  const bank=p<.53?0:1;
  memoryLeds.forEach((dot,i)=>{
    const x=i%12,y=Math.floor(i/12), tick=Math.floor(t*4);
    dot.visible=(x+12*y)<Math.floor((t%2.5)*48)&&((x*(bank?5:3)+y*3+Math.floor(t*.76))%7<4||i===tick%84);
  });
  memSignal.forEach(({wire,dot},i)=>dot.position.copy(wire.getPoint((t*.83+i*.24)%1)));
  look(lerp(1.19,-1.06,p),lerp(1.96,2.46,p),lerp(4.35,5.8,p),0,1.40,.16);return memory;
}
const chips=room(0x153e3d,0x25544e,0x8ae2cc);
box(chips,0x2a6755,0,.18,0,3.7,.27,2.97);shadow(chips,0,0,4.5,3.4);
for(let i=0;i<10;i++){
  const x=(i-4.5)*.34;
  box(chips,i%2?0xc48a49:0xc7b56b,x,.325,-.2,.035,.012,2.4);
  box(chips,0xc9955c,x/2,.33,.58,.17,.013,.58);
}
const vintage=group(chips,-.92,.34,-.19);
rod(vintage,0x423c47,0,.06,0,.27,.12,.27);
part(vintage,'tube',0xb97758,0,.54,0,.45,.60,.45);
rod(vintage,C.cream,0,.49,.01,.060,.63,.060);
const transistor=group(chips,.94,.34,-.19);
part(transistor,'tube',0x8e9b9a,0,.25,0,.24,.28,.22);
for(let i=0;i<3;i++)rod(transistor,C.cream,(i-1)*.11,.10,.03,.024,.27,.024);
const cpu=group(chips,0,2.0,.17);
box(cpu,0x292f41,0,.02,0,1.16,.20,.70);
const lid=box(cpu,0xb4b7a6,0,.14,0,1.00,.08,.55);
const cpuLabel=board(cpu,.80,.31,0,.186,0,['INTEL 4004'],{bg:'#b3b9ac',fg:'#363543',size:49});cpuLabel.rotation.x=-Math.PI/2;
const pinsCpu=[];
for(let i=0;i<16;i++){
  const side=i<8?-1:1,x=(i%8-3.5)*.128;
  pinsCpu.push([x,-.02,side*.40,.046,.054,.22],[x,-.077,side*.48,.046,.16,.044]);
}
inst(cpu,'box',C.cream,pinsCpu);
const calculator=group(chips,0,0,-.20);
box(calculator,0x283b4b,0,.13,0,2.71,.21,2.55);
inst(calculator,'box',0xd9c58b,Array.from({length:20},(_,i)=>[(i%5-2)*.30,.263,Math.floor(i/5)*.27-.16,.22,.10,.20]));
const chipTrack=gsap.timeline({paused:true});
chipTrack.set(cpu.scale,{x:.03,y:.03,z:.03},0).to(cpu.scale,{x:1,y:1,z:1,duration:.18,ease:'back.out(1.7)'},.42)
  .to(cpu.position,{y:.44,duration:.24,ease:'power3.inOut'},.69).to(cpu.rotation,{y:.0,duration:.26},.62);
function silicon(t,p){
  chipTrack.seek(p);
  vintage.position.y=.34+ease(.15,.46,p)*1.56;
  vintage.visible=p<.64;transistor.visible=p<.75;
  transistor.rotation.y=t*.8;
  calculator.visible=p>.79;
  look(lerp(-1.83,1.40,p),lerp(2.80,3.38,p),lerp(6.14,4.95,p),0,lerp(.90,.56,p),.05);return chips;
}
const deskPc=room(0x29334d,0x454d65,0xa8c3f3);
box(deskPc,0x916a53,0,.70,-.15,4.2,.16,1.88);
for(const x of [-1.87,1.87])for(const z of [-.88,.54])box(deskPc,0x68535a,x,.33,z,.18,.70,.16);
shadow(deskPc,0,0,5.2,3);
const computer=group(deskPc,0,0,0);
box(computer,0xcfc29b,0,.93,-.25,1.62,.32,.99);
box(computer,0x36374a,.41,.93,.259,.68,.13,.032);
const crt=group(computer,0,2.96,-.36);
box(crt,0xd5c7a5,0,.04,0,1.21,.87,.65);
box(crt,0x414451,0,.04,.35,1.04,.71,.036);
board(crt,.91,.57,0,.04,.375,['C:\\>_','IBM PC','1981'],{size:32});
const keyboard=group(computer,0,.83,1.98);
box(keyboard,0xd9cba7,0,.04,0,1.47,.082,.47);
inst(keyboard,'box',0xf6e7c7,Array.from({length:48},(_,i)=>[(i%12-5.5)*.103,.09,(Math.floor(i/12)-1.5)*.083,.086,.036,.065]));
const pcTrack=gsap.timeline({paused:true}).to(crt.position,{y:1.56,duration:.27,ease:'bounce.out'},.04).to(keyboard.position,{z:.52,duration:.31,ease:'power3.out'},.10);
const web=room(0x182a44,0x294057,0x75c9e7);
shadow(web,0,0,5,3);
const server=group(web,0,.73,0);
box(server,0x262737,0,0,0,1.52,1.42,1.36);
box(server,0x38394e,0,0,.686,1.40,1.30,.033);
board(server,1.09,.43,0,.21,.713,['THIS MACHINE','IS A SERVER','DO NOT POWER DOWN'],{bg:'#f0df9e',fg:'#834348',size:29});
for(let i=0;i<3;i++)box(server,i===0?C.teal:0x6b768b,-.52+i*.14,-.43,.712,.073,.051,.024,false);
const net=[];
for(let i=0;i<5;i++){
  const x=(i-2)*.89,z=-1.65-Math.abs(i-2)*.42;
  box(web,0x607982,x,.38,z,.54,.71,.23);
  board(web,.42,.48,x,.40,z+.124,['WWW'],{size:64});
  const wire=cable(web,0x477986,[[0,.25,.39],[(i-2)*.35,.08,-.11],[x,.08,z+.44],[x,.40,z+.08]],.027);
  net.push({wire,signal:pulse(web,i%2?C.teal:C.gold,.055)});
}
function personal(t,p){
  if(p<.54){
    const f=p/.54;pcTrack.seek(f);
    look(lerp(-1.5,1.15,f),lerp(2.38,2.05,f),lerp(5.69,5.35,f),0,1.27,0);return deskPc;
  }
  const f=(p-.54)/.46;
  net.forEach(({wire,signal},i)=>signal.position.copy(wire.getPoint((t*.72+i*.21)%1)));
  look(lerp(1.51,-1.55,f),lerp(2.42,1.82,f),lerp(5.62,4.83,f),0,.76,-.47);return web;
}
const data=room(0x152139,0x26314a,0x81badf);
racks(data,14,{body:0x34425a,panel:0x233449,light:0x63d6cf});
const streams=[];
for(let i=0;i<8;i++){
  const x=(i-3.5)*.22;
  const wire=cable(data,0x386b81,[[x,.02,3],[x,.025,.8],[x*.58,.026,-1.8],[x*.45,.032,-5.1]],.019);
  streams.push({wire,dot:pulse(data,i%3?C.teal:C.gold,.048)});
}
const floatingBoard=group(mobile,0,1.63,0);
box(floatingBoard,0x26695b,0,0,0,1.17,1.97,.071);
box(floatingBoard,C.ink,0,.17,.051,.56,.61,.068);
box(floatingBoard,C.gold,0,.17,.091,.36,.40,.026);
for(let i=0;i<9;i++)box(floatingBoard,C.cream,(i-4)*.113,-.42,.049,.036,.47,.025);
function today(t,p){
  if(p<.23||p>.87){
    const start=p<.23, f=start?p/.23:(p-.87)/.13;
    modernPhone.rotation.set(.06,-.25+f*.37,-.08);
    floatingBoard.visible=start&&f>.57;modernPhone.visible=!floatingBoard.visible;
    floatingBoard.rotation.y=.18*t;
    look(lerp(1.24,-.15,f),lerp(2.31,1.77,f),start?lerp(5.31,3.79,f):lerp(4.50,5.1,f),0,1.64,0);
    return mobile;
  }
  modernPhone.visible=true;floatingBoard.visible=false;
  streams.forEach(({wire,dot},i)=>dot.position.copy(wire.getPoint((t*.58+i*.15)%1)));
  const f=(p-.23)/.64;
  look(lerp(.15,-.21,f),lerp(1.15,1.85,f),lerp(6.9,2.32,f),0,1.34,-4.9);return data;
}
const shots=[opening,babbage,cards,war,vacuum,stored,silicon,personal,today];
const labels=[
 [[.47,'CÁLCULOS FEITOS À MÃO']],
 [[0,'DÉCADA DE 1830'],[.40,'ADA LOVELACE  •  1843'],[.75,'UM PROGRAMA NO PAPEL']],
 [[0,'1890  •  CENSO DOS EUA'],[.54,'FURO → CIRCUITO → CONTAGEM']],
 [[0,'1941  •  Z3'],[.54,'1944  •  COLOSSUS']],
 [[0,'ENIAC  •  CERCA DE 18 MIL VÁLVULAS'],[.64,'PROGRAMAR COM CABOS']],
 [[0,'1948  •  MANCHESTER BABY'],[.55,'INSTRUÇÕES NA MEMÓRIA']],
 [[0,'VÁLVULA → TRANSISTOR'],[.38,'CIRCUITO INTEGRADO'],[.65,'1971  •  INTEL 4004']],
 [[0,'1981  •  IBM PC'],[.54,'1990  •  PRIMEIRO SERVIDOR WEB']],
 [[0,'COMPUTAÇÃO NO BOLSO'],[.29,'SERVIDORES E IA'],[.50,'EL CAPITAN  •  1,742 EXAFLOPS'],[.81,'AUTOMATIZAR CÁLCULOS']]
];
function title(text,y,size,fill='#fff9ed'){
  ctx.font='900 '+size+'px "Arial Black",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.strokeStyle='#141325';ctx.lineWidth=size*.14;
  ctx.strokeText(text,W/2,y,494);ctx.fillStyle=fill;ctx.fillText(text,W/2,y,494);
}
function badge(text){
  ctx.font='900 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  const w=ctx.measureText(text).width+44;
  ctx.fillStyle='#101b31ed';ctx.strokeStyle='#f4c36d';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.roundRect((W-w)/2,135,w,41,20);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff0ce';ctx.fillText(text,W/2,156);
}
window.seekTo=function(time){
  let index=timing.scenes.findIndex(s=>time<s.end);
  if(index<0)index=timing.scenes.length-1;
  const scene=timing.scenes[index],t=time-scene.start,p=T.MathUtils.clamp(t/(scene.end-scene.start),0,1);
  if(index!==8){modernPhone.visible=true;floatingBoard.visible=false;}
  renderer.render(shots[index](t,p),camera);
  ctx.drawImage(renderer.domElement,0,0);
  const fade=ctx.createLinearGradient(0,0,0,H);fade.addColorStop(0,'#050a1b9a');fade.addColorStop(.29,'#050a1b00');fade.addColorStop(.65,'#050a1b00');fade.addColorStop(1,'#050a1baf');
  ctx.fillStyle=fade;ctx.fillRect(0,0,W,H);
  if(index===0&&t<3.05){
    ctx.globalAlpha=1-ease(2.65,3.05,t);title('POR QUE CRIARAM',143,46);title('OS COMPUTADORES?',203,49,'#ffcc64');ctx.globalAlpha=1;
  }else{
    const label=labels[index].filter(([at])=>at<=p).at(-1);if(label)badge(label[1]);
  }
  const word=scene.captions.find(w=>time>=w.start&&time<w.end);if(word)title(word.text,757,47);
};
window.animationReady=true;window.seekTo(0);
if(!location.search.includes('export')){
  const start=performance.now(),voice=new Audio('./assets/narracao.mp3');
  output.onclick=()=>{voice.currentTime=0;voice.play();};
  requestAnimationFrame(function frame(now){window.seekTo(voice.paused?((now-start)/1000)%timing.duration:voice.currentTime);requestAnimationFrame(frame);});
}

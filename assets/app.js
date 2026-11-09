const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const C = {internal:'#2a4c9e',external:'#f6bb02',reflection:'#9db99f',roadblocks:'#bd1b1f',foundation:'#b9afa1'};
const CAT = {internal:'Internal',external:'External',reflection:'Reflection',roadblocks:'Roadblocks',foundation:'Foundation'};
const ORDER = ['Foundation','LL','L1','L2','L3'];
const NAMES = {Foundation:'Shared foundations',LL:'Organizational Readiness',L1:'Sense & Choose',L2:'Connect & Build',L3:'Experiment & Grow'};
const BASE = {Foundation:1520,LL:1180,L1:840,L2:500,L3:160};
const state = {floor:'all',room:null,category:null,view:'iso',spread:1,projection:0,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,zoom:1,tour:-1,exterior:0};
const camera = {x:-200,y:-60,w:1440,h:2180};
let cameraHome={...camera}, data={}, rooms=[], dragging=null, suppressClick=false, routeRun=null;
const world=$('#world'), map=$('#map'), canvas=$('#map-canvas');
const duration = n => state.motion ? n : 0;
const ease='power3.inOut';
const svg=(tag,attrs={},parent)=>{const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(parent)parent.appendChild(el);return el;};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const split=s=>s.split(/\s*·\s*|\n/).filter(Boolean);
const rid=(f,c,i)=>`${f}-${c}-${i}`;
const roomById=id=>rooms.find(r=>r.id===id);
function parseSource(source){
 source.guides.forEach(g=>{const arr=g.text,f=arr[0]==='FOUNDATION'?'Foundation':arr[0];
  data[f]={id:f,title:NAMES[f],question:arr[2],groups:{internal:[],external:[],reflection:[],roadblocks:[],foundation:[]}};
  if(f==='Foundation'){data[f].question=arr[1];for(let i=2;i<arr.length;i+=3){data[f].groups.foundation.push({id:rid(f,'foundation',i),floor:f,cat:'foundation',code:arr[i].slice(0,2),title:arr[i].replace(/^\d+\s*/,''),question:arr[i+1],body:arr[i+2]});}return;}
  let cat='internal';for(let i=3;i<arr.length;){if(arr[i].startsWith('■')){cat=arr[i].includes('INTERNAL')?'internal':arr[i].includes('EXTERNAL')?'external':arr[i].includes('REFLECTION')?'reflection':'roadblocks';i++;continue;}
   const title=arr[i],body=arr[i+1]||'';const code=/^(\d\d|E\d|R\d)\s/.test(title)?title.match(/^(\d\d|E\d|R\d)/)[0]:`!${data[f].groups[cat].length+1}`;
   data[f].groups[cat].push({id:rid(f,cat,i),floor:f,cat,code,title:cat==='roadblocks'?title.toLowerCase().replace(/(^|[\s–])\w/g,s=>s.toUpperCase()):title.replace(/^(\d\d|E\d|R\d)\s*/,''),body});i+=2;}
 });
 rooms=ORDER.flatMap(f=>Object.values(data[f].groups).flat());
}
function drawText(parent,title,x,y,width,size=34,maxLines=3){
 const words=title.split(' '),lines=[];let line='';const chars=Math.max(9,Math.floor(width/(size*.43)));
 for(const word of words){if((line+' '+word).trim().length>chars&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);
 const t=svg('text',{x,y,class:'room-title','font-size':size},parent);t.style.fontSize=size+'px';lines.slice(0,maxLines).forEach((s,i)=>{svg('tspan',{x,dy:i?size*1.1:0},t).textContent=s;});return t;
}
function roomShape(parent,r,x,y,w,h,small=false){
 Object.assign(r,{x,y,w,h});const g=svg('g',{class:'room',id:r.id,tabindex:'0',role:'button','aria-label':`${r.floor} ${CAT[r.cat]}: ${r.title}`,'data-room':r.id},parent);
 const color=C[r.cat];svg('rect',{x,y,width:w,height:h,fill:color,class:'room-fill',opacity:r.floor==='L3'&&r.cat!=='roadblocks'?.66:1},g);
 svg('rect',{x:x+3,y:y+3,width:w-6,height:h-6,class:'room-outline'},g);
 const copy=svg('g',{class:'room-copy',fill:r.cat==='internal'?'#f5f1ea':'#33312e'},g);
 if(small){drawText(copy,`${r.code}  ${r.title}`,x+12,y+34,w-24,32,2);}else{svg('text',{x:x+20,y:y+31,class:'room-number'},copy).textContent=r.code;drawText(copy,r.title,x+20,y+72,w-40,r.floor==='L3'?44:48,3);}
 g.addEventListener('pointerenter',e=>hoverRoom(r,e));g.addEventListener('pointermove',e=>moveTip(e));g.addEventListener('pointerleave',()=>unhoverRoom(r));g.addEventListener('focus',()=>highlightRoom(r));g.addEventListener('blur',()=>unhoverRoom(r));g.addEventListener('click',()=>{if(!suppressClick)selectRoom(r.id);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRoom(r.id);}});
}
function blueprint(parent){
 svg('rect',{x:0,y:0,width:1083,height:676,fill:'#c2b9ad',stroke:'#f5f1ea','stroke-width':3},parent);
 const doors=[[330,283],[330,400],[666,160],[666,470]];
 doors.forEach(([x,y])=>svg('path',{d:`M${x},${y}v50q50,0 50,-50`,fill:'none',stroke:'#f5f1ea','stroke-width':2},parent));
 svg('path',{d:'M50 340H600V640H1050',stroke:'#747167','stroke-width':2,fill:'none','stroke-dasharray':'6 6',opacity:.5},parent);
}
function terrace(parent,rect){
 const [x,y,w,h]=rect;svg('path',{d:`M${x+w-100} ${y+h-25}h70v-27h-70z`,fill:'#c8bfae',stroke:'#77786f','stroke-width':1.5,opacity:.8},parent);
 for(let i=0;i<3;i++){svg('circle',{cx:x+w-86+i*22,cy:y+h-48,r:13,fill:'#9db99f',stroke:'#7d8d79','stroke-width':1,opacity:.8},parent);}
}
function drawFloor(f){
 const g=svg('g',{class:'floor-region','data-floor':f,id:'floor-'+f},world),plane=svg('g',{class:'floor-plane'},g);
 if(f==='Foundation'){
  svg('rect',{x:-70,y:-20,width:1480,height:790,fill:'#c9c0b3',stroke:'#aaa194','stroke-width':2},plane);
  data[f].groups.foundation.forEach((r,i)=>{roomShape(plane,r,40+i%2*570,60+Math.floor(i/2)*350,460,250);});
 }else{
  blueprint(plane);const d=data[f].groups;
  let boxes=f==='L3'?[[5,5,345,278],[368,5,345,278],[731,5,347,278],[5,400,345,235],[368,400,345,235],[731,400,347,235]]:f==='L1'?[[5,5,527,278],[5,400,527,235],[666,5,412,278],[666,400,412,235]]:f==='LL'?[[666,5,412,278],[5,5,527,278],[5,400,527,235]]:[[5,5,527,278],[666,5,412,278],[5,400,1073,235]];
  d.internal.forEach((r,i)=>roomShape(plane,r,...boxes[i]));
  d.external.forEach((r,i)=>{const two=d.external.length===2,rect=[1083,two?i*354:i*233,388,two?322:210];roomShape(plane,r,...rect);terrace(plane,rect);});
  d.reflection.forEach((r,i)=>{let rect;if(f==='LL'&&i===2)rect=[666,400,412,235];else if(i===0)rect=[26,f==='L3'?185:193,f==='L3'?306:480,88];else rect=[f==='LL'?26:680,548,f==='LL'?480:384,88];roomShape(plane,r,...rect,true);});
  svg('text',{x:35,y:344,fill:'#69665e','font-family':'DM Sans','font-size':16},plane).textContent=f==='LL'?'SHARED DIRECTION → READINESS':f==='L1'?'SENSE → INTERPRET → CHOOSE':f==='L2'?'DIRECTION → ROLE → PARTNERS → ALIGNMENT':'TEST → LEARN → DECIDE → NEXT CYCLE';
  svg('text',{x:35,y:658,fill:'#69665e','font-family':'DM Sans','font-size':14},plane).textContent=f==='LL'?'ARRIVE / BUILD READINESS':f==='L3'?'SCALE · ITERATE · STOP · REALLOCATE':`NEXT FLOOR → ${f==='L1'?'L2':'L3'}`;
 }
 const decor=svg('g',{class:'floor-decoration architectural'},g);g._decor=decor;
 const label=svg('g',{class:'floor-link',tabindex:'0',role:'button','aria-label':`Explore ${f}`},g);
 svg('text',{x:-95,y:80,class:'floor-label'},label).textContent=f==='Foundation'?'F':f;
 svg('text',{x:-95,y:109,class:'floor-label-name'},label).textContent=f==='Foundation'?'Foundation':f==='L3'?'Under construction':'Explore floor ↗';
 label.addEventListener('click',()=>selectFloor(f));label.addEventListener('keydown',e=>{if(e.key==='Enter')selectFloor(f);});
 if(f!=='Foundation'){
  dPins(g,f);
 }
 return g;
}
function project(x,y,z=0){const t=state.projection;return [340+(.52+(.62-.52)*t)*x+(-.52*(1-t))*y,(.24*(1-t))*x+(.24+(.62-.24)*t)*y-z*(1-t)];}
function path3(p,points,attrs={}){return svg('path',{d:points.map((pt,i)=>(i?'L':'M')+project(...pt).join(' ')).join(' '),fill:'none',stroke:'#727c78','stroke-width':2,...attrs},p);}
function drawArchitecture(g,f){
 const p=g._decor;p.innerHTML='';if(f==='Foundation')return;
 // Windows and dividing walls remain deliberately light, as in the Figma map.
 path3(p,[[20,0,30],[280,0,30],[280,0,118],[20,0,118],[20,0,30]],{fill:'#82969f','fill-opacity':.13,'stroke-opacity':.5});
 path3(p,[[150,0,30],[150,0,118]],{'stroke-opacity':.5});
 path3(p,[[0,18,35],[0,92,35],[0,92,96],[0,18,96],[0,18,35]],{'stroke-opacity':.5});
 if(f!=='L3')for(const [lo,hi]of [[0,112],[177,410],[480,676]]){path3(p,[[1083,lo,0],[1083,hi,0],[1083,hi,100],[1083,lo,100],[1083,lo,0]],{fill:'#f5f1ea','fill-opacity':.22,'stroke-opacity':.35});}
 if(f==='L3'){
  for(const x of [0,350,700,1083])path3(p,[[x,-35,0],[x,-35,245]],{'stroke-opacity':.47});
  for(const z of [85,165,245])path3(p,[[0,-35,z],[1083,-35,z]],{'stroke-opacity':.38});
  for(const [a,b]of [[0,350],[350,700],[700,1083]]){path3(p,[[a,-35,0],[b,-35,245]],{'stroke-opacity':.35});path3(p,[[a,-35,245],[b,-35,0]],{'stroke-opacity':.35});}
  for(const y of [0,225,450,676])path3(p,[[-32,y,0],[-32,y,210]],{'stroke-opacity':.38});
  for(const z of [85,210])path3(p,[[-32,0,z],[-32,676,z]],{'stroke-opacity':.35});
  for(const y of [0,225,450])path3(p,[[-32,y,0],[-32,y+225,210]],{'stroke-opacity':.35});
 }
}
function dPins(g,f){
 const group=svg('g',{class:'roadblock-pins'},g);data[f].groups.roadblocks.forEach((r,i)=>{const coords=[[50,120],[890,170],[650,610],[80,550]][i];r.pin=coords;const pin=svg('g',{class:'roadblock-pin',role:'button',tabindex:0,'aria-label':`${r.title}, roadblock`,'data-room':r.id},group);pin._coords=coords;svg('line',{x1:0,y1:0,x2:0,y2:-55,stroke:'#77776d','stroke-width':2},pin);svg('circle',{cx:0,cy:-65,r:18},pin);svg('text',{x:0,y:-58},pin).textContent='!';pin.addEventListener('click',()=>{if(!suppressClick)selectRoom(r.id);});pin.addEventListener('pointerenter',e=>hoverRoom(r,e));pin.addEventListener('pointermove',e=>moveTip(e));pin.addEventListener('pointerleave',()=>unhoverRoom(r));pin.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRoom(r.id);}});});
}
function floorBase(f){return BASE[f]*state.spread+(f==='Foundation'?1180:1080-ORDER.indexOf(f)*70)*(1-state.spread);}
function updateProjection(){
 for(const f of ORDER){const g=$('#floor-'+f);g.setAttribute('transform',`translate(0 ${floorBase(f)})`);const p=state.projection;$('.floor-link',g).setAttribute('transform',`translate(${-30*p} ${-115*p})`);$('.floor-plane',g).setAttribute('transform',`matrix(${.52+.10*p} ${.24*(1-p)} ${-.52*(1-p)} ${.24+.38*p} ${340-260*p} 0)`);drawArchitecture(g,f);$('.architectural',g).style.opacity=1-p;
  $$('.roadblock-pin',g).forEach(pin=>{let [x,y]=project(...pin._coords);if(p){x-=260*p;}pin.setAttribute('transform',`translate(${x} ${y})`);});
 }
 drawConnections();drawBuildingShell();exteriorAppearance();
}
let exteriorVisible=false,exteriorFloor=null;
let panoramaReady=false;
function loadPanorama(){
 const asset=new Image();
 asset.onload=()=>{
  const view=svg('image',{id:'figma-panorama',x:1150,y:-20,width:1190,height:2290,href:asset.src,'pointer-events':'none','aria-label':'Figma building with innovation roadblocks'},world);
  const labels=svg('g',{id:'comparison-labels','pointer-events':'none'},world);
  for(const [x,title] of [[460,'Exterior'],[1627,'Interior']]){
   svg('text',{x,y:-48,'text-anchor':'middle',fill:'#34312d','font-family':'PingFang SC, sans-serif','font-size':54,'font-weight':600},labels).textContent=title;
  }
  view.style.opacity='0';
  const hits=svg('g',{id:'figma-floor-targets'},world);
  const scale=2290/5660;
  const inset=(1190-2930*scale)/2;
  const slabs=[
   ['L3',[[1573.51,917.783],[2123.81,579.083],[3005.45,1121.68],[2455.14,1460.38]]],
   ['L2',[[1573.51,1944.94],[2123.81,1606.24],[3005.45,2148.84],[2455.14,2487.54]]],
   ['L1',[[1573.51,3114.52],[2123.81,2775.82],[3005.45,3318.42],[2455.14,3657.12]]],
   ['LL',[[1573.51,4125.65],[2123.81,3786.95],[3005.45,4329.55],[2455.14,4668.25]]],
   ['Foundation',[[1365.74,5078.55],[2127.14,4607.56],[3255.14,5299.01],[2493.74,5770]]]
  ];
  for(const [floor,vertices] of slabs){
   const points=vertices.map(([x,y])=>[inset+(x-1270)*scale,-20+(y-230)*scale].join(',')).join(' ');
   const hit=svg('polygon',{points,fill:'transparent','stroke-width':3,role:'button',tabindex:0,'aria-label':NAMES[floor]},hits);
   hit.style.cursor='pointer';
   const activate=()=>{if(!suppressClick)selectFloor(floor);};
   hit.addEventListener('click',activate);
   hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
   const highlight=()=>{hit.setAttribute('stroke','#2a4c9e');hit.setAttribute('fill','#2a4c9e18');};
   const reset=()=>{hit.removeAttribute('stroke');hit.setAttribute('fill','transparent');};
   hit.addEventListener('focus',highlight);
   hit.addEventListener('blur',reset);
   hit.addEventListener('pointerenter',highlight);
   hit.addEventListener('pointerleave',()=>{if(document.activeElement!==hit)reset();});
  }
  // Use the same coordinate transform as the Figma SVG for its navigation targets.
  const navigation=svg('g',{transform:`translate(${inset} -20) scale(${scale}) translate(-1270 -230)`},hits);
  const addTarget=(label,d,activate,stair=false)=>{
   const hit=svg('path',{d,fill:'transparent',stroke:'transparent','stroke-width':12,role:'button',tabindex:0,'aria-label':label},navigation);
   hit.style.cursor='pointer';
   if(stair){
    hit.setAttribute('fill','none');
    hit.setAttribute('stroke-width',90);
    hit.setAttribute('stroke-linecap','round');
    hit.setAttribute('stroke-linejoin','round');
   }
   const highlight=()=>{hit.setAttribute('stroke',stair?'#2a4c9e35':'#2a4c9e');if(!stair)hit.setAttribute('fill','#2a4c9e18');};
   const reset=()=>{hit.setAttribute('stroke','transparent');hit.setAttribute('fill',stair?'none':'transparent');};
   hit.addEventListener('pointerenter',highlight);
   hit.addEventListener('pointerleave',()=>{if(document.activeElement!==hit)reset();});
   hit.addEventListener('focus',highlight);
   hit.addEventListener('blur',reset);
   hit.addEventListener('click',()=>{if(!suppressClick)activate();});
   hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  };
  const stairFlights=[
   [[1840,3350],[2060,3780],[1895,4070]],
   [[1770,2010],[2055,2480],[1890,2870]],
   [[1770,983],[2055,1453],[1890,1843]]
  ];
  stairFlights.forEach((vertices,i)=>{
   const d='M'+vertices.map(p=>p.join(' ')).join('L');
   addTarget(`Staircase ${STAIR[i].from} to ${STAIR[i].to}`,d,()=>showStaircase(i),true);
  });
  addTarget('Express lift: explore shortcuts','M2545 545L2661 616L2725 577V4098L2661 4137L2545 4066Z',showShortcuts);
  const blocks={"LL":[[["393.858","266.075","matrix(0.851636 0.524134 -0.851636 0.524134 2649.89 4118.88)"],["504.138","266.075","matrix(0.851636 0.524134 -0.851636 0.524134 2111.3 3787.4)"],["504.138","260.074","matrix(0.851636 0.524134 -0.851636 0.524134 1789.29 3985.58)"]],[["458.833","60.4279","matrix(0.851636 0.524134 -0.851636 0.524134 1974.71 3896.06)"],["458.833","66.3717","matrix(0.851636 0.524134 -0.851636 0.524134 1654.12 4093.36)"],["393.858","154.044","matrix(0.851636 0.524134 -0.851636 0.524134 2327.88 4317.05)"]],["M3005.5 4342.15L3286.84 4515.3V4533.12L3131.78 4628.55H3102.83L2821.49 4455.4L3005.5 4342.15Z","M2763.57 4491.05L3044.91 4664.2V4682.02L2860.89 4795.27H2831.93L2550.59 4622.12L2763.57 4491.05Z"]],"L1":[[["503.761","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2110.89 2776.83)"],["503.761","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 1789.33 2974.73)"],["393.832","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2649 3108)"],["393.832","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 2327.43 3305.9)"]],[["458.833","60.2219","matrix(0.851636 0.524134 -0.851636 0.524134 1958.66 2891.56)"],["367.067","51.6188","matrix(0.851636 0.524134 -0.851636 0.524134 2193.93 3402.1)"]],["M3006.48 3331.2L3286.22 3503.36V3521.18L3164.94 3595.82H3135.99L2856.25 3423.66L3006.48 3331.2Z","M2802.19 3453.33L3086.09 3628.05V3645.87L2983.84 3708.79H2954.89L2670.99 3534.07L2802.19 3453.33Z","M2620.65 3565.05L2904.09 3739.49V3757.31L2785.32 3830.4H2756.37L2472.93 3655.97L2620.65 3565.05Z"]],"L2":[[["503.761","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2110.87 1607.25)"],["393.832","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2648.98 1938.43)"],["1025.68","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 1789.31 1805.16)"]],[["458.833","55.4424","matrix(0.851636 0.524134 -0.851636 0.524134 1955.39 1723.99)"],["367.067","55.4424","matrix(0.851636 0.524134 -0.851636 0.524134 2197.17 2230.53)"]],["M3005.47 2161.43L3286.41 2334.34V2352.16L3073.67 2483.09H3044.72L2763.77 2310.18L3005.47 2161.43Z","M2717.28 2338.79L2998.23 2511.7V2529.52L2785.49 2660.45H2756.53L2475.59 2487.54L2717.28 2338.79Z"]],"L3":[[["329.787","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2110.87 580.094)"],["329.787","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2406.39 761.965)"],["331.698","265.741","matrix(0.851636 0.524134 -0.851636 0.524134 2701.9 943.836)"],["329.787","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 1789.31 777.998)"],["329.787","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 2084.82 959.869)"],["331.698","224.637","matrix(0.851636 0.524134 -0.851636 0.524134 2380.34 1141.74)"]],[["458.833","55.4424","matrix(0.851636 0.524134 -0.851636 0.524134 1955.39 696.832)"]],["M3005.47 1134.27L3286.41 1307.17V1324.99L3164.85 1399.81H3135.89L2854.95 1226.9L3005.47 1134.27Z","M2815.79 1251.01L3096.73 1423.91V1441.73L2975.17 1516.55H2946.21L2665.27 1343.64L2815.79 1251.01Z","M2626.1 1367.74L2907.05 1540.65V1558.47L2785.49 1633.29H2756.53L2475.59 1460.38L2626.1 1367.74Z"]]};
  const barriers={LL:[[2132,3713,332,88],[1307,3874,331,122],[2929,4127,332,122],[2196,4181,331,88]],L1:[[2154,2618,332,54],[1307,2863,331,54],[2929,3002,332,88],[1906,3262,331,88]],L2:[[1304,1848,331,82],[2929,1888,331,82],[1942,2131,331,82]],L3:[[1669,826],[2898,916],[1931,1126,331,82]]};
  const interactive=svg('g',{},navigation);
  const bindBlock=(hit,r)=>{
   if(!r){hit.remove();return;}
   hit.setAttribute('role','button');hit.setAttribute('tabindex','0');hit.setAttribute('aria-label',r.title);
   hit.setAttribute('fill','transparent');hit.setAttribute('stroke-width','8');
   hit.style.cursor='pointer';
   const activate=()=>{if(!suppressClick)selectRoom(r.id);};
   hit.addEventListener('pointerenter',e=>{if(!dragging){hit.setAttribute('stroke','#fff');hoverRoom(r,e);}});
   hit.addEventListener('pointermove',e=>{if(!$('#hover-tip').hidden)moveTip(e);});
   hit.addEventListener('pointerleave',()=>{hit.removeAttribute('stroke');unhoverRoom(r);});
   hit.addEventListener('focus',()=>hit.setAttribute('stroke','#fff'));
   hit.addEventListener('blur',()=>hit.removeAttribute('stroke'));
   hit.addEventListener('click',activate);
   hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  };
  for(const [floor,[internal,reflection,external]] of Object.entries(blocks)){
   const groups=data[floor].groups;
   for(const [category,shapes] of [['internal',internal],['reflection',reflection]]){
    shapes.forEach(([width,height,transform],i)=>bindBlock(svg('rect',{width,height,transform},interactive),groups[category][i]));
   }
   external.forEach((d,i)=>bindBlock(svg('path',{d},interactive),groups.external[i]));
   barriers[floor].forEach(([x,y,width,height],i)=>bindBlock(width?svg('rect',{x,y,width,height},interactive):svg('circle',{cx:x,cy:y,r:34},interactive),groups.roadblocks[i]));
  }
  panoramaReady=true;
  exteriorAppearance();
 };
 asset.src='assets/figma-building.svg';
}
function drawBuildingShell(){
 let g=$('#building-shell');if(!g)g=svg('g',{id:'building-shell','pointer-events':'none','aria-hidden':'true'},world);
 g.innerHTML='';world.appendChild(g);
 const top=floorBase('L3')-100,height=floorBase('LL')-top+60,ink='#2a4c9e';
 const A=[340,top],B=[903,top+260],D=[-12,top+162],E=[551,top+422];
 const down=(p,n)=>[p[0],p[1]+n],base=[A,B,E,D].map(p=>down(p,height));
 const line=(points,opacity=.8,width=2.5)=>svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:ink,'stroke-opacity':opacity,'stroke-width':width},g);
 const polygon=(points,fill='#eee9df',opacity=.85,stroke=ink)=>svg('polygon',{points:points.map(p=>p.join(',')).join(' '),fill,'fill-opacity':opacity,stroke,'stroke-width':2.5,'stroke-opacity':.8},g);
 // A ground plane separates the four above-ground floors from Foundation below.
 const ground=[[340,base[0][1]-85],[1050,base[1][1]-5],[551,base[2][1]+110],[-160,base[3][1]+30]];
 polygon(ground,'#c6c3b5',.48,'#9b9d8d');
 const soil=svg('g',{},g);
 for(const [p,q]of [[ground[3],ground[2]],[ground[2],ground[1]]]){
  svg('polygon',{points:[p,q,down(q,38),down(p,38)].map(p=>p.join(',')).join(' '),fill:'#b0a590','fill-opacity':.28,stroke:'#9b9485','stroke-opacity':.5,'stroke-width':1.5},soil);
 }
 for(const corner of [base[1],base[2],base[3]])svg('path',{d:`M${corner[0]} ${corner[1]+45}v170`,stroke:'#9b9485','stroke-width':2,'stroke-dasharray':'7 7','stroke-opacity':.6},g);
 const unfinished=height/4;
 polygon([down(D,unfinished),down(E,unfinished),base[2],base[3]],'#eee9df',.94);
 polygon([down(E,unfinished),down(B,unfinished),base[1],base[2]],'#dedfd8',.92);
 // L3 remains an open construction frame rather than a completed roof.
 polygon([A,B,E,D].map(p=>down(p,unfinished)),'#e6e5dc',.42);
 line([A,B,E,D,A],.55,2);
 for(const [start,end]of [[D,E],[E,B]]){
  const point=(t,y)=>[start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t+y];
  for(let col=0;col<=3;col++)line([point(col/3,0),point(col/3,unfinished)],.7,2.4);
  for(const y of [unfinished*.32,unfinished*.66,unfinished])line([point(0,y),point(1,y)],.5,1.8);
  for(let col=0;col<3;col++){
   line([point(col/3,0),point((col+1)/3,unfinished)],.38,1.5);
   line([point(col/3,unfinished),point((col+1)/3,0)],.38,1.5);
  }
 }
 // An incomplete slab, exposed columns and rebar make the future floor legible.
 const deck=[down(D,75),[350,top+403],[700,top+240],down(A,75)];
 polygon(deck,'#e5e3d8',.48);
 line(deck.map(p=>down(p,14)),.65,2);
 const columnPoints=[D,[D[0]+(E[0]-D[0])*.33,D[1]+(E[1]-D[1])*.33],[D[0]+(E[0]-D[0])*.66,D[1]+(E[1]-D[1])*.66],E,[E[0]+(B[0]-E[0])*.5,E[1]+(B[1]-E[1])*.5],B,A];
 for(const foot of columnPoints){
  const head=down(foot,-48);
  polygon([[head[0]-7,head[1]-4],[head[0]+7,head[1]+3],[foot[0]+7,foot[1]+78],[foot[0]-7,foot[1]+71]],'#dce0da',.5);
  for(const offset of [-5,0,5])line([[head[0]+offset,head[1]-25],[head[0]+offset,head[1]+3]],.75,1.5);
 }
 for(let n=0;n<15;n++){
  const u=(n+.4)/15,edge=[D[0]+(E[0]-D[0])*.65*u,D[1]+(E[1]-D[1])*.65*u+75];
  line([edge,down(edge,-23)],.65,1.4);
 }
 // A small lattice tower crane stands beside the construction, not over the rooms.
 const craneX=-145,craneTop=top+20,craneBottom=base[3][1]+25,towerWidth=34;
 line([[craneX,craneBottom],[craneX,craneTop],[craneX+towerWidth,craneTop],[craneX+towerWidth,craneBottom]],.68,2);
 for(let y=craneTop;y<craneBottom;y+=85){
  const end=Math.min(y+85,craneBottom);line([[craneX,y],[craneX+towerWidth,end],[craneX,end],[craneX+towerWidth,y]],.5,1.4);
 }
 polygon([[craneX-22,craneBottom],[craneX+62,craneBottom+39],[craneX+89,craneBottom+25],[craneX+5,craneBottom-14]],'#c4c4b6',.55);
 const boomStart=[craneX-65,craneTop+28],boomEnd=[655,top-35];
 line([boomStart,boomEnd,down(boomEnd,24),down(boomStart,24),boomStart],.75,2);
 for(let n=0;n<15;n++){
  const p=[boomStart[0]+(boomEnd[0]-boomStart[0])*n/15,boomStart[1]+(boomEnd[1]-boomStart[1])*n/15],q=[boomStart[0]+(boomEnd[0]-boomStart[0])*(n+1)/15,boomStart[1]+(boomEnd[1]-boomStart[1])*(n+1)/15];
  line([p,down(q,24),q,down(p,24)],.55,1.3);
 }
 polygon([[craneX+34,craneTop+24],[craneX+83,craneTop+47],[craneX+83,craneTop+91],[craneX+34,craneTop+68]],'#bfcdca',.32);
 const hookX=430,hookY=boomStart[1]+(boomEnd[1]-boomStart[1])*(hookX-boomStart[0])/(boomEnd[0]-boomStart[0]);
 line([[hookX,hookY+24],[hookX,top+115]],.7,1.6);
 svg('path',{d:`M${hookX} ${top+115}q-10 17 3 17q13 0 10-12`,fill:'none',stroke:ink,'stroke-opacity':.7,'stroke-width':2},g);
 for(let beam=0;beam<3;beam++)line([[hookX-50,top+145+beam*7],[hookX+52,top+192+beam*7]],.7,3);
 polygon([down(D,height-36),down(E,height-36),down(E,height+8),down(D,height+8)],'#e9e6dd',.95);
 polygon([down(E,height-36),down(B,height-36),down(B,height+8),down(E,height+8)],'#dce0d8',.95);
 for(const [start,end]of [[D,E],[E,B]]){
  const point=(t,dy)=>[start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t+dy];
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   if(row===0||(row===3&&start===D&&col===3)||(start===E&&col===1))continue;
   const l=(col+.28)/4,r=(col+.68)/4,y=70+row*(height-100)/4,h=(height-100)*.48/4;
   polygon([point(l,y),point(r,y),point(r,y+h),point(l,y+h)],'#b5c4c5',.18);
   for(const fraction of [.33,.66])line([point(l,y+h*fraction),point(r,y+h*fraction)],.62,1.8);
  }
 }
 const door=(t,dy)=>[D[0]+(E[0]-D[0])*t,D[1]+(E[1]-D[1])*t+dy];
 polygon([door(.80,height-155),door(.96,height-155),door(.96,height+8),door(.80,height+8)],'#c0cdd0',.4);
 line([door(.88,height-155),door(.88,height+8)],.8,2);
 // External spaces become open balconies on the right-hand facade.
 const balconyPoint=(t,dy)=>[E[0]+(B[0]-E[0])*t,E[1]+(B[1]-E[1])*t+dy];
 const out=p=>[p[0]+185,p[1]+85];
 for(let floor=0;floor<4;floor++){
  const level=(floor+1)*height/4-38,p=balconyPoint(.06,level),q=balconyPoint(.94,level),r=out(q),t=out(p);
  const doorLeft=balconyPoint(.30,level),doorRight=balconyPoint(.54,level),doorHeight=154;
  // Each balcony has a visible doorway; L3 shows only its unfinished frame.
  polygon([down(doorLeft,-doorHeight),down(doorRight,-doorHeight),doorRight,doorLeft],'#c0cdd0',floor===0?.08:.25);
  if(floor>0){
   const opened=[doorRight[0]+42,doorRight[1]+19];
   polygon([down(doorRight,-doorHeight),down(opened,-doorHeight),opened,doorRight],'#e9eee9',.55);
   line([down(doorLeft,-doorHeight),doorLeft],.8,2.5);
  }
  polygon([p,q,r,t],'#f6bb02',.17);
  polygon([t,r,down(r,13),down(t,13)],'#d8d1b6',.7);
  // Low, open railings preserve the lightweight architectural drawing.
  line([down(p,-67),down(t,-67),down(r,-67),down(q,-67)],.8,2);
  for(let post=0;post<=6;post++){
   const u=post/6,foot=[t[0]+(r[0]-t[0])*u,t[1]+(r[1]-t[1])*u];line([foot,down(foot,-67)],.65,1.7);
  }
  line([p,down(p,-67)],.7,1.7);line([q,down(q,-67)],.7,1.7);
  const planter=[r[0]-42,r[1]+4];
  polygon([[planter[0]-22,planter[1]-7],[planter[0]+18,planter[1]-26],[planter[0]+36,planter[1]-17],[planter[0]-4,planter[1]+2]],'#aebc9e',.6);
  for(let leaf=0;leaf<3;leaf++)svg('circle',{cx:planter[0]-9+leaf*12,cy:planter[1]-21-leaf*5,r:10,fill:'#9db99f','fill-opacity':.7,stroke:'#7f927d','stroke-opacity':.55,'stroke-width':1.3},g);
 }
 svg('text',{x:-135,y:base[3][1]+80,fill:'#777467','font-family':'DM Sans','font-size':24},g).textContent='GROUND / LL';
 g.style.opacity=state.exterior;
}
function exteriorAppearance(){
 const amount=state.exterior;
 for(const f of ORDER){if(f==='Foundation')continue;const g=$('#floor-'+f);$('.floor-plane',g).style.opacity=1-amount;$('.architectural',g).style.opacity=(1-state.projection)*(1-amount);$('.roadblock-pins',g).style.opacity=1-amount;}
 $('#building-shell')?.style.setProperty('opacity',amount);
 const panorama=$('#figma-panorama');
 if(panorama){
  const scale=1-.08*amount;
  $('#building-shell').setAttribute('transform','scale('+scale+')');
  $('#floor-Foundation').setAttribute('transform','scale('+scale+') translate(0 '+floorBase('Foundation')+')');
  panorama.style.visibility=exteriorVisible&&state.view==='iso'?'visible':'hidden';
  panorama.style.opacity=amount;
  const interior=!exteriorVisible&&state.view==='iso';
  panorama.setAttribute('x',interior?'0':'1150');
  if(interior){panorama.style.visibility='visible';panorama.style.opacity='1';}
  $('#figma-floor-targets').style.display=interior?'':'none';
  for(const f of ORDER){
   const hide=interior||(exteriorVisible&&state.view==='iso'&&f!=='Foundation');
   $('#floor-'+f).style.visibility=hide?'hidden':'';
  }
  const labels=$('#comparison-labels');
  labels.style.visibility=exteriorVisible&&state.view==='iso'?'visible':'hidden';
  labels.style.opacity=amount;
 }
 $('#building-connections').style.visibility=exteriorVisible||(panoramaReady&&state.view==='iso')?'hidden':'';
}
function setExterior(on){
 if(exteriorVisible===on)return;exteriorVisible=on;document.body.classList.toggle('exterior-view',on);$('#hover-tip').hidden=true;
 exteriorAppearance();
 $$('.room,.roadblock-pin,.floor-link').forEach(el=>{el.setAttribute('tabindex',on?'-1':(state.floor==='all'||el.closest('.floor-region')?.dataset.floor===state.floor?'0':'-1'));});
 gsap.to(state,{exterior:on?1:0,duration:duration(.65),ease:'power2.inOut',overwrite:'auto',onUpdate:exteriorAppearance});
 $('#map-instruction').textContent=on?'Zoom in past 80% to explore inside':'Hover to discover · Click to explore · Drag to move';
}
function connectionLabel(parent,visual,x,y,title,label,activate,anchorX,anchorY){
 const g=svg('g',{class:'connection-label',role:'button',tabindex:0,'aria-label':label,transform:`translate(${x} ${y})`},parent);
 const w=title.startsWith('↑')?340:320,h=88;
 svg('path',{d:`M${anchorX-x} ${anchorY-y}H${x<anchorX?w:0}`,class:'connection-leader',fill:'none'},g);
 svg('rect',{x:-12,y:-h/2-12,width:w+24,height:h+24,fill:'transparent',class:'connection-hit'},g);
 svg('rect',{x:0,y:-h/2,width:w,height:h,rx:6,class:'connection-badge'},g);
 svg('text',{x:w/2,y:14,'text-anchor':'middle',class:'connection-title'},g).textContent=title;
 const highlight=on=>{g.classList.toggle('highlighted',on);visual.classList.toggle('connection-highlighted',on);};
 for(const el of [g,visual]){el.addEventListener('pointerenter',()=>highlight(true));el.addEventListener('pointerleave',()=>highlight(false));el.addEventListener('focus',()=>highlight(true));el.addEventListener('blur',()=>highlight(false));}
 g.addEventListener('click',()=>{if(!suppressClick)activate();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
}
function drawPlanStairs(parent){
 const index=STAIR.findIndex(stair=>stair.from===state.floor);
 const routeIndex=index>=0?index:STAIR.findIndex(stair=>stair.to===state.floor);
 if(routeIndex<0)return;
 const stair=STAIR[routeIndex],base=floorBase(state.floor);
 const strip=svg('g',{class:'plan-stair-strip',transform:`translate(-12 ${base})`},parent);
 const directions=state.floor==='LL'||state.floor==='L3'?[1]:[0,1];
 for(const direction of directions){
  const label=direction?`${stair.from} → ${stair.to}`:`${stair.to} → ${stair.from}`,y=directions.length===1?112:(direction?225:0);
  const g=svg('g',{class:'plan-stairs narrow-stairs',role:'button',tabindex:0,'aria-label':`Stairs ${label}`,transform:`translate(0 ${y})`},strip);
  svg('rect',{x:0,y:0,width:76,height:194,class:'plan-stairs-badge'},g);
  const icon=svg('g',{'aria-hidden':'true',class:'plan-stairs-icon'},g);
  for(let i=1;i<16;i++)svg('path',{d:`M2 ${i*12}h72`,fill:'none'},icon);
  svg('path',{d:direction?'M38 170V24m-8 10 8-10 8 10':'M38 24v146m-8-10 8 10 8-10',fill:'none','stroke-width':2},icon);
  svg('text',{transform:'translate(38 97) rotate(-90)','text-anchor':'middle','dominant-baseline':'middle',class:'narrow-stairs-label'},g).textContent=label;
  const activate=()=>{if(!suppressClick)showStaircase(routeIndex,direction===0);};g.addEventListener('click',activate);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
 }
}
function drawConnections(){
 const con=$('#building-connections');if(!con)return;con.innerHTML='';
 world.appendChild(con);
 if(state.view==='plan'){drawPlanStairs(con);return;}
 const liftX=680,top=floorBase('L3')+170,bottom=floorBase('LL')+170;
 const lift=svg('g',{class:'lift-visual',role:'button',tabindex:'0','aria-label':'Explore express lift shortcuts'},con);
 svg('path',{d:`M${liftX},${top-140}l42,24v${bottom-top+140}l-42,-24z`,fill:'#82969f','fill-opacity':.13,stroke:'#727c78','stroke-opacity':.45,'stroke-width':1.5},lift);
 svg('path',{d:`M${liftX+42},${top-116}l19,-11v${bottom-top+140}l-19,11z`,fill:'#82969f','fill-opacity':.21,stroke:'#727c78','stroke-opacity':.4},lift);
 for(const f of ['LL','L1','L2','L3']){const y=floorBase(f)+165;svg('path',{d:`M${liftX+6},${y-50}l30,17v51l-30,-17zM${liftX+21},${y-42}v51`,fill:'none',stroke:'#727c78','stroke-opacity':.45},lift);}
 svg('rect',{id:'lift-cabin',x:liftX+4,y:bottom-50,width:33,height:57,fill:'#2a4c9e','fill-opacity':.3,stroke:'#727c78','stroke-width':1},lift);
 connectionLabel(con,lift,900,(top+bottom)/2,'↑↓ Shortcuts ↗','Explore express lift shortcuts',showShortcuts,722,(top+bottom)/2);
 lift.addEventListener('click',showShortcuts);lift.addEventListener('keydown',e=>{if(e.key==='Enter')showShortcuts();});
 for(let i=1;i<ORDER.length-1;i++){const low=ORDER[i],high=ORDER[i+1],y1=floorBase(low)+150,y2=floorBase(high)+150;const x1=100,x2=82;const st=svg('g',{class:'stairs-visual',role:'button',tabindex:'0','aria-label':`Staircase ${low} to ${high}`},con);svg('path',{d:`M${x1},${y1}L${x2},${y2}l18,8L${x1+18},${y1+8}z`,fill:'#f5f1ea',stroke:'#a39a8b','stroke-width':1},st);for(let j=0;j<26;j++){const t=j/26;svg('path',{d:`M${x1+(x2-x1)*t} ${y1+(y2-y1)*t}l18,8`,stroke:'#a39a8b','stroke-width':.7},st);}st.style.cursor='pointer';const cb=()=>showStaircase(i-1);connectionLabel(con,st,-260,(y1+y2)/2,`${low} → ${high} ↗`,`Staircase ${low} to ${high}`,cb,95,(y1+y2)/2);st.addEventListener('click',cb);st.addEventListener('keydown',e=>{if(e.key==='Enter')cb();});}
}
function buildWorld(){
 svg('g',{id:'building-connections'},world);
 for(const f of ORDER)drawFloor(f);
 updateProjection();
 loadPanorama();
}
function setCamera(target,animate=true){
 gsap.killTweensOf(camera);gsap.to(camera,{...target,duration:animate?duration(.85):0,ease,onUpdate:()=>map.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`)});
}
function homeCamera(){if(state.floor==='all')return {x:-200,y:state.spread? -60:500,w:1440,h:state.spread?2180:1300};const b=floorBase(state.floor);return state.view==='plan'?{x:-150,y:b-45,w:1330,h:650}:{x:-210,y:b-210,w:1440,h:860};}
function fitCamera(){setExterior(false);exteriorAppearance();state.zoom=1;cameraHome=homeCamera();setCamera(cameraHome);updateZoom();}
function updateZoom(){$('#zoom-label').textContent=Math.round(state.zoom*100)+'%';}
function zoomBy(factor){
 const next=Math.min(3.8,Math.max(.6,state.zoom*factor));
 if(factor<1&&next<=.8&&state.floor!=='all'){
  exteriorFloor=null;
  endTour();
  selectFloor('all');
  return;
 }
 if(next<=.8&&!exteriorVisible){
  exteriorFloor=state.floor==='all'?null:state.floor;endTour();if(exteriorFloor)selectFloor('all');
 }else if(next>.8&&exteriorVisible){
  const returnFloor=exteriorFloor;exteriorFloor=null;setExterior(false);if(returnFloor)selectFloor(returnFloor);
 }
 state.zoom=next;setExterior(next<=.8&&state.floor==='all');
 const w=cameraHome.w/state.zoom,h=cameraHome.h/state.zoom;
 const y=cameraHome.y+cameraHome.h/2-h/2;
 setCamera(exteriorVisible&&panoramaReady&&state.view==='iso'
  ?{x:-185,y:-150,w:2610,h:2470}
  :{x:cameraHome.x+cameraHome.w/2-w/2,y,w,h});updateZoom();
}
function setView(view,instant=false){if(view==='plan'&&state.floor==='all')selectFloor('LL',false);state.view=view;gsap.to($('#building-connections'),{opacity:state.floor==='all'||view==='plan'?1:0,duration:duration(.3),overwrite:true});$('#iso-button').classList.toggle('active',view==='iso');$('#plan-button').classList.toggle('active',view==='plan');$('#iso-button').setAttribute('aria-pressed',view==='iso');$('#plan-button').setAttribute('aria-pressed',view==='plan');gsap.to(state,{projection:view==='plan'?1:0,duration:instant?0:duration(.9),ease,overwrite:'auto',onUpdate:updateProjection});fitCamera();}
function selectFloor(f,animate=true){
 const fromFigma=panoramaReady&&state.view==='iso'&&f!=='all';
 stopRoute();state.floor=f;state.room=null;state.category=null;$('#hover-tip').hidden=true;
 if(fromFigma){
  animate=false;
  for(const level of ORDER)gsap.set($('#floor-'+level),{opacity:level===f?1:0});
 }
 setView(f==='all'?'iso':'plan',fromFigma);
 $('#back-to-building').hidden=f==='all';
 $('#map-instruction').textContent=f==='all'?'Hover to discover · Click to explore · Drag to move':'Pinch to zoom · Zoom out to return to the building';
 $('#overview-button').classList.toggle('active',f==='all');$$('.floor-nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.floor===f);b.setAttribute('aria-current',b.dataset.floor===f?'true':'false');});
 for(const level of ORDER){const g=$('#floor-'+level),active=f==='all'||f===level;g.classList.toggle('inactive',!active);g.setAttribute('aria-hidden',!active);$$('[tabindex]',g).forEach(el=>el.setAttribute('tabindex',active?'0':'-1'));gsap.to(g,{opacity:active?1:0,duration:animate?duration(.55):0,overwrite:true});}
 gsap.to($('#building-connections'),{opacity:f==='all'||state.view==='plan'?1:0,duration:duration(.4),overwrite:true});updateFilters();fitCamera();$('#breadcrumb').innerHTML=f==='all'?'The whole building <span>/</span> Explore freely':`${safe(f)} <span>/</span> ${safe(NAMES[f])}`;
 $('#mobile-current').textContent=f==='all'?'The whole building':`${f==='Foundation'?'F':f} · ${NAMES[f]}`;
 clearSelection();renderInspector(f==='all'?introHTML():floorHTML(f));$('#floor-guide-button').hidden=f==='all';updateHash();
}
function clearSelection(){$$('.room.selected').forEach(n=>n.classList.remove('selected'));}
function selectRoom(id){const r=roomById(id);if(!r)return;if(state.floor!==r.floor)selectFloor(r.floor);state.room=id;clearSelection();document.getElementById(id)?.classList.add('selected');renderInspector(roomHTML(r),true);updateHash();if(state.motion){const shape=$('.room-fill',document.getElementById(id)||document);if(shape)gsap.fromTo(shape,{filter:'brightness(1.24)'},{filter:'brightness(1)',duration:.7,overwrite:'auto'});}}
function highlightRoom(r){const node=document.getElementById(r.id);if(node&&state.motion)gsap.to(node,{y:-8,duration:.25,overwrite:true});}
function hoverRoom(r,e){if(dragging)return;highlightRoom(r);const tip=$('#hover-tip');tip.hidden=false;tip.style.borderLeftColor=C[r.cat];$('.tip-category',tip).textContent=`${r.floor} / ${CAT[r.cat]}`;$('strong',tip).textContent=r.title;moveTip(e);}
function moveTip(e){const tip=$('#hover-tip');tip.style.left=Math.min(innerWidth-285,e.clientX+18)+'px';tip.style.top=Math.min(innerHeight-130,e.clientY+18)+'px';}
function unhoverRoom(r){$('#hover-tip').hidden=true;const n=document.getElementById(r.id);if(n)gsap.to(n,{y:0,duration:duration(.25),overwrite:true});}
function filterCategory(cat){state.category=state.category===cat?null:cat;updateFilters();if(state.floor!=='all'&&!state.room)renderInspector(floorHTML(state.floor));}
function updateFilters(){
 $$('#legend button').forEach(b=>{const active=state.category===null||state.category===b.dataset.cat;b.classList.toggle('active',active);b.setAttribute('aria-pressed',state.category===b.dataset.cat?'true':'false');});
 $$('.room,.roadblock-pin').forEach(n=>{const r=roomById(n.dataset.room);const show=!state.category||state.category===r.cat;gsap.to(n,{opacity:show?1:.10,duration:duration(.25),overwrite:'auto'});n.style.pointerEvents=show?'':'none';n.setAttribute('tabindex',show&&(state.floor==='all'||state.floor===r.floor)?'0':'-1');});
}
function renderInspector(html,open=false){const panel=$('#inspector'),el=$('#inspector-content');el.innerHTML=`<div class="inspector-content">${html}</div>`;panel.scrollTop=0;if(open||state.tour>=0)panel.classList.add('open');if(innerWidth<=900&&panel.classList.contains('open'))el.insertAdjacentHTML('afterbegin','<div class="detail-toolbar"><button type="button" class="detail-close" aria-label="Close details">×</button></div>');$('.detail-close',el)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();panel.classList.remove('open');});if(state.motion)gsap.from($('.inspector-content'),{opacity:0,y:10,duration:.35,ease:'power2.out'});bindInspector();}
function introHTML(){return `<div class="inspector-kicker"><span class="swatch" style="--cat:var(--blue)"></span> A living visual metaphor</div><h2>Innovation is<br>built, floor<br>by floor.</h2><p class="lead">A shared foundation. Clear choices. Connected capabilities. Space to experiment.</p><p class="lead">Explore the building to see how these pieces work together.</p><button class="primary-button" data-floor="Foundation">Start at the foundations <span>↗</span></button><div class="intro-rule"></div><h3>Make yourself at home</h3><ol class="intro-steps"><li><span class="step-no">01</span> Hover over a room to discover it.</li><li><span class="step-no">02</span> Click to open its ideas and questions.</li><li><span class="step-no">03</span> Switch views to see the connections.</li></ol><div class="intro-rule"></div><button class="text-button" data-action="shortcuts">↑↓ Explore the express lift <span>↗</span></button><p class="inspector-footnote">Adapted from the Innovation by Design visual metaphor map. A learning framework, not a rigid sequence.</p>`;}
function roomListHTML(list){return `<div class="room-list">${list.map(r=>`<button data-room="${r.id}"><small>${safe(r.code)}</small><span>${safe(r.title)}</span><span>↗</span></button>`).join('')}</div>`;}
function floorHTML(f){const d=data[f];let html=`<div class="inspector-kicker">${f==='Foundation'?'Foundation':f} / Floor guide</div><h2>${safe(d.title)}</h2><p class="lead">${safe(d.question)}</p>${f==='L3'?'<p class="inspector-footnote">Under construction: future possibilities are tested before they scale.</p>':''}<div class="search-box"><span>⌕</span><input id="room-search" type="search" placeholder="Find a room or idea…" aria-label="Find a room on this floor"></div><div id="floor-room-groups">`;
 for(const[cat,list]of Object.entries(d.groups)){if(!list.length||state.category&&state.category!==cat)continue;html+=`<section class="room-category-group" data-category="${cat}"><div class="group-heading"><span class="swatch" style="--cat:${C[cat]}"></span>${CAT[cat]}</div>${roomListHTML(list)}</section>`;}
 html+='</div>';if(f!=='Foundation'&&f!=='L3')html+=`<div class="intro-rule"></div><button class="primary-button" data-floor="${ORDER[ORDER.indexOf(f)+1]}">Continue to ${ORDER[ORDER.indexOf(f)+1]} <span>↑</span></button>`;return html;}
function roomHTML(r){const peers=Object.values(data[r.floor].groups).flat(),idx=peers.indexOf(r),related=r.cat==='internal'?data[r.floor].groups.roadblocks:[];return `<button class="back-button" data-floor="${r.floor}">← ${r.floor} / ${safe(NAMES[r.floor])}</button><div class="category-tag"><span class="swatch" style="--cat:${C[r.cat]}"></span>${CAT[r.cat]} · ${safe(r.code)}</div><h2>${safe(r.title)}</h2>${r.cat==='reflection'?`<div class="reflection-prompt">${safe(r.body)}</div><p class="lead">Pause here. Use this question to challenge assumptions before moving on.</p>`:r.cat==='foundation'?`<p class="lead">${safe(r.question)}</p><ul class="detail-list"><li>${safe(r.body)}</li></ul>`:`<ul class="detail-list">${split(r.body).map(s=>`<li>${safe(s)}</li>`).join('')}</ul>`}${r.cat==='roadblocks'?'<p class="inspector-footnote">A roadblock signals a condition to address. Return to the relevant room, strengthen the missing capability, and try again.</p>':''}${related.length?`<h3>Watch for roadblocks</h3>${related.slice(0,2).map(b=>`<div class="related-block"><button data-room="${b.id}"><span class="swatch" style="--cat:var(--red)"></span>${safe(b.title)} ↗</button></div>`).join('')}`:''}<div class="room-navigation"><button data-room="${peers[(idx-1+peers.length)%peers.length].id}">← Previous area</button><button data-room="${peers[(idx+1)%peers.length].id}">Next area →</button></div>`;}
function bindInspector(){
 $$('[data-floor]',$('#inspector')).forEach(b=>b.addEventListener('click',()=>{selectFloor(b.dataset.floor);if(innerWidth<=900){$('#inspector').classList.add('open');renderInspector(floorHTML(b.dataset.floor),true);}}));
 $$('[data-room]',$('#inspector')).forEach(b=>b.addEventListener('click',()=>selectRoom(b.dataset.room)));
 $('[data-action="shortcuts"]',$('#inspector'))?.addEventListener('click',showShortcuts);
 $$('[data-route]',$('#inspector')).forEach(b=>b.addEventListener('click',()=>runRoute(Number(b.dataset.route))));
 $('#room-search')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();$$('.room-category-group').forEach(group=>{let count=0;$$('[data-room]',group).forEach(b=>{const r=roomById(b.dataset.room);const show=(r.title+' '+r.body).toLowerCase().includes(q);b.hidden=!show;if(show)count++;});group.hidden=!count;});});
}
const ROUTES=[{start:'LL',end:'L2',title:'Established Strategic Focus',conditions:['Target markets & users defined','Reusable insights available','Ready to build partnerships']},{start:'L1',end:'L3',title:'Ready-to-Test Opportunity',conditions:['Partners & capabilities in place','Clear owner for the test','Experiment resources available']},{start:'LL',end:'L3',title:'Existing Innovation Platform',conditions:['Established team & partners','Clear ownership & decision rights','Resources ready for experimentation']}];
function showShortcuts(){stopRoute();selectFloor('all');renderInspector(`<div class="inspector-kicker">↑↓ Express lift</div><h2>Take what you<br>already know.<br>Go further.</h2><p class="lead">The stairs build capabilities step by step. The lift connects distant floors when those capabilities are already in place.</p>${ROUTES.map((r,i)=>`<button class="route-button" data-route="${i}"><strong>${r.start} → ${r.end} <span style="display:inline;font-size:21px">↗</span></strong><span>${r.title}</span></button>`).join('')}<div class="intro-rule"></div><h3>Entry conditions / all routes</h3><p class="lead">Shared vision & clear innovation strategy.</p><p class="inspector-footnote">If a capability gap appears, return to the relevant floor.</p>`,true);}
function stopRoute(){if(routeRun){routeRun.kill();routeRun=null;}gsap.killTweensOf('#lift-cabin');$('#route-overlay')?.remove();}
function runRoute(index){
 stopRoute();if(state.view==='plan')setView('iso');const r=ROUTES[index];state.floor='all';state.room=null;gsap.to($('#building-connections'),{opacity:1,duration:duration(.3)});updateFilters();for(const f of ORDER){const g=$('#floor-'+f),active=[r.start,r.end].includes(f);g.classList.remove('inactive');gsap.to(g,{opacity:active?1:.12,duration:duration(.4),overwrite:true});}
 renderInspector(`<button class="back-button" data-action="shortcuts">← All express routes</button><div class="inspector-kicker">Express route / ${index+1}</div><h2>${r.start} → ${r.end}</h2><p class="lead">${r.title}</p><div class="route-progress"><span></span></div><h3>Ready to board?</h3><ul class="detail-list">${r.conditions.map(c=>`<li>${c}</li>`).join('')}</ul><button class="primary-button" data-floor="${r.end}">Step into ${r.end} <span>↗</span></button><p class="inspector-footnote">Direct access uses existing capabilities. It does not remove the need to test assumptions.</p>`,true);
 const figma=panoramaReady&&state.view==='iso'&&!exteriorVisible;
 const scale=2290/5660;
 const stops={Foundation:5079,LL:4092,L1:3081,L2:1911,L3:884};
 const stop=f=>figma?-20+(stops[f]-230)*scale:floorBase(f)+170;
 const x=figma?(1190-2930*scale)/2+(2615-1270)*scale:740;
 const o=svg('g',{id:'route-overlay','pointer-events':'none'},world),top=stop(r.end),bot=stop(r.start);
 svg('path',{d:`M${x} ${bot}V${top}`,stroke:'#2a4c9e','stroke-width':4,fill:'none','stroke-dasharray':'10 8'},o);
 const cabin=svg('rect',{x:x-13,y:bot-15,width:26,height:30,fill:'#2a4c9e',rx:3},o);
 routeRun=gsap.timeline();routeRun.to(cabin,{attr:{y:top-15},duration:duration(2.1),ease:'power2.inOut'},0).to('.route-progress span',{width:'100%',duration:duration(2.1),ease:'power2.inOut'},0);
 setCamera({x:-150,y:top-260,w:1440,h:bot-top+530});
}
const STAIR=[{from:'LL',to:'L1',title:'Build Readiness',steps:['Identify barriers','Design enablers','Assign owners & resources','Establish routines']},{from:'L1',to:'L2',title:'Develop Strategic Focus',steps:['Scan signals','Interpret drivers','Frame markets','Understand users','Choose where to play']},{from:'L2',to:'L3',title:'Build Collective Commitment',steps:['Map actors','Choose our role','Build partnerships','Align initiatives','Confirm capabilities & ownership']}];
function showStaircase(i,reverse=false){const original=STAIR[i],s=reverse?{...original,from:original.to,to:original.from}:original;renderInspector(`<button class="back-button" data-floor="${s.from}">← Back to ${s.from}</button><div class="inspector-kicker">${s.from} → ${s.to} / Staircase</div><h2>${s.title}</h2><p class="lead">${reverse?'Return to the previous floor to revisit these capabilities.':'Build the capability to move to the next floor.'}</p><ol class="intro-steps">${s.steps.map((t,j)=>`<li><span class="step-no">${String(j+1).padStart(2,'0')}</span>${t}</li>`).join('')}</ol><div class="intro-rule"></div><button class="primary-button" data-floor="${s.to}">${reverse?'Return':'Continue'} to ${s.to}<span>${reverse?'↓':'↑'}</span></button>`,true);}
function updateHash(){const hash=state.room?`room=${encodeURIComponent(state.room)}`:state.floor==='all'?'':`floor=${state.floor}`;history.replaceState(null,'',location.pathname+(hash?'#'+hash:''));}
function tourStep(i){state.tour=i;selectFloor(ORDER[i]);$('#tour-bar').hidden=false;$('#tour-count').textContent=`${String(i+1).padStart(2,'0')} / 05`;$('#tour-label').textContent=NAMES[ORDER[i]];$('#tour-prev').disabled=i===0;$('#tour-next').textContent=i===4?'Finish tour ✓':'Next floor →';}
function endTour(){state.tour=-1;$('#tour-bar').hidden=true;}
function syncFullscreenButton(){
 const active=Boolean(document.fullscreenElement),button=$('#present-button');button.setAttribute('aria-pressed',String(active));$('.fullscreen-label',button).textContent=active?'Exit full screen':'Full screen';button.setAttribute('aria-label',active?'Exit full screen':'Enter full screen');button.title=active?'Exit full screen':'Enter full screen';$('.fullscreen-icon path',button).setAttribute('d',active?'M3 8h5V3M21 8h-5V3M8 21v-5H3M16 21v-5h5':'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5');
}
async function toggleFullscreen(){
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
  else alert('Use your browser’s full-screen command to present this page.');
 }catch{alert('Full screen is unavailable here. Open this page in Chrome, Edge, or Safari and try again.');}
 syncFullscreenButton();
}
function initializeControls(){
 $('#present-button').addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',syncFullscreenButton);
 $('#floor-nav').innerHTML=[...ORDER].reverse().map(f=>`<button class="floor-nav-button" data-floor="${f}"><span class="nav-floor ${f==='Foundation'?'foundation':''}">${f==='Foundation'?'F':f}</span><span class="nav-floor-title">${NAMES[f]}<small>${f==='L3'?'Test, learn, decide':f==='L2'?'Ecosystem & capabilities':f==='L1'?'Signals & strategic choices':f==='LL'?'The organisation within':'Vision, purpose & values'}</small></span><span class="floor-arrow">↗</span></button>`).join('');
 $$('.floor-nav-button').forEach(b=>b.addEventListener('click',()=>{endTour();selectFloor(b.dataset.floor);}));
 $('#back-to-building').addEventListener('click',()=>{endTour();selectFloor('all');});
 $('#floor-guide-button').addEventListener('click',()=>{if(state.floor!=='all')renderInspector(floorHTML(state.floor),true);});$('#overview-button').addEventListener('click',()=>{endTour();selectFloor('all');});$('.brand').addEventListener('click',e=>{e.preventDefault();endTour();selectFloor('all');});
 $('#legend').innerHTML=Object.entries(CAT).filter(([c])=>c!=='foundation').map(([cat,title])=>`<button class="active" data-cat="${cat}" aria-pressed="false"><i class="swatch" style="--cat:${C[cat]}"></i>${title}</button>`).join('');
 $$('#legend button').forEach(b=>b.addEventListener('click',()=>filterCategory(b.dataset.cat)));
 $('#iso-button').addEventListener('click',()=>setView('iso'));$('#plan-button').addEventListener('click',()=>setView('plan'));
 $('#zoom-in').addEventListener('click',()=>zoomBy(1.25));$('#zoom-out').addEventListener('click',()=>zoomBy(.8));$('#reset-view').addEventListener('click',fitCamera);
 $('#spread-button').addEventListener('click',()=>{if(state.view==='plan')setView('iso');if(state.floor!=='all')selectFloor('all');const target=state.spread>.5?0:1;gsap.to(state,{spread:target,duration:duration(1),ease,onUpdate:updateProjection,onComplete:fitCamera});$('#spread-button span').textContent=target?'Collapse floors':'Expand floors';$('#spread-button').setAttribute('aria-pressed',Boolean(target));});
 $('#shortcuts-button').addEventListener('click',()=>{endTour();showShortcuts();});
 $('#motion-toggle').setAttribute('aria-pressed',!state.motion);$('#motion-toggle').textContent=state.motion?'Ⅱ':'▷';
 $('#motion-toggle').addEventListener('click',()=>{state.motion=!state.motion;$('#motion-toggle').textContent=state.motion?'Ⅱ':'▷';$('#motion-toggle').setAttribute('aria-pressed',!state.motion);$('#motion-toggle').setAttribute('aria-label',state.motion?'Pause animations':'Enable animations');if(!state.motion)gsap.globalTimeline.getChildren().forEach(t=>{if(t.repeat()===-1)t.pause();else t.progress(1);});});
 $('#tour-button').addEventListener('click',()=>tourStep(0));$('#tour-prev').addEventListener('click',()=>tourStep(Math.max(0,state.tour-1)));$('#tour-next').addEventListener('click',()=>{if(state.tour===4){endTour();selectFloor('all');}else tourStep(state.tour+1);});$('#tour-close').addEventListener('click',endTour);
 const mobileNav=delta=>{endTour();const i=state.floor==='all'?-1:ORDER.indexOf(state.floor);const next=i+delta;if(next<0||next>=ORDER.length)selectFloor('all');else selectFloor(ORDER[next]);};$('#mobile-prev').addEventListener('click',()=>mobileNav(-1));$('#mobile-next').addEventListener('click',()=>mobileNav(1));
 canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoomBy(Math.exp(-Math.max(-80,Math.min(80,e.deltaY))*.008));}},{passive:false});
 const touches=new Map();let pinchDistance=0,pinchActive=false;
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);pinchActive=true;dragging=null;suppressClick=true;}});
 canvas.addEventListener('pointermove',e=>{if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size!==2)return;e.preventDefault();const [a,b]=[...touches.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoomBy(distance/pinchDistance);pinchDistance=distance;},{passive:false});
 const finishTouch=e=>{touches.delete(e.pointerId);if(pinchActive){dragging=null;pinchDistance=0;if(touches.size===0){pinchActive=false;setTimeout(()=>suppressClick=false,80);}}};
 window.addEventListener('pointerup',finishTouch);window.addEventListener('pointercancel',finishTouch);
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||pinchActive)return;dragging={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,moved:false,pointer:e.pointerId};});
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;if(Math.abs(dx)+Math.abs(dy)>7){dragging.moved=true;canvas.classList.add('dragging');$('#hover-tip').hidden=true;gsap.killTweensOf(camera);const rect=canvas.getBoundingClientRect(),scale=Math.max(camera.w/rect.width,camera.h/rect.height);camera.x=dragging.cx-dx*scale;camera.y=dragging.cy-dy*scale;map.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);}});
 window.addEventListener('pointerup',()=>{if(!dragging)return;suppressClick=dragging.moved;dragging=null;canvas.classList.remove('dragging');setTimeout(()=>suppressClick=false,0);});window.addEventListener('pointercancel',()=>{dragging=null;canvas.classList.remove('dragging');});
 document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'&&document.fullscreenElement)return;if(e.key==='Escape'){endTour();if(state.room){state.room=null;clearSelection();renderInspector(floorHTML(state.floor));updateHash();}else{$('#inspector').classList.remove('open');}}else if(e.key==='+'||e.key==='=')zoomBy(1.2);else if(e.key==='-')zoomBy(.8);else if(e.key==='0')fitCamera();});
}
async function init(){
 try{const response=await fetch('assets/source-map.json');if(!response.ok)throw Error('Map content unavailable.');const source=await response.json();parseSource(source);buildWorld();initializeControls();renderInspector(introHTML());const initial=new URLSearchParams(location.hash.slice(1));if(initial.get('room')&&roomById(initial.get('room')))selectRoom(initial.get('room'));else if(ORDER.includes(initial.get('floor')))selectFloor(initial.get('floor'));else{fitCamera();if(state.motion){gsap.from('.floor-region',{opacity:0,y:'+=70',duration:1.1,stagger:.11,ease:'power3.out'});gsap.from('.nav-intro,.floor-nav-button',{opacity:0,x:-12,duration:.6,stagger:.07,ease:'power2.out'});}}
 window.innovationMap={state,data,rooms,selectFloor,selectRoom,setView,showShortcuts,runRoute,fitCamera};
 }catch(error){console.error(error);$('#inspector-content').innerHTML='<div class="inspector-content"><h2>The map could not load.</h2><p>Please refresh the page to try again.</p></div>';}
}
init();

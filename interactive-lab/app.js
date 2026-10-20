'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const layers = [
    ['Experience','Start with the journey: a clear website, useful content and a considered path from first visit to next action.','#8ee9c4'],
    ['Information','Give information a clear structure. Consistent records and explicit validation make the next step easier to trust.','#8fc8f4'],
    ['Workflow','Connect triggers, decisions and handoffs. Design review points and recovery paths alongside the happy path.','#c2aff4'],
    ['People','Keep responsibilities visible. Use review and approval where human judgment belongs.','#f0cf9a'],
    ['Operations','Support what has been delivered with maintenance, documentation and continuing improvement.','#f0aebf']
  ];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let moving = !reduced.matches;
  let chosen = 0, yaw = -.47, pitch = -.25, tick = 0, last = 0, drag = null, points = [], width = 0, height = 0;
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const positions = [[-190,20,0],[-70,-90,-155],[150,-55,-90],[170,15,145],[-75,90,150]];
  function selectLayer(i) {
    chosen = i;
    document.querySelectorAll('[data-node]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.node) === i)));
    $('layer-index').textContent = String(i+1).padStart(2,'0');
    $('layer-title').textContent = layers[i][0]; $('layer-copy').textContent = layers[i][1];
    draw();
  }
  document.querySelectorAll('[data-node]').forEach(b => b.addEventListener('click', () => selectLayer(Number(b.dataset.node))));
  function setMotion() { $('motion').textContent = moving ? 'Pause motion' : 'Resume motion'; $('motion').setAttribute('aria-pressed', String(!moving)); }
  $('motion').addEventListener('click', () => { moving = !moving; setMotion(); draw(); });
  reduced.addEventListener('change', e => { moving = !e.matches; setMotion(); });
  $('rotate-left').addEventListener('click', () => { yaw -= .28; draw(); });
  $('rotate-right').addEventListener('click', () => { yaw += .28; draw(); });
  $('reset-view').addEventListener('click', () => { yaw = -.47; pitch = -.25; draw(); });
  function project(p) {
    const angle = yaw + (moving ? Math.sin(tick*.14)*.055 : 0);
    const x = p[0]*Math.cos(angle)+p[2]*Math.sin(angle), z0 = -p[0]*Math.sin(angle)+p[2]*Math.cos(angle);
    const y = p[1]*Math.cos(pitch)-z0*Math.sin(pitch), z = p[1]*Math.sin(pitch)+z0*Math.cos(pitch);
    const k = 780/(780+z), scale = Math.min(width/650,height/495);
    return {x:width/2+x*k*scale,y:height*.53+y*k*scale,z,k,scale};
  }
  function path(vertices, color, alpha = 1, fill = false, lineWidth = 1) {
    if(!ctx) return;
    ctx.beginPath(); vertices.map(project).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.globalAlpha=alpha;
    if(fill){ctx.closePath();ctx.fillStyle=color;ctx.fill();}else ctx.stroke();ctx.globalAlpha=1;
  }
  function block(pos,s,color,active=false) {
    const [x,y,z]=pos, b=[[x-s,y,z-s],[x+s,y,z-s],[x+s,y,z+s],[x-s,y,z+s]], top=b.map(p=>[p[0],p[1]-s*.65,p[2]]);
    path([b[0],b[1],top[1],top[0]],color,.10,true);path([b[1],b[2],top[2],top[1]],color,.17,true);path(top,color,active?.23:.11,true);
    path([...top,top[0]],color,active?.85:.42);path([...b,b[0]],color,.25);for(let i=0;i<4;i++)path([b[i],top[i]],color,.25);
    const small=top.map(p=>[x+(p[0]-x)*.7,p[1]-.5,z+(p[2]-z)*.7]);path([...small,small[0]],color,.2);
  }
  function draw() {
    if(!ctx || !width)return;
    ctx.clearRect(0,0,width,height);
    for(let i=-360;i<=360;i+=45){path([[i,138,-330],[i,138,330]],'#7eaaa0',.075);path([[-360,138,i],[360,138,i]],'#7eaaa0',.075);}
    const ring=[];for(let i=0;i<=80;i++){let a=i/80*Math.PI*2;ring.push([Math.cos(a)*275,112,Math.sin(a)*225]);}path(ring,'#8ee9c4',.20);
    const center=[0,5,0];
    positions.forEach((p,i)=>{
      const mid=[p[0]*.55,center[1],p[2]*.55];path([center,mid,p],layers[i][2],i===chosen?.75:.28,false,i===chosen?1.5:1);
      const f=(tick*.18+i*.19)%1, q=f<.55?center.map((v,j)=>v+(mid[j]-v)*f/.55):mid.map((v,j)=>v+(p[j]-v)*(f-.55)/.45), dot=project(q);
      ctx.beginPath();ctx.arc(dot.x,dot.y,2.4,0,Math.PI*2);ctx.fillStyle=layers[i][2];ctx.fill();
    });
    const items=positions.map((p,i)=>({p:[p[0],p[1]+(moving?Math.sin(tick*.8+i)*4:0),p[2]],i}));
    items.push({p:center,i:5});items.sort((a,b)=>project(b.p).z-project(a.p).z);
    points=[];
    items.forEach(({p,i})=>{
      if(i===5){for(let j=2;j>=0;j--)block([0,15-j*22,0],42,'#8ee9c4',true);let c=project([0,-62,0]);ctx.textAlign='center';ctx.fillStyle='#e8fff3';ctx.font=`600 ${Math.max(12,c.scale*15)}px Arial`;ctx.fillText('SK',c.x,c.y);return;}
      block(p,38,layers[i][2],i===chosen);
      const label=project([p[0],p[1]-55,p[2]]);ctx.textAlign='center';ctx.fillStyle=i===chosen?'#f0faf5':layers[i][2];ctx.font=`${i===chosen?'600':'400'} ${Math.max(10,Math.min(13,13*label.scale))}px Arial`;ctx.fillText(layers[i][0],label.x,label.y);
      const n=project([p[0],p[1]-13,p[2]]);ctx.fillStyle=layers[i][2];ctx.font=`11px monospace`;ctx.fillText('0'+(i+1),n.x,n.y);
      points.push({...n,i});
    });
  }
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
  if(ctx){new ResizeObserver(resize).observe(canvas);resize();}else{$('scene').setAttribute('aria-label','Use the layer selection buttons below to explore the conceptual model.');}
  canvas.addEventListener('pointerdown', e=>{drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove', e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.006;pitch=Math.max(-.7,Math.min(.25,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;draw();});
  function endDrag(e){if(!drag)return;const distance=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);drag=null;if(distance<7){const r=canvas.getBoundingClientRect();const hit=points.map(p=>({...p,d:Math.hypot(p.x-(e.clientX-r.left),p.y-(e.clientY-r.top))})).sort((a,b)=>a.d-b.d)[0];if(hit&&hit.d<42)selectLayer(hit.i);}}
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',()=>{drag=null;});
  let inView=true;new IntersectionObserver(es=>{inView=es[0].isIntersecting;},{threshold:0}).observe(canvas);
  function animate(now){const dt=Math.min((now-last)/1000,.1);last=now;if(moving&&inView&&!document.hidden){tick+=dt;draw();}requestAnimationFrame(animate);}setMotion();requestAnimationFrame(animate);

  const scenarios={
    order:{title:'A fictional order',record:[['Reference','DEMO-ORDER-001'],['Item','Sample kit'],['Quantity','2'],['Destination','Example region']],steps:[['Receive','Capture a structured request'],['Validate','Check the required reference'],['Prepare','Create a coordination record'],['Review','Confirm the handoff'],['Complete','Prepare a fulfilment summary']],events:['Fictional order received.','Required fields validated.','A coordination record was prepared.','Handoff details were reviewed.','Fulfilment summary prepared.'],result:'Ready for the next team: 2 sample kits, reference DEMO-ORDER-001.'},
    content:{title:'A fictional content brief',record:[['Reference','DEMO-BRIEF-001'],['Topic','Sample product launch'],['Channel','Example landing page'],['State','Draft']],steps:[['Receive','Capture a content brief'],['Validate','Check the source reference'],['Prepare','Create an illustrative AI-assisted outline'],['Review','Apply a human editorial checkpoint'],['Complete','Prepare an approved draft']],events:['Fictional content brief received.','Source reference validated.','A predefined example outline was prepared.','Editorial review checkpoint completed.','Draft marked ready for publishing review.'],result:'Demo outline: introduction, product context, next action. Nothing has been published.'},
    inquiry:{title:'A fictional client inquiry',record:[['Reference','DEMO-INQUIRY-001'],['Topic','Website integration'],['Scope','Example discovery'],['State','New']],steps:[['Receive','Capture a service inquiry'],['Validate','Check the request reference'],['Prepare','Organize the discovery topics'],['Review','Confirm the proposed next step'],['Complete','Prepare a response outline']],events:['Fictional inquiry received.','Request reference validated.','Discovery topics organized.','Proposed next step reviewed.','Response outline prepared.'],result:'Demo next step: discuss scope, dependencies and a delivery plan. No message has been sent.'}
  };
  let stage=0,timer=null,waiting=false,resolved=false,running=false;
  function scenario(){return scenarios[$('scenario').value];}
  function addEvent(message){const li=document.createElement('li'),index=document.createElement('span');index.textContent=String($('event-log').children.length+1).padStart(2,'0');li.append(index,document.createTextNode(message));$('event-log').append(li);}
  function pause(){clearTimeout(timer);timer=null;running=false;}
  function sync(){
    const complete=stage===5;
    $('run').textContent=running?'Pause demo':complete?'Replay demo':stage?'Resume demo':'Run demo';
    $('run').disabled=waiting;$('step').disabled=waiting||complete;$('approve').disabled=!waiting;
    $('progress').textContent=stage+' / 5 steps';$('run-status').textContent=waiting?'Needs review':complete?'Complete':running?'Running':stage?'Paused':'Ready';
    $('approval').hidden=!waiting;
    [...$('flow-steps').children].forEach((li,i)=>{li.className=i<stage?'done':i===stage?(waiting?'hold':'active'):'';li.querySelector('span').textContent=i<stage?'✓':String(i+1).padStart(2,'0');if(i===stage)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
  }
  function reset(){pause();stage=0;waiting=false;resolved=false;const s=scenario();$('input-title').textContent=s.title;$('input-record').replaceChildren();s.record.forEach(([key,value],i)=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=i===0&&$('exception').checked?'Missing':value;$('input-record').append(dt,dd);});$('flow-steps').replaceChildren();s.steps.forEach(([title,copy],i)=>{const li=document.createElement('li'),num=document.createElement('span'),body=document.createElement('div'),h=document.createElement('strong'),small=document.createElement('small');num.textContent=String(i+1).padStart(2,'0');h.textContent=title;small.textContent=copy;body.append(h,small);li.append(num,body);$('flow-steps').append(li);});$('event-log').replaceChildren();$('result').textContent='The outcome will appear here.';sync();}
  function advance(){
    if(waiting||stage===5)return;
    if(stage===1&&$('exception').checked&&!resolved){waiting=true;pause();addEvent('Missing reference detected. Held for human review.');$('result').textContent='On hold. Review is required before the workflow can continue.';sync();return;}
    addEvent(scenario().events[stage]);stage++;
    if(stage===5){pause();$('result').textContent=scenario().result;}
    sync();
  }
  function schedule(){if(!running)return;timer=setTimeout(()=>{advance();if(running)schedule();},2000);}
  $('run').addEventListener('click',()=>{if(running){pause();sync();return;}if(stage===5)reset();running=true;advance();if(running)schedule();});
  $('step').addEventListener('click',()=>{pause();advance();});
  $('reset').addEventListener('click',reset);$('scenario').addEventListener('change',reset);$('exception').addEventListener('change',reset);
  $('approve').addEventListener('click',()=>{if(!waiting)return;resolved=true;waiting=false;$('input-record').querySelector('dd').textContent=scenario().record[0][1];addEvent('A synthetic reference was supplied at the review checkpoint.');$('result').textContent='Reference supplied. The workflow can continue.';running=true;advance();if(running)schedule();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){pause();sync();}});
  reset();
})();

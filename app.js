(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const games = {
    platformer:{title:"Skybound",hint:"Use ← → to move and ↑ / Space to jump. On touchscreens, use the buttons below."},
    dino:{title:"Neon Dash",hint:"Press Space, ↑, or TAP JUMP to leap over obstacles. How long can you last?"},
    arcade:{title:"Arcade Alley",hint:"Choose a mini-game. Earn points and try to beat your best."},
    racer:{title:"Turbo Circuit",hint:"Steer with ← → or the on-screen controls. Avoid traffic and survive."},
    story:{title:"The Last Lighthouse",hint:"Read carefully. Your choices shape the journey."},
    choose:{title:"Fork in the Road",hint:"Explore the paths and see which ending you discover."},
    builder:{title:"Pixel Painter",hint:"Pick a color and tap the tiles to make your own pixel art."}
  };
  const storeKey = "pixelport-progress-v1";
  let saved = {score:0,best:0,played:0,favorites:[]};
  try { saved = {...saved, ...JSON.parse(localStorage.getItem(storeKey) || "{}")}; } catch(e) {}
  let currentGame = null, cleanupCurrent = null, soundOn = false, audioCtx = null;
  const modal = $("#gameModal"), stage = $("#gameStage");
  function persist(){ try{localStorage.setItem(storeKey,JSON.stringify(saved));}catch(e){} updateStats(); }
  function updateStats(){
    $("#totalScore").textContent = saved.score;
    $("#bestScore").textContent = saved.best;
    $("#playedCount").textContent = saved.played;
    $$(".favorite-btn").forEach(b=>{const yes=saved.favorites.includes(b.dataset.favorite);b.classList.toggle("is-favorite",yes);b.textContent=yes?"♥":"♡";});
  }
  function addScore(n){saved.score=Math.max(0,saved.score+n);saved.best=Math.max(saved.best,saved.score);persist();}
  function gamePlayed(){saved.played++;persist();}
  function beep(freq=440,duration=.07){
    if(!soundOn)return;
    try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.type="sine";g.gain.value=.04;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration);}catch(e){}
  }
  function openGame(id){
    if(!games[id])return;
    closeGame(false);currentGame=id;$("#modalTitle").textContent=games[id].title;$("#gameHint").textContent=games[id].hint;
    modal.classList.remove("hidden");document.body.style.overflow="hidden";gamePlayed();
    const renderers={platformer:renderPlatformer,dino:renderDino,arcade:renderArcade,racer:renderRacer,story:renderStory,choose:renderChoose,builder:renderBuilder};
    cleanupCurrent=(renderers[id]||renderStory)();
    $("#restartGame").onclick=()=>openGame(id);
  }
  function closeGame(reset=true){if(cleanupCurrent){try{cleanupCurrent();}catch(e){}cleanupCurrent=null;}modal.classList.add("hidden");document.body.style.overflow="";if(reset)currentGame=null;stage.innerHTML="";}
  $("#closeModal").addEventListener("click",()=>closeGame());
  modal.addEventListener("click",e=>{if(e.target===modal)closeGame();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.classList.contains("hidden"))closeGame();});
  $("#homeBrand").addEventListener("click",e=>{e.preventDefault();closeGame();window.scrollTo({top:0,behavior:"smooth"});});
  $("#playFeatured").addEventListener("click",()=>openGame("platformer"));
  $("#soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("#soundBtn").style.color=soundOn?"#5eead4":"#c8d2e9";$("#soundBtn").title=soundOn?"Sound on":"Sound off";beep(620);});
  $$(".card-play").forEach(b=>b.addEventListener("click",()=>openGame(b.dataset.play)));
  $$(".favorite-btn").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const id=b.dataset.favorite;if(saved.favorites.includes(id))saved.favorites=saved.favorites.filter(x=>x!==id);else saved.favorites.push(id);persist();}));
  let activeFilter="all";
  function filterGames(){
    const q=$("#searchInput").value.trim().toLowerCase();let shown=0;
    $$(".game-card").forEach(card=>{const okCat=activeFilter==="all"||card.dataset.category===activeFilter||(activeFilter==="favorites"&&saved.favorites.includes(card.dataset.game));const okText=(card.dataset.title+" "+card.textContent).toLowerCase().includes(q);card.classList.toggle("hidden",!(okCat&&okText));if(okCat&&okText)shown++;});
    $("#emptyState").classList.toggle("hidden",shown>0);
  }
  $$(".filter").forEach(b=>b.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;filterGames();}));
  $("#searchInput").addEventListener("input",filterGames);
  updateStats();

  function stageBase(){stage.innerHTML='<div class="stage-inner"></div>';return $(".stage-inner",stage);}
  function btn(label,fn,primary=false){const b=document.createElement("button");b.className="game-btn"+(primary?" primary":"");b.textContent=label;b.addEventListener("click",fn);return b;}
  function message(parent,text){const d=document.createElement("div");d.className="stage-message";d.textContent=text;parent.appendChild(d);return d;}
  function renderStory(){
    const root=stageBase();
    const scenes=[
      {title:"A light in the storm",text:"Your little boat bumps against a rocky shore. Above you, a lighthouse flashes once, then goes dark. In your pocket: a brass key and a half-torn map.",choices:[["Climb the winding path","path"],["Search the tide pools","pools"]]},
      {title:"The winding path",text:"Wind whistles between the pines. You find a weather-beaten shed with a warm glow beneath its door. The brass key feels strangely warm.",choices:[["Unlock the shed","shed"],["Keep climbing to the lighthouse","tower"]]},
      {title:"The tide pools",text:"Among the shells, you find a glass bottle. Inside is a note: “When the bell rings, follow the blue light.” A distant bell answers the thunder.",choices:[["Follow a blue glow along the rocks","glow"],["Head for the lighthouse","tower"]]},
      {title:"The shed",text:"The key turns. Inside is an old lantern and a journal. The keeper wrote that the lighthouse needs a new flame, and the lantern can carry it.",choices:[["Take the lantern to the top","towerLantern"],["Read the journal first","journal"]]},
      {title:"The journal",text:"The final page shows a symbol matching the mark on your map. You now know the lighthouse is not abandoned—it's waiting for someone to finish the job.",choices:[["Take the lantern upstairs","towerLantern"],["Return to the shore","shore"]]},
      {title:"The blue light",text:"A trail of tiny blue lights leads to a hidden stairway. At the top, a sealed door bears the same symbol as your map.",choices:[["Use the brass key","tower"],["Go back and find another way","path"]]},
      {title:"The lighthouse",text:"You reach the lantern room. The great lens is still, and the sea beyond is nearly invisible. A small empty socket waits in the center of the old mechanism.",choices:[["Place the lantern in the socket","win"],["Look out to sea one last time","sea"]]},
      {title:"A new keeper",text:"The lantern catches. Light sweeps across the waves, revealing a safe channel through the rocks. Far offshore, another boat answers with a tiny light. The island has found its next keeper.",choices:[["Play again","restart"]]},
      {title:"The sea answers",text:"A pale shape moves beneath the waves. For a moment, the storm seems to hold its breath. Then the lighthouse lens begins to turn by itself. Perhaps the island has secrets left for another night.",choices:[["Try a different path","restart"]]},
      {title:"The quiet shore",text:"You return to the beach as the clouds begin to part. You may not have solved the island's mystery, but the brass key is yours to keep.",choices:[["Start a new journey","restart"]]}
    ];
    let idx=0,hasLantern=false;
    function show(id){
      if(id==="restart"){idx=0;hasLantern=false;return show("start");}
      if(id==="towerLantern"){hasLantern=true;return show("tower");}
      if(id==="tower"&&hasLantern)id="win";
      const map={start:0,path:1,pools:2,shed:3,journal:4,glow:5,tower:6,win:7,sea:8,shore:9};
      idx=map[id]??0;const s=scenes[idx];root.innerHTML=`<div class="eyebrow">CHAPTER ${idx+1} / ISLAND MYSTERY</div><h3 class="stage-title">${s.title}</h3><p class="story-text">${s.text}</p><div class="choice-list"></div><div class="story-status">${hasLantern?"LANTERN FOUND":"BRASS KEY · TORN MAP"}</div>`;
      const list=$(".choice-list",root);s.choices.forEach(([label,next])=>{const b=document.createElement("button");b.className="choice-btn";b.textContent="↳ "+label;b.onclick=()=>{beep(480);if(next==="win")addScore(100);show(next);};list.appendChild(b);});
    }
    show("start");return ()=>{};
  }
  function renderChoose(){
    const root=stageBase();let courage=0,clues=0;
    const nodes={
      start:{title:"The Door at the Edge of the World",text:"At the end of a quiet street stands a doorway floating in midair. Three symbols glow across it: a mountain, a wave, and a star.",opts:[["Choose the mountain","mountain"],["Choose the wave","wave"],["Choose the star","star"]]},
      mountain:{title:"The Glass Mountain",text:"You climb a mountain made of clear crystal. Halfway up, a tiny dragon guards a bridge and asks for something brave—not something valuable.",opts:[["Tell the dragon what you fear","brave"],["Offer your map","map"]]},
      wave:{title:"The City Below",text:"Beneath the waves, a city glows inside a giant bubble. The royal library has one book with your name on its spine.",opts:[["Open the book","book"],["Help repair the city's bell","bell"]]},
      star:{title:"The Star Train",text:"A silver train arrives on a track of starlight. The conductor says it can take you anywhere, but only once.",opts:[["Travel to tomorrow","tomorrow"],["Ask to visit a forgotten memory","memory"]]},
      brave:{title:"The Brave Ending",text:"The dragon nods. You cross the bridge and discover a garden above the clouds. Your courage has opened a path that wasn't there before.",opts:[["Play another route","start"]],end:true},
      map:{title:"The Map Ending",text:"The dragon studies your map and draws a new path on it: a route to a hidden sky village. You leave with a bigger world than you started with.",opts:[["Play another route","start"]],end:true},
      book:{title:"The Story Ending",text:"The book contains a story about someone who made a choice at a magical doorway. The final page is blank, waiting for your next chapter.",opts:[["Play another route","start"]],end:true},
      bell:{title:"The Helpful Hero Ending",text:"The city bell rings again, and every window lights up. The citizens name you an honorary explorer and give you a pearl that remembers this place.",opts:[["Play another route","start"]],end:true},
      tomorrow:{title:"The Future Ending",text:"Tomorrow's world is full of floating gardens and friendly robots. You bring back one idea that changes your own world for the better.",opts:[["Play another route","start"]],end:true},
      memory:{title:"The Memory Ending",text:"You revisit a small, happy moment you had nearly forgotten. It feels brighter than any star. You return knowing the best treasures can travel with you.",opts:[["Play another route","start"]],end:true}
    };
    function show(id){const n=nodes[id];root.innerHTML=`<div class="eyebrow">CHOOSE YOUR OWN ADVENTURE</div><h3 class="stage-title">${n.title}</h3><p class="story-text">${n.text}</p><div class="choice-list"></div>${n.end?'<div class="score-chip">ENDING DISCOVERED ✦ +25 PTS</div>':""}`;if(n.end)addScore(25);const list=$(".choice-list",root);n.opts.forEach(([label,next])=>{const b=document.createElement("button");b.className="choice-btn";b.textContent="↳ "+label;b.onclick=()=>{beep(510);show(next);};list.appendChild(b);});}
    show("start");return ()=>{};
  }
  function renderArcade(){
    const root=stageBase();root.innerHTML='<div class="eyebrow">PICK YOUR MINI-GAME</div><h3 class="stage-title">Arcade Alley</h3><p class="stage-copy">Three quick challenges. Each one tracks your score and adds points to your PixelPort total.</p><div class="arcade-tabs"><button class="active" data-mini="mole">Whack-a-Mole</button><button data-mini="skeeball">Skee-ball</button><button data-mini="reaction">Quick Tap</button></div><div class="arcade-play-area"></div>';
    const area=$(".arcade-play-area",root);let timer=null,stopFn=()=>{};
    function selectMini(type){if(timer)clearInterval(timer);stopFn();$$(".arcade-tabs button",root).forEach(b=>b.classList.toggle("active",b.dataset.mini===type));if(type==="mole")mole();if(type==="skeeball")skeeball();if(type==="reaction")reaction();}
    $$(".arcade-tabs button",root).forEach(b=>b.onclick=()=>selectMini(b.dataset.mini));
    function mole(){let score=0,seconds=20,active=0,ended=false;area.innerHTML=`<div class="arcade-score">SCORE <b id="miniScore">0</b> · TIME <b id="miniTime">20</b>s</div><p class="stage-copy">Tap the mole when it pops up!</p><div class="mole-grid">${Array.from({length:9},(_,i)=>`<button class="mole-hole" data-hole="${i}" aria-label="Hole ${i+1}"></button>`).join("")}</div><div class="stage-message">Get ready…</div>`;
      const holes=$$(".mole-hole",area);function pop(){holes.forEach(h=>h.classList.remove("up")),active=Math.floor(Math.random()*9);holes[active].classList.add("up");}holes.forEach((h,i)=>h.onclick=()=>{if(ended||i!==active||!h.classList.contains("up"))return;score+=10;$("#miniScore",area).textContent=score;h.classList.remove("up");beep(650);pop();});pop();timer=setInterval(()=>{seconds--;$("#miniTime",area).textContent=seconds;if(seconds<=0){clearInterval(timer);ended=true;holes.forEach(h=>h.disabled=true);message(area,`Time! You scored ${score} points.`);addScore(score);}},1000);stopFn=()=>{ended=true;clearInterval(timer);};}
    function skeeball(){let score=0,throws=8;area.innerHTML=`<div class="arcade-score">SCORE <b id="miniScore">0</b> · BALLS <b id="miniTime">8</b></div><p class="stage-copy">Tap a target to roll. Smaller targets are worth more!</p><div style="display:flex;justify-content:center;align-items:end;gap:12px;height:125px;margin:15px 0"><button data-points="10" style="width:95px;height:95px;border-radius:50%;border:7px solid #ffb86b;background:#382b52;color:white;font-weight:800">10</button><button data-points="25" style="width:70px;height:70px;border-radius:50%;border:6px solid #5eead4;background:#23445a;color:white;font-weight:800">25</button><button data-points="50" style="width:48px;height:48px;border-radius:50%;border:5px solid #c0b1ff;background:#41366d;color:white;font-size:11px;font-weight:800">50</button></div><div class="stage-message">Aim for the center ring!</div>`;
      $$("[data-points]",area).forEach(b=>b.onclick=()=>{if(throws<=0)return;throws--;const base=Number(b.dataset.points),earned=Math.random()<.72?base:0;score+=earned;$("#miniScore",area).textContent=score;$("#miniTime",area).textContent=throws;message(area,earned?`Nice roll! +${earned} points.`:"Gutter ball! Try again.");beep(earned?600:180);if(throws===0){message(area,`Game over — total ${score} points.`);addScore(score);$$("[data-points]",area).forEach(x=>x.disabled=true);}});
    }
    function reaction(){let score=0,seconds=15,ready=false,ended=false;area.innerHTML=`<div class="arcade-score">TAPS <b id="miniScore">0</b> · TIME <b id="miniTime">15</b>s</div><p class="stage-copy">Tap the big button as many times as you can before time runs out.</p><div style="display:grid;place-items:center;min-height:140px"><button id="tapTarget" style="width:140px;height:140px;border-radius:50%;border:8px solid #9e8bff;background:radial-gradient(circle at 30% 25%,#a99bff,#6555bb);box-shadow:0 0 40px #9277ff3a;color:white;font-size:15px;font-weight:800">TAP!</button></div>`;
      $("#tapTarget",area).onclick=()=>{if(ended)return;if(!ready){ready=true;timer=setInterval(()=>{seconds--;$("#miniTime",area).textContent=seconds;if(seconds<=0){clearInterval(timer);ended=true;message(area,`Time! ${score} taps. You earned ${score*2} points.`);addScore(score*2);}},1000);}score++;$("#miniScore",area).textContent=score;beep(300+Math.min(score*7,500));};
      stopFn=()=>{ended=true;clearInterval(timer);};
    }
    selectMini("mole");return ()=>{if(timer)clearInterval(timer);stopFn();};
  }
  function renderBuilder(){
    const root=stageBase();const colors=["#ff777f","#ffbd69","#f8e58c","#5ee5ce","#69b9ff","#9e8bff","#ff8ad1","#f3f5ff","#263b5d","#172239"];
    let chosen=0;root.innerHTML='<div class="eyebrow">MAKE SOMETHING YOURS</div><h3 class="stage-title">Pixel Painter</h3><p class="stage-copy">Choose a color and tap squares to paint. Make a tiny character, a landscape, or anything you can imagine.</p><div class="pixel-palette"></div><div class="pixel-board" aria-label="Pixel art canvas"></div><div class="button-row" style="justify-content:center"><button class="game-btn" id="clearPixels">Clear canvas</button><button class="game-btn primary" id="savePixels">Add creation bonus (+20)</button></div><p class="platform-hint">Tip: try a few colors to create shading and details.</p>';
    const palette=$(".pixel-palette",root),board=$(".pixel-board",root);colors.forEach((c,i)=>{const b=document.createElement("button");b.className="color-swatch"+(i===0?" selected":"");b.style.background=c;b.setAttribute("aria-label","Choose color "+(i+1));b.onclick=()=>{chosen=i;$$(".color-swatch",palette).forEach(x=>x.classList.remove("selected"));b.classList.add("selected");};palette.appendChild(b);});
    const cells=[];for(let i=0;i<144;i++){const c=document.createElement("button");c.className="pixel-cell";c.setAttribute("aria-label","Pixel "+(i+1));c.onclick=()=>{c.style.background=colors[chosen];c.dataset.painted="1";beep(250+chosen*35,.03);};board.appendChild(c);cells.push(c);}
    $("#clearPixels",root).onclick=()=>cells.forEach(c=>{c.style.background="";delete c.dataset.painted;});
    $("#savePixels",root).onclick=()=>{addScore(20);message(root,"Creation bonus added! Your artwork remains on the canvas until you clear it.");$("#savePixels",root).disabled=true;};return ()=>{};
  }
  function renderDino(){
    const root=stageBase();root.innerHTML='<div class="eyebrow">ENDLESS RUNNER</div><h3 class="stage-title">Neon Dash</h3><div class="score-chip">SCORE <span id="runnerScore">0</span> · BEST <span id="runnerBest">0</span></div><canvas class="lane-canvas" id="runnerCanvas" aria-label="Runner game canvas"></canvas><div class="canvas-controls"><button class="control-btn" id="jumpBtn">⬆ JUMP</button></div><div class="platform-hint">Space / ↑ / tap JUMP to leap.</div>';
    const canvas=$("#runnerCanvas",root),ctx=canvas.getContext("2d");let w=0,h=300,raf=0,last=0,score=0,speed=5,over=false,player={x:55,y:0,vy:0,grounded:true},obstacles=[],spawn=0;
    function resize(){const r=canvas.getBoundingClientRect();w=canvas.width=Math.max(300,r.width*devicePixelRatio);h=canvas.height=300*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);w=r.width;h=300;player.y=h-55;}
    function jump(){if(over){start();return;}if(player.grounded){player.vy=-10.5;player.grounded=false;beep(400);}}
    function start(){score=0;speed=5;over=false;obstacles=[];spawn=0;player.y=h-55;player.vy=0;player.grounded=true;last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
    function draw(){const dpr=devicePixelRatio||1;ctx.clearRect(0,0,w,h);const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,"#162746");grad.addColorStop(1,"#0e172a");ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
      for(let i=0;i<30;i++){const x=(i*67-(score*speed*.15)%(w+67)+w+67)%(w+67);ctx.fillStyle="#9beeea55";ctx.fillRect(x,20+(i*31)%105,2,2);}
      ctx.fillStyle="#6ee7d8";ctx.fillRect(0,h-29,w,2);ctx.fillStyle="#29435b";ctx.fillRect(0,h-27,w,27);
      // character
      const py=player.y;ctx.fillStyle="#5eead4";ctx.fillRect(player.x,py-27,26,27);ctx.fillRect(player.x+15,py-37,18,15);ctx.fillStyle="#10213a";ctx.fillRect(player.x+26,py-32,3,3);ctx.fillStyle="#5eead4";ctx.fillRect(player.x+3,py,6,7);ctx.fillRect(player.x+18,py,6,7);
      obstacles.forEach(o=>{ctx.fillStyle="#ff8d87";ctx.fillRect(o.x,h-29-o.height,o.width,o.height);ctx.fillRect(o.x-5,h-29-o.height+10,7,7);ctx.fillRect(o.x+o.width-2,h-29-o.height+18,7,7);});
    }
    function loop(t){if(over)return;const dt=Math.min((t-last||16)/16,2);last=t;score+=dt*.15;speed=Math.min(10,5+score/100);$("#runnerScore",root).textContent=Math.floor(score);$("#runnerBest",root).textContent=Math.max(saved.best,Math.floor(score));
      player.vy+=.48*dt;player.y+=player.vy*dt;if(player.y>h-55){player.y=h-55;player.vy=0;player.grounded=true;}
      spawn-=dt;if(spawn<=0){obstacles.push({x:w+10,width:17+Math.random()*13,height:25+Math.random()*28});spawn=45+Math.random()*40;}
      obstacles.forEach(o=>o.x-=speed*dt);obstacles=obstacles.filter(o=>o.x>-40);
      const px=player.x+3,py=player.y-26;for(const o of obstacles){if(px<o.x+o.width&&px+21>o.x&&py<h-29&&player.y>h-29-o.height+2){over=true;cancelAnimationFrame(raf);saved.best=Math.max(saved.best,Math.floor(score));persist();addScore(Math.floor(score));const cover=document.createElement("div");cover.className="game-over";cover.innerHTML=`<div><h3>Run over!</h3><p>You scored ${Math.floor(score)} points.</p><button class="game-btn primary" id="runAgain">Run again ↻</button></div>`;stage.appendChild(cover);$("#runAgain",cover).onclick=()=>{cover.remove();start();};break;}}
      draw();if(!over)raf=requestAnimationFrame(loop);}
    resize();const key=e=>{if([" ","ArrowUp"].includes(e.key)&&currentGame==="dino"){e.preventDefault();jump();}};document.addEventListener("keydown",key);$("#jumpBtn",root).onclick=jump;canvas.addEventListener("pointerdown",jump);raf=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",key);};
  }
  function renderPlatformer(){
    const root=stageBase();root.innerHTML='<div class="eyebrow">PLATFORMER</div><h3 class="stage-title">Skybound</h3><div class="score-chip">STARS <span id="starCount">0</span>/5</div><canvas class="lane-canvas" id="platformCanvas" aria-label="Platform game canvas"></canvas><div class="platform-controls"><button class="control-btn" id="leftBtn">← LEFT</button><button class="control-btn" id="jumpPlatform">↑ JUMP</button><button class="control-btn" id="rightBtn">RIGHT →</button></div><div class="platform-hint">Collect all 5 stars and reach the glowing portal. Keyboard: arrows + Space.</div>';
    const canvas=$("#platformCanvas",root),ctx=canvas.getContext("2d");let w=0,h=300,raf=0,last=0,keys={},stars=0,won=false,player={x:28,y:0,vy:0,w:22,h:27},platforms=[],coins=[],camera=0;
    function resize(){const r=canvas.getBoundingClientRect();canvas.width=r.width*devicePixelRatio;canvas.height=300*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);w=r.width;h=300;makeLevel();}
    function makeLevel(){platforms=[{x:0,y:260,w:140},{x:180,y:220,w:95},{x:310,y:180,w:95},{x:440,y:220,w:100},{x:580,y:170,w:100},{x:720,y:220,w:150}];coins=[{x:85,y:228},{x:218,y:188},{x:348,y:148},{x:474,y:188},{x:618,y:138}];player.x=28;player.y=230;player.vy=0;camera=0;stars=0;won=false;$("#starCount",root).textContent=0;}
    function draw(){ctx.clearRect(0,0,w,h);let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#6575c8");g.addColorStop(1,"#edb3bd");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      for(let i=0;i<7;i++){ctx.fillStyle="#ffffff30";ctx.beginPath();ctx.arc((i*113-camera*.2)%(w+90),40+(i%3)*28,14,0,Math.PI*2);ctx.fill();}
      platforms.forEach(p=>{let x=p.x-camera;ctx.fillStyle="#55457e";ctx.fillRect(x,p.y,p.w,12);ctx.fillStyle="#9d91ec";ctx.fillRect(x,p.y,p.w,4);});
      coins.forEach(c=>{if(c.got)return;let x=c.x-camera;ctx.fillStyle="#ffe08b";ctx.beginPath();ctx.arc(x,c.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff4bd";ctx.fillRect(x-2,c.y-4,3,8);});
      const portalX=790-camera;ctx.fillStyle="#5eead4";ctx.shadowColor="#5eead4";ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(portalX,195,13,23,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle="#ffce8a";ctx.fillRect(player.x-camera,player.y,player.w,player.h);ctx.fillStyle="#30365d";ctx.fillRect(player.x-camera+13,player.y+7,4,4);ctx.fillStyle="#fff0c4";ctx.fillRect(player.x-camera+3,player.y+3,6,5);
    }
    function loop(t){const dt=Math.min((t-last||16)/16,2);last=t;if(!won){const oldY=player.y;player.x+=(keys.ArrowRight||keys.right?3.2:0)-(keys.ArrowLeft||keys.left?3.2:0);player.x=Math.max(0,player.x);player.vy+=.42*dt;player.y+=player.vy*dt;
      let landed=false;platforms.forEach(p=>{if(player.x+player.w>p.x&&player.x<p.x+p.w&&oldY+player.h<=p.y+3&&player.y+player.h>=p.y&&player.vy>=0){player.y=p.y-player.h;player.vy=0;landed=true;}});if(player.y>h+20){player.x=28;player.y=230;player.vy=0;}
      if((keys[" "]||keys.ArrowUp||keys.jump)&&landed){player.vy=-9.4;keys[" "]=false;keys.ArrowUp=false;keys.jump=false;beep(400);}
      coins.forEach(c=>{if(!c.got&&Math.abs(player.x+11-c.x)<15&&Math.abs(player.y+13-c.y)<20){c.got=true;stars++;$("#starCount",root).textContent=stars;addScore(5);beep(720);}});
      camera=Math.max(0,Math.min(player.x-100,480));if(player.x>770&&stars===5){won=true;addScore(100);const cover=document.createElement("div");cover.className="game-over";cover.innerHTML='<div><h3>Level complete!</h3><p>You collected every star. +100 points!</p><button class="game-btn primary" id="platformAgain">Play again ↻</button></div>';stage.appendChild(cover);$("#platformAgain",cover).onclick=()=>{cover.remove();makeLevel();};}
    }draw();raf=requestAnimationFrame(loop);}
    resize();const keydown=e=>{if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key)){keys[e.key]=true;if(currentGame==="platformer")e.preventDefault();}};const keyup=e=>{keys[e.key]=false;};document.addEventListener("keydown",keydown);document.addEventListener("keyup",keyup);
    const hold=(id,key)=>{const b=$("#"+id,root);b.addEventListener("pointerdown",e=>{e.preventDefault();keys[key]=true;});["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>keys[key]=false));};hold("leftBtn","ArrowLeft");hold("rightBtn","ArrowRight");$("#jumpPlatform",root).onclick=()=>{keys.jump=true;player.vy=-9.4;beep(400);};
    raf=requestAnimationFrame(loop);return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",keydown);document.removeEventListener("keyup",keyup);};
  }
  function renderRacer(){
    const root=stageBase();root.innerHTML='<div class="eyebrow">TURBO CIRCUIT</div><h3 class="stage-title">Stay on the road</h3><div class="score-chip">DISTANCE <span id="raceScore">0</span> m</div><canvas class="lane-canvas" id="raceCanvas" aria-label="Racing game canvas"></canvas><div class="canvas-controls"><button class="control-btn" id="raceLeft">← STEER</button><button class="control-btn" id="raceRight">STEER →</button></div><div class="platform-hint">Dodge the cars for as long as you can.</div>';
    const canvas=$("#raceCanvas",root),ctx=canvas.getContext("2d");let w=0,h=300,raf=0,last=0,score=0,speed=4,over=false,playerLane=1,traffic=[],stripe=0;
    function resize(){const r=canvas.getBoundingClientRect();canvas.width=r.width*devicePixelRatio;canvas.height=300*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);w=r.width;h=300;}
    function start(){score=0;speed=4;over=false;playerLane=1;traffic=[];stripe=0;last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
    function draw(){ctx.clearRect(0,0,w,h);ctx.fillStyle="#1b3a43";ctx.fillRect(0,0,w,h);ctx.fillStyle="#343b50";ctx.beginPath();ctx.moveTo(w*.22,0);ctx.lineTo(w*.78,0);ctx.lineTo(w*.98,h);ctx.lineTo(w*.02,h);ctx.closePath();ctx.fill();ctx.strokeStyle="#f8e8b0";ctx.lineWidth=3;ctx.setLineDash([19,18]);ctx.lineDashOffset=-stripe;ctx.beginPath();ctx.moveTo(w*.5,0);ctx.lineTo(w*.5,h);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle="#e8d9a0";ctx.beginPath();ctx.moveTo(w*.31,0);ctx.lineTo(w*.13,h);ctx.moveTo(w*.69,0);ctx.lineTo(w*.87,h);ctx.stroke();
      function car(x,y,color,scale=1){ctx.fillStyle=color;ctx.fillRect(x-12*scale,y-20*scale,24*scale,40*scale);ctx.fillStyle="#b7e8f0";ctx.fillRect(x-8*scale,y-13*scale,16*scale,10*scale);ctx.fillStyle="#111827";ctx.fillRect(x-16*scale,y-13*scale,4*scale,9*scale);ctx.fillRect(x+12*scale,y-13*scale,4*scale,9*scale);ctx.fillRect(x-16*scale,y+9*scale,4*scale,9*scale);ctx.fillRect(x+12*scale,y+9*scale,4*scale,9*scale);}
      traffic.forEach(o=>car(w*(.34+o.lane*.16),o.y,"#ff797f",.75));car(w*(.34+playerLane*.16),h-55,"#5eead4",1);
    }
    function loop(t){const dt=Math.min((t-last||16)/16,2);last=t;if(!over){score+=dt*.4;speed=Math.min(9,4+score/80);stripe+=speed*dt;$("#raceScore",root).textContent=Math.floor(score);if(Math.random()<.025*dt)traffic.push({lane:Math.floor(Math.random()*3),y:-30});traffic.forEach(o=>o.y+=speed*dt);traffic=traffic.filter(o=>o.y<h+40);for(const o of traffic){if(o.lane===playerLane&&o.y>h-85&&o.y<h-22){over=true;cancelAnimationFrame(raf);addScore(Math.floor(score));const cover=document.createElement("div");cover.className="game-over";cover.innerHTML=`<div><h3>Crash!</h3><p>You travelled ${Math.floor(score)} m.</p><button class="game-btn primary" id="raceAgain">Race again ↻</button></div>`;stage.appendChild(cover);$("#raceAgain",cover).onclick=()=>{cover.remove();start();};break;}}draw();if(!over)raf=requestAnimationFrame(loop);}}
    function left(){playerLane=Math.max(0,playerLane-1);beep(300,.04);}function right(){playerLane=Math.min(2,playerLane+1);beep(350,.04);}
    resize();const key=e=>{if(currentGame==="racer"&&["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();e.key==="ArrowLeft"?left():right();}};document.addEventListener("keydown",key);$("#raceLeft",root).onclick=left;$("#raceRight",root).onclick=right;raf=requestAnimationFrame(loop);return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",key);};
  }
})();
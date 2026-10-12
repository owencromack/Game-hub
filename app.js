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
    builder:{title:"Pixel Painter",hint:"Pick a color and tap the tiles to make your own pixel art."},
    dungeon:{title:"Crypt Crawler",hint:"Fight through the dungeon. Choose an action each turn, use potions wisely, and reach the final chamber."}
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
    const renderers={platformer:renderPlatformer,dino:renderDino,arcade:renderArcade,racer:renderRacer,story:renderStory,choose:renderChoose,builder:renderBuilder,dungeon:renderDungeon};
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
    const scenes={
      start:{title:"A light in the storm",text:"Your boat scrapes against a rocky shore. The lighthouse above flashes once, then goes dark. You have a brass key, a torn map, and a lantern with almost no oil.",choices:[["Climb the cliff path","path"],["Search the tide pools","pools"],["Follow strange footprints into the caves","cave"]]},
      path:{title:"The winding path",text:"The path forks beneath a leaning pine. One branch climbs toward the lighthouse; the other leads to a shed with a broken door. Thunder rolls behind you.",choices:[["Inspect the shed","shed"],["Rush up the exposed cliff","storm"],["Follow the footprints back downhill","cave"]]},
      pools:{title:"The tide pools",text:"You find a bottle containing a note: “When the bell rings, follow the blue light.” A bell sounds from somewhere beneath the cliffs, and the tide is rising quickly.",choices:[["Follow the blue lights","blue"],["Climb toward the lighthouse","tower"],["Stay and search the pools longer","tide"]]},
      cave:{title:"The whispering cave",text:"Blue fungus glows along the cave walls. You hear a voice asking for your lantern. A narrow tunnel slopes down toward rushing water.",choices:[["Give the voice your lantern","voice"],["Explore the narrow tunnel","flood"],["Back away and return to the path","path"]]},
      shed:{title:"The keeper's shed",text:"Inside, you discover a sealed oil can and a journal. The brass key fits a cabinet. A note warns: “Never light the lens before winding the bell.”",choices:[["Take the oil and read the journal","journal"],["Ignore the warning and go to the lens room","badLight"],["Return to the shore","shore"]]},
      journal:{title:"A keeper's warning",text:"The journal explains that the bell steadies the lighthouse mechanism. The oil can is enough for one attempt. The bell tower stands on the far side of the island.",choices:[["Go wind the bell first","bell"],["Use the oil right now","badLight"],["Hide in the shed until morning","hide"]]},
      blue:{title:"The blue stairway",text:"The lights lead to a hidden staircase and a door marked with the same symbol as your map. Beyond it, you can hear the bell mechanism grinding.",choices:[["Open the door with your brass key","bell"],["Walk away from the stairs","shore"],["Force the door open","trap"]]},
      tower:{title:"The lantern room",text:"The great lens is still. The sea is almost invisible through the rain. A socket waits beside the mechanism, but the bell has not rung.",choices:[["Light the lens anyway","badLight"],["Search for the bell mechanism","bell"],["Look out to sea","sea"]]},
      bell:{title:"The bell tower",text:"You pull the rusted rope until the bell rings. The sound rolls across the island and the lighthouse mechanism begins to turn. You have one chance to relight the lens.",choices:[["Take the oil to the lantern room","good"],["Follow the sound of footsteps below","voice"],["Leave the island while you can","shore"]]},
      good:{title:"A safe channel",text:"You pour the oil and light the wick. The lens turns, sending a bright path across the waves. A distant boat answers with a signal lamp. At dawn, you leave the island with a story worth telling.",ending:"good"},
      storm:{title:"Lost in the storm",text:"A flash of lightning blinds you on the exposed cliff. When the rain clears, the path has crumbled behind you and your map is gone. You make it to shore at sunrise, but the lighthouse stays dark.",ending:"bad"},
      tide:{title:"Taken by the tide",text:"The sea surges into the pools and cuts off your way out. You scramble to a ledge and wait for the water to retreat. By the time you return, the trail to the lighthouse has vanished beneath a rockslide.",ending:"bad"},
      flood:{title:"The flooded tunnel",text:"The tunnel narrows, and water rushes in from a hidden opening. You retreat just in time, leaving your lantern behind. The cave is sealed by the rising tide; the lighthouse remains a mystery.",ending:"bad"},
      voice:{title:"The bargain",text:"A pale keeper's spirit takes the lantern and fades into the wall. The cave fills with blue light, revealing a passage out—but your only flame is gone. You escape safely, though the beacon never returns.",ending:"bittersweet"},
      badLight:{title:"The lens goes dark",text:"You light the lens before the bell is wound. The mechanism shudders, sparks, and falls silent. A distant ship turns away from the rocks, but the island's beacon is lost until another keeper arrives.",ending:"bad"},
      trap:{title:"The sealed chamber",text:"The door swings open, then slams shut behind you. The room is safe, but there is no handle on the inside. You discover an old supply cache and wait until rescuers arrive days later.",ending:"bad"},
      sea:{title:"A light beneath the waves",text:"Something glimmers beneath the water. You lean closer and notice the tide climbing over the steps. You escape down the cliff, shaken by what you saw, and leave the island behind.",ending:"bad"},
      hide:{title:"Morning comes",text:"You wake to a clear sky, but the bell tower has collapsed in the storm. You find a rescue boat offshore and leave safely, wondering what might have happened if you had acted sooner.",ending:"bittersweet"},
      shore:{title:"The quiet shore",text:"You return to the beach and signal a passing fishing boat. The island's secret remains unsolved. You are safe, but the lighthouse still waits for someone else.",ending:"bittersweet"}
    };
    function show(id){
      const s=scenes[id]||scenes.start;
      root.innerHTML=`<div class="eyebrow">ISLAND MYSTERY · ${s.ending?"ENDING":"CHOOSE YOUR PATH"}</div><h3 class="stage-title">${s.title}</h3><p class="story-text">${s.text}</p><div class="choice-list"></div>${s.ending?`<div class="story-status">${s.ending==="good"?"✦ BEACON RESTORED":s.ending==="bad"?"ENDING: THE ISLAND WINS":"ENDING: SAFE, BUT UNSOLVED"}</div>`:""}`;
      const list=$(".choice-list",root);
      if(s.ending){if(s.ending==="good")addScore(100);else if(s.ending==="bittersweet")addScore(15);const b=document.createElement("button");b.className="choice-btn";b.textContent="↳ Start a new journey";b.onclick=()=>show("start");list.appendChild(b);return;}
      s.choices.forEach(([label,next])=>{const b=document.createElement("button");b.className="choice-btn";b.textContent="↳ "+label;b.onclick=()=>{beep(480);show(next);};list.appendChild(b);});
    }
    show("start");return ()=>{};
  }
  function renderChoose(){
    const root=stageBase();
    const nodes={
      start:{title:"The Door at the Edge of the World",text:"A doorway floats at the end of a quiet street. Three symbols glow across it: a mountain, a wave, and a star. A small sign says: “Every road asks a price.”",opts:[["Choose the mountain","mountain"],["Choose the wave","wave"],["Choose the star","star"]]},
      mountain:{title:"The Glass Mountain",text:"A crystal bridge crosses a deep ravine. A dragon guards it, asking for a brave truth before it will let you pass.",opts:[["Admit what scares you","brave"],["Pretend you fear nothing","bluff"],["Try to sneak past the dragon","sneak"]]},
      wave:{title:"The City Below",text:"A glowing city rests inside a bubble beneath the sea. The gatekeeper offers you a pearl that can grant one wish, but warns that it always takes something in return.",opts:[["Wish to breathe underwater","pearl"],["Wish to become ruler","greed"],["Refuse the pearl and help repair the bell","bell"]]},
      star:{title:"The Star Train",text:"A silver train waits on a track of starlight. The conductor offers one journey: tomorrow, a forgotten memory, or a place that no longer exists.",opts:[["Travel to tomorrow","future"],["Visit a forgotten memory","memory"],["Go to the vanished city","vanished"]]},
      brave:{title:"The Sky Garden",text:"The dragon respects your honesty and guides you across. Above the clouds, a garden blooms around a quiet observatory. You leave with a new map and a clearer sense of yourself.",opts:[["Return to the doorway","start"]],end:"good"},
      bluff:{title:"The Crumbling Bridge",text:"The dragon sees through your boast. The bridge cracks under your feet and you scramble back to safety, but the mountain path closes behind you.",opts:[["Try another path","start"]],end:"bad"},
      sneak:{title:"Caught in the Act",text:"You creep past the dragon, but a loose crystal rings like a bell. The dragon sends you back to the doorway with a stern warning: courage is not the same as pretending.",opts:[["Try another path","start"]],end:"bad"},
      pearl:{title:"The Sea Explorer",text:"You wish to breathe underwater. The pearl takes your voice in exchange, but opens a whole new world of coral libraries and gentle sea creatures. You can explore, though you cannot speak.",opts:[["Try another path","start"]],end:"mixed"},
      greed:{title:"The Empty Throne",text:"The wish makes you ruler—but everyone vanishes from the city, leaving you alone in a silent palace. The pearl glows once, then turns to sand.",opts:[["Try another path","start"]],end:"bad"},
      bell:{title:"The City Remembers",text:"You help repair the bell. Its clear sound wakes the city's lights, and the citizens share their knowledge freely. You leave with a small compass that points toward kindness.",opts:[["Return to the doorway","start"]],end:"good"},
      future:{title:"Tomorrow's Price",text:"You arrive in a bright future full of floating gardens, but discover your return ticket has expired. You find a place there and send a message home, knowing the choice cannot be undone.",opts:[["Try another path","start"]],end:"mixed"},
      memory:{title:"A Precious Moment",text:"You revisit a small happy moment you nearly forgot. It feels brighter than any star, and you return with the memory intact and a renewed appreciation for ordinary days.",opts:[["Return to the doorway","start"]],end:"good"},
      vanished:{title:"The City That Wasn't",text:"The train arrives at a city made of mist. As you step off, the platform dissolves and the train departs. You find a way home at dawn, but the vanished city remains beyond reach.",opts:[["Try another path","start"]],end:"bad"}
    };
    function show(id){const n=nodes[id]||nodes.start;root.innerHTML=`<div class="eyebrow">CHOOSE YOUR OWN ADVENTURE</div><h3 class="stage-title">${n.title}</h3><p class="story-text">${n.text}</p><div class="choice-list"></div>${n.end?`<div class="story-status">${n.end==="good"?"✦ GOOD ENDING":n.end==="bad"?"ENDING: A HARD LESSON":"BITTERSWEET ENDING"} · +${n.end==="good"?30:n.end==="mixed"?15:5} PTS</div>`:""}`;const list=$(".choice-list",root);if(n.end)addScore(n.end==="good"?30:n.end==="mixed"?15:5);n.opts.forEach(([label,next])=>{const b=document.createElement("button");b.className="choice-btn";b.textContent="↳ "+label;b.onclick=()=>{beep(510);show(next);};list.appendChild(b);});}
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
    resize();const key=e=>{if([" ","ArrowUp"].includes(e.key)&&currentGame==="dino"){e.preventDefault();jump();}};document.addEventListener("keydown",key);$("#jumpBtn",root).onclick=jump;canvas.addEventListener("pointerdown",jump);
    const anywhereTap=e=>{if(currentGame==="dino"&&!e.target.closest("button"))jump();};
    stage.addEventListener("pointerdown",anywhereTap);raf=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",key);stage.removeEventListener("pointerdown",anywhereTap);};
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
    let touchStart=null;const touchAnywhere=e=>{const rect=stage.getBoundingClientRect(),x=e.clientX-rect.left;if(e.target.closest("button"))return;touchStart={x,y:e.clientY};if(x<rect.width*.33)keys.ArrowLeft=true;else if(x>rect.width*.67)keys.ArrowRight=true;else{player.vy=-9.4;beep(400);}};const touchEnd=()=>{keys.ArrowLeft=false;keys.ArrowRight=false;touchStart=null;};stage.addEventListener("pointerdown",touchAnywhere);stage.addEventListener("pointerup",touchEnd);stage.addEventListener("pointercancel",touchEnd);
    raf=requestAnimationFrame(loop);return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",keydown);document.removeEventListener("keyup",keyup);stage.removeEventListener("pointerdown",touchAnywhere);stage.removeEventListener("pointerup",touchEnd);stage.removeEventListener("pointercancel",touchEnd);};
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
    resize();const key=e=>{if(currentGame==="racer"&&["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();e.key==="ArrowLeft"?left():right();}};document.addEventListener("keydown",key);$("#raceLeft",root).onclick=left;$("#raceRight",root).onclick=right;
    let startX=0;const steerDown=e=>{if(e.target.closest("button"))return;startX=e.clientX;};const steerUp=e=>{if(e.target.closest("button"))return;const dx=e.clientX-startX;if(Math.abs(dx)>20){dx<0?left():right();}else{const r=stage.getBoundingClientRect();e.clientX<r.left+r.width/2?left():right();}};stage.addEventListener("pointerdown",steerDown);stage.addEventListener("pointerup",steerUp);raf=requestAnimationFrame(loop);return ()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",key);stage.removeEventListener("pointerdown",steerDown);stage.removeEventListener("pointerup",steerUp);};
  }
  function renderDungeon(){
    const root=stageBase();
    const monsters=[
      {name:"Cave Slime",hp:24,max:24,atk:5,xp:10,color:"#65d69b"},
      {name:"Crypt Bat",hp:30,max:30,atk:7,xp:15,color:"#a58cff"},
      {name:"Skeleton Guard",hp:42,max:42,atk:9,xp:20,color:"#e5d8c1"},
      {name:"Moss Ogre",hp:58,max:58,atk:11,xp:30,color:"#8cbd75"},
      {name:"The Ember Warden",hp:78,max:78,atk:13,xp:60,color:"#ff8d78"}
    ];
    let floor=0,hp=100,maxHp=100,potions=3,gold=0,xp=0,guarding=false,ended=false,monster=null;
    root.innerHTML='<div class="eyebrow">DUNGEON RUN · FLOOR 1 OF 5</div><h3 class="stage-title">Crypt Crawler</h3><p class="stage-copy">Descend through five chambers, defeat the monsters, and collect treasure. Rest between floors to recover a little health.</p><div class="dungeon-hud"></div><div class="dungeon-scene"></div><div class="button-row dungeon-actions"></div><div class="stage-message dungeon-log">You enter the crypt. Something moves in the shadows…</div>';
    const hud=$(".dungeon-hud",root),scene=$(".dungeon-scene",root),actions=$(".dungeon-actions",root),log=$(".dungeon-log",root);
    function say(t){log.textContent=t;}
    function updateHud(){hud.innerHTML=`<div class="score-chip">♥ HP ${hp}/${maxHp}</div> <div class="score-chip">✦ XP ${xp}</div> <div class="score-chip">◈ GOLD ${gold}</div> <div class="score-chip">✚ POTIONS ${potions}</div>`;}
    function drawScene(){
      const m=monster;scene.innerHTML=`<div style="position:relative;min-height:190px;overflow:hidden;border-radius:10px;margin-top:14px;background:radial-gradient(ellipse at 50% 20%,#42335d,#1c2337 58%,#101725);border:1px solid #ffffff14"><div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 34px,#c7b7ef0b 35px 37px),repeating-linear-gradient(0deg,transparent 0 30px,#c7b7ef0a 31px 33px)"></div><div style="position:absolute;left:8%;bottom:20px;width:52px;height:58px;background:#4c4762;border:3px solid #8d82a8;box-shadow:inset -7px -7px #302a40;border-radius:5px"></div><div style="position:absolute;right:8%;bottom:20px;width:44px;height:46px;background:#4c4762;border:3px solid #8d82a8;box-shadow:inset -7px -7px #302a40;border-radius:5px"></div><div style="position:absolute;left:50%;top:38px;transform:translateX(-50%);font-size:47px;filter:drop-shadow(0 0 17px ${m.color}66)">${["◉","✦","☠","♟","♨"][floor]||"☠"}</div><div style="position:absolute;left:0;right:0;bottom:0;text-align:center;padding:8px;background:#0c1322a8;color:#e6eaff;font-weight:800;font-size:13px">${m.name}<div style="height:6px;background:#4a253b;border-radius:8px;margin:6px auto 0;width:65%;overflow:hidden"><div style="height:100%;width:${Math.max(0,m.hp/m.max*100)}%;background:linear-gradient(90deg,#ff777f,#ffbd78)"></div></div><small style="color:#b8c4dc;font-weight:500">${Math.max(0,m.hp)} / ${m.max} HP</small></div></div>`;
    }
    function renderActions(){actions.innerHTML="";if(ended){actions.appendChild(btn("Start a new run ↻",()=>{floor=0;hp=100;maxHp=100;potions=3;gold=0;xp=0;guarding=false;ended=false;spawnMonster();},true));return;}
      actions.appendChild(btn("⚔ Attack",attack,true));actions.appendChild(btn("🛡 Guard",guard));actions.appendChild(btn("✚ Use potion",potion));actions.appendChild(btn("↗ Flee",flee));}
    function spawnMonster(){monster={...monsters[floor]};guarding=false;updateHud();drawScene();renderActions();$(".eyebrow",root).textContent=`DUNGEON RUN · FLOOR ${floor+1} OF 5`;say(`${monster.name} blocks the passage. What will you do?`);}
    function enemyTurn(){if(monster.hp<=0)return;let damage=monster.atk;if(guarding){damage=Math.max(1,Math.floor(damage*.35));guarding=false;}hp=Math.max(0,hp-damage);updateHud();if(hp<=0){ended=true;addScore(Math.floor(xp/2)+gold);say(`You were defeated on floor ${floor+1}. You earned ${xp} XP and found ${gold} gold. Try a different strategy!`);renderActions();}else say(`${monster.name} hits you for ${damage} damage.`);}
    function attack(){if(ended)return;const damage=8+Math.floor(Math.random()*11)+(floor===4?0:2);monster.hp=Math.max(0,monster.hp-damage);beep(270,.09);if(monster.hp<=0){const reward=monster.xp;xp+=reward;gold+=5+Math.floor(Math.random()*11);updateHud();drawScene();if(floor===4){ended=true;addScore(xp+gold+100);say(`VICTORY! You defeated the Ember Warden and escaped the crypt with ${gold} gold. Bonus +100 points!`);renderActions();return;}say(`${monster.name} defeated! You find gold and a staircase. Your health is restored by 8.`);hp=Math.min(maxHp,hp+8);floor++;updateHud();renderActions();const next=btn("Descend to floor "+(floor+1)+" ↓",spawnMonster,true);actions.innerHTML="";actions.appendChild(next);}else{drawScene();enemyTurn();}}
    function guard(){if(ended)return;guarding=true;const before=hp;enemyTurn();if(hp>0)say(`You brace for impact${before-hp>0?` and reduce the hit to ${before-hp} damage`:""}.`);}
    function potion(){if(ended||potions<=0){say(potions<=0?"No potions left!":"The run has ended.");return;}potions--;const healed=Math.min(30,maxHp-hp);hp+=healed;updateHud();beep(650);say(`You drink a potion and recover ${healed} HP.`);enemyTurn();}
    function flee(){if(ended)return;if(Math.random()<.5){hp=Math.max(1,hp-4);updateHud();say("You escape the chamber, but lose 4 HP scrambling away. You can restart to try the dungeon again.");ended=true;addScore(Math.floor(xp/2));renderActions();}else{say("The passage is blocked! The monster gets a free strike.");enemyTurn();}}
    spawnMonster();return ()=>{};
  }

})();
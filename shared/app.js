(() => {
 'use strict';
 const C=PreferencesCore,B=PreferencesBackend,M=PreferencesMotion,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const root=new URL('../',document.currentScript.src),asset=name=>new URL('shared/'+name,root).href;
 const params=new URL(location.href).searchParams,roomId=/^[a-z0-9-]{1,40}$/.test(params.get('room')||'')?params.get('room'):'table';
 const isSandbox=params.get('demo')==='1',iconVersion='20261105-horizontal';
 const prefKey='preferences-ui-v1',deviceKey='preferences-device-v1';
 let prefs;try{prefs=JSON.parse(localStorage.getItem(prefKey)||'{}');}catch{prefs={};}
 prefs={palette:'design',motion:'playful',...prefs};
 const avatars={koala:{icon:'🐨',name:'Koala'},baby:{icon:'👶',name:'Baby'},cat:{icon:'🐱',name:'Cat'},robot:{icon:'🤖',name:'Robot'},fox:{icon:'🦊',name:'Fox'}};
 if(!Object.hasOwn(avatars,prefs.avatar))prefs.avatar='';
 const avatarIcon=id=>Object.hasOwn(avatars,id)?`<span class="inline-avatar" aria-hidden="true">${avatars[id].icon}</span>`:'';
 if(!['design','citrus','ocean','rose','night'].includes(prefs.palette))prefs.palette='design';
 if(!['off','gentle','playful','ridiculous'].includes(prefs.motion))prefs.motion='playful';
 const restoredMotion=M.restore(prefs);prefs.animationPreset=restoredMotion.preset;prefs.animations=restoredMotion.effects;prefs.customAnimations=restoredMotion.custom;
 let device=localStorage.getItem(deviceKey);if(!device){device=crypto.randomUUID();localStorage.setItem(deviceKey,device);}
 let busy=false,sorter=null,signature='',lastPhase='',lastRoundId=null,topicSearch='',topicFilter='active',modalKind='',modalData=null,noticeTimer,pickerVisible=true,guessEditing=false,dragging=false;
 const icons=()=>lucide.createIcons(),glyph=(name,label)=>`<i data-lucide="${name}"${label?` aria-label="${label}"`:''}></i>`;
 const savePrefs=()=>{prefs.motion=Object.values(prefs.animations).some(Boolean)?(prefs.animationPreset==='custom'?'playful':prefs.animationPreset):'off';localStorage.setItem(prefKey,JSON.stringify(prefs));document.body.dataset.palette=prefs.palette;document.body.dataset.motion=prefs.motion;for(const key of Object.keys(M.labels))document.body.dataset['fx'+key[0].toUpperCase()+key.slice(1)]=String(prefs.animations[key]);};savePrefs();
 let motionSnapshot=null,confettiTimer;
 function clearEffects(){M.clear();clearTimeout(confettiTimer);$('#confetti').replaceChildren();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearEffects();});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{clearEffects();sorter?.option('animation',M.enabled(prefs,'reorder')?220:0);});
 const key=()=>`preferences-private-${isSandbox?'sandbox':PREFERENCES_CONFIG.environment}-${roomId}-${B.room.roundId}`;
 function order(){try{return C.privateOrder(B.room,JSON.parse(localStorage.getItem(key())||'null'));}catch{return B.room.items.map(i=>i.id);}}
 function saveOrder(ids){localStorage.setItem(key(),JSON.stringify(ids));}
 function guessOrder(){try{return C.privateOrder(B.room,JSON.parse(localStorage.getItem(key()+'-guess')||'null')||B.room.guesses?.[device]?.order);}catch{return C.privateOrder(B.room);}}
 const activeOrder=()=>guessEditing?guessOrder():order();
 const saveActiveOrder=ids=>localStorage.setItem(key()+(guessEditing?'-guess':''),JSON.stringify(ids));
 function refreshRankLabels(){[...$('#topic-list').children].forEach((el,i)=>{el.querySelector('.tile-number').textContent=i+1;el.querySelectorAll('[data-move]').forEach(button=>{button.dataset.move=i;button.disabled=Number(button.dataset.direction)<0?i===0:i===3;});});}
 const mine=()=>B.room?.owner===device;
 const shareUrl=()=>{const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',roomId);return url.href;};
 const liveShareUrl=()=>{const url=new URL(PREFERENCES_CONFIG.liveUrl);url.searchParams.set('room',roomId);return url.href;};
 function qr(node,size){node.replaceChildren();new QRCode(node,{text:location.hostname==='127.0.0.1'||location.hostname==='localhost'?liveShareUrl():shareUrl(),width:size,height:size,colorDark:'#15262c',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
 function toast(message){clearTimeout(noticeTimer);const target=$('#modal').open?$('#modal-error'):$('#toast');if(!target)return;target.textContent=message;target.hidden=false;noticeTimer=setTimeout(()=>{if(target.id==='toast')target.hidden=true;},6500);}
 async function run(fn){
  if(busy)return false;busy=true;renderStatus();
  const options=modalKind==='round-options'?[...$('#modal').querySelectorAll('button,input')].map(el=>[el,el.disabled]):[];
  options.forEach(([el])=>el.disabled=true);document.querySelectorAll('#game button,#player-controls button,.topbar [data-player-name]').forEach(b=>b.disabled=true);
  try{await fn();return true;}catch(error){toast(error.code==='permission-denied'?'Database access is blocked. Check Firebase rules, then retry.':error.message);return false;}finally{busy=false;options.forEach(([el,disabled])=>el.disabled=disabled);signature='';render();}
 }
 async function command(type,payload={}){return B.command({type,payload:{...payload,expectedRevision:B.room.revision}});}
 function renderStatus(){const state=B.status,node=$('#connection');node.className='connection '+state;node.hidden=state==='live'||state==='loading';node.textContent=state==='live'?'':state==='sandbox'?'Sandbox · only on this device':state==='local'?'On this device · sharing is not connected':state==='reconnecting'?'Reconnecting with your table…':state==='offline'?'Offline · shared changes need a connection':state==='error'?'Not connected · '+(B.error||'retry in Settings'):'';}
 function renderProgress(){
  $('.new-round').disabled=busy||!B.room;
  const phase=B.room?.phase,index=({setup:0,ranking:1,discuss:2,reveal:3,done:3})[phase]??0;
  const list=$('#progress-steps');list.style.setProperty('--stage',index);
  list.querySelectorAll('li').forEach((step,i)=>{step.classList.toggle('complete',i<index||phase==='done');step.classList.toggle('current',Boolean(phase)&&i===index);if(phase&&i===index)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
  const room=B.room,name=room?.picker||'The ranker';
  $('#step-direction').textContent=!room?'':phase==='setup'?'Choose four topics and a ranker, then move to private ranking.':guessEditing?'Arrange your guess, then save it to return to the table.':phase==='ranking'?(mine()?'Put your favorite first. When finished, move to discussion.':`${name} will move everyone to discussion when ready.`):phase==='discuss'?'Discuss the order together. The ranker moves everyone to reveal.':phase==='done'?'Compare the results, then start a new round.':'Reveal from least favorite to favorite. Back returns to the previous step.';
 }
 function tile(item,index,ranking=false){
  const empty=!item.text,editable=B.room.phase==='setup'&&!ranking;
  return `<li class="topic-tile ${empty?'empty':''} ${editable?'editable-topic':''}" data-id="${esc(item.id)}" style="--i:${index}">${ranking?`<span class="tile-number">${index+1}</span>`:''}<span class="tile-text">${empty?'Choose a topic':esc(item.text)}</span>${ranking?`<div class="rank-tools"><button class="icon" data-move="${index}" data-direction="-1" aria-label="Move ${esc(item.text)} up" ${index===0?'disabled':''}>${glyph('chevron-up')}</button><button class="icon" data-move="${index}" data-direction="1" aria-label="Move ${esc(item.text)} down" ${index===3?'disabled':''}>${glyph('chevron-down')}</button></div>`:editable?`<div class="tile-tools"><button class="icon" data-edit-item="${index}" aria-label="${empty?'Add a Topic':'Edit '+esc(item.text)}" title="${empty?'Add a Topic':'Edit Topic'}">${glyph(empty?'plus':'pencil')}</button><button class="icon" data-shuffle-item="${index}" aria-label="Randomize topic ${index+1}" title="Random topic">${glyph('shuffle')}</button></div>`:''}</li>`;
 }
 function render(){
  renderStatus();$('#player-name-label').textContent=prefs.name||'Your name';const nameButton=$('.header-name');nameButton.disabled=busy||!B.room;nameButton.title=prefs.name?'Your profile: '+prefs.name:'Set your name and avatar';const avatarNode=$('#player-avatar');if(avatarNode.dataset.avatar!==prefs.avatar){avatarNode.dataset.avatar=prefs.avatar;avatarNode.innerHTML=avatarIcon(prefs.avatar)||glyph('user-round');icons();}
  if(!B.room){renderProgress();$('#game').innerHTML=`<div class="loading-bars" aria-label="Loading"><span></span><span></span><span></span><span></span></div>${B.status==='error'?'<button data-retry>Retry connection</button>':''}`;return;}
  if(dragging)return;
  const room=B.room;
  if(lastRoundId&&lastRoundId!==room.roundId){pickerVisible=true;guessEditing=false;if($('#modal').open&&!['topics','topic','settings','share'].includes(modalKind))close();window.scrollTo(0,0);}
  lastRoundId=room.roundId;
  if(lastPhase!==room.phase&&room.phase==='setup')localStorage.removeItem(key()+'-guess');
  if(!['ranking','discuss'].includes(room.phase)||mine()||room.revealStarted||room.revealed.length)guessEditing=false;
  renderProgress();
  const ranking=(mine()&&pickerVisible&&room.phase==='ranking')||guessEditing;
  // Firestore map key order can change on reconnect without any actual game change.
  const sig=JSON.stringify([room.id,room.roundId,room.revision,room.phase,room.picker,room.owner,room.items.map(i=>[i.id,i.text,i.topicId]),room.revealed,ranking?activeOrder():null,busy,prefs.name,prefs.avatar,pickerVisible,guessEditing]);if(sig===signature){if(modalKind==='topics')renderTopics();return;}signature=sig;
  sorter?.destroy();sorter=null;
  const named=room.picker?esc(room.picker):'The ranker',complete=room.items.every(i=>i.text),canGuess=room.guessesEnabled&&!mine()&&!room.revealStarted&&!room.revealed.length&&['ranking','discuss'].includes(room.phase);
  $('#player-controls').hidden=false;$('#player-controls').innerHTML=`<div class="ranker-toolbar">${room.owner?`<span class="current-picker">Ranker: <strong>${avatarIcon(room.pickerAvatar)}${room.picker?named:'Unnamed'}${mine()?' (you)':''}</strong></span>`:''}<div class="ranker-role"><button class="ranker-choice ${mine()?'selected':''}" data-volunteer aria-pressed="${mine()}" ${mine()?'aria-label="Stop being the ranker"':''}><span class="ranker-switch" aria-hidden="true"><span></span></span> I’m the ranker</button><button class="icon ranker-info" data-ranker-info title="What does the ranker do?" aria-label="What does the ranker do?">${glyph('info')}</button></div></div>${!room.owner?`<p class="ranker-reminder"><span>Don’t forget to choose a ranker!</span><span aria-hidden="true">${glyph('corner-right-up')}</span></p>`:''}`;
  const back=room.phase!=='setup'?`<button class="secondary step-back" data-step-back ${!mine()?'disabled title="The ranker controls the shared steps"':''}>${glyph('arrow-left')} Back</button>`:'';
  const waiting=`<button class="primary" disabled>${glyph('hourglass')} Waiting for ${room.picker?named:'the ranker'}</button>`;
  let heading,sub='',actions='',notice='',extras='';
  if(room.phase==='setup'){
   heading='Choose four topics';
   actions=mine()?`<button class="primary" data-claim ${!complete?'disabled':''}>Next: rank privately ${glyph('arrow-right')}</button>`:!room.owner?`<button class="primary" disabled>Next: rank privately ${glyph('arrow-right')}</button>`:waiting;
   extras=!complete?`<div class="topic-source"><button class="secondary" data-draw>${glyph('shuffle')} Four random topics</button></div>`:'';
  }else if(guessEditing){heading='Your guess';sub=`${named}’s favorites, best to least`;notice='<strong>Your guess is separate.</strong><span>Moving these cards won’t change the ranker’s order.</span>';actions=`<button class="secondary" data-cancel-guess>${glyph('arrow-left')} Back</button><button class="primary" data-save-guess>Done: save my guess ${glyph('check')}</button>`;}
  else if(ranking){heading='Rank your favorites';notice='<strong>Only you can see this order.</strong><span>Favorite at the top, least favorite at the bottom.</span>';actions=`${back}<button class="primary" data-ready>Done ranking: discuss ${glyph('arrow-right')}</button>`;}
  else if(room.phase==='ranking'){heading=mine()?'Your ranking is hidden':'Private ranking';notice=`<strong>${mine()?'Your private order is hidden':named+' is ranking'}.</strong><span>${mine()?'Show your order to finish ranking.':canGuess?'Feel free to guess on your page while you wait.':'Discuss your guesses together while you wait.'}</span>`;actions=mine()?`${back}<button class="primary" data-select-picker>Show my ranking ${glyph('eye')}</button>`:`${back}${waiting}`;}
  else if(room.phase==='discuss'){heading='Discuss the order';notice=`<strong>What do you think ${room.picker?named:'the ranker'} chose?</strong><span>${room.revealStarted?'Answers have already been shown; saved guesses are locked.':'Discuss together before revealing the answers.'}</span>`;actions=`${back}${mine()?`<button class="primary" data-start-reveal>Done discussing: reveal ${glyph('arrow-right')}</button>`:waiting}`;}
  else{heading=room.phase==='done'?'The results':'Reveal the order';notice=room.phase==='done'?'<strong>All four preferences are revealed.</strong><span>Go back to the reveal or start with four new topics.</span>':`<strong>${room.revealed.length} of 4 revealed.</strong><span>Start with the least favorite and work up to the favorite.</span>`;actions=`${back}${room.phase==='done'?`<button class="primary" data-next>Next round ${glyph('arrow-right')}</button>`:mine()?`<button class="primary" data-reveal>${room.revealed.length===0?'Reveal least favorite':room.revealed.length===3?'Reveal the favorite':'Reveal next'} ${glyph('sparkles')}</button>`:waiting}`;}
  let body;
  if(['reveal','done'].includes(room.phase))body=`<ol class="topic-list revealed-list">${[0,1,2,3].map(i=>{const id=room.revealed[3-i],item=room.items.find(t=>t.id===id);return `<li class="topic-tile reveal-tile ${item?'revealed':'unrevealed'}" style="--i:${i}" data-rank="${i+1}"><span class="tile-number">${i+1}</span><span class="tile-text">${item?esc(item.text):'…'}</span>${i===0?`<span class="favorite-icon">${glyph('heart')}</span>`:''}</li>`;}).join('')}</ol>`;
  else body=`${ranking?'<div class="rank-label"><span>Most favorite</span><span>↓</span></div>':''}<ol id="topic-list" class="topic-list ${ranking?'ranking-list':''}">${(ranking?activeOrder().map(id=>room.items.find(i=>i.id===id)):room.items).map((item,i)=>tile(item,i,ranking)).join('')}</ol>${ranking?'<div class="rank-label rank-bottom">Least favorite</div>':''}`;
  if(canGuess&&!guessEditing)notice+=`<button class="secondary" data-guess>${glyph('list-ordered')} ${room.guesses?.[device]?'Edit my guess':'Make my guess'}</button>`;
  const guesses=Object.values(room.guesses||{}),results=room.phase==='done'&&room.guessesEnabled?`<section class="guess-results"><h3>How did we guess?</h3>${guesses.length?guesses.map(g=>({...g,correct:g.order.filter((id,i)=>id===room.revealed[3-i]).length})).sort((a,b)=>b.correct-a.correct||a.name.localeCompare(b.name)).map(g=>`<div><span>${avatarIcon(g.avatar)}${esc(g.name)}</span><strong>${g.correct===4?'Perfect match!':g.correct+' / 4'}</strong></div>`).join(''):'<p class="fine">No guesses this round.</p>'}</section>`:'';
  $('#game').innerHTML=`<div class="round-heading"><div><h2>${heading}</h2>${sub?`<p>${sub}</p>`:''}</div><div class="round-heading-tools">${room.phase==='setup'&&complete?`<button class="icon quiet" data-draw title="Draw four new topics" aria-label="Draw four new topics">${glyph('shuffle')}</button>`:''}<button class="icon round-menu" data-round-options aria-label="Round options" title="Round options">${glyph('ellipsis')}</button></div></div>${notice?`<aside class="stage-notice" aria-label="Current step">${notice}</aside>`:''}${extras}${body}<div class="round-actions step-navigation">${actions}</div>${room.guessesEnabled&&['ranking','discuss'].includes(room.phase)?`<p class="fine guess-count">${guesses.length} ${guesses.length===1?'guess':'guesses'} saved${room.revealStarted?' · locked':''}</p>`:''}${results}`;
  if(ranking){const roundId=room.roundId;sorter=new Sortable($('#topic-list'),{animation:M.enabled(prefs,'reorder')?220:0,filter:'button,input,a',preventOnFilter:false,fallbackTolerance:5,ghostClass:'drag-ghost',chosenClass:'drag-chosen',dragClass:'dragging',forceFallback:true,fallbackOnBody:true,onStart(){dragging=true;},onEnd(event){const ids=[...$('#topic-list').children].map(el=>el.dataset.id);if(B.room.roundId===roundId)saveActiveOrder(ids);dragging=false;refreshRankLabels();signature='';requestAnimationFrame(()=>{render();M.pop(prefs,'reorder',$('#topic-list')?.children[event.newIndex]);});}});}
  if(lastPhase!==room.phase){document.body.dataset.phase=room.phase;window.scrollTo(0,0);lastPhase=room.phase;}
  if(busy)document.querySelectorAll('#game button,#player-controls button,.topbar [data-player-name]').forEach(button=>button.disabled=true);
  $('.new-round').disabled=busy;
  icons();if(modalKind==='topics')renderTopics();if(!busy)animateRound(room);
 }
 function animateRound(room){
  const previous=motionSnapshot,sameRound=previous?.roundId===room.roundId;
  motionSnapshot={roundId:room.roundId,phase:room.phase,owner:room.owner,items:room.items.map(item=>item.text),revealed:[...room.revealed]};
  const freshPhase=!previous||!sameRound||previous.phase!==room.phase;
  if(freshPhase){M.animate(prefs,'steps',$('.round-heading'),[{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'none'}]);M.pop(prefs,'steps',$('#progress-steps .current .step-circle'));M.animate(prefs,'steps',$('.stage-notice'),[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}]);}
  if(room.phase==='setup')$('#topic-list').querySelectorAll('.topic-tile').forEach((node,index)=>{if(freshPhase||previous.items[index]!==room.items[index].text)M.animate(prefs,'deal',node,[{opacity:.25,transform:`translateY(18px) rotate(${index%2?4:-4}deg) scale(.96)`},{opacity:1,transform:'none'}],{delay:index*45,duration:440});});
  if(previous&&previous.owner!==room.owner)M.pop(prefs,'ranker',$('[data-volunteer]'));
  if(sameRound)room.revealed.forEach((id,index)=>{if(!previous.revealed.includes(id))M.animate(prefs,'reveal',$(`.reveal-tile[data-rank="${4-index}"]`),[{opacity:.2,transform:'perspective(650px) rotateX(-65deg) scale(.94)'},{opacity:1,transform:'perspective(650px) rotateX(0deg) scale(1)'}],{duration:560});});
  if(sameRound&&room.phase==='done'&&previous.phase!=='done'){celebrate();M.pop(prefs,'reveal',$('.favorite-icon'));}
 }
 function celebrate(){if(!M.enabled(prefs,'confetti'))return;clearTimeout(confettiTimer);$('#confetti').innerHTML=Array.from({length:prefs.animationPreset==='ridiculous'?70:28},(_,i)=>`<span style="--x:${Math.random()*100}%;--delay:${Math.random()*.4}s;--color:${['#ee6c65','#e3b93c','#3a9f91','#5882cc'][i%4]};--spin:${Math.random()*720}deg"></span>`).join('');confettiTimer=setTimeout(()=>$('#confetti').replaceChildren(),2400);}
 function modal(title,html,buttons='',kind='',data=null){modalKind=kind;modalData=data;$('#modal').dataset.kind=kind;$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;$('#modal-footer').innerHTML=`<p id="modal-error" role="alert" hidden></p>${buttons}`;updateEditorViewport();$('#modal').showModal();$('#modal').scrollTop=0;icons();M.animate(prefs,'dialogs',$('#modal'),[{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'none'}],{duration:240});}
 function updateEditorViewport(){const viewport=window.visualViewport;$('#modal').style.setProperty('--editor-height',(viewport?.height||innerHeight)+'px');$('#modal').style.setProperty('--editor-top',(viewport?.offsetTop||0)+'px');}
 window.visualViewport?.addEventListener('resize',updateEditorViewport);
 window.visualViewport?.addEventListener('scroll',updateEditorViewport);
 function close(){modalKind='';modalData=null;$('#modal').close();}
 function playerName(after){modal('Your profile',`<label>Name<input id="player-name" maxlength="50" value="${esc(prefs.name||'')}" autocomplete="given-name"></label><fieldset class="avatar-field"><legend>Avatar (optional)</legend><div class="avatar-options">${Object.entries(avatars).map(([id,a])=>`<button class="avatar-choice" data-avatar="${id}" title="${a.name}" aria-label="${a.name}" aria-pressed="${prefs.avatar===id}"><span aria-hidden="true">${a.icon}</span></button>`).join('')}</div></fieldset>`,`${prefs.name||prefs.avatar?'<button class="text-link danger" data-clear-name>Remove name</button>':''}<button data-close>Cancel</button><button class="primary" data-save-name>Save</button>`,'name',after);$('#player-name').focus({preventScroll:true});}
 function rankerInfo(){modal('What’s a ranker?',`<p>The ranker privately orders the four topics from favorite to least favorite. Everyone else guesses the order before the reveal.</p>`,`<button class="primary" data-close>Got it</button>`,'ranker-info');}
 function releasePicker(){
  const {roundId:expectedRoundId,phase}=B.room;
  const release=async()=>{if(await run(()=>command('release-picker',{device,expectedRoundId,phase,roundId:crypto.randomUUID()})))close();};
  if(phase!=='setup')return confirm('Stop being the ranker?','The four topics will stay. The private ranking, saved guesses and revealed answers will be cleared so someone else can volunteer.',release,'Step down');
  return release();
 }
 async function clearName(){if((mine()||B.room?.guesses?.[device])&&!await run(()=>command('clear-name',{device})))return;prefs.name='';prefs.avatar='';savePrefs();close();signature='';render();}
 function roundOptions(){const room=B.room;modal('Round options',`${room.owner?`<p class="fine">Ranker: ${esc(room.picker||'Unnamed')}${mine()?' (you)':''}</p>`:''}<div class="option-actions"><button data-select-picker>${glyph(mine()?'eye':'hand')} ${mine()?(pickerVisible?'Hide my ranking':'Show my ranking'):room.owner?'Become the ranker':'I’m the ranker'}</button>${mine()&&room.phase==='discuss'?'<button data-rerank>Adjust my ranking</button>':''}${mine()&&room.phase==='reveal'?'<button data-reveal-all>Reveal remaining preferences</button>':''}${room.phase==='setup'?`<label class="toggle">Individual guesses<input id="guessing" type="checkbox" ${room.guessesEnabled?'checked':''}></label>`:''}</div>`,`<button class="primary" data-close>Done</button>`,'round-options');}
 function selectPicker(){
  if(mine()){pickerVisible=!pickerVisible;signature='';render();return;}
  if(!C.text(prefs.name))return playerName(selectPicker);
  const room=B.room,owner=room.owner,roundId=room.roundId;
  const take=async()=>{const ok=await run(()=>command('select-picker',{device,name:prefs.name,avatar:prefs.avatar,takeover:true,expectedOwner:owner,expectedRoundId:roundId,roundId:crypto.randomUUID()}));if(ok){pickerVisible=true;guessEditing=false;saveOrder(B.room.items.map(i=>i.id));close();signature='';render();}};
  if(room.phase!=='setup')return confirm('Become the ranker?',`${room.picker||'Someone else'} is already the ranker. Taking over restarts ranking for these four topics and clears guesses. Their private answers will not be shown.`,take,'Become ranker');
  return run(async()=>{await command('select-picker',{device,name:prefs.name,avatar:prefs.avatar});pickerVisible=true;guessEditing=false;});
 }
 function confirm(title,message,action,label='Continue'){modal(title,`<p>${esc(message)}</p>`,`<button data-close>Cancel</button><button class="primary" data-confirm>${esc(label)}</button>`,'confirm',action);}
 function editItem(index){if(busy||B.room?.phase!=='setup')return;const item=B.room.items[index];if(!item)return;modal(item.text?'Edit Topic':'Add a Topic',`<label>Topic<textarea id="item-text" maxlength="140" rows="3">${esc(item.text)}</textarea></label><details class="item-library"><summary>Pick from library</summary><input id="item-library-search" type="search" aria-label="Search topic library" placeholder="Search topics"><div id="item-library-results" class="item-library-results" role="region" aria-label="Available topics" tabindex="0"></div><p id="item-library-count" class="fine" role="status"></p></details><label class="toggle">Add this to the list of topics<input id="save-topic" type="checkbox"></label>`,`<button data-close>Cancel</button><button class="primary" data-save-item>Save</button>`,'item',{index,revision:B.room.revision});renderItemLibrary();$('#item-text').focus({preventScroll:true});}
 function renderItemLibrary(){
  if(modalKind!=='item'||!$('#item-library-results'))return;
  const query=C.normalized($('#item-library-search').value),used=new Set(B.room.items.filter((_,index)=>index!==modalData.index).map(item=>C.normalized(item.text)));
  const topics=B.topics.filter(topic=>!topic.archived&&C.normalized(topic.text+' '+topic.category).includes(query)).sort((a,b)=>a.text.localeCompare(b.text));
  $('#item-library-results').innerHTML=topics.length?topics.map(topic=>`<button class="item-library-option" data-pick-topic="${esc(topic.id)}" ${used.has(C.normalized(topic.text))?'disabled':''}><span>${esc(topic.text)}<small>${esc(topic.category||'')}</small></span>${used.has(C.normalized(topic.text))?'<small>Already chosen</small>':''}</button>`).join(''):'<p class="empty-library">No matching topics.</p>';
  $('#item-library-count').textContent=topics.length+' topics';
 }
 function topicEditor(id){const topic=B.topics.find(t=>t.id===id);modal(topic?'Edit topic':'Add topic',`<label>Topic<textarea id="topic-text" rows="3" maxlength="140">${esc(topic?.text||'')}</textarea></label><label>Category<input id="topic-category" maxlength="40" value="${esc(topic?.category||'From the table')}"></label>`,`<button data-topics>Back</button><button class="primary" data-save-topic>Save topic</button>`,'topic',topic||{});$('#topic-text').focus();}
 function topics(){topicSearch='';topicFilter='active';modal('Topic library',`<div class="library-tools"><input type="search" id="topic-search" aria-label="Search topics" placeholder="Search topics…"><button class="icon" data-new-topic aria-label="Add topic" title="Add topic">${glyph('plus')}</button></div><div class="library-filters"><button class="text-link" data-topic-filter="active" aria-pressed="true">Available</button><button class="text-link" data-topic-filter="archived" aria-pressed="false">Removed</button><button class="icon" data-export-topics aria-label="Export topic library" title="Export JSON">${glyph('download')}</button></div><div id="topic-results" aria-live="polite"></div>`,`<button class="primary" data-close>Done</button>`,'topics');renderTopics();}
 function renderTopics(){if(!$('#topic-results'))return;const visible=B.topics.filter(t=>Boolean(t.archived)===(topicFilter==='archived')&&C.normalized(t.text+' '+t.category).includes(C.normalized(topicSearch))).sort((a,b)=>a.text.localeCompare(b.text));$('#topic-results').innerHTML=`<p class="library-count">${visible.length} topics</p>${visible.length?visible.map(t=>`<div class="library-row"><div><strong>${esc(t.text)}</strong><small>${esc(t.category)}</small></div>${t.archived?`<button class="icon" data-restore-topic="${esc(t.id)}" aria-label="Restore ${esc(t.text)}" title="Restore">${glyph('rotate-ccw')}</button>`:`<button class="icon" data-edit-topic="${esc(t.id)}" aria-label="Edit ${esc(t.text)}" title="Edit">${glyph('pencil')}</button><button class="icon danger" data-remove-topic="${esc(t.id)}" aria-label="Remove ${esc(t.text)}" title="Remove">${glyph('trash-2')}</button>`}</div>`).join(''):'<p class="empty-library">Nothing here yet.</p>'}`;icons();}
 function tableInfo(){modal('Your table',`<p>Create a separate table for your group in Settings, then share its link with your friends.</p><p class="fine">Separate tables keep games apart, but are not password-protected. Anyone with the link can join.</p><p class="fine">Current table: <strong>${esc(roomId==='table'?'Table':roomId.replaceAll('-',' '))}</strong></p>`,`<button data-close>Close</button><button class="primary" data-table-settings>Go to Settings ${glyph('arrow-right')}</button>`,'table-info');}
 const motionLevels=['off','gentle','playful','ridiculous','custom'],motionNames=['Off','Gentle','Playful','Extra','Custom'];
 function animationSettings(){return `<details id="settings-animations"><summary>Animation settings</summary><div class="motion-heading"><label for="motion">Animation level</label><strong id="motion-name">${motionNames[motionLevels.indexOf(prefs.animationPreset)]}</strong></div><input type="range" id="motion" min="0" max="4" step="1" value="${motionLevels.indexOf(prefs.animationPreset)}" aria-valuetext="${motionNames[motionLevels.indexOf(prefs.animationPreset)]}"><div class="motion-labels" aria-hidden="true">${motionNames.map(name=>`<span>${name}</span>`).join('')}</div><details class="motion-effects"><summary>Customize effects</summary>${Object.entries(M.labels).map(([key,label])=>`<label class="toggle">${label}<input type="checkbox" data-effect="${key}" ${prefs.animations[key]?'checked':''}></label>`).join('')}</details></details>`;}
 function setAnimations(preset,effects){
  clearEffects();prefs.animationPreset=preset;prefs.animations=M.normalize(effects);if(preset==='custom')prefs.customAnimations={...prefs.animations};savePrefs();
  $('#motion').value=motionLevels.indexOf(preset);$('#motion').setAttribute('aria-valuetext',motionNames[motionLevels.indexOf(preset)]);$('#motion-name').textContent=motionNames[motionLevels.indexOf(preset)];document.querySelectorAll('[data-effect]').forEach(input=>input.checked=prefs.animations[input.dataset.effect]);
  sorter?.option('animation',M.enabled(prefs,'reorder')?220:0);
 }
 function settings(section=''){
  modal('Settings',`<details ${section==='tables'?'':'open'}><summary>Appearance</summary><fieldset><legend>Color palette</legend><div class="palettes">${[['design','This design'],['citrus','Citrus'],['ocean','Ocean'],['rose','Rose'],['night','Night']].map(([id,name])=>`<button class="palette" data-palette="${id}" title="${name}" aria-label="${name}" aria-pressed="${prefs.palette===id}"><span></span></button>`).join('')}</div></fieldset></details>${animationSettings()}<details id="settings-tables" ${section==='tables'?'open':''}><summary>Tables</summary><p class="fine">Current table: ${esc(roomId)}${B.live?' · shared live':' · local only'}</p><button class="text-link" data-new-room>Create or join another table</button><button class="text-link" data-reset>Start a new round</button></details><details><summary>Advanced</summary><a href="${new URL('README.md',root)}" target="_blank" rel="noopener">Setup & project notes</a><button class="text-link" data-retry>Reconnect</button><a class="text-link" href="${isSandbox?new URL(location.pathname,location.origin):new URL('?demo=1',location.href)}">${isSandbox?'Return to shared game':'Local testing sandbox'}</a><p class="fine">${B.live?'Public room and topic library. Your unrevealed ranking stays on this device.':'This mode saves on this device only. QR links need the published site and Firebase for other phones.'}</p></details>`,`<button class="primary" data-close>Save</button>`,'settings');
  if(section==='tables'){const summary=$('#settings-tables summary');summary.scrollIntoView({block:'nearest'});summary.focus({preventScroll:true});}
 }
 function share(enlarged=false){const url=location.hostname==='127.0.0.1'||location.hostname==='localhost'?liveShareUrl():shareUrl();modal(enlarged?'Join this table':'Share / Save',`${!enlarged?`<div class="install-heading"><img src="${asset('icon-192.png?v='+iconVersion)}" width="44" height="44" alt=""><div><h3>Save to your phone</h3><details><summary>iPhone & Android</summary><p>iPhone: open in Safari, tap Share, then Add to Home Screen.</p><p>Android: open in Chrome, open the ⋮ menu, then Add to Home screen or Install app.</p></details></div></div>`:''}<div class="qr-large" id="share-qr"></div><label>Room link<input id="share-url" readonly value="${esc(url)}"></label><p class="fine">${B.live?'Everyone joins the same four topics.':'Other phones need Firebase connected and this site published.'}</p>`,`<button data-close>Close</button><button class="primary" data-copy>${glyph('copy')} Copy link</button>`,'share');qr($('#share-qr'),220);}
 async function reveal(all=false){const room=B.room,ids=[...order()].reverse();await run(()=>command('reveal',{device,ids:ids.slice(0,all?4:room.revealed.length+1)}));}
 function previousStep(){
  const room=B.room,phase=room.phase,expectedRoundId=room.roundId;
  const move=async()=>{pickerVisible=true;guessEditing=false;if(await run(()=>command('back',{device,phase,expectedRoundId})))close();};
  if(phase==='ranking')return confirm('Back to topics?','Your topics and ranker stay selected. Private ranking and saved guesses will restart.',move,'Back to topics');
  if(room.revealStarted||room.revealed.length)return confirm('Go back a step?','Previously revealed answers cannot be unseen. They will be hidden again where appropriate, and guesses will stay locked.',move,'Go back');
  return move();
 }
 function navigateRoom(id){const url=new URL(location.href);url.searchParams.set('room',id);location.href=url.href;}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.disabled)return;M.pop(prefs,'taps',button);
  if(button.matches('[data-close]'))return close();
  if(button.matches('[data-draw],[data-shuffle-item]'))return run(()=>command('items',{items:C.draw(B.topics,B.room.items,button.hasAttribute('data-draw')?[0,1,2,3]:[Number(button.dataset.shuffleItem)],B.room.seen)}));
  if(button.matches('[data-edit-item]'))return editItem(Number(button.dataset.editItem));
  if(button.matches('[data-pick-topic]')){if(busy||modalKind!=='item')return;const topic=B.topics.find(topic=>topic.id===button.dataset.pickTopic&&!topic.archived);if(!topic)return;$('#item-text').value=topic.text;modalData.topicId=topic.id;$('#save-topic').checked=false;$('.item-library').open=false;$('.item-library summary').focus({preventScroll:true});return;}
  if(button.matches('[data-save-item]')){const draft={...modalData},text=$('#item-text').value,save=$('#save-topic').checked;const ok=await run(async()=>{if(B.room.phase!=='setup'||B.room.revision!==draft.revision)throw Error('This round changed while you were editing. Close and reopen the topic.');const clean=C.validateTopic(text),items=C.clone(B.room.items),topic=B.topics.find(topic=>topic.id===draft.topicId&&!topic.archived&&topic.text===clean);items[draft.index]={...items[draft.index],text:clean,topicId:topic?.id||null};C.apply(B.room,{type:'items',payload:{items,expectedRevision:B.room.revision}});if(save&&!B.topics.some(t=>!t.archived&&C.normalized(t.text)===C.normalized(clean)))await B.topic({text:clean});await command('items',{items});});if(ok)close();return;}
  if(button.matches('[data-player-name]'))return playerName();
  if(button.matches('[data-avatar]')){const selected=button.getAttribute('aria-pressed')==='true';document.querySelectorAll('button[data-avatar]').forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button&&!selected)));return;}
  if(button.matches('[data-round-options]'))return roundOptions();
  if(button.matches('[data-clear-name]'))return clearName();
  if(button.matches('[data-ranker-info]'))return rankerInfo();
  if(button.matches('[data-volunteer]'))return mine()?releasePicker():selectPicker();
  if(button.matches('[data-select-picker]')){if(modalKind==='round-options')close();return selectPicker();}
  if(button.matches('[data-save-name]')){const name=C.text($('#player-name').value),avatar=$('[data-avatar][aria-pressed="true"]')?.dataset.avatar||'';if(!name&&typeof modalData==='function')return toast('Enter your name first.');const after=modalData;if((mine()||B.room?.guesses?.[device])&&!await run(()=>command('profile',{device,name,avatar})))return;prefs.name=name;prefs.avatar=avatar;savePrefs();close();signature='';render();if(typeof after==='function')after();return;}
  if(button.matches('[data-claim]')){saveOrder(B.room.items.map(i=>i.id));pickerVisible=true;return run(()=>command('claim',{device,name:prefs.name}));}
  if(button.matches('[data-guess]')){const begin=()=>{guessEditing=true;signature='';render();};if(!C.text(prefs.name))return playerName(begin);return begin();}
  if(button.matches('[data-cancel-guess]')){guessEditing=false;signature='';return render();}
  if(button.matches('[data-save-guess]')){if(await run(()=>command('guess',{device,name:prefs.name,avatar:prefs.avatar,order:guessOrder()}))){guessEditing=false;signature='';render();}return;}
  if(button.matches('[data-ready]'))return run(()=>command('ready',{device}));
  if(button.matches('[data-step-back]'))return previousStep();
  if(button.matches('[data-start-reveal]'))return run(()=>command('start-reveal',{device}));
  if(button.matches('[data-rerank]')){close();pickerVisible=true;return run(()=>command('rerank',{device}));}
  if(button.matches('[data-move]')){const ids=activeOrder(),index=Number(button.dataset.move),to=index+Number(button.dataset.direction);if(to>=0&&to<4){[ids[index],ids[to]]=[ids[to],ids[index]];saveActiveOrder(ids);sorter?.sort(ids,M.enabled(prefs,'reorder'));refreshRankLabels();signature='';M.pop(prefs,'reorder',$('#topic-list').children[to]);}return;}
  if(button.matches('[data-reveal]'))return reveal();if(button.matches('[data-reveal-all]')){close();return reveal(true);}
  if(button.matches('[data-next]'))return run(()=>command('reset',{roundId:crypto.randomUUID()}));
  if(button.matches('[data-reset]'))return confirm('Start a new round?','This clears these four topics and any private ranking. Your topic library stays.',async()=>{if(await run(()=>command('reset',{roundId:crypto.randomUUID()})))close();});
  if(button.matches('[data-confirm]')){const action=modalData;return action();}
  if(button.matches('[data-settings]'))return settings();if(button.matches('[data-topics]'))return topics();
  if(button.matches('[data-new-topic]'))return topicEditor();if(button.matches('[data-edit-topic]'))return topicEditor(button.dataset.editTopic);
  if(button.matches('[data-save-topic]')){const draft={...modalData,text:$('#topic-text').value,category:$('#topic-category').value};if(await run(()=>B.topic(draft)))topics();return;}
  if(button.matches('[data-remove-topic]')){const topic=B.topics.find(t=>t.id===button.dataset.removeTopic);return confirm('Remove this topic?',topic.text+' will stop appearing in future draws. Existing rounds won’t change.',async()=>{if(await run(()=>B.topic({...topic,archived:true})))topics();});}
  if(button.matches('[data-restore-topic]')){const topic=B.topics.find(t=>t.id===button.dataset.restoreTopic);return run(()=>B.topic({...topic,archived:false}));}
  if(button.matches('[data-topic-filter]')){topicFilter=button.dataset.topicFilter;document.querySelectorAll('[data-topic-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));return renderTopics();}
  if(button.matches('[data-export-topics]')){const url=URL.createObjectURL(new Blob([B.exportTopics()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='preferences-topics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  if(button.matches('[data-share]'))return share();if(button.matches('[data-qr]'))return share(true);
  if(button.matches('[data-copy]')){try{await navigator.clipboard.writeText($('#share-url').value);button.textContent='Copied';}catch{$('#share-url').select();toast('Select the link to copy it.');}return;}
  if(button.matches('[data-palette]')){prefs.palette=button.dataset.palette;savePrefs();document.querySelectorAll('button[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));return;}
  if(button.matches('[data-room]'))return tableInfo();
  if(button.matches('[data-table-settings]'))return settings('tables');
  if(button.matches('[data-new-room]'))return modal('Another table',`<label>Table name<input id="new-room" maxlength="40" placeholder="friday-dinner" autocomplete="off"></label>`,`<button data-close>Cancel</button><button class="primary" data-join-room>Open table</button>`,'room');
  if(button.matches('[data-join-room]')){const id=C.text($('#new-room').value).toLowerCase().replace(/\s+/g,'-');if(!/^[a-z0-9-]{1,40}$/.test(id))return toast('Use letters, numbers and hyphens for the room name.');return navigateRoom(id);}
  if(button.matches('[data-retry]')){close();return connect();}
 });
 document.addEventListener('input',event=>{if(event.target.id==='topic-search'){topicSearch=event.target.value;renderTopics();}if(event.target.id==='item-library-search')renderItemLibrary();if(event.target.id==='motion'){const preset=motionLevels[Number(event.target.value)];setAnimations(preset,preset==='custom'?prefs.customAnimations:M.presets[preset]);}});
 document.addEventListener('change',event=>{if(event.target.matches('[data-effect]'))setAnimations('custom',{...prefs.animations,[event.target.dataset.effect]:event.target.checked});if(event.target.id==='guessing')run(()=>command('guessing',{enabled:event.target.checked}));});
 $('#modal').addEventListener('click',event=>{if(event.target!==$('#modal'))return;const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 $('#modal').addEventListener('cancel',()=>{modalKind='';modalData=null;});
 async function connect(){try{await B.open(roomId);}catch(error){B.status='error';B.error=error.message;render();}}
 const manifestUrl=new URL(shareUrl()),scope=new URL('./',manifestUrl).pathname;
 const manifest={id:manifestUrl.pathname+manifestUrl.search,name:'Preferences · '+roomId,short_name:'Preferences',start_url:manifestUrl.href,scope,display:'standalone',background_color:'#f5f6f2',theme_color:'#377765',icons:[{src:asset('icon-192.png?v='+iconVersion),sizes:'192x192',type:'image/png'},{src:asset('icon-512.png?v='+iconVersion),sizes:'512x512',type:'image/png'}]};
 $('link[rel=manifest]').href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'}));
 B.subscribe(render);qr($('#footer-qr'),68);icons();connect();
 window.PreferencesTest={getPublic:()=>C.clone(B.room),getTopics:()=>C.clone(B.topics),getPrivate:order,device,roomId};
})();

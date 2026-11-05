(() => {
 'use strict';
 const C=PreferencesCore,B=PreferencesBackend,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const root=new URL('../',document.currentScript.src),asset=name=>new URL('shared/'+name,root).href;
 const params=new URL(location.href).searchParams,roomId=/^[a-z0-9-]{1,40}$/.test(params.get('room')||'')?params.get('room'):'table';
 const isSandbox=params.get('demo')==='1',iconVersion='20261105-horizontal';
 const prefKey='preferences-ui-v1',deviceKey='preferences-device-v1';
 let prefs;try{prefs=JSON.parse(localStorage.getItem(prefKey)||'{}');}catch{prefs={};}
 prefs={palette:'design',motion:'playful',...prefs};
 if(!['design','citrus','ocean','rose','night'].includes(prefs.palette))prefs.palette='design';
 if(!['off','gentle','playful','ridiculous'].includes(prefs.motion))prefs.motion='playful';
 let device=localStorage.getItem(deviceKey);if(!device){device=crypto.randomUUID();localStorage.setItem(deviceKey,device);}
 let busy=false,sorter=null,signature='',lastPhase='',topicSearch='',topicFilter='active',modalKind='',modalData=null,noticeTimer;
 const icons=()=>lucide.createIcons(),glyph=(name,label)=>`<i data-lucide="${name}"${label?` aria-label="${label}"`:''}></i>`;
 const savePrefs=()=>{localStorage.setItem(prefKey,JSON.stringify(prefs));document.body.dataset.palette=prefs.palette;document.body.dataset.motion=prefs.motion;};savePrefs();
 const key=()=>`preferences-private-${isSandbox?'sandbox':PREFERENCES_CONFIG.environment}-${roomId}-${B.room.roundId}`;
 function order(){try{return C.privateOrder(B.room,JSON.parse(localStorage.getItem(key())||'null'));}catch{return B.room.items.map(i=>i.id);}}
 function saveOrder(ids){localStorage.setItem(key(),JSON.stringify(ids));}
 function refreshRankLabels(){[...$('#topic-list').children].forEach((el,i)=>{el.querySelector('.tile-number').textContent=i+1;el.querySelectorAll('[data-move]').forEach(button=>{button.dataset.move=i;button.disabled=Number(button.dataset.direction)<0?i===0:i===3;});});}
 const mine=()=>B.room?.owner===device;
 const shareUrl=()=>{const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',roomId);return url.href;};
 const liveShareUrl=()=>{const url=new URL(PREFERENCES_CONFIG.liveUrl);url.searchParams.set('room',roomId);return url.href;};
 function qr(node,size){node.replaceChildren();new QRCode(node,{text:location.hostname==='127.0.0.1'||location.hostname==='localhost'?liveShareUrl():shareUrl(),width:size,height:size,colorDark:'#15262c',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
 function toast(message){clearTimeout(noticeTimer);const target=$('#modal').open?$('#modal-error'):$('#toast');if(!target)return;target.textContent=message;target.hidden=false;noticeTimer=setTimeout(()=>{if(target.id==='toast')target.hidden=true;},6500);}
 async function run(fn){if(busy)return false;busy=true;renderStatus();document.querySelectorAll('#game button').forEach(b=>b.disabled=true);try{await fn();return true;}catch(error){toast(error.code==='permission-denied'?'Database access is blocked. Check Firebase rules, then retry.':error.message);return false;}finally{busy=false;signature='';render();}}
 async function command(type,payload={}){return B.command({type,payload:{...payload,expectedRevision:B.room.revision}});}
 function renderStatus(){const state=B.status;$('#connection').className='connection '+state;$('#connection').textContent=busy?'Saving…':state==='live'?'Live with your table':state==='sandbox'?'Sandbox · only on this device':state==='local'?'On this device · sharing is not connected':state==='reconnecting'?'Reconnecting with your table…':state==='offline'?'Offline · shared changes need a connection':state==='error'?'Not connected · '+(B.error||'retry in Settings'):'Connecting…';}
 function renderProgress(){
  $('.new-round').disabled=busy||!B.room;
  const phase=B.room?.phase,index=({setup:0,ranking:1,discuss:2,reveal:3,done:3})[phase]??0;
  const list=$('#progress-steps');list.style.setProperty('--stage',index);
  list.querySelectorAll('li').forEach((step,i)=>{step.classList.toggle('complete',i<index||phase==='done');step.classList.toggle('current',Boolean(phase)&&i===index);if(phase&&i===index)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
 }
 function tile(item,index,ranking=false){
  const empty=!item.text;
  return `<li class="topic-tile ${empty?'empty':''}" data-id="${esc(item.id)}" style="--i:${index}"><span class="tile-number">${ranking?index+1:String.fromCharCode(65+index)}</span><span class="tile-text">${empty?'Choose a topic':esc(item.text)}</span>${ranking?`<div class="rank-tools"><button class="icon" data-move="${index}" data-direction="-1" aria-label="Move ${esc(item.text)} up" ${index===0?'disabled':''}>${glyph('chevron-up')}</button><button class="icon" data-move="${index}" data-direction="1" aria-label="Move ${esc(item.text)} down" ${index===3?'disabled':''}>${glyph('chevron-down')}</button><button class="icon drag-handle" aria-label="Drag ${esc(item.text)} to rank" title="Drag to rank">${glyph('grip-horizontal')}</button></div>`:B.room.phase==='setup'?`<div class="tile-tools"><button class="icon" data-edit-item="${index}" aria-label="${empty?'Enter a topic':'Edit '+esc(item.text)}" title="Edit topic">${glyph(empty?'plus':'pencil')}</button><button class="icon" data-shuffle-item="${index}" aria-label="Randomize topic ${index+1}" title="Random topic">${glyph('shuffle')}</button></div>`:''}</li>`;
 }
 function render(){
  renderStatus();renderProgress();$('#room-label').textContent=roomId==='table'?'Table':roomId.replaceAll('-',' ');
  if(!B.room){$('#game').innerHTML=`<div class="loading-bars" aria-label="Loading"><span></span><span></span><span></span><span></span></div>${B.status==='error'?'<button data-retry>Retry connection</button>':''}`;return;}
  const room=B.room,ranking=mine()&&room.phase==='ranking';
  // Firestore map key order can change on reconnect without any actual game change.
  const sig=JSON.stringify([room.id,room.roundId,room.revision,room.phase,room.picker,room.owner,room.items.map(i=>[i.id,i.text,i.topicId]),room.revealed,ranking?order():null,busy]);if(sig===signature){if(modalKind==='topics')renderTopics();return;}signature=sig;
  sorter?.destroy();sorter=null;
  const named=room.picker?esc(room.picker):'The Star';
  let heading,sub,actions='';
  if(room.phase==='setup'){
   heading='Pick four.';sub='';actions=`<button class="secondary" data-draw>${glyph('shuffle')} Four random topics</button><button class="primary" data-claim ${room.items.some(i=>!i.text)?'disabled':''}>${glyph('sparkles')} I’m the Star</button>`;
  }else if(ranking){heading='Your favorites, in order.';sub='Only on your phone';actions=`<button class="primary" data-ready>${glyph('eye-off')} Ready · hide my ranking</button>`;}
  else if(room.phase==='ranking'){heading=`${named} is ranking.`;sub='Talk amongst yourselves.';}
  else if(room.phase==='discuss'){heading='What’s the order?';sub=mine()?'Your ranking is hidden.':'Make your case.';if(mine())actions=`<button class="primary" data-reveal>${glyph('sparkles')} Reveal least favorite</button><button class="text-link" data-rerank>Adjust my ranking</button>`;}
  else{heading=room.phase==='done'?'Well, there it is.':'The plot thickens.';sub=room.picker?`${named}’s preferences`:'';if(mine()&&room.phase!=='done')actions=`<button class="primary" data-reveal>${glyph('sparkles')} ${room.revealed.length===3?'Reveal the favorite':'Reveal next'}</button><button class="text-link" data-reveal-all>Reveal all</button>`;if(room.phase==='done')actions=`<button class="primary" data-next>${glyph('rotate-cw')} Next round</button>`;}
  let body;
  if(['reveal','done'].includes(room.phase))body=`<ol class="topic-list revealed-list">${[0,1,2,3].map(i=>{const id=room.revealed[3-i],item=room.items.find(t=>t.id===id);return `<li class="topic-tile reveal-tile ${item?'revealed':'unrevealed'}" style="--i:${i}" data-rank="${i+1}"><span class="tile-number">${i+1}</span><span class="tile-text">${item?esc(item.text):'…'}</span>${i===0?`<span class="favorite-icon">${glyph('heart')}</span>`:''}</li>`;}).join('')}</ol>`;
  else body=`${ranking?'<div class="rank-label"><span>Most favorite</span><span>↓</span></div>':''}<ol id="topic-list" class="topic-list ${ranking?'ranking-list':''}">${(ranking?order().map(id=>room.items.find(i=>i.id===id)):room.items).map((item,i)=>tile(item,i,ranking)).join('')}</ol>${ranking?'<div class="rank-label rank-bottom">Least favorite</div>':''}`;
  $('#game').innerHTML=`<div class="round-heading"><div><h2>${heading}</h2>${sub?`<p>${sub}</p>`:''}</div></div>${room.phase==='setup'?`<button class="picker-name text-link" data-picker>${room.picker?named+'’s turn':'Who’s the Star? (optional)'} ${glyph('pencil')}</button>`:''}${body}<div class="round-actions">${actions}</div>`;
  if(ranking)sorter=new Sortable($('#topic-list'),{animation:220,handle:'.drag-handle',ghostClass:'drag-ghost',chosenClass:'drag-chosen',dragClass:'dragging',forceFallback:true,fallbackOnBody:true,onEnd(){const ids=[...$('#topic-list').children].map(el=>el.dataset.id);saveOrder(ids);refreshRankLabels();signature='';}});
  if(lastPhase!==room.phase){document.body.dataset.phase=room.phase;if(room.phase==='done'&&lastPhase)celebrate();lastPhase=room.phase;}
  if(busy)$('#game').querySelectorAll('button').forEach(button=>button.disabled=true);
  $('.new-round').disabled=busy;
  icons();if(modalKind==='topics')renderTopics();
 }
 function celebrate(){if(prefs.motion==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;$('#confetti').innerHTML=Array.from({length:prefs.motion==='ridiculous'?70:24},(_,i)=>`<span style="--x:${Math.random()*100}%;--delay:${Math.random()*.4}s;--color:${['#ee6c65','#e3b93c','#3a9f91','#5882cc'][i%4]};--spin:${Math.random()*720}deg"></span>`).join('');setTimeout(()=>$('#confetti').replaceChildren(),2400);}
 function modal(title,html,buttons='',kind='',data=null){modalKind=kind;modalData=data;$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;$('#modal-footer').innerHTML=`<p id="modal-error" role="alert" hidden></p>${buttons}`;$('#modal').showModal();$('#modal').scrollTop=0;icons();}
 function close(){modalKind='';modalData=null;$('#modal').close();}
 function confirm(title,message,action){modal(title,`<p>${esc(message)}</p>`,`<button data-close>Cancel</button><button class="primary" data-confirm>Continue</button>`,'confirm',action);}
 function editItem(index){const item=B.room.items[index];modal('Edit topic',`<label>Topic<textarea id="item-text" maxlength="140" rows="3" placeholder="Sleeping with your socks on">${esc(item.text)}</textarea></label><label class="toggle">Save to the topic library<input id="save-topic" type="checkbox"></label>`,`<button data-close>Cancel</button><button class="primary" data-save-item>Save</button>`,'item',{index,revision:B.room.revision});$('#item-text').focus();}
 function topicEditor(id){const topic=B.topics.find(t=>t.id===id);modal(topic?'Edit topic':'Add topic',`<label>Topic<textarea id="topic-text" rows="3" maxlength="140">${esc(topic?.text||'')}</textarea></label><label>Category<input id="topic-category" maxlength="40" value="${esc(topic?.category||'From the table')}"></label>`,`<button data-topics>Back</button><button class="primary" data-save-topic>Save topic</button>`,'topic',topic||{});$('#topic-text').focus();}
 function topics(){topicSearch='';topicFilter='active';modal('Topic library',`<div class="library-tools"><input type="search" id="topic-search" aria-label="Search topics" placeholder="Search topics…"><button class="icon" data-new-topic aria-label="Add topic" title="Add topic">${glyph('plus')}</button></div><div class="library-filters"><button class="text-link" data-topic-filter="active" aria-pressed="true">Available</button><button class="text-link" data-topic-filter="archived" aria-pressed="false">Removed</button><button class="icon" data-export-topics aria-label="Export topic library" title="Export JSON">${glyph('download')}</button></div><div id="topic-results" aria-live="polite"></div>`,`<button class="primary" data-close>Done</button>`,'topics');renderTopics();}
 function renderTopics(){if(!$('#topic-results'))return;const visible=B.topics.filter(t=>Boolean(t.archived)===(topicFilter==='archived')&&C.normalized(t.text+' '+t.category).includes(C.normalized(topicSearch))).sort((a,b)=>a.text.localeCompare(b.text));$('#topic-results').innerHTML=`<p class="library-count">${visible.length} topics</p>${visible.length?visible.map(t=>`<div class="library-row"><div><strong>${esc(t.text)}</strong><small>${esc(t.category)}</small></div>${t.archived?`<button class="icon" data-restore-topic="${esc(t.id)}" aria-label="Restore ${esc(t.text)}" title="Restore">${glyph('rotate-ccw')}</button>`:`<button class="icon" data-edit-topic="${esc(t.id)}" aria-label="Edit ${esc(t.text)}" title="Edit">${glyph('pencil')}</button><button class="icon danger" data-remove-topic="${esc(t.id)}" aria-label="Remove ${esc(t.text)}" title="Remove">${glyph('trash-2')}</button>`}</div>`).join(''):'<p class="empty-library">Nothing here yet.</p>'}`;icons();}
 function settings(){modal('Settings',`<details open><summary>Appearance</summary><fieldset><legend>Color palette</legend><div class="palettes">${[['design','This design'],['citrus','Citrus'],['ocean','Ocean'],['rose','Rose'],['night','Night']].map(([id,name])=>`<button class="palette" data-palette="${id}" title="${name}" aria-label="${name}" aria-pressed="${prefs.palette===id}"><span></span></button>`).join('')}</div></fieldset><label class="motion-label">Animations<select id="motion">${['off','gentle','playful','ridiculous'].map(id=>`<option value="${id}" ${prefs.motion===id?'selected':''}>${id[0].toUpperCase()+id.slice(1)}</option>`).join('')}</select></label></details><details><summary>Room</summary><p class="fine">${esc(roomId)}${B.live?' · shared live':' · local only'}</p><button class="text-link" data-new-room>Create or join another room</button><button class="text-link" data-reset>Start a new round</button></details><details><summary>Advanced</summary><a href="${new URL('README.md',root)}" target="_blank" rel="noopener">Setup & project notes</a><button class="text-link" data-retry>Reconnect</button><a class="text-link" href="${isSandbox?new URL(location.pathname,location.origin):new URL('?demo=1',location.href)}">${isSandbox?'Return to shared game':'Local testing sandbox'}</a><p class="fine">${B.live?'Public room and topic library. Your unrevealed ranking stays on this device.':'This mode saves on this device only. QR links need the published site and Firebase for other phones.'}</p></details>`,`<button class="primary" data-close>Save</button>`,'settings');}
 function share(enlarged=false){const url=location.hostname==='127.0.0.1'||location.hostname==='localhost'?liveShareUrl():shareUrl();modal(enlarged?'Join this table':'Share / Save',`${!enlarged?`<div class="install-heading"><img src="${asset('icon-192.png?v='+iconVersion)}" width="44" height="44" alt=""><div><h3>Save to your phone</h3><details><summary>iPhone & Android</summary><p>iPhone: open in Safari, tap Share, then Add to Home Screen.</p><p>Android: open in Chrome, open the ⋮ menu, then Add to Home screen or Install app.</p></details></div></div>`:''}<div class="qr-large" id="share-qr"></div><label>Room link<input id="share-url" readonly value="${esc(url)}"></label><p class="fine">${B.live?'Everyone joins the same four topics.':'Other phones need Firebase connected and this site published.'}</p>`,`<button data-close>Close</button><button class="primary" data-copy>${glyph('copy')} Copy link</button>`,'share');qr($('#share-qr'),220);}
 async function reveal(all=false){const room=B.room,ids=[...order()].reverse();await run(()=>command('reveal',{device,ids:ids.slice(0,all?4:room.revealed.length+1)}));}
 function navigateRoom(id){const url=new URL(location.href);url.searchParams.set('room',id);location.href=url.href;}
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('[data-close]'))return close();
  if(button.matches('[data-draw],[data-shuffle-item]'))return run(()=>command('items',{items:C.draw(B.topics,B.room.items,button.hasAttribute('data-draw')?[0,1,2,3]:[Number(button.dataset.shuffleItem)],B.room.seen)}));
  if(button.matches('[data-edit-item]'))return editItem(Number(button.dataset.editItem));
  if(button.matches('[data-save-item]')){const draft=modalData,text=$('#item-text').value,save=$('#save-topic').checked;const ok=await run(async()=>{if(B.room.phase!=='setup'||B.room.revision!==draft.revision)throw Error('This round changed while you were editing. Close and reopen the topic.');const clean=C.validateTopic(text),items=C.clone(B.room.items);items[draft.index]={...items[draft.index],text:clean,topicId:null};C.apply(B.room,{type:'items',payload:{items,expectedRevision:B.room.revision}});if(save&&!B.topics.some(t=>!t.archived&&C.normalized(t.text)===C.normalized(clean)))await B.topic({text:clean});await command('items',{items});});if(ok)close();return;}
  if(button.matches('[data-picker]'))return modal('Whose turn?',`<label>Name<input id="picker-name" maxlength="50" value="${esc(B.room.picker)}" autocomplete="off" placeholder="Optional"></label>`,`<button data-close>Cancel</button><button class="primary" data-save-picker>Save</button>`,'picker');
  if(button.matches('[data-save-picker]')){const name=$('#picker-name').value;if(await run(()=>command('picker',{name})))close();return;}
  if(button.matches('[data-claim]')){saveOrder(B.room.items.map(i=>i.id));return run(()=>command('claim',{device}));}
  if(button.matches('[data-ready]'))return run(()=>command('ready',{device}));
  if(button.matches('[data-rerank]'))return run(()=>command('rerank',{device}));
  if(button.matches('[data-move]')){const ids=order(),index=Number(button.dataset.move),to=index+Number(button.dataset.direction);if(to>=0&&to<4){[ids[index],ids[to]]=[ids[to],ids[index]];saveOrder(ids);sorter?.sort(ids,true);refreshRankLabels();signature='';}return;}
  if(button.matches('[data-reveal]'))return reveal();if(button.matches('[data-reveal-all]'))return reveal(true);
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
  if(button.matches('[data-room]'))return settings();
  if(button.matches('[data-new-room]'))return modal('Another table',`<label>Room name<input id="new-room" maxlength="40" placeholder="friday-dinner" autocomplete="off"></label>`,`<button data-close>Cancel</button><button class="primary" data-join-room>Open room</button>`,'room');
  if(button.matches('[data-join-room]')){const id=C.text($('#new-room').value).toLowerCase().replace(/\s+/g,'-');if(!/^[a-z0-9-]{1,40}$/.test(id))return toast('Use letters, numbers and hyphens for the room name.');return navigateRoom(id);}
  if(button.matches('[data-retry]')){close();return connect();}
 });
 document.addEventListener('input',event=>{if(event.target.id==='topic-search'){topicSearch=event.target.value;renderTopics();}});
 document.addEventListener('change',event=>{if(event.target.id==='motion'){prefs.motion=event.target.value;savePrefs();}});
 $('#modal').addEventListener('click',event=>{if(event.target!==$('#modal'))return;const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 $('#modal').addEventListener('cancel',()=>{modalKind='';modalData=null;});
 async function connect(){try{await B.open(roomId);}catch(error){B.status='error';B.error=error.message;render();}}
 const manifestUrl=new URL(shareUrl()),scope=new URL('./',manifestUrl).pathname;
 const manifest={id:manifestUrl.pathname+manifestUrl.search,name:'Preferences · '+roomId,short_name:'Preferences',start_url:manifestUrl.href,scope,display:'standalone',background_color:'#f5f6f2',theme_color:'#377765',icons:[{src:asset('icon-192.png?v='+iconVersion),sizes:'192x192',type:'image/png'},{src:asset('icon-512.png?v='+iconVersion),sizes:'512x512',type:'image/png'}]};
 $('link[rel=manifest]').href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'}));
 B.subscribe(render);qr($('#footer-qr'),68);icons();connect();
 window.PreferencesTest={getPublic:()=>C.clone(B.room),getTopics:()=>C.clone(B.topics),getPrivate:order,device,roomId};
})();

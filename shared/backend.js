(() => {
 'use strict';
 const C=PreferencesCore,config=PREFERENCES_CONFIG,sandbox=new URL(location.href).searchParams.get('demo')==='1';
 const environment=sandbox?'sandbox':config.environment||'main';
 if(!/^[a-z0-9-]{1,60}$/.test(environment))throw Error('Invalid database environment.');
 const live=Boolean(config.firebase)&&!sandbox,storageKey='preferences-'+environment+'-shared-v1',cacheKey='preferences-'+environment+'-read-cache-v2';
 let emit=()=>{},roomId='table',unsubscribers=[],context=null,contextPromise=null,opening=null,generation=0,channel=null,hideTimer,connectionTimer;
 const B=window.PreferencesBackend={room:null,topics:[],live,status:'loading',error:'',errorCode:'',subscribe:fn=>emit=fn};
 const changed=()=>emit();
 const topicsUrl=new URL('topics.json',document.currentScript.src);
 const readJSON=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
 const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
 let cache=readJSON(cacheKey)||{rooms:{},topics:[],retryAfter:0};
 if(!cache.rooms||typeof cache.rooms!=='object')cache.rooms={};
 if(!Array.isArray(cache.topics))cache.topics=[];
 let seedPromise;
 function seedTopics(){return seedPromise||=(async()=>{const response=await fetch(topicsUrl);if(!response.ok)throw Error('Could not load starter topics.');const groups=await response.json();return Object.entries(groups).flatMap(([category,labels])=>labels.map((text,i)=>({id:'seed-'+category.toLowerCase().replace(/[^a-z]+/g,'-')+'-'+i,text,category,archived:false,rev:1})));})().catch(error=>{seedPromise=null;throw error;});}
 function remember(){
  if(B.room){cache.rooms[B.room.id]=B.room;const ids=Object.keys(cache.rooms);while(ids.length>12)delete cache.rooms[ids.shift()];}
  cache.topics=B.topics;
  writeJSON(cacheKey,cache);
 }
 function stopListeners(){clearTimeout(connectionTimer);unsubscribers.forEach(fn=>fn());unsubscribers=[];}
 B.reportError=error=>{
  generation++;opening=null;stopListeners();B.errorCode=error.code||'';
  if(B.errorCode.endsWith('resource-exhausted')||/quota exceeded/i.test(error.message||'')){
   B.status='quota';B.error='Firestore quota reached. Shared changes are paused. Try Reconnect in Settings later.';cache.retryAfter=Date.now()+15*60*1000;
  }else{B.status='error';B.error=error.message||'Could not connect.';}
  remember();changed();
 };
 function requireLive(){if(B.status!=='live'){const error=Error(B.status==='quota'?B.error:'Not connected. Reconnect before saving shared changes.');error.code=B.status==='quota'?'resource-exhausted':'unavailable';throw error;}}
 function localRead(){return readJSON(storageKey)||{topics:[],rooms:{}};}
 function localUpdate(fn){const perform=async()=>{const state=localRead(),result=fn(state);localStorage.setItem(storageKey,JSON.stringify(state));localRefresh();channel?.postMessage('changed');return result;};return navigator.locks?navigator.locks.request(storageKey,perform):perform();}
 function localRefresh(){const state=localRead();B.room=state.rooms[roomId];B.topics=state.topics;B.status=sandbox?'sandbox':'local';changed();}
 async function firebase(){
  const [app,sdk]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')]);
  const instance=app.initializeApp(config.firebase,'preferences-'+environment),db=sdk.getFirestore(instance);
  if(config.firestoreEmulator){
   const {host,port}=config.firestoreEmulator;
   if(!['127.0.0.1','localhost','::1'].includes(host)||!config.firebase.projectId.startsWith('demo-'))throw Error('Tests require a loopback emulator and a demo project.');
   sdk.connectFirestoreEmulator(db,host,port);
  }
  return {sdk,db,library:sdk.doc(db,'preferences',environment,'library','current'),legacyTopics:sdk.collection(db,'preferences',environment,'topics'),rooms:sdk.collection(db,'preferences',environment,'rooms')};
 }
 function libraryTopics(data){if(!data||data.schema!==2||!data.topics||typeof data.topics!=='object'||Array.isArray(data.topics))throw Error('The shared topic library is invalid.');return Object.entries(data.topics).map(([id,topic])=>({...topic,id}));}
 async function createLibrary({sdk,db,library,legacyTopics}){
  // Read legacy records only when the new single-document library does not exist.
  const legacy=await sdk.getDocsFromServer(legacyTopics),topics=legacy.empty?await seedTopics():legacy.docs.map(doc=>({...doc.data(),id:doc.id}));
  const entries=Object.fromEntries(topics.map(topic=>[topic.id,topic]));
  await sdk.runTransaction(db,async tx=>{if((await tx.get(library)).exists())return;tx.set(library,{schema:2,revision:1,topics:entries,updatedAt:sdk.serverTimestamp()});});
 }
 B.open=(id,{force=false}={})=>{
  clearTimeout(hideTimer);
  if(opening&&id===roomId)return opening;
  if(live&&id===roomId&&unsubscribers.length&&B.status==='live'&&!force)return Promise.resolve();
  if(live){cache=readJSON(cacheKey)||cache;if(cache.rooms?.[id]&&!B.room)B.room=cache.rooms[id];if(!B.topics.length)B.topics=cache.topics||[];}
  if(B.room?.id!==id)B.room=live?cache.rooms?.[id]||null:null;
  roomId=id;
  if(live&&!force&&cache.retryAfter>Date.now()){B.status='quota';B.error='Firestore quota reached. Shared changes are paused. Try Reconnect in Settings later.';changed();return Promise.resolve();}
  if(force){cache.retryAfter=0;writeJSON(cacheKey,cache);}
  const session=++generation;stopListeners();B.status=navigator.onLine===false?'offline':B.room?'reconnecting':'loading';changed();
  if(live&&navigator.onLine===false)return Promise.resolve();
  if(live)connectionTimer=setTimeout(()=>{if(session===generation)B.reportError(Object.assign(Error('Firestore did not confirm the connection. Shared changes are paused. Reconnect later.'),{code:'deadline-exceeded'}));},15000);
  const work=(async()=>{
   if(!live){
    const topics=await seedTopics();await localUpdate(state=>{if(!state.initialized){state.topics=topics;state.initialized=true;}state.rooms[id]||=C.initial(id,crypto.randomUUID());state.rooms[id]=C.resetExpired(state.rooms[id],crypto.randomUUID());if(C.activityMillis(state.rooms[id])===null)state.rooms[id].lastActivityAt=Date.now();});
    channel||=new BroadcastChannel(storageKey);channel.onmessage=localRefresh;return;
   }
   if(!context){contextPromise||=firebase().catch(error=>{contextPromise=null;throw error;});context=await contextPromise;}
   if(session!==generation||document.hidden)return;
   const {sdk,db,library,rooms}=context,ref=sdk.doc(rooms,id);
   let roomReady=false,libraryReady=false,roomPending=false,libraryPending=false,expiryPending=false;
   const ready=()=>{B.status=roomReady&&libraryReady?'live':'reconnecting';if(B.status==='live'){clearTimeout(connectionTimer);B.error='';B.errorCode='';cache.retryAfter=0;remember();}changed();};
   const failed=error=>{if(session===generation)B.reportError(error);};
   const cached=()=>{if(B.room){B.status=navigator.onLine===false?'offline':'reconnecting';changed();}};
   unsubscribers.push(sdk.onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
    if(session!==generation)return;
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites){if(!snapshot.metadata.hasPendingWrites)cached();return;}
    if(!snapshot.exists()){
     if(!roomPending){roomPending=true;sdk.runTransaction(db,async tx=>{if(!(await tx.get(ref)).exists())tx.set(ref,{...C.initial(id,crypto.randomUUID()),lastActivityAt:sdk.serverTimestamp()});}).catch(failed).finally(()=>{roomPending=false;});}return;
    }
    const next=snapshot.data();
    if(C.expired(next)||C.activityMillis(next)===null){
     if(!expiryPending){expiryPending=true;sdk.runTransaction(db,async tx=>{const current=await tx.get(ref);if(!current.exists())return;const source=current.data(),reset=C.resetExpired(source,crypto.randomUUID());if(reset!==source)tx.set(ref,{...reset,lastActivityAt:sdk.serverTimestamp()});else if(C.activityMillis(source)===null)tx.update(ref,{lastActivityAt:sdk.serverTimestamp()});}).catch(failed).finally(()=>{expiryPending=false;});}return;
    }
    if(!B.room||next.revision>=B.room.revision)B.room=next;roomReady=true;ready();
   },failed));
   unsubscribers.push(sdk.onSnapshot(library,{includeMetadataChanges:true},snapshot=>{
    if(session!==generation)return;
    if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites){if(!snapshot.metadata.hasPendingWrites)cached();return;}
    if(!snapshot.exists()){
     if(!libraryPending){libraryPending=true;createLibrary(context).catch(failed).finally(()=>{libraryPending=false;});}return;
    }
    try{B.topics=libraryTopics(snapshot.data());libraryReady=true;ready();}catch(error){failed(error);}
   },failed));
  })().catch(error=>{if(session===generation){B.reportError(error);throw error;}});
  opening=work;const done=()=>{if(opening===work)opening=null;};work.then(done,done);return work;
 };
 B.command=async command=>{
  if(!live){let stale=false;const result=await localUpdate(state=>{const source=state.rooms[roomId],reset=C.resetExpired(source,crypto.randomUUID());stale=reset!==source;state.rooms[roomId]=stale?reset:C.apply(source,command);return state.rooms[roomId];});if(stale)throw Error('This round was inactive for 12 hours. Start a new game.');return result;}
  requireLive();const {sdk,db,rooms}=context,ref=sdk.doc(rooms,roomId);
  try{
   const result=await sdk.runTransaction(db,async tx=>{const source=(await tx.get(ref)).data();if(!source)throw Error('Room unavailable. Refresh and try again.');const reset=C.resetExpired(source,crypto.randomUUID()),stale=reset!==source,next=stale?reset:C.apply(source,command);tx.set(ref,{...next,lastActivityAt:sdk.serverTimestamp()});return {room:next,stale};});
   if(!B.room||result.room.revision>=B.room.revision)B.room=result.room;remember();changed();if(result.stale)throw Error('This round was inactive for 12 hours. Start a new game.');return result.room;
  }catch(error){if(error.code?.endsWith('resource-exhausted'))B.reportError(error);throw error;}
 };
 B.topic=async draft=>{
  const id=draft.id||'topic-'+crypto.randomUUID(),text=C.validateTopic(draft.text),category=C.text(draft.category||'From the table').slice(0,40);
  const update=(old,topics)=>{if(topics.some(t=>t.id!==id&&!t.archived&&C.normalized(t.text)===C.normalized(text)))throw Error('That topic is already in the library.');if(old&&old.rev!==draft.rev)throw Error('This topic changed elsewhere. Close and reopen it.');return {id,text,category,archived:Boolean(draft.archived),rev:(old?.rev||0)+1};};
  if(!live)return localUpdate(state=>{const index=state.topics.findIndex(t=>t.id===id),next=update(state.topics[index],state.topics);if(index<0)state.topics.push(next);else state.topics[index]=next;return next;});
  requireLive();const {sdk,db,library}=context;
  try{return await sdk.runTransaction(db,async tx=>{const snapshot=await tx.get(library);if(!snapshot.exists())throw Error('Reconnect to initialize the topic library.');const data=snapshot.data(),topics=libraryTopics(data),next=update(topics.find(t=>t.id===id),topics),updated={...data,revision:(data.revision||0)+1,topics:{...data.topics,[id]:next},updatedAt:sdk.serverTimestamp()};if(new TextEncoder().encode(JSON.stringify(updated)).length>800000)throw Error('The topic library is full. Export it before adding more.');tx.set(library,updated);return next;});}catch(error){if(error.code?.endsWith('resource-exhausted'))B.reportError(error);throw error;}
 };
 B.exportTopics=()=>JSON.stringify(B.topics,null,2);
 B.pause=()=>{clearTimeout(hideTimer);generation++;opening=null;stopListeners();};
 const reconnect=()=>B.open(roomId).catch(()=>{});
 window.addEventListener('storage',event=>{if(!live&&event.key===storageKey)localRefresh();});
 window.addEventListener('offline',()=>{if(live&&B.status!=='quota'){B.status='offline';changed();}});
 window.addEventListener('online',()=>{if(live&&!document.hidden)reconnect();});
 window.addEventListener('focus',()=>{if(live&&!document.hidden&&!unsubscribers.length)reconnect();});
 window.addEventListener('pageshow',event=>{if(live&&event.persisted&&!document.hidden)reconnect();});
 document.addEventListener('visibilitychange',()=>{clearTimeout(hideTimer);if(document.hidden){if(live)hideTimer=setTimeout(()=>B.pause(),60000);}else reconnect();});
})();

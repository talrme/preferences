(() => {
 'use strict';
 const C=PreferencesCore,config=PREFERENCES_CONFIG,sandbox=new URL(location.href).searchParams.get('demo')==='1';
 const environment=sandbox?'sandbox':config.environment||'main';
 if(!/^[a-z0-9-]{1,60}$/.test(environment))throw Error('Invalid database environment.');
 const live=Boolean(config.firebase)&&!sandbox,storageKey='preferences-'+environment+'-shared-v1';
 let emit=()=>{},roomId='table',unsubscribers=[],context=null,contextPromise=null,seedPromise=null,opening=null,generation=0,channel=null;
 const initializedRooms=new Set();
 const B=window.PreferencesBackend={room:null,topics:[],live,status:'loading',subscribe:fn=>emit=fn};
 const changed=()=>emit();
 // Capture asset location before asynchronous initialization leaves currentScript.
 const topicsUrl=new URL('topics.json',document.currentScript.src);
 async function seedTopics(){const response=await fetch(topicsUrl);if(!response.ok)throw Error('Could not load starter topics.');const groups=await response.json();return Object.entries(groups).flatMap(([category,labels])=>labels.map((text,i)=>({id:'seed-'+category.toLowerCase().replace(/[^a-z]+/g,'-')+'-'+i,text,category,archived:false,rev:1})));}
 function localRead(){const value=localStorage.getItem(storageKey);return value?JSON.parse(value):{topics:[],rooms:{}};}
 function localUpdate(fn){const perform=async()=>{const state=localRead(),result=fn(state);localStorage.setItem(storageKey,JSON.stringify(state));localRefresh();channel?.postMessage('changed');return result;};return navigator.locks?navigator.locks.request(storageKey,perform):perform();}
 function localRefresh(){const state=localRead();B.room=state.rooms[roomId];B.topics=state.topics;B.status=sandbox?'sandbox':'local';changed();}
 async function firebase(){
  const [app,sdk]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')]);
  const db=sdk.getFirestore(app.initializeApp(config.firebase,'preferences-'+environment));
  return {sdk,db,root:sdk.doc(db,'preferences',environment),topics:sdk.collection(db,'preferences',environment,'topics'),rooms:sdk.collection(db,'preferences',environment,'rooms')};
 }
 const stopListeners=()=>{unsubscribers.forEach(fn=>fn());unsubscribers=[];};
 B.open=id=>{
  if(opening&&id===roomId)return opening;
  const session=++generation;stopListeners();roomId=id;
  if(B.room?.id!==id)B.room=null;
  B.status=navigator.onLine===false?'offline':B.room?'reconnecting':'loading';changed();
  const work=(async()=>{
  if(!live){
   const topics=await seedTopics();await localUpdate(state=>{if(!state.initialized){state.topics=topics;state.initialized=true;}state.rooms[id]||=C.initial(id,crypto.randomUUID());});
   channel||=new BroadcastChannel(storageKey);channel.onmessage=localRefresh;return;
  }
  if(!context){contextPromise||=firebase().catch(error=>{contextPromise=null;throw error;});context=await contextPromise;}
  const {sdk,db,root,topics,rooms}=context;
  if(!seedPromise)seedPromise=(async()=>{
   // Only first initialization needs the seed and marker check, not every tab return.
   const seed=await seedTopics();await sdk.runTransaction(db,async tx=>{
    const existing=await tx.get(root);if(existing.exists())return;
    tx.set(root,{schema:1,createdAt:sdk.serverTimestamp()});for(const topic of seed)tx.set(sdk.doc(topics,topic.id),topic);
   });
  })().catch(error=>{seedPromise=null;throw error;});
  await seedPromise;if(session!==generation||document.hidden)return;
  const ref=sdk.doc(rooms,id);
  if(!initializedRooms.has(id)){await sdk.runTransaction(db,async tx=>{if(!(await tx.get(ref)).exists())tx.set(ref,C.initial(id,crypto.randomUUID()));});initializedRooms.add(id);}
  if(session!==generation||document.hidden)return;
  let roomReady=false,topicsReady=false;
  const ready=()=>{B.status=roomReady&&topicsReady?'live':B.room?'reconnecting':'loading';if(B.status==='live')B.error='';changed();};
  const cached=()=>{if(B.room){B.status=navigator.onLine===false?'offline':'reconnecting';changed();}};
  const failed=error=>{if(session!==generation)return;generation++;stopListeners();B.status='error';B.error=error.message;changed();};
  unsubscribers.push(sdk.onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
   if(session!==generation)return;
   if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites){if(!snapshot.metadata.hasPendingWrites)cached();return;}
   if(!snapshot.exists()){failed(Error('This room was removed. Create or join another room.'));return;}
   const next=snapshot.data();if(!B.room||next.revision>=B.room.revision)B.room=next;roomReady=true;ready();
  },failed));
  unsubscribers.push(sdk.onSnapshot(topics,{includeMetadataChanges:true},snapshot=>{
   if(session!==generation)return;
   if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites){if(!snapshot.metadata.hasPendingWrites)cached();return;}
   B.topics=snapshot.docs.map(d=>({...d.data(),id:d.id}));topicsReady=true;ready();
  },failed));
  })().catch(error=>{if(session===generation)throw error;});
  opening=work;const done=()=>{if(opening===work)opening=null;};work.then(done,done);return work;
 };
 B.command=async command=>{
  if(!live)return localUpdate(state=>{state.rooms[roomId]=C.apply(state.rooms[roomId],command);return state.rooms[roomId];});
  const {sdk,db,rooms}=context,ref=sdk.doc(rooms,roomId);
  const result=await sdk.runTransaction(db,async tx=>{const source=(await tx.get(ref)).data();if(!source)throw Error('Room unavailable. Refresh and try again.');const next=C.apply(source,command);tx.set(ref,next);return next;});
  if(!B.room||result.revision>=B.room.revision)B.room=result;changed();return result;
 };
 B.topic=async draft=>{
  const id=draft.id||'topic-'+crypto.randomUUID(),text=C.validateTopic(draft.text),category=C.text(draft.category||'From the table').slice(0,40);
  if(B.topics.some(t=>t.id!==id&&!t.archived&&C.normalized(t.text)===C.normalized(text)))throw Error('That topic is already in the library.');
  const update=old=>{if(old&&old.rev!==draft.rev)throw Error('This topic changed elsewhere. Close and reopen it.');return {id,text,category,archived:Boolean(draft.archived),rev:(old?.rev||0)+1};};
  if(!live)return localUpdate(state=>{const index=state.topics.findIndex(t=>t.id===id),next=update(state.topics[index]);if(index<0)state.topics.push(next);else state.topics[index]=next;return next;});
  const {sdk,db,topics}=context,ref=sdk.doc(topics,id);
  return sdk.runTransaction(db,async tx=>{const doc=await tx.get(ref),next=update(doc.exists()?doc.data():null);tx.set(ref,next);return next;});
 };
 B.exportTopics=()=>JSON.stringify(B.topics,null,2);
 B.pause=()=>{generation++;opening=null;stopListeners();};
 const reconnect=()=>B.open(roomId).catch(error=>{B.status='error';B.error=error.message;changed();});
 window.addEventListener('storage',event=>{if(!live&&event.key===storageKey)localRefresh();});
 window.addEventListener('offline',()=>{if(live){B.status='offline';changed();}});
 window.addEventListener('online',()=>{if(live&&!document.hidden)reconnect();});
 window.addEventListener('focus',()=>{if(live&&!document.hidden&&!unsubscribers.length)reconnect();});
 window.addEventListener('pageshow',event=>{if(live&&event.persisted&&!document.hidden)reconnect();});
 document.addEventListener('visibilitychange',()=>{if(!live)return;if(document.hidden)B.pause();else reconnect();});
})();

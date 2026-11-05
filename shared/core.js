(function(root){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const text=value=>String(value||'').trim().replace(/\s+/g,' ');
 const normalized=value=>text(value).toLocaleLowerCase();
 const idleLimit=12*60*60*1000;
 function activityMillis(room){const value=room.lastActivityAt;return typeof value==='number'&&Number.isFinite(value)?value:value&&Number.isFinite(value.seconds)?value.seconds*1000+(value.nanoseconds||0)/1e6:null;}
 function expired(room,now=Date.now()){const time=activityMillis(room);return time!==null&&now-time>=idleLimit;}
 function initial(id,roundId,now=Date.now()){return {id,roundId,revision:0,phase:'setup',picker:'',owner:null,items:[0,1,2,3].map(i=>({id:'slot-'+i,text:'',topicId:null})),revealed:[],revealStarted:false,seen:[],guessesEnabled:false,guesses:{},lastActivityAt:now};}
 function validateTopic(value){const clean=text(value);if(!clean||clean.length>140)throw Error('Use 1–140 characters for a topic.');return clean;}
 function apply(source,cmd,now=Date.now()){
  const state=clone(source),p=cmd.payload||{};
  if(p.expectedRevision!==state.revision)throw Error('Someone just changed this round. Please try again.');
  if(cmd.type==='reset'){
   const next=initial(state.id,p.roundId,now);next.seen=state.seen;next.guessesEnabled=Boolean(state.guessesEnabled);next.revision=state.revision+1;return next;
  }
  if(cmd.type==='items'){
   if(state.phase!=='setup')throw Error('This round is locked. Start a new round to change the topics.');
   if(!Array.isArray(p.items)||p.items.length!==4||new Set(p.items.map(i=>i.id)).size!==4)throw Error('Choose exactly four topics.');
   state.items=p.items.map(i=>({id:i.id,text:i.text?validateTopic(i.text):'',topicId:i.topicId||null}));
   const nonempty=state.items.filter(i=>i.text);if(new Set(nonempty.map(i=>normalized(i.text))).size!==nonempty.length)throw Error('Those topics match. Try a different one.');
  }else if(cmd.type==='picker'){
   if(state.phase!=='setup')throw Error('This round has already started.');state.picker=text(p.name).slice(0,50);
  }else if(cmd.type==='select-picker'){
   if(!p.device||!text(p.name))throw Error('Enter your name first.');
   if(state.phase!=='setup'){
    if(!p.takeover||p.expectedOwner!==state.owner||p.expectedRoundId!==state.roundId)throw Error('The picker changed. Please try again.');
    if(!p.roundId||p.roundId===state.roundId)throw Error('A takeover needs a new ranking.');
    state.roundId=p.roundId;state.phase='ranking';state.revealed=[];state.revealStarted=false;state.guesses={};
   }
   state.owner=p.device;state.picker=text(p.name).slice(0,50);
  }else if(cmd.type==='rename-picker'){
   if(state.owner!==p.device)throw Error('Only the picker can change their name.');
   if(!text(p.name))throw Error('Enter your name first.');state.picker=text(p.name).slice(0,50);
  }else if(cmd.type==='clear-name'){
   if(!p.device)throw Error('This device could not be identified.');
   if(state.owner===p.device)state.picker='';
   if(state.guesses?.[p.device])state.guesses[p.device].name='Anonymous';
  }else if(cmd.type==='guessing'){
   if(state.phase!=='setup')throw Error('Change guessing mode before ranking starts.');
   state.guessesEnabled=Boolean(p.enabled);state.guesses={};
  }else if(cmd.type==='guess'){
   if(!state.guessesEnabled||state.revealStarted||state.revealed.length||!['ranking','discuss'].includes(state.phase))throw Error('Guesses are closed for this round.');
   if(state.owner===p.device)throw Error('The picker cannot guess their own ranking.');
   if(!p.device||!text(p.name))throw Error('Enter your name first.');
   if(!Array.isArray(p.order)||p.order.length!==4||new Set(p.order).size!==4||p.order.some(id=>!state.items.some(i=>i.id===id)))throw Error('Rank all four topics in your guess.');
   state.guesses||={};if(!state.guesses[p.device]&&Object.keys(state.guesses).length>=50)throw Error('This round already has 50 guesses.');
   state.guesses[p.device]={name:text(p.name).slice(0,50),order:[...p.order]};
  }else if(cmd.type==='claim'){
   if(state.phase!=='setup')throw Error('Someone is already ranking this round.');
   if(state.owner&&state.owner!==p.device)throw Error('Someone else is the picker. Select the picker control to take over.');
   if(state.items.some(i=>!i.text))throw Error('Choose all four topics first.');
   if(!p.device)throw Error('This device could not be identified.');state.owner=p.device;state.phase='ranking';if(p.name)state.picker=text(p.name).slice(0,50);
   state.seen=[...new Set([...state.seen,...state.items.map(i=>i.topicId).filter(Boolean)])].slice(-500);
  }else{
   if(state.owner!==p.device)throw Error('Only the picker can do that.');
   if(cmd.type==='back'){
    if((p.phase&&p.phase!==state.phase)||(p.expectedRoundId&&p.expectedRoundId!==state.roundId))throw Error('The step changed. Please try again.');
    if(state.phase==='ranking'){state.phase='setup';state.guesses={};state.revealed=[];state.revealStarted=false;}
    else if(state.phase==='discuss')state.phase='ranking';
    else if(state.phase==='reveal'){state.revealStarted=Boolean(state.revealStarted||state.revealed.length);state.phase='discuss';state.revealed=[];}
    else if(state.phase==='done'){state.phase='reveal';state.revealStarted=true;state.revealed=state.revealed.slice(0,-1);}
    else throw Error('You are already at the first step.');
   }else if(cmd.type==='start-reveal'){
    if(state.phase!=='discuss')throw Error('Finish the discussion before moving to reveal.');state.phase='reveal';
   }else if(cmd.type==='ready'){
    if(state.phase!=='ranking')throw Error('This round is not ready for that.');state.phase='discuss';
   }else if(cmd.type==='rerank'){
    if(state.phase!=='discuss'||state.revealed.length)throw Error('The reveal has already started.');state.phase='ranking';
   }else if(cmd.type==='reveal'){
    if(!['discuss','reveal'].includes(state.phase))throw Error('Hide the ranking before revealing it.');
    const ids=p.ids;if(!Array.isArray(ids)||ids.length<=state.revealed.length||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!state.items.some(i=>i.id===id))||state.revealed.some((id,i)=>ids[i]!==id))throw Error('The reveal order changed. Try again.');
    state.revealed=ids;state.revealStarted=true;state.phase=ids.length===4?'done':'reveal';
   }else throw Error('Unknown action.');
  }
  state.lastActivityAt=now;state.revision++;return state;
 }
 function draw(topics,items,indexes,seen=[],random=Math.random){
  const result=clone(items),keep=items.filter((_,i)=>!indexes.includes(i)),blocked=new Set(keep.map(i=>normalized(i.text))),seenSet=new Set(seen);
  let pool=topics.filter(t=>!t.archived&&!blocked.has(normalized(t.text)));
  const previous=new Set(items.filter((_,i)=>indexes.includes(i)).map(i=>normalized(i.text))),different=pool.filter(t=>!previous.has(normalized(t.text)));
  if(different.length>=indexes.length)pool=different;
  const fresh=pool.filter(t=>!seenSet.has(t.id));
  if(fresh.length>=indexes.length)pool=fresh;
  for(const index of indexes){if(!pool.length)throw Error('Not enough different topics. Add more in Topics.');const pick=pool.splice(Math.floor(random()*pool.length),1)[0];result[index]={...result[index],text:pick.text,topicId:pick.id};pool=pool.filter(t=>normalized(t.text)!==normalized(pick.text));}
  return result;
 }
 function privateOrder(room,saved){const ids=room.items.map(i=>i.id);return Array.isArray(saved)&&saved.length===4&&new Set(saved).size===4&&saved.every(id=>ids.includes(id))?[...saved]:ids;}
 function resetExpired(room,roundId,now=Date.now()){return expired(room,now)?apply(room,{type:'reset',payload:{roundId,expectedRevision:room.revision}},now):room;}
 const api={clone,text,normalized,initial,validateTopic,apply,draw,privateOrder,activityMillis,expired,resetExpired,idleLimit};root.PreferencesCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);

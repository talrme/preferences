// Deterministic browser-only SDK fixture; no requests reach Firebase.
const F=window.FirestoreFixture;
const clone=value=>JSON.parse(JSON.stringify(value));
const fail=()=>{if(F.quota){const error=Error('Quota exceeded.');error.code='resource-exhausted';throw error;}};
const snapshot=ref=>({id:ref.path.split('/').at(-1),ref,metadata:{fromCache:false,hasPendingWrites:false},exists:()=>Object.hasOwn(F.data,ref.path),data:()=>clone(F.data[ref.path])});
function publish(path){for(const listener of F.listeners)if(listener.active&&listener.ref.path===path)queueMicrotask(()=>{if(listener.active)listener.next(snapshot(listener.ref));});}
export const getFirestore=()=>({});
export const connectFirestoreEmulator=()=>{};
export const doc=(base,...parts)=>({path:[base.path,...parts].filter(Boolean).join('/'),kind:'document'});
export const collection=(base,...parts)=>({path:[base.path,...parts].filter(Boolean).join('/'),kind:'collection'});
export const serverTimestamp=()=>Date.now();
export function onSnapshot(ref,options,next,error){
 F.stats.listeners.push({path:ref.path,kind:ref.kind});const listener={ref,next,error,active:true};F.listeners.push(listener);
 queueMicrotask(()=>{if(!listener.active||F.silent)return;try{fail();F.stats.documentReads++;next(snapshot(ref));}catch(e){error(e);}});
 return ()=>{listener.active=false;};
}
export async function getDocsFromServer(ref){fail();F.stats.collectionReads++;const docs=Object.keys(F.data).filter(path=>path.startsWith(ref.path+'/')&&path.slice(ref.path.length+1).split('/').length===1).map(path=>snapshot({path,kind:'document'}));F.stats.documentReads+=Math.max(1,docs.length);return {empty:!docs.length,docs};}
export async function runTransaction(db,work){
 fail();F.stats.transactions++;const writes=[];
 const result=await work({get:async ref=>{fail();F.stats.documentReads++;return snapshot(ref);},set:(ref,value)=>writes.push([ref,clone(value)]),update:(ref,value)=>writes.push([ref,{...F.data[ref.path],...clone(value)}])});
 fail();for(const [ref,value] of writes){F.stats.writes++;F.data[ref.path]=value;publish(ref.path);}localStorage.setItem('fixture-database',JSON.stringify(F.data));return result;
}

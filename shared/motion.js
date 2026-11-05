(function(root){
 'use strict';
 const labels={deal:'Topic dealing & shuffling',reorder:'Card reordering',steps:'Step transitions',ranker:'Ranker switch pop',reveal:'Answer reveals',confetti:'Results confetti',dialogs:'Dialog entrances',taps:'Button pops',ambient:'Handwritten notes & icon wiggles'};
 const all=value=>Object.fromEntries(Object.keys(labels).map(key=>[key,value]));
 const presets={off:all(false),gentle:{...all(false),reorder:true,steps:true,ranker:true,dialogs:true},playful:{...all(true),ambient:false},ridiculous:all(true)};
 function normalize(value,fallback=presets.playful){return Object.fromEntries(Object.keys(labels).map(key=>[key,typeof value?.[key]==='boolean'?value[key]:fallback[key]]));}
 function restore(prefs){
  const preset=Object.hasOwn(presets,prefs.animationPreset)?prefs.animationPreset:prefs.animationPreset==='custom'?'custom':Object.hasOwn(presets,prefs.motion)?prefs.motion:'playful';
  return {preset,effects:preset==='custom'?normalize(prefs.animations):{...presets[preset]},custom:normalize(prefs.customAnimations||prefs.animations)};
 }
 const active=new Set();
 function enabled(prefs,key){return Boolean(prefs.animations?.[key]&&!root.document?.hidden&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);}
 function clear(){for(const animation of active)animation.cancel();active.clear();}
 function animate(prefs,key,node,frames,options={}){
  if(!node?.isConnected||!enabled(prefs,key))return;
  const animation=node.animate(frames,{duration:prefs.animationPreset==='gentle'?220:420,easing:'cubic-bezier(.2,.8,.2,1)',...options});animation.id='preferences-'+key;active.add(animation);
  animation.finished.catch(()=>{}).finally(()=>active.delete(animation));return animation;
 }
 function pop(prefs,key,node){return animate(prefs,key,node,[{transform:'scale(1)'},{transform:'scale(1.06)',offset:.45},{transform:'scale(1)'}]);}
 root.PreferencesMotion={labels,presets,normalize,restore,enabled,animate,pop,clear};
 if(typeof module!=='undefined')module.exports=root.PreferencesMotion;
})(typeof globalThis!=='undefined'?globalThis:this);

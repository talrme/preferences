const assert=require('node:assert/strict'),M=require('../shared/motion.js');
assert(Object.values(M.presets.off).every(value=>value===false));assert.equal(Object.keys(M.labels).length,9);
assert.equal(M.presets.playful.confetti,true);assert.equal(M.presets.playful.ambient,false);assert.equal(M.presets.gentle.confetti,false);assert.equal(M.presets.ridiculous.ambient,true);
for(const motion of ['off','gentle','playful','ridiculous']){const restored=M.restore({motion});assert.equal(restored.preset,motion);assert.deepEqual(restored.effects,M.presets[motion]);}
const custom=M.restore({animationPreset:'custom',animations:{reveal:false,ambient:true},customAnimations:{taps:false}});assert.equal(custom.effects.reveal,false);assert.equal(custom.effects.ambient,true);assert.equal(custom.custom.taps,false);assert.equal(Object.keys(custom.effects).length,9);
const normalized=M.normalize({bogus:true,taps:'false'});assert(!('bogus' in normalized));assert.equal(normalized.taps,true);
console.log('PASS animation presets, legacy migration, custom effects normalization and saved custom mix.');

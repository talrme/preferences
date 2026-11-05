const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'}),errors=[];p.on('pageerror',error=>errors.push(error.message));
  await p.addInitScript(()=>{window.__motion=[];const animate=Element.prototype.animate;Element.prototype.animate=function(...args){const result=animate.apply(this,args);window.__motion.push(result);return result;};});
  await p.goto('http://127.0.0.1:5196/?demo=1&room=animation-test');await p.locator('[data-draw]').waitFor();
  const played=key=>p.evaluate(key=>window.__motion.some(a=>a.id==='preferences-'+key),key),clear=()=>p.evaluate(()=>window.__motion=[]);
  assert(await played('deal'));assert(await played('steps'));assert(await p.locator('.qr-reminder').isVisible());
  await clear();await p.locator('[data-draw]').click();await p.waitForFunction(()=>PreferencesTest.getPublic().items.every(i=>i.text));assert(await played('deal'));
  await p.locator('[data-volunteer]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.waitForFunction(()=>Boolean(PreferencesTest.getPublic().owner));assert(await played('ranker'));
  await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();await clear();await p.locator('[data-move="0"][data-direction="1"]').click();assert(await played('reorder'));
  await p.locator('[data-ready]').click();await p.locator('[data-start-reveal]').click();await p.locator('[data-reveal]').waitFor();
  for(let i=1;i<=4;i++){await clear();await p.locator('[data-reveal]').click();await p.waitForFunction(count=>PreferencesTest.getPublic().revealed.length===count,i);assert(await played('reveal'));}
  assert(await p.locator('#confetti span').count()>0);await p.reload();await p.locator('[data-next]').waitFor();assert.equal(await p.locator('#confetti span').count(),0,'No results celebration replay on reload');
  await p.locator('[data-settings]').click();await p.locator('#settings-animations>summary').click();assert.equal(await p.locator('#motion-name').innerText(),'Playful');await p.locator('.motion-effects>summary').click();await p.locator('[data-effect="reveal"]').uncheck();assert.equal(await p.locator('#motion-name').innerText(),'Custom');
  await p.locator('#motion').fill('0');assert(await p.locator('[data-effect="dialogs"]').isChecked()===false);await p.locator('#motion').fill('4');assert.equal(await p.locator('[data-effect="reveal"]').isChecked(),false);assert.equal(await p.locator('[data-effect="deal"]').isChecked(),true);
  await p.locator('#motion').fill('3');for(const width of [320,390,1280])for(const palette of ['design','night','citrus','ocean','rose']){await p.setViewportSize({width,height:900});await p.evaluate(value=>document.body.dataset.palette=value,palette);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth));}
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>document.body.dataset.palette='night');await p.screenshot({path:'/tmp/preferences-animation-settings-phone.png'});
  await p.locator('#motion').fill('0');await p.keyboard.press('Escape');await p.reload();await p.locator('[data-next]').waitFor();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('preferences-ui-v1')).animationPreset),'off');await clear();await p.locator('[data-settings]').click();assert.equal(await played('dialogs'),false);assert.equal(await played('taps'),false);
  await p.locator('#settings-animations>summary').click();await p.locator('#motion').fill('2');await p.keyboard.press('Escape');await clear();await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-settings]').click();assert.equal(await played('dialogs'),false);assert.equal(await played('taps'),false);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  await p.keyboard.press('Escape');await p.locator('.footer').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/preferences-qr-note-phone.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS animated dealing/ranker/reordering/steps/reveals/confetti, no refresh celebration, presets/custom/persistence/off, reduced motion, all palettes and phone/desktop, QR note.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

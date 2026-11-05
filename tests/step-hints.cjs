const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:740},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=step-hints');await p.locator('[data-draw]').waitFor();
  const primary=()=>p.locator('.step-navigation .primary');assert(!(await p.locator('#step-error').isVisible()));let rev=await p.evaluate(()=>PreferencesTest.getPublic().revision);
  await primary().click({force:true});assert.equal(await p.locator('#step-error').innerText(),'Select a ranker before going to the next step.');assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().revision),rev);
  for(const palette of ['design','citrus','ocean','rose','night']){await p.evaluate(value=>document.body.dataset.palette=value,palette);assert(await p.locator('#step-error').isVisible());assert(await p.locator('#step-error').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.step-navigation').getBoundingClientRect().bottom));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await p.screenshot({path:'/tmp/preferences-step-hint-phone.png'});
  await p.locator('[data-volunteer]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.locator('#modal').waitFor({state:'hidden'});await p.waitForFunction(()=>PreferencesTest.getPublic().owner===PreferencesTest.device&&!document.querySelector('[data-claim]').disabled);assert(!(await p.locator('#step-error').isVisible()));rev=await p.evaluate(()=>PreferencesTest.getPublic().revision);
  await primary().focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#step-error').innerText(),'Choose all four topics before going to the next step.');assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().revision),rev);
  await p.locator('[data-draw]').click();await p.waitForFunction(()=>PreferencesTest.getPublic().items.every(i=>i.text));assert(!(await p.locator('#step-error').isVisible()));await primary().click();await p.locator('.ranking-list').waitFor();assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().phase),'ranking');
  await p.locator('[data-round-options]').click();await p.locator('[data-select-picker]').click();await p.locator('[data-step-back]').waitFor();await p.locator('[data-ready]').waitFor({state:'hidden'});
  await p.evaluate(()=>{const room=PreferencesTest.getPublic();return PreferencesBackend.command({type:'select-picker',payload:{device:'another-device',name:'Sophie',takeover:true,expectedOwner:room.owner,expectedRoundId:room.roundId,roundId:crypto.randomUUID(),expectedRevision:room.revision}});});
  await primary().click({force:true});assert.equal(await p.locator('#step-error').innerText(),'The ranker must move everyone to the next step.');await p.locator('[data-step-back]').click({force:true});assert.equal(await p.locator('#step-error').innerText(),'Only the ranker can go back to the previous step.');
  console.log('PASS on-demand inline errors, correct missing ranker/topics reasons, mouse/touch-style and keyboard activation, no game writes on blocked action, hints clear on state changes, all palettes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

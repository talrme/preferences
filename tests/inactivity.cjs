const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:5196/?demo=1&room=idle-test');await p.locator('[data-draw]').click();await p.locator('[data-volunteer]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();
  const old=await p.evaluate(()=>PreferencesTest.getPublic());
  await p.evaluate(()=>{const key='preferences-sandbox-shared-v1',data=JSON.parse(localStorage.getItem(key));data.rooms['idle-test'].lastActivityAt=Date.now()-13*60*60*1000;localStorage.setItem(key,JSON.stringify(data));});
  await p.reload();await p.locator('[data-draw]').waitFor();assert.equal(await p.locator('.ranking-list').count(),0);assert.equal(await p.locator('.current-picker').count(),0);assert.equal(await p.locator('[data-player-name]').innerText(),'Tal');assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().revision),old.revision+1);
  const activity=await p.evaluate(()=>PreferencesTest.getPublic().lastActivityAt);await p.reload();await p.locator('[data-draw]').waitFor();assert.equal(await p.evaluate(()=>PreferencesTest.getPublic().lastActivityAt),activity);
  // Old versions have no timestamp: establish a baseline without destroying a round.
  await p.locator('[data-draw]').click();await p.locator('[data-volunteer]').click();await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();
  await p.evaluate(()=>{const key='preferences-sandbox-shared-v1',data=JSON.parse(localStorage.getItem(key));delete data.rooms['idle-test'].lastActivityAt;localStorage.setItem(key,JSON.stringify(data));});await p.reload();await p.locator('.ranking-list').waitFor();assert(await p.evaluate(()=>Number.isFinite(PreferencesTest.getPublic().lastActivityAt)));
  await p.locator('[data-round-options]').click();await p.evaluate(()=>{const key='preferences-sandbox-shared-v1',data=JSON.parse(localStorage.getItem(key));data.rooms['idle-test'].lastActivityAt=Date.now()-13*60*60*1000;localStorage.setItem(key,JSON.stringify(data));document.dispatchEvent(new Event('visibilitychange'));});await p.locator('[data-draw]').waitFor();assert(!(await p.locator('#modal').isVisible()));
  console.log('PASS local inactive game returns to first screen on refresh/visible return, stale modal closes, name survives, opens do not renew activity, legacy rounds get a non-destructive baseline.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

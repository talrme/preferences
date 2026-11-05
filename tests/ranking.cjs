const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),p=await c.newPage();
  await p.goto('http://127.0.0.1:5196/?demo=1&room=drag-test');await p.locator('[data-draw]').click();await p.locator('[data-select-picker]').click();await p.locator('#player-name').fill('Tal');await p.locator('[data-save-name]').click();await p.locator('[data-claim]').click();await p.locator('.ranking-list').waitFor();
  assert.equal(await p.locator('.drag-handle').count(),0);const before=await p.evaluate(()=>PreferencesTest.getPrivate());
  const first=await p.locator('.ranking-list .tile-text').nth(0).boundingBox(),third=await p.locator('.ranking-list .tile-text').nth(2).boundingBox(),session=await c.newCDPSession(p),x=first.x+20,y=first.y+first.height/2,target=third.y+third.height/2;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=18;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+(target-y)*i/18}]});await p.waitForTimeout(25);}
  assert.equal(await p.locator('.sortable-fallback').evaluate(el=>getComputedStyle(el).opacity),'1','Dragged tile must be fully visible');
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);assert.notDeepEqual(await p.evaluate(()=>PreferencesTest.getPrivate()),before,'Dragging the text with touch must reorder');assert.equal(await p.locator('main').count(),1);assert.equal(await p.locator('.topic-tile').count(),4);assert.equal(await p.locator('.sortable-fallback').count(),0);
  await p.locator('[data-round-options]').click();await p.locator('#modal [data-select-picker]').click();assert.equal(await p.locator('.ranking-list').count(),0);assert.deepEqual(await p.locator('#topic-list>li').evaluateAll(els=>els.map(e=>e.dataset.id)),before);await p.locator('#game [data-select-picker]').click();await p.locator('.ranking-list').waitFor();
  for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const size=await p.locator('[data-move]').first().boundingBox();assert(size.width>=44&&size.height>=44);}
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/preferences-ranking-phone.png',fullPage:true});await p.setViewportSize({width:1280,height:900});await p.screenshot({path:'/tmp/preferences-ranking-desktop.png',fullPage:true});await p.reload();await p.locator('.ranking-list').waitFor();assert.equal(await p.locator('[data-player-name]').innerText(),'Tal');
  console.log('PASS whole-card touch drag, 44px arrows, local picker view hides order, persisted name, 320/390/1280 layouts.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
